-- ── B2C Full Upgrade Migration ─────────────────────────────────────────────
-- Adds: celebration_guests columns, celebration_vendors, celebration_reminders,
--       celebration_members (partner invite), due_date already exists on tasks

-- 1. Extend celebration_guests with richer fields
ALTER TABLE celebration_guests
  ADD COLUMN IF NOT EXISTS email        TEXT,
  ADD COLUMN IF NOT EXISTS is_vip       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS family_group TEXT,
  ADD COLUMN IF NOT EXISTS rsvp_status  TEXT DEFAULT 'pending'
                            CHECK (rsvp_status IN ('pending','confirmed','declined')),
  ADD COLUMN IF NOT EXISTS rsvp_token   TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS arrival_mode TEXT,
  ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flight_no    TEXT,
  ADD COLUMN IF NOT EXISTS needs_pickup BOOLEAN DEFAULT FALSE;

-- 2. celebration_vendors (new table)
CREATE TABLE IF NOT EXISTS celebration_vendors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  category       TEXT NOT NULL,
  name           TEXT NOT NULL,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  total_amount   NUMERIC(12,2) DEFAULT 0,
  advance_paid   NUMERIC(12,2) DEFAULT 0,
  status         TEXT DEFAULT 'enquired'
                 CHECK (status IN ('enquired','confirmed','booked','paid','cancelled')),
  notes          TEXT,
  payment_due    DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration vendors" ON celebration_vendors;
CREATE POLICY "users manage own celebration vendors" ON celebration_vendors
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 3. celebration_members (partner invite — co-planning)
CREATE TABLE IF NOT EXISTS celebration_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role           TEXT DEFAULT 'partner' CHECK (role IN ('owner','partner','viewer')),
  invited_by     UUID,
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (celebration_id, user_id)
);
ALTER TABLE celebration_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members see own records" ON celebration_members;
CREATE POLICY "members see own records" ON celebration_members
  FOR ALL USING (user_id = auth.uid() OR
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid()));

-- 4. celebration_reminders
CREATE TABLE IF NOT EXISTS celebration_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  user_id        UUID NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('task_due','vendor_payment','event_countdown','rsvp_follow','budget_alert','custom')),
  title          TEXT NOT NULL,
  remind_at      TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  ref_id         UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own reminders" ON celebration_reminders;
CREATE POLICY "users manage own reminders" ON celebration_reminders
  FOR ALL USING (user_id = auth.uid());

-- 5. Extend celebration_budget with advance_paid
ALTER TABLE celebration_budget
  ADD COLUMN IF NOT EXISTS advance_paid  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_due   DATE,
  ADD COLUMN IF NOT EXISTS vendor_name   TEXT;

-- 6. Partner invite token on celebrations
ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS partner_invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
