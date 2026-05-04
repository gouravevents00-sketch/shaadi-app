-- ═══════════════════════════════════════════════════════
-- OPS UPGRADES — Vendor check-in, Event live status,
--                Staff check-ins, F&B served tracking
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── Vendors: on-day check-in tracking ──────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS checkin_status  text NOT NULL DEFAULT 'expected',
  -- values: expected | arrived | no_show | left
  ADD COLUMN IF NOT EXISTS arrived_at      timestamptz,
  ADD COLUMN IF NOT EXISTS left_at         timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_notes   text;

-- ── Events: live day status ─────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS live_status   text NOT NULL DEFAULT 'upcoming',
  -- values: upcoming | setup | live | done | delayed | cancelled
  ADD COLUMN IF NOT EXISTS delay_mins    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ops_notes     text;

-- ── F&B Counts: served tracking ────────────────────────
ALTER TABLE fb_counts
  ADD COLUMN IF NOT EXISTS veg_served     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_veg_served integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jain_served    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_served   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wastage_notes  text;

-- ── Staff check-ins (on-day attendance) ─────────────────
CREATE TABLE IF NOT EXISTS staff_checkins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id   uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  -- for freelancers / external staff who may not have accounts
  staff_name   text,
  staff_phone  text,
  role         text NOT NULL DEFAULT 'coordinator',
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  notes          text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select" ON staff_checkins FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "sc_insert" ON staff_checkins FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "sc_update" ON staff_checkins FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));

CREATE INDEX IF NOT EXISTS idx_staff_checkins_wedding ON staff_checkins(wedding_id);
