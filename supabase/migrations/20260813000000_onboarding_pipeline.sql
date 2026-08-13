-- ============================================================================
-- ONBOARDING PIPELINE — volunteers, members, chapters, and the write path
-- ----------------------------------------------------------------------------
-- This migration does four things, in this order:
--
--   1. Closes the reference-data gap that would have made every volunteer
--      INSERT fail its foreign key (audit finding H-1). The home.html
--      <select> offered ten province labels; public.provinces held seven
--      codes, and none of the three component cities existed.
--
--   2. Adds the columns an actual onboarding journey needs: phone as the
--      primary contact, language and channel preference, member-vs-volunteer
--      affiliation, chapter assignment, verification state, and an explicit
--      onboarding_stage (H-10, and Part 4 of the audit).
--
--   3. Introduces `chapters` — the missing organisational layer between a
--      province and a person. Without it there is nobody to route a new
--      volunteer to, which is why leads had no owner and no SLA.
--
--   4. REVOKES public write access and routes every public submission through
--      the `submit-lead` Edge Function (H-2, H-3). An `insert ... with check
--      (true)` endpoint reachable with a published anon key, holding
--      political-affiliation data, during a campaign period, is not a risk
--      this party should carry. The Edge Function holds the service-role key
--      and enforces CAPTCHA, rate limiting, validation, and consent logging.
--
-- Idempotent: safe to re-run.
-- Target: PostgreSQL 15+ on Supabase.
-- ============================================================================

-- ============================================================================
-- 1. REFERENCE DATA — close the province gap (H-1)
-- ============================================================================
-- Official BARMM scope for the 14 Sep 2026 election: five provinces, three
-- component cities, and the Special Geographic Area. Sulu and Isabela City
-- are excluded. The labels below must stay byte-identical to the <option>
-- text in home.html, because that is what the form posts back as a code.

insert into public.provinces (code, label, sort_order) values
  ('maguindanao_norte', 'Maguindanao del Norte',                      1),
  ('maguindanao_sur',   'Maguindanao del Sur',                        2),
  ('lanao_del_sur',     'Lanao del Sur',                              3),
  ('basilan',           'Basilan (maliban sa Isabela City)',          4),
  ('tawi_tawi',         'Tawi-Tawi',                                  5),
  ('cotabato_city',     'Cotabato City',                              6),
  ('lamitan_city',      'Lamitan City',                               7),
  ('marawi_city',       'Marawi City',                                8),
  ('sga_cotabato',      'Special Geographic Area (8 bagong munisipyo)', 9),
  ('outside_barmm',     'Labas ng BARMM',                            10)
on conflict (code) do update
  set label      = excluded.label,
      sort_order = excluded.sort_order;

-- Interests: extend to match every option the form actually offers. The
-- original four did not include the six BANGON pillars, so a volunteer who
-- picked "N — Kalikasan" was writing an interest_code with no matching row.
insert into public.volunteer_interests (code, label, sort_order) values
  ('basic_services',       'B — Batayang Serbisyo (subsidy, kalusugan)',        1),
  ('alliance_building',    'A — Alyansa (bottom-up budgeting)',                 2),
  ('natural_resources',    'N — Kalikasan (Palaw Rangers, sakahan)',            3),
  ('green_economy',        'G — Green Economy (green skills, Halal)',           4),
  ('open_governance',      'O — Bukas na Pamahalaan (meritokrasya)',            5),
  ('nonviolent_peace',     'N — Kapayapaan (reintegration, Marawi)',            6),
  ('ground_volunteer',     'Ground / precinct volunteer',                       7),
  ('sectoral_organizing',  'Sectoral organizing (youth, professionals)',        8),
  ('digital_comms',        'Digital at komunikasyon',                           9),
  ('donate_resources',     'Mag-donate ng resources',                          10)
on conflict (code) do update
  set label      = excluded.label,
      sort_order = excluded.sort_order;

