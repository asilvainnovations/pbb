/*
# PBB Core Database — Volunteer Leads, Sign-ups, and Campaign Events

## Purpose
This migration creates the core database for the Partido Bangon Bangsamoro (PBB)
project. It replaces the current `mailto:` fallback on the public volunteer form
with a real database-backed submission flow, and adds tables for campaign
events and event RSVPs so the public site can list upcoming events and let
supporters register to attend.

## Tables Created

### 1. volunteer_leads
Stores public volunteer sign-ups from the "Join the Movement" form on
home.html. Any visitor can submit; only authenticated staff can read/manage.

- `id` (uuid, PK)
- `full_name` (text, not null) — the volunteer's full name
- `email` (text, not null) — contact email
- `province` (text, not null) — BARMM province or "Outside BARMM"
- `interest` (text, not null) — how they want to help (e.g. "Ground volunteer")
- `source` (text) — where the lead came from (e.g. "bangonbangsamoro.com/#get-involved")
- `status` (text, default 'new') — lead status: new, contacted, joined, archived
- `created_at` (timestamptz, default now())

### 2. events
Campaign events (rallies, town halls, volunteer orientations). Created by
staff; visible to the public.

- `id` (uuid, PK)
- `title` (text, not null)
- `description` (text)
- `event_date` (timestamptz, not null) — when the event takes place
- `location` (text) — venue / city
- `event_type` (text) — e.g. "Rally", "Town Hall", "Orientation"
- `is_published` (boolean, default false) — only published events show on the public site
- `created_by` (uuid, references auth.users) — staff member who created the event
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 3. event_rsvps
Public RSVPs for campaign events. Any visitor can RSVP; only staff can see
the full list.

- `id` (uuid, PK)
- `event_id` (uuid, FK → events, cascade delete)
- `full_name` (text, not null)
- `email` (text, not null)
- `phone` (text, optional)
- `created_at` (timestamptz, default now())

## Security (RLS)

### volunteer_leads
- INSERT: `anon, authenticated` — anyone can submit a volunteer sign-up
- SELECT/UPDATE/DELETE: `authenticated` only — only logged-in staff can view and manage leads

### events
- SELECT: `anon, authenticated` — public can see published events; staff can see all
- INSERT/UPDATE/DELETE: `authenticated` only — only staff can create/edit events

### event_rsvps
- INSERT: `anon, authenticated` — anyone can RSVP
- SELECT/UPDATE/DELETE: `authenticated` only — only staff can see the RSVP list

## Indexes
- `volunteer_leads` on `created_at DESC` (admin list sorted by recency)
- `volunteer_leads` on `status` (filter by new/contacted/joined/archived)
- `events` on `event_date` (upcoming events query)
- `events` on `is_published` (public listing filter)
- `event_rsvps` on `event_id` (look up RSVPs for a specific event)
- `event_rsvps` on `email` (check if someone already RSVP'd)

## Notes
1. The public volunteer form on home.html currently falls back to `mailto:`
   when no in-browser storage is available. This migration provides a real
   backend so submissions persist in the database and staff can manage them
   through the authenticated dashboard.
2. The `volunteer_leads.status` column lets staff track leads through a
   simple pipeline: new → contacted → joined → archived.
3. Events have an `is_published` flag so staff can draft events before
   making them visible on the public site.
*/

-- ============================================================
-- 1. volunteer_leads
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  province text NOT NULL,
  interest text NOT NULL,
  source text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE volunteer_leads ENABLE ROW LEVEL SECURITY;

-- Public can submit volunteer leads
DROP POLICY IF EXISTS "public_insert_volunteer_leads" ON volunteer_leads;
CREATE POLICY "public_insert_volunteer_leads"
  ON volunteer_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated staff can read leads
DROP POLICY IF EXISTS "staff_select_volunteer_leads" ON volunteer_leads;
CREATE POLICY "staff_select_volunteer_leads"
  ON volunteer_leads FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated staff can update lead status
DROP POLICY IF EXISTS "staff_update_volunteer_leads" ON volunteer_leads;
CREATE POLICY "staff_update_volunteer_leads"
  ON volunteer_leads FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Only authenticated staff can delete leads
DROP POLICY IF EXISTS "staff_delete_volunteer_leads" ON volunteer_leads;
CREATE POLICY "staff_delete_volunteer_leads"
  ON volunteer_leads FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_volunteer_leads_created_at
  ON volunteer_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_volunteer_leads_status
  ON volunteer_leads (status);

-- ============================================================
-- 2. events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  event_type text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can see published events; staff can see all
DROP POLICY IF EXISTS "public_select_events" ON events;
CREATE POLICY "public_select_events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Staff can see ALL events (including unpublished) — separate policy
DROP POLICY IF EXISTS "staff_select_all_events" ON events;
CREATE POLICY "staff_select_all_events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- Only staff can create events
DROP POLICY IF EXISTS "staff_insert_events" ON events;
CREATE POLICY "staff_insert_events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only staff can update events
DROP POLICY IF EXISTS "staff_update_events" ON events;
CREATE POLICY "staff_update_events"
  ON events FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Only staff can delete events
DROP POLICY IF EXISTS "staff_delete_events" ON events;
CREATE POLICY "staff_delete_events"
  ON events FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_events_event_date
  ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_published
  ON events (is_published);

-- ============================================================
-- 3. event_rsvps
-- ============================================================
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Public can submit RSVPs
DROP POLICY IF EXISTS "public_insert_event_rsvps" ON event_rsvps;
CREATE POLICY "public_insert_event_rsvps"
  ON event_rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only staff can see RSVPs
DROP POLICY IF EXISTS "staff_select_event_rsvps" ON event_rsvps;
CREATE POLICY "staff_select_event_rsvps"
  ON event_rsvps FOR SELECT
  TO authenticated
  USING (true);

-- Only staff can update RSVPs
DROP POLICY IF EXISTS "staff_update_event_rsvps" ON event_rsvps;
CREATE POLICY "staff_update_event_rsvps"
  ON event_rsvps FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Only staff can delete RSVPs
DROP POLICY IF EXISTS "staff_delete_event_rsvps" ON event_rsvps;
CREATE POLICY "staff_delete_event_rsvps"
  ON event_rsvps FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id
  ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_email
  ON event_rsvps (email);
