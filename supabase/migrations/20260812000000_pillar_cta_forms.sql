-- ============================================================================
-- PILLAR CTA FORMS — home.html BANGON-section CTAs
-- ----------------------------------------------------------------------------
-- Adds backend tables for the three public-facing forms wired into
-- home.html's pillar sections:
--   B — Basic Services Enhancement          -> form_submissions (basic_services)
--   A — Alliance Building & Partnerships    -> partnership_agreements
--   G — Green Economic Competitiveness      -> form_submissions (environment_volunteer)
--
-- Reuses the RLS + consent_log pattern established in
-- 20260811123735_comprehensive_schema.sql's volunteer_leads table.
--
-- CHANGELOG 2026-08-13 (audit finding C-5):
--   * Added the section 4 GRANT block. The original revision defined RLS
--     policies but shipped no grants at all. RLS only ever NARROWS an
--     existing privilege — it never confers one — so on any project not
--     relying on Supabase's implicit default grants, every INSERT from the
--     public form failed with "permission denied for table form_submissions".
--     This restores parity with migration 20260811123735, which documents the
--     same rule at its own section 7.
--   * Added `if not exists` / `do $$ ... $$` guards so the file is idempotent
--     and safe to re-run against a partially-applied database.
--   * Added a foreign key from consent_id -> consent_log(id). It was declared
--     as a bare uuid, so a consent reference could point at nothing (H-10).
--   * Added an index on partnership_agreements(lower(email)) — the coordinator
--     queue looks partners up by e-mail and would otherwise seq-scan.
--
-- NOTE: as of 2026-08-13 the anon INSERT policies below are superseded by
-- migration 20260813000000, which revokes public write access and routes all
-- submissions through the `submit-lead` Edge Function (CAPTCHA + rate limit).
-- They are left intact here so this migration remains correct in isolation
-- and so the history reads honestly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FORM SUBMISSIONS (Basic Services + Environment Volunteer)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'form_submission_status') then
    create type public.form_submission_status as enum (
      'new', 'reviewed', 'actioned', 'archived'
    );
  end if;
end
$$;