-- ============================================================================
-- 2. CHAPTERS — the missing layer between a province and a person
-- ============================================================================

create table if not exists public.chapters (
  id              uuid primary key default uuid_generate_v4(),
  province_code   text not null references public.provinces(code),
  municipality    text not null,
  name            text not null,
  coordinator_id  uuid references public.staff_profiles(id) on delete set null,
  contact_number  text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

create index if not exists idx_chapters_province on public.chapters(province_code);
create index if not exists idx_chapters_coordinator on public.chapters(coordinator_id);

-- Seed one provincial chapter per area so auto-assignment has a target from
-- day one. Municipal sub-chapters can be added later without code changes.
insert into public.chapters (province_code, municipality, name)
select p.code, p.label, 'PBB ' || p.label
from public.provinces p
where p.code <> 'outside_barmm'
  and not exists (
    select 1 from public.chapters c where c.province_code = p.code
  );

alter table public.chapters enable row level security;

drop policy if exists "anyone can read active chapters" on public.chapters;
create policy "anyone can read active chapters"
  on public.chapters for select
  using (is_active or public.is_staff());

drop policy if exists "admins manage chapters" on public.chapters;
create policy "admins manage chapters"
  on public.chapters for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 3. VOLUNTEER LEADS — onboarding columns
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'affiliation_type') then
    create type public.affiliation_type as enum (
      'member',          -- signed party membership
      'volunteer',       -- campaign work, no membership
      'supporter',       -- receives updates only
      'partner',         -- organisation, see partnership_agreements
      'youth_supporter'  -- 15-17, guardian consent required (RA 10173)
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'onboarding_stage') then
    create type public.onboarding_stage as enum (
      'captured',   -- form submitted, nothing sent yet
      'confirmed',  -- auto-reply delivered on their channel
      'verified',   -- OTP proved the number belongs to them
      'assigned',   -- routed to a chapter coordinator
      'activated',  -- completed a first task
      'trained',    -- finished role-based micro-modules
      'deployed',   -- has a precinct/barangay assignment
      'inactive'    -- lapsed or opted out
    );
  end if;
end
$$;

alter table public.volunteer_leads
  add column if not exists phone             text,
  add column if not exists preferred_lang    text not null default 'tl',
  add column if not exists preferred_channel text not null default 'sms',
  add column if not exists affiliation       public.affiliation_type not null default 'volunteer',
  add column if not exists chapter_id        uuid references public.chapters(id) on delete set null,
  add column if not exists verified_at       timestamptz,
  add column if not exists onboarding_stage  public.onboarding_stage not null default 'captured',
  add column if not exists first_task_at     timestamptz,
  add column if not exists guardian_consent  boolean,
  add column if not exists date_of_birth     date,
  add column if not exists opted_out_at      timestamptz;

-- E-mail was `not null`, which is backwards for this constituency: SMS and
-- Messenger reach far more of BARMM than e-mail does. Phone becomes the
-- required channel; e-mail becomes optional.
alter table public.volunteer_leads alter column email drop not null;

