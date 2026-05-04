-- ═══════════════════════════════════════════════════════
-- HOSPITALITY OPS — Room allocation operational fields,
--                   Room status, Guest requests
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── Room Allocations: hospitality checklist per guest ──
ALTER TABLE room_allocations
  ADD COLUMN IF NOT EXISTS id_collected    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_type         text,   -- 'aadhar' | 'passport' | 'driving_license' | 'other'
  ADD COLUMN IF NOT EXISTS id_number       text,
  ADD COLUMN IF NOT EXISTS key_issued      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_issued_at   timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_kit     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_kit_at  timestamptz,
  ADD COLUMN IF NOT EXISTS special_needs   text,
  ADD COLUMN IF NOT EXISTS checked_in_at   timestamptz,
  ADD COLUMN IF NOT EXISTS checked_out_at  timestamptz;

-- ── Rooms: operational status ──────────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS room_status    text NOT NULL DEFAULT 'available',
  -- values: available | occupied | cleaning | blocked | checkout_pending
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- ── Guest Requests: in-stay service requests ───────────
CREATE TABLE IF NOT EXISTS guest_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id   uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id     uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  room_id      uuid REFERENCES rooms(id) ON DELETE SET NULL,
  category     text NOT NULL DEFAULT 'general',
  -- values: housekeeping | food | transport | amenity | medical | general
  description  text NOT NULL,
  priority     text NOT NULL DEFAULT 'normal',
  -- values: low | normal | high | urgent
  status       text NOT NULL DEFAULT 'open',
  -- values: open | in_progress | resolved | cancelled
  assigned_to  uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gr_select" ON guest_requests FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "gr_insert" ON guest_requests FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "gr_update" ON guest_requests FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));

CREATE INDEX IF NOT EXISTS idx_guest_requests_wedding ON guest_requests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_guest  ON guest_requests(guest_id);
