-- ============================================================================
-- PARTIDO BANGON BANGSAMORO — PLATFORM DATABASE SCHEMA
-- Target: PostgreSQL 15+ on Supabase (uses auth.users, auth.uid(), auth.jwt())
--
-- If you are NOT on Supabase: replace every `auth.uid()` with your own
-- session-user function, and create your own `users` table in place of
-- Supabase's built-in `auth.users` — the RLS logic itself is standard
-- Postgres and will work unchanged.
--
-- Five domains, in dependency order:
--   1. Roles & staff profiles       (who can do what)
--   2. Reference data                (provinces, volunteer interests)
--   3. Volunteer leads                (public sign-up form -> real backend)
--   4. Campaign content                (BANGON platform, legislative wings,
--                                        roadmap horizons — currently
--                                        hardcoded in home.html; modeled here
--                                        so it CAN move to a CMS later)
--   5. ACAPS / INFORM risk data        (the dashboard's actual subject matter)
--   6. Consent & audit                 (cookie/privacy compliance trail,
--                                        admin action log)
--
-- Every table has RLS enabled with no default-allow policy — access is
-- opt-in per table, per operation, per role. Nothing is world-writable.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- 0. SHARED HELPERS
-- ============================================================================

-- updated_at auto-touch, reused by every table below
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. ROLES & STAFF PROFILES
-- ============================================================================
-- Assumption from the codebase: `contexts/Auth.tsx` handles "is this person
-- allowed into INFORM at all" (login), while `contexts/ACAPSContext.tsx`
-- separately holds *data-source* config (ACAPS API credentials, mock-data
-- toggle). This schema keeps that same separation: `staff_profiles` is the
-- identity/role side; `acaps_connections` (section 5) is the data-source side.

create type public.app_role as enum (
  'admin',            -- full access: manage staff, content, view all leads, audit log
  'coordinator',       -- manage volunteer leads, view dashboard, no staff management
  'analyst',            -- view/edit ACAPS dashboard data, cannot see leads
  'viewer'               -- read-only dashboard access (e.g. field staff, press)
);

create table public.staff_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  role            public.app_role not null default 'viewer',
  province        text,                    -- optional: coordinator's assigned area
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_staff_profiles_updated_at
  before update on public.staff_profiles
  for each row execute function public.set_updated_at();

-- Helper: current user's role, null if not staff / not signed in.
-- SECURITY DEFINER so it can read staff_profiles even under a caller whose
-- own RLS policy on staff_profiles wouldn't otherwise let them see the row.
create or replace function public.current_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.staff_profiles
  where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.current_role() is not null;
$$;

alter table public.staff_profiles enable row level security;

-- Staff can read their own profile; admins can read everyone's.
create policy "staff read own profile"
  on public.staff_profiles for select
  using (id = auth.uid() or public.is_admin());

-- Only admins create/modify/deactivate staff accounts.
create policy "admins manage staff profiles"
  on public.staff_profiles for insert
  with check (public.is_admin());

create policy "admins update staff profiles"
  on public.staff_profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins deactivate staff (soft delete via is_active)"
  on public.staff_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- 2. REFERENCE DATA
-- ============================================================================
-- Lookup tables for the volunteer form's fixed option lists — matches the
-- <select> options in home.html exactly, kept in the DB (rather than
-- hardcoded HTML) so new provinces/interests don't require a redeploy.

create table public.provinces (
  code    text primary key,     -- e.g. 'maguindanao_norte'
  label   text not null,        -- e.g. 'Maguindanao del Norte'
  sort_order integer not null default 0
);

insert into public.provinces (code, label, sort_order) values
  ('maguindanao_norte', 'Maguindanao del Norte', 1),
  ('maguindanao_sur',   'Maguindanao del Sur',   2),
  ('lanao_del_sur',     'Lanao del Sur',         3),
  ('basilan',           'Basilan',               4),
  ('tawi_tawi',         'Tawi-Tawi',             5),
  ('sga_cotabato',      'Special Geographic Area (North Cotabato)', 6),
  ('outside_barmm',     'Outside BARMM',         7)
on conflict (code) do nothing;

create table public.volunteer_interests (
  code    text primary key,     -- e.g. 'ground_volunteer'
  label   text not null,
  sort_order integer not null default 0
);

insert into public.volunteer_interests (code, label, sort_order) values
  ('ground_volunteer',    'Ground / precinct volunteer',                 1),
  ('sectoral_organizing',  'Sectoral organizing (youth, professionals)',  2),
  ('digital_comms',         'Digital and communications',                 3),
  ('donate_resources',       'Donate resources',                           4)
on conflict (code) do nothing;

alter table public.provinces enable row level security;
alter table public.volunteer_interests enable row level security;

-- Reference data is public read (the form needs it before anyone signs in),
-- write restricted to admins.
create policy "anyone can read provinces"
  on public.provinces for select using (true);
create policy "admins manage provinces"
  on public.provinces for all
  using (public.is_admin()) with check (public.is_admin());

create policy "anyone can read volunteer interests"
  on public.volunteer_interests for select using (true);
create policy "admins manage volunteer interests"
  on public.volunteer_interests for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 3. VOLUNTEER LEADS
-- ============================================================================
-- Real backend for the "Sign up to volunteer" form (home.html currently
-- falls back to window.storage/mailto — this is what that form should POST
-- to instead once wired to a real API).

create type public.lead_status as enum (
  'new', 'contacted', 'confirmed', 'inactive', 'do_not_contact'
);

create table public.volunteer_leads (
  id             uuid primary key default uuid_generate_v4(),
  full_name      text not null,
  email          text not null,
  province_code  text references public.provinces(code),
  interest_code  text references public.volunteer_interests(code),
  status         public.lead_status not null default 'new',
  source         text not null default 'bangonbangsamoro.com/#get-involved',
  assigned_to    uuid references public.staff_profiles(id),
  notes          text,
  consent_id     uuid,   -- optional link to consent_log (section 6) at time of submission
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_volunteer_leads_updated_at
  before update on public.volunteer_leads
  for each row execute function public.set_updated_at();

create index idx_volunteer_leads_status on public.volunteer_leads(status);
create index idx_volunteer_leads_province on public.volunteer_leads(province_code);
create index idx_volunteer_leads_assigned on public.volunteer_leads(assigned_to);
create index idx_volunteer_leads_submitted on public.volunteer_leads(submitted_at desc);

alter table public.volunteer_leads enable row level security;

-- Anonymous public visitors can INSERT (submit the form) but never read,
-- update, or delete leads — this is the load-bearing policy that lets the
-- public form work without exposing anyone else's submitted data.
create policy "anyone can submit a volunteer lead"
  on public.volunteer_leads for insert
  to anon, authenticated
  with check (true);

-- Only coordinators+ can see submitted leads (matches the "Lead admin"
-- panel in home.html, which should move behind real auth rather than a
-- client-side hash trigger once this is wired up).
create policy "coordinators and admins read leads"
  on public.volunteer_leads for select
  using (public.current_role() in ('admin', 'coordinator'));

create policy "coordinators and admins update leads"
  on public.volunteer_leads for update
  using (public.current_role() in ('admin', 'coordinator'))
  with check (public.current_role() in ('admin', 'coordinator'));

-- Deletion (e.g. honoring a "remove my data" request) restricted to admins.
create policy "admins delete leads"
  on public.volunteer_leads for delete
  using (public.is_admin());

-- ============================================================================
-- 4. CAMPAIGN CONTENT
-- ============================================================================
-- Currently hardcoded directly into home.html (the six BANGON pillars, the
-- three legislative wings, the three roadmap horizons). Modeled here so
-- that content CAN move out of static HTML into a CMS-editable table
-- without changing the public site's information architecture. Optional to
-- adopt immediately — the public site works fine reading from HTML until
-- you're ready to wire it to these tables.

create table public.platform_pillars (
  id              uuid primary key default uuid_generate_v4(),
  letter          char(1) not null,          -- B A N G O N
  sort_order      integer not null,
  eyebrow         text not null,             -- e.g. 'Basic Services Enhancement'
  headline        text not null,             -- e.g. 'Services that reach every household'
  bullets         text[] not null default '{}',
  is_published    boolean not null default true,
  updated_at      timestamptz not null default now()
);

create table public.legislative_bills (
  id              uuid primary key default uuid_generate_v4(),
  wing            text not null check (wing in ('A', 'B', 'C')),
  wing_label      text not null,             -- e.g. 'Foundational Services & Livelihood'
  bill_name       text not null,             -- e.g. 'Super Health Stations Act'
  sort_order      integer not null default 0,
  is_published    boolean not null default true,
  updated_at      timestamptz not null default now()
);

create table public.roadmap_horizons (
  id              uuid primary key default uuid_generate_v4(),
  horizon_number  integer not null check (horizon_number between 1 and 3),
  label           text not null,             -- e.g. 'Horizon 1 · Current'
  title           text not null,             -- e.g. 'The Foundation'
  description     text not null,
  is_current      boolean not null default false,
  is_published    boolean not null default true,
  updated_at      timestamptz not null default now()
);

create trigger trg_pillars_updated_at before update on public.platform_pillars
  for each row execute function public.set_updated_at();
create trigger trg_bills_updated_at before update on public.legislative_bills
  for each row execute function public.set_updated_at();
create trigger trg_horizons_updated_at before update on public.roadmap_horizons
  for each row execute function public.set_updated_at();

alter table public.platform_pillars enable row level security;
alter table public.legislative_bills enable row level security;
alter table public.roadmap_horizons enable row level security;

-- Public read for published content (this is what the marketing site shows
-- anonymous visitors); staff see everything including drafts; only admins edit.
create policy "public reads published pillars"
  on public.platform_pillars for select
  using (is_published or public.is_staff());
create policy "admins manage pillars"
  on public.platform_pillars for all
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads published bills"
  on public.legislative_bills for select
  using (is_published or public.is_staff());
create policy "admins manage bills"
  on public.legislative_bills for all
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads published horizons"
  on public.roadmap_horizons for select
  using (is_published or public.is_staff());
create policy "admins manage horizons"
  on public.roadmap_horizons for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 5. ACAPS / INFORM RISK DATA
-- ============================================================================
-- Field choices below come directly from two places in your code:
--   - tailwind.config.js's `acaps` color tokens (severity, impact,
--     conditions, complexity, reliability, access, riskHigh/Medium/Low,
--     exposure, intensity, vulnerability, capacity) — these ARE your
--     methodology's actual dimensions, not decoration.
--   - the risk-assessment object Dashboard.tsx builds from live API data:
--     hazardId, hazardName, hazardCategory, barmmRelevant, impact{exposure,
--     intensity, vulnerability, capacity}, compositeImpact, impactLevel,
--     probabilityScore, probabilityPct, riskScore, riskLevel, indicators,
--     monitoringStatus, lastReviewed.
-- Everything else (column widths, exact numeric precision) is a reasonable
-- default — adjust to match types/acaps.ts exactly once you're ready to
-- wire the dashboard to a real table instead of the ACAPS API / realData.ts.

create type public.risk_level as enum ('Low', 'Medium', 'High');
create type public.impact_level as enum ('MINOR', 'MODERATE', 'SIGNIFICANT', 'MAJOR', 'EXTREME');

-- One row per data pull, so severity/risk history stays queryable over time
-- (Dashboard.tsx fetches monthly severity history for the timeline chart).
create table public.data_snapshots (
  id             uuid primary key default uuid_generate_v4(),
  source         text not null,          -- 'ACAPS_API' | 'MOCK' | 'MANUAL'
  snapshot_date  date not null,
  fetched_at     timestamptz not null default now(),
  fetched_by     uuid references public.staff_profiles(id),
  notes          text
);

create table public.severity_records (
  id              uuid primary key default uuid_generate_v4(),
  snapshot_id     uuid not null references public.data_snapshots(id) on delete cascade,
  region          text not null default 'BARMM',
  record_date     date not null,
  severity        numeric(4,2),           -- INFORM Severity Index score
  impact          numeric(4,2),
  conditions      numeric(4,2),
  complexity      numeric(4,2),
  reliability     numeric(4,2),
  access          numeric(4,2),
  created_at      timestamptz not null default now()
);

create table public.risk_records (
  id                uuid primary key default uuid_generate_v4(),
  snapshot_id       uuid not null references public.data_snapshots(id) on delete cascade,
  risk_id           text not null,          -- upstream ACAPS risk identifier
  risk_description  text not null,
  risk_type         text,
  barmm_relevant    boolean not null default false,
  risk_level        public.risk_level,
  created_at        timestamptz not null default now()
);

create table public.access_constraints (
  id              uuid primary key default uuid_generate_v4(),
  snapshot_id     uuid not null references public.data_snapshots(id) on delete cascade,
  constraint_type text not null,          -- e.g. 'Physical', 'Bureaucratic', 'Security'
  description     text,
  severity        numeric(4,2),
  location        text,
  created_at      timestamptz not null default now()
);

create table public.protection_risks (
  id              uuid primary key default uuid_generate_v4(),
  snapshot_id     uuid not null references public.data_snapshots(id) on delete cascade,
  risk_category   text not null,
  description     text,
  severity        numeric(4,2),
  affected_group  text,                   -- e.g. 'IDPs', 'children', 'women'
  location        text,
  created_at      timestamptz not null default now()
);

create table public.daily_events (
  id              uuid primary key default uuid_generate_v4(),
  snapshot_id     uuid references public.data_snapshots(id) on delete set null,
  event_date      date not null,
  event_type      text not null,
  description     text,
  location        text,
  fatalities      integer default 0,
  created_at      timestamptz not null default now()
);

create table public.risk_assessments (
  id                  uuid primary key default uuid_generate_v4(),
  snapshot_id         uuid not null references public.data_snapshots(id) on delete cascade,
  hazard_id           text not null,
  hazard_name         text not null,
  hazard_category     text,
  barmm_relevant      boolean not null default false,
  exposure            numeric(4,2),
  intensity           numeric(4,2),
  vulnerability       numeric(4,2),
  capacity            numeric(4,2),
  composite_impact    numeric(4,2),
  impact_level        public.impact_level,
  probability_score   numeric(4,2),
  probability_pct     numeric(5,2),
  risk_score          numeric(5,2),
  risk_level          public.risk_level,
  indicators          jsonb not null default '[]'::jsonb,
  monitoring_status   text default 'Active',
  last_reviewed       date,
  created_at          timestamptz not null default now()
);

create index idx_severity_snapshot on public.severity_records(snapshot_id);
create index idx_risk_snapshot on public.risk_records(snapshot_id);
create index idx_access_snapshot on public.access_constraints(snapshot_id);
create index idx_protection_snapshot on public.protection_risks(snapshot_id);
create index idx_daily_events_date on public.daily_events(event_date desc);
create index idx_assessments_snapshot on public.risk_assessments(snapshot_id);
create index idx_assessments_risk_level on public.risk_assessments(risk_level);

alter table public.data_snapshots enable row level security;
alter table public.severity_records enable row level security;
alter table public.risk_records enable row level security;
alter table public.access_constraints enable row level security;
alter table public.protection_risks enable row level security;
alter table public.daily_events enable row level security;
alter table public.risk_assessments enable row level security;

-- The dashboard is behind sign-in in the app already (App.tsx gates on
-- isAuthenticated), so mirror that here: any signed-in staff member can
-- VIEW the risk data (that's the whole point of the dashboard), but only
-- analysts/admins can write to it — normal viewers/coordinators shouldn't
-- be able to edit conflict data.
create policy "staff view data snapshots" on public.data_snapshots for select using (public.is_staff());
create policy "analysts write data snapshots" on public.data_snapshots for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update data snapshots" on public.data_snapshots for update
  using (public.current_role() in ('admin', 'analyst'))
  with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete data snapshots" on public.data_snapshots for delete
  using (public.is_admin());

-- Same read/write pattern, repeated per table (Postgres RLS has no
-- table-group shorthand — each table needs its own policies).
create policy "staff view severity" on public.severity_records for select using (public.is_staff());
create policy "analysts write severity" on public.severity_records for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update severity" on public.severity_records for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete severity" on public.severity_records for delete using (public.is_admin());

create policy "staff view risk records" on public.risk_records for select using (public.is_staff());
create policy "analysts write risk records" on public.risk_records for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update risk records" on public.risk_records for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete risk records" on public.risk_records for delete using (public.is_admin());

create policy "staff view access constraints" on public.access_constraints for select using (public.is_staff());
create policy "analysts write access constraints" on public.access_constraints for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update access constraints" on public.access_constraints for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete access constraints" on public.access_constraints for delete using (public.is_admin());

create policy "staff view protection risks" on public.protection_risks for select using (public.is_staff());
create policy "analysts write protection risks" on public.protection_risks for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update protection risks" on public.protection_risks for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete protection risks" on public.protection_risks for delete using (public.is_admin());

create policy "staff view daily events" on public.daily_events for select using (public.is_staff());
create policy "analysts write daily events" on public.daily_events for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update daily events" on public.daily_events for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete daily events" on public.daily_events for delete using (public.is_admin());

create policy "staff view risk assessments" on public.risk_assessments for select using (public.is_staff());
create policy "analysts write risk assessments" on public.risk_assessments for insert
  with check (public.current_role() in ('admin', 'analyst'));
create policy "analysts update risk assessments" on public.risk_assessments for update
  using (public.current_role() in ('admin', 'analyst')) with check (public.current_role() in ('admin', 'analyst'));
create policy "admins delete risk assessments" on public.risk_assessments for delete using (public.is_admin());

-- ---- ACAPS API credentials -------------------------------------------------
-- This is the sensitive one: ACAPSContext.setConfig() currently holds a raw
-- username/password in React state for calling the ACAPS API. That should
-- never be a database table in plaintext. If credentials need to persist
-- server-side at all (e.g. for a scheduled sync job), store only a
-- server-encrypted token, never the password itself, and restrict it to
-- literally nobody via the client — only a service-role backend job reads it.

create table public.acaps_connections (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references public.staff_profiles(id) on delete cascade,
  acaps_username    text not null,
  encrypted_token   bytea not null,        -- store via pgsodium/pgcrypto, never plaintext
  base_url          text not null default '/api/acaps',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_acaps_connections_updated_at
  before update on public.acaps_connections
  for each row execute function public.set_updated_at();

alter table public.acaps_connections enable row level security;

-- No SELECT policy for regular clients at all — this table is intended to
-- be read only by a service-role backend job, never by the browser client,
-- even for its own owner. The one exception: an owner can see THAT a
-- connection exists (for UI state) but not the token itself — handled by
-- excluding encrypted_token from any view/select the client is allowed,
-- not by RLS (RLS is row-level, not column-level). If you need the client
-- to know connection status, expose it through a narrow view instead:
--
--   create view public.acaps_connection_status as
--     select owner_id, base_url, is_active, updated_at from public.acaps_connections;
--
-- and grant RLS-protected select on that view to the owner only.
create policy "owners manage their own connection row (insert)"
  on public.acaps_connections for insert
  with check (owner_id = auth.uid());
create policy "owners update their own connection row"
  on public.acaps_connections for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete their own connection row"
  on public.acaps_connections for delete
  using (owner_id = auth.uid());
-- Deliberately no SELECT policy — see comment above.

-- ============================================================================
-- 6. CONSENT & AUDIT
-- ============================================================================
-- The cookie/accessibility widget (assets/site-widgets.js) currently stores
-- consent choices in localStorage only — genuinely fine for the choice
-- itself, but if you want a server-side compliance record of *when and what*
-- someone consented to (useful if ever asked to demonstrate DPA compliance),
-- log it here. Anonymous-friendly: no personal identifier required.

create table public.consent_log (
  id              uuid primary key default uuid_generate_v4(),
  session_ref     text,                    -- client-generated random id, NOT a user identity
  essential       boolean not null default true,
  analytics       boolean not null default false,
  marketing       boolean not null default false,
  decided_at      timestamptz not null default now(),
  ip_hash         text                     -- store a salted hash if at all, never raw IP
);

alter table public.consent_log enable row level security;

-- Anyone can log their own consent decision; nobody (not even staff, by
-- default) can read this table through the client — it's a write-only
-- audit trail from the browser's perspective. Query it via the Supabase
-- dashboard / service role for compliance reporting, not through the app.
create policy "anyone can record a consent decision"
  on public.consent_log for insert
  to anon, authenticated
  with check (true);
create policy "only admins read consent log"
  on public.consent_log for select
  using (public.is_admin());

-- ---- General admin action audit trail --------------------------------------
-- For accountability on the sensitive stuff: who exported the leads list,
-- who changed a staff role, who edited published campaign content.

create table public.audit_log (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid references public.staff_profiles(id),
  action        text not null,            -- e.g. 'leads.export_csv', 'staff.role_change'
  target_table  text,
  target_id     uuid,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index idx_audit_log_actor on public.audit_log(actor_id);
create index idx_audit_log_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

-- Any signed-in staff member can WRITE an audit entry for their own
-- actions (the app calls this after e.g. a CSV export); nobody can alter
-- history; only admins can read the log.
create policy "staff can log their own actions"
  on public.audit_log for insert
  with check (actor_id = auth.uid());
create policy "only admins read audit log"
  on public.audit_log for select
  using (public.is_admin());
-- No update/delete policy for anyone — audit trails should be append-only.

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- ============================================================================
-- 7. EXPLICIT GRANTS
-- ============================================================================
-- IMPORTANT: RLS policies only NARROW access that a GRANT already permits —
-- they don't grant anything by themselves. Supabase's dashboard sets up
-- broad default grants for `anon`/`authenticated` on every `public` table
-- automatically, which can make a schema silently dependent on that
-- platform behavior. Being explicit here means this schema is correct on
-- its own, whether or not those defaults are in place.
--
-- The pattern: grant the SQL-level privilege broadly per role, then let the
-- RLS policies above do the actual row-level narrowing. A role granted
-- INSERT here can still only insert rows that pass its RLS policy; a role
-- granted SELECT can still only see rows its RLS policy allows.

grant usage on schema public to anon, authenticated;

-- Public reference + content tables: anyone can read.
grant select on public.provinces, public.volunteer_interests to anon, authenticated;
grant select on public.platform_pillars, public.legislative_bills, public.roadmap_horizons
  to anon, authenticated;

-- Volunteer leads: anon can only INSERT (the public form); reading is
-- staff-only and enforced entirely by the RLS policy, not by omitting the
-- grant — authenticated needs SELECT/UPDATE granted so staff members
-- (who sign in and therefore hold the `authenticated` role) can pass
-- through to the RLS check at all.
grant insert on public.volunteer_leads to anon, authenticated;
grant select, update, delete on public.volunteer_leads to authenticated;

-- Consent log: anyone can insert their own consent record; only staff
-- (narrowed to admins by RLS) can ever select.
grant insert on public.consent_log to anon, authenticated;
grant select on public.consent_log to authenticated;

-- Everything staff-only (profiles, ACAPS data domain, connections, audit
-- log) is granted to `authenticated` only — anonymous visitors get no
-- grant at all here, so there's no RLS policy to even evaluate for them.
grant select, insert, update, delete on public.staff_profiles to authenticated;
grant select, insert, update, delete on public.data_snapshots to authenticated;
grant select, insert, update, delete on public.severity_records to authenticated;
grant select, insert, update, delete on public.risk_records to authenticated;
grant select, insert, update, delete on public.access_constraints to authenticated;
grant select, insert, update, delete on public.protection_risks to authenticated;
grant select, insert, update, delete on public.daily_events to authenticated;
grant select, insert, update, delete on public.risk_assessments to authenticated;
grant select, insert, update, delete on public.acaps_connections to authenticated;
grant insert, select on public.audit_log to authenticated;

-- Sequences/UUID defaults don't need explicit grants under uuid_generate_v4()
-- or gen_random_uuid() — both are function calls, not sequence nextval().