create table if not exists public.form_submissions (
  id             uuid primary key default uuid_generate_v4(),
  form_type      text not null check (form_type in ('basic_services', 'environment_volunteer')),
  full_name      text not null,
  contact        text not null,              -- phone or email, submitter's choice
  municipality   text,                       -- basic_services
  barangay_area  text,                       -- environment_volunteer "area"
  mode           text,                       -- basic_services: 'suggest' | 'register'
  payload        jsonb not null default '{}',-- suggestion text, availability, skills, age
  status         public.form_submission_status not null default 'new',
  assigned_to    uuid references public.staff_profiles(id),
  notes          text,
  consent_id     uuid references public.consent_log(id) on delete set null,
  source         text not null default 'bangonbangsamoro.com',
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_form_submissions_updated_at on public.form_submissions;
create trigger trg_form_submissions_updated_at
  before update on public.form_submissions
  for each row execute function public.set_updated_at();

create index if not exists idx_form_submissions_type
  on public.form_submissions(form_type);
create index if not exists idx_form_submissions_status
  on public.form_submissions(status);
create index if not exists idx_form_submissions_submitted
  on public.form_submissions(submitted_at desc);
create index if not exists idx_form_submissions_assigned
  on public.form_submissions(assigned_to);

alter table public.form_submissions enable row level security;

drop policy if exists "anyone can submit a pillar cta form" on public.form_submissions;
create policy "anyone can submit a pillar cta form"
  on public.form_submissions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "coordinators and admins read form submissions" on public.form_submissions;
create policy "coordinators and admins read form submissions"
  on public.form_submissions for select
  to authenticated
  using (public.current_role() in ('admin', 'coordinator'));

drop policy if exists "coordinators and admins update form submissions" on public.form_submissions;
create policy "coordinators and admins update form submissions"
  on public.form_submissions for update
  to authenticated
  using (public.current_role() in ('admin', 'coordinator'))
  with check (public.current_role() in ('admin', 'coordinator'));

drop policy if exists "admins delete form submissions" on public.form_submissions;
create policy "admins delete form submissions"
  on public.form_submissions for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. ALLIANCE & PARTNERSHIP AGREEMENTS (e-signature flow)
-- ----------------------------------------------------------------------------
-- Distinct from form_submissions because it carries a legally-relevant
-- artifact (the signed agreement text + typed e-signature + version), not
-- just a lead. The agreement TEXT is immutable once signed — enforced below
-- by a trigger, not merely by convention. If terms change, publish a new
-- agreement_version and require re-signing.

create table if not exists public.partnership_agreements (
  id                 uuid primary key default uuid_generate_v4(),
  org_or_individual  text not null,
  contact_name       text not null,
  email              text not null,
  phone              text,
  partnership_type   text,
  agreement_version  text not null default 'v1-2026-08',
  agreement_text     text not null,          -- full text shown at signing time, snapshotted
  signature_name     text not null,          -- typed full legal name (RA 8792)
  signed_at          timestamptz not null default now(),
  status             public.form_submission_status not null default 'new',
  assigned_to        uuid references public.staff_profiles(id),
  notes              text,
  consent_id         uuid references public.consent_log(id) on delete set null,
  source             text not null default 'bangonbangsamoro.com',
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_partnership_agreements_updated_at on public.partnership_agreements;
create trigger trg_partnership_agreements_updated_at
  before update on public.partnership_agreements
  for each row execute function public.set_updated_at();

-- Hard-enforce immutability of the signed artifact. The original revision
-- relied on "deliberately no UPDATE policy for coordinators", which protects
-- the client path but not a service-role job or a psql session.
create or replace function public.freeze_signed_agreement()
returns trigger language plpgsql as $$
begin
  if new.agreement_text  is distinct from old.agreement_text
  or new.signature_name  is distinct from old.signature_name
  or new.agreement_version is distinct from old.agreement_version
  or new.signed_at       is distinct from old.signed_at then
    raise exception
      'partnership_agreements: signed fields are immutable (id=%). Publish a new agreement_version and re-sign instead.',
      old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partnership_agreements_freeze on public.partnership_agreements;
create trigger trg_partnership_agreements_freeze
  before update on public.partnership_agreements
  for each row execute function public.freeze_signed_agreement();

create index if not exists idx_partnership_agreements_signed
  on public.partnership_agreements(signed_at desc);
create index if not exists idx_partnership_agreements_email
  on public.partnership_agreements(lower(email));

alter table public.partnership_agreements enable row level security;

drop policy if exists "anyone can sign a partnership agreement" on public.partnership_agreements;
create policy "anyone can sign a partnership agreement"
  on public.partnership_agreements for insert
  to anon, authenticated
  with check (true);

drop policy if exists "coordinators and admins read partnership agreements" on public.partnership_agreements;
create policy "coordinators and admins read partnership agreements"
  on public.partnership_agreements for select
  to authenticated
  using (public.current_role() in ('admin', 'coordinator'));

-- Admins may update operational fields (status, notes, assigned_to) only —
-- the freeze trigger above rejects any attempt to touch the signed fields.
drop policy if exists "admins update partnership agreement operational fields" on public.partnership_agreements;
create policy "admins update partnership agreement operational fields"
  on public.partnership_agreements for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete partnership agreements" on public.partnership_agreements;
create policy "admins delete partnership agreements"
  on public.partnership_agreements for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION HELPER — surface new submissions to the coordinator queue
-- ----------------------------------------------------------------------------

create or replace view public.pillar_submission_queue as
select
  s.id,
  s.form_type,
  s.full_name,
  s.contact,
  coalesce(s.municipality, s.barangay_area) as location,
  s.status,
  s.assigned_to,
  s.submitted_at,
  now() - s.submitted_at                                   as age,
  (now() - s.submitted_at > interval '48 hours'
   and s.status = 'new')                                   as breached_sla
from public.form_submissions s;

-- ============================================================================
-- 4. EXPLICIT GRANTS  ← the block missing from the original revision
-- ============================================================================
-- RLS policies NARROW access that a GRANT already permits — they never grant
-- anything on their own. Supabase's dashboard applies broad default grants to
-- `anon`/`authenticated` for tables created through its UI, which makes a
-- schema silently dependent on that platform behaviour. Being explicit here
-- means this migration is correct on its own, on any Postgres 15+ instance.

grant usage on schema public to anon, authenticated;

-- Public forms: anon may only INSERT. Reading is staff-only and enforced by
-- the RLS policies above; `authenticated` still needs the SQL-level SELECT/
-- UPDATE grant in order to reach the RLS check at all.
grant insert                         on public.form_submissions       to anon, authenticated;
grant select, update, delete         on public.form_submissions       to authenticated;

grant insert                         on public.partnership_agreements to anon, authenticated;
grant select, update, delete         on public.partnership_agreements to authenticated;

grant select                         on public.pillar_submission_queue to authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
