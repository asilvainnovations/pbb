-- ============================================================================
-- PILLAR CTA FORMS — Task 2 (home.html BANGON-section CTAs)
-- Adds backend tables for the three new public-facing forms wired into
-- home.html's pillar sections:
--   B — Basic Services Enhancement  -> form_submissions (form_type: basic_services)
--   A — Accelerate Sustainable Livelihood (Alliance & Partnership placement)
--                                    -> partnership_agreements
--   G — Green Economic Competitiveness (Natural Resources Protection
--       placement — see note below)  -> form_submissions (form_type: environment_volunteer)
--
-- NOT YET APPLIED. This environment has no Supabase connection/credentials,
-- so this file was written but never run. Apply it yourselves via
-- `supabase db push` or the SQL editor in the Supabase dashboard, then set
-- window.PBB_SUPABASE_URL / window.PBB_SUPABASE_ANON_KEY before home.html's
-- new script block so submitToBackend() in home.html posts here instead of
-- falling back to window.storage/mailto.
--
-- Reuses the RLS + consent_log pattern established in
-- 20260811123735_comprehensive_schema.sql's volunteer_leads table: anon can
-- INSERT only, coordinators/admins can SELECT/UPDATE, admins can DELETE.
--
-- Placement note: the attached BANGON-domain mapping names a
-- "Natural Resources Protection" pillar that does not exist as a distinct
-- canonical BANGON letter in home.html (canonical G = "Green Economic
-- Competitiveness", which already carries the Environment & Natural
-- Resources Code / Climate Change Commission Act / Ligawasan Development
-- Authority Act legislative content per home.html's Wing B). The
-- environment-volunteer CTA and this table were placed under G accordingly,
-- per the task's own instruction to follow canonical pillar names.
-- ============================================================================

create type public.form_submission_status as enum (
  'new', 'reviewed', 'actioned', 'archived'
);

create table public.form_submissions (
  id             uuid primary key default uuid_generate_v4(),
  form_type      text not null check (form_type in ('basic_services', 'environment_volunteer')),
  full_name      text not null,
  contact        text not null,              -- phone or email, user's choice
  municipality   text,                       -- basic_services
  barangay_area  text,                       -- environment_volunteer "area"
  mode           text,                       -- basic_services: 'suggest' | 'register'
  payload        jsonb not null default '{}',-- everything else (suggestion text, availability, skills, etc.)
  status         public.form_submission_status not null default 'new',
  assigned_to    uuid references public.staff_profiles(id),
  notes          text,
  consent_id     uuid,
  source         text not null default 'bangonbangsamoro.com',
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_form_submissions_updated_at
  before update on public.form_submissions
  for each row execute function public.set_updated_at();

create index idx_form_submissions_type on public.form_submissions(form_type);
create index idx_form_submissions_status on public.form_submissions(status);
create index idx_form_submissions_submitted on public.form_submissions(submitted_at desc);

alter table public.form_submissions enable row level security;

create policy "anyone can submit a pillar cta form"
  on public.form_submissions for insert
  to anon, authenticated
  with check (true);

create policy "coordinators and admins read form submissions"
  on public.form_submissions for select
  using (public.current_role() in ('admin', 'coordinator'));

create policy "coordinators and admins update form submissions"
  on public.form_submissions for update
  using (public.current_role() in ('admin', 'coordinator'))
  with check (public.current_role() in ('admin', 'coordinator'));

create policy "admins delete form submissions"
  on public.form_submissions for delete
  using (public.is_admin());

-- ============================================================================
-- ALLIANCE & PARTNERSHIP AGREEMENTS (e-signature flow)
-- ============================================================================
-- Distinct from form_submissions because it carries a legally-relevant
-- artifact (the signed agreement text + typed e-signature + version), not
-- just a lead. Keep the agreement TEXT immutable once signed — do not
-- UPDATE agreement_text or signature_name after insert; if terms change,
-- publish a new agreement_version and require re-signing.

create table public.partnership_agreements (
  id                 uuid primary key default uuid_generate_v4(),
  org_or_individual  text not null,
  contact_name       text not null,
  email              text not null,
  phone              text,
  partnership_type   text,
  agreement_version  text not null default 'v1-2026-08',
  agreement_text     text not null,          -- full text shown at signing time, snapshotted
  signature_name     text not null,          -- typed full legal name
  signed_at          timestamptz not null default now(),
  status             public.form_submission_status not null default 'new',
  assigned_to        uuid references public.staff_profiles(id),
  notes              text,
  consent_id         uuid,
  source             text not null default 'bangonbangsamoro.com',
  updated_at         timestamptz not null default now()
);

create trigger trg_partnership_agreements_updated_at
  before update on public.partnership_agreements
  for each row execute function public.set_updated_at();

create index idx_partnership_agreements_signed on public.partnership_agreements(signed_at desc);

alter table public.partnership_agreements enable row level security;

create policy "anyone can sign a partnership agreement"
  on public.partnership_agreements for insert
  to anon, authenticated
  with check (true);

create policy "coordinators and admins read partnership agreements"
  on public.partnership_agreements for select
  using (public.current_role() in ('admin', 'coordinator'));

-- Deliberately no UPDATE policy for coordinators on agreement_text/signature_name —
-- a signed agreement should not be editable through the client. Admins may
-- still update operational fields (status, notes, assigned_to) if needed.
create policy "admins update partnership agreement operational fields"
  on public.partnership_agreements for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete partnership agreements"
  on public.partnership_agreements for delete
  using (public.is_admin());