-- Language and channel constraints. Maguindanaon (mdh), Maranao (mrw) and
-- Tausug (tsg) are the actual first languages of most of the six provinces.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'volunteer_leads_lang_check') then
    alter table public.volunteer_leads add constraint volunteer_leads_lang_check
      check (preferred_lang in ('tl','en','mdh','mrw','tsg'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'volunteer_leads_channel_check') then
    alter table public.volunteer_leads add constraint volunteer_leads_channel_check
      check (preferred_channel in ('sms','messenger','email','call'));
  end if;

  -- A lead must be reachable by SOMETHING. Previously e-mail was mandatory
  -- and phone did not exist; now at least one is required.
  if not exists (select 1 from pg_constraint where conname = 'volunteer_leads_contactable_check') then
    alter table public.volunteer_leads add constraint volunteer_leads_contactable_check
      check (phone is not null or email is not null);
  end if;

  -- RA 10173: a minor cannot consent on their own behalf.
  if not exists (select 1 from pg_constraint where conname = 'volunteer_leads_guardian_check') then
    alter table public.volunteer_leads add constraint volunteer_leads_guardian_check
      check (affiliation <> 'youth_supporter' or guardian_consent is true);
  end if;
end
$$;

-- Deduplication. One person, one record — enforced on the normalised number
-- so "0917 123 4567" and "+639171234567" collide as they should.
create unique index if not exists uq_volunteer_leads_phone
  on public.volunteer_leads (regexp_replace(phone, '\D', '', 'g'))
  where phone is not null;

create unique index if not exists uq_volunteer_leads_email
  on public.volunteer_leads (lower(email))
  where email is not null;

create index if not exists idx_volunteer_leads_stage on public.volunteer_leads(onboarding_stage);
create index if not exists idx_volunteer_leads_chapter on public.volunteer_leads(chapter_id);
create index if not exists idx_volunteer_leads_affiliation on public.volunteer_leads(affiliation);

-- Backfill: existing rows keep working under the new constraints.
update public.volunteer_leads
   set onboarding_stage = 'captured'
 where onboarding_stage is null;

-- ============================================================================
-- 4. SUBMISSION THROTTLE — per-IP rate limiting for the Edge Function
-- ============================================================================
-- Stores only a salted SHA-256 of the IP, never the address itself, so this
-- table is not a surveillance artifact if it ever leaks.

create table if not exists public.submission_throttle (
  id          bigserial primary key,
  ip_hash     text not null,
  form_type   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_submission_throttle_lookup
  on public.submission_throttle (ip_hash, created_at desc);

alter table public.submission_throttle enable row level security;
-- No policies at all: reachable only by the service role, which bypasses RLS.

-- Housekeeping: keep the window, drop the history. Schedule with pg_cron:
--   select cron.schedule('purge-throttle','*/30 * * * *',
--                        $$select public.purge_submission_throttle()$$);
create or replace function public.purge_submission_throttle()
returns void language sql security definer set search_path = public as $$
  delete from public.submission_throttle where created_at < now() - interval '1 day';
$$;

-- ============================================================================
-- 5. COORDINATOR QUEUE — an SLA that is visible in the data
-- ============================================================================

create or replace view public.coordinator_queue as
select
  l.id,
  l.full_name,
  l.phone,
  l.email,
  l.affiliation,
  l.onboarding_stage,
  l.province_code,
  p.label                    as province_label,
  l.chapter_id,
  c.name                     as chapter_name,
  c.coordinator_id,
  l.interest_code,
  i.label                    as interest_label,
  l.preferred_lang,
  l.preferred_channel,
  l.verified_at,
  l.submitted_at,
  now() - l.submitted_at     as age,
  (now() - l.submitted_at > interval '48 hours'
   and l.onboarding_stage in ('captured', 'confirmed')) as breached_sla
from public.volunteer_leads l
left join public.provinces           p on p.code = l.province_code
left join public.volunteer_interests i on i.code = l.interest_code
left join public.chapters            c on c.id   = l.chapter_id
where l.opted_out_at is null;

-- Funnel health, for the weekly organising review.
create or replace view public.onboarding_funnel as
select
  coalesce(c.name, 'Unassigned')                                   as chapter,
  count(*)                                                          as total,
  count(*) filter (where l.onboarding_stage = 'captured')            as captured,
  count(*) filter (where l.onboarding_stage = 'confirmed')           as confirmed,
  count(*) filter (where l.onboarding_stage = 'verified')            as verified,
  count(*) filter (where l.onboarding_stage = 'assigned')            as assigned,
  count(*) filter (where l.onboarding_stage = 'activated')           as activated,
  count(*) filter (where l.onboarding_stage = 'trained')             as trained,
  count(*) filter (where l.onboarding_stage = 'deployed')            as deployed,
  round(100.0 * count(*) filter (where l.onboarding_stage
        in ('verified','assigned','activated','trained','deployed'))
        / nullif(count(*), 0), 1)                                    as verified_pct
from public.volunteer_leads l
left join public.chapters c on c.id = l.chapter_id
where l.opted_out_at is null
group by coalesce(c.name, 'Unassigned')
order by total desc;

-- ============================================================================
-- 6. AUTO-ASSIGNMENT — a lead always has an owner
-- ============================================================================

create or replace function public.assign_lead_to_chapter()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_chapter uuid;
begin
  if new.chapter_id is null and new.province_code is not null then
    select id into target_chapter
      from public.chapters
     where province_code = new.province_code and is_active
     order by created_at
     limit 1;

    new.chapter_id := target_chapter;
  end if;

  if new.chapter_id is not null and new.assigned_to is null then
    select coordinator_id into new.assigned_to
      from public.chapters where id = new.chapter_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_volunteer_leads_assign on public.volunteer_leads;
create trigger trg_volunteer_leads_assign
  before insert on public.volunteer_leads
  for each row execute function public.assign_lead_to_chapter();

-- ============================================================================
-- 7. LOCK DOWN THE PUBLIC WRITE PATH (H-2, H-3)
-- ============================================================================
-- Everything public now goes through the `submit-lead` Edge Function, which
-- holds the service-role key and applies CAPTCHA, rate limiting, validation,
-- normalisation, de-duplication, and consent logging before it writes.
--
-- Revoking the grant is what actually closes the hole — dropping the policy
-- alone would leave the privilege in place if a permissive policy were ever
-- re-added by accident.

revoke insert on public.volunteer_leads        from anon;
revoke insert on public.form_submissions       from anon;
revoke insert on public.partnership_agreements from anon;
revoke insert on public.consent_log            from anon;

drop policy if exists "anyone can submit a volunteer lead"     on public.volunteer_leads;
drop policy if exists "anyone can submit a pillar cta form"    on public.form_submissions;
drop policy if exists "anyone can sign a partnership agreement" on public.partnership_agreements;
drop policy if exists "anyone can record a consent decision"   on public.consent_log;

-- Reference data stays publicly readable — the forms need it before anyone
-- signs in, and it contains no personal data.
grant select on public.provinces, public.volunteer_interests to anon, authenticated;
grant select on public.chapters                              to anon, authenticated;

grant select on public.coordinator_queue  to authenticated;
grant select on public.onboarding_funnel  to authenticated;

-- ============================================================================
-- 8. RETENTION — political affiliation is sensitive personal information
-- ============================================================================
-- RA 10173 s.3(l): information about an individual's political affiliation is
-- SENSITIVE personal information. Keeping it indefinitely after the campaign
-- is neither necessary nor proportionate. Run this after the election, once
-- the party has decided what it is retaining as a membership register.
--
--   select cron.schedule('purge-lapsed-leads','0 3 * * 0',
--                        $$select public.purge_opted_out_leads()$$);

create or replace function public.purge_opted_out_leads()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  with deleted as (
    delete from public.volunteer_leads
     where opted_out_at is not null
       and opted_out_at < now() - interval '30 days'
    returning 1
  )
  select count(*) into removed from deleted;

  insert into public.audit_log (actor_id, action, target_table, detail)
  values (null, 'leads.purge_opted_out', 'volunteer_leads',
          jsonb_build_object('removed', removed, 'run_at', now()));

  return removed;
end;
$$;

comment on column public.volunteer_leads.phone is
  'E.164 normalised (+639XXXXXXXXX). Primary contact channel — SMS and Messenger reach far more of BARMM than email. SENSITIVE PERSONAL INFORMATION under RA 10173 when combined with party affiliation.';

comment on table public.chapters is
  'Organisational layer between a province and a volunteer. Every lead is auto-assigned to one on insert so no submission is ownerless.';

comment on view public.coordinator_queue is
  'Working view for coordinators. breached_sla flags leads uncontacted after 48 hours.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
