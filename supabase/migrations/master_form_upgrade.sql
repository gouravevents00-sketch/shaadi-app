-- ── Master Form Upgrade Migration ──────────────────────────────────────────
-- Extends celebrations with rich wedding data, adds celebration_functions,
-- celebration_rooms, celebration_room_allotments, celebration_timeline
-- Safe to re-run: all CREATE uses IF NOT EXISTS, policies use DROP IF EXISTS first

-- 1. Extend celebrations with master form fields
ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS bride_name          TEXT,
  ADD COLUMN IF NOT EXISTS groom_name          TEXT,
  ADD COLUMN IF NOT EXISTS end_date            DATE,
  ADD COLUMN IF NOT EXISTS wedding_style       TEXT
                           CHECK (wedding_style IN ('intimate','traditional','destination','simple')),
  ADD COLUMN IF NOT EXISTS requirements        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS managed_by          TEXT DEFAULT 'self'
                           CHECK (managed_by IN ('self','agency','marketplace')),
  ADD COLUMN IF NOT EXISTS guest_count_per_day JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_done     BOOLEAN DEFAULT FALSE;

-- 2. celebration_functions — each ceremony/function on the event
CREATE TABLE IF NOT EXISTS celebration_functions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  date           DATE NOT NULL,
  start_time     TIME,
  end_time       TIME,
  venue_space    TEXT,
  expected_count INTEGER,
  notes          TEXT,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_functions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration functions" ON celebration_functions;
CREATE POLICY "users manage own celebration functions" ON celebration_functions
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 3. celebration_rooms — venue room layout
CREATE TABLE IF NOT EXISTS celebration_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  room_type      TEXT DEFAULT 'double'
                 CHECK (room_type IN ('single','double','suite','family','dormitory','other')),
  capacity       INTEGER NOT NULL DEFAULT 2,
  floor_block    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration rooms" ON celebration_rooms;
CREATE POLICY "users manage own celebration rooms" ON celebration_rooms
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 4. celebration_room_allotments — guest ↔ room mapping
CREATE TABLE IF NOT EXISTS celebration_room_allotments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID REFERENCES celebration_rooms ON DELETE CASCADE NOT NULL,
  guest_id       UUID REFERENCES celebration_guests ON DELETE CASCADE NOT NULL,
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  check_in       DATE,
  check_out      DATE,
  allocated_by   UUID,
  allocated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, guest_id)
);
ALTER TABLE celebration_room_allotments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own room allotments" ON celebration_room_allotments;
CREATE POLICY "users manage own room allotments" ON celebration_room_allotments
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 5. celebration_timeline
CREATE TABLE IF NOT EXISTS celebration_timeline (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  function_id    UUID REFERENCES celebration_functions ON DELETE SET NULL,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ,
  title          TEXT NOT NULL,
  description    TEXT,
  responsible    TEXT,
  status         TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','done','skipped')),
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own celebration timeline" ON celebration_timeline;
CREATE POLICY "users manage own celebration timeline" ON celebration_timeline
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 6. Extend celebration_guests with function attendance + room link
ALTER TABLE celebration_guests
  ADD COLUMN IF NOT EXISTS attending_functions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS check_in_date       DATE,
  ADD COLUMN IF NOT EXISTS check_out_date      DATE,
  ADD COLUMN IF NOT EXISTS room_id             UUID REFERENCES celebration_rooms ON DELETE SET NULL;

-- 7. Add client invite token to weddings
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS client_invite_token    TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS client_celebration_id  UUID REFERENCES celebrations ON DELETE SET NULL;

-- 8. celebration_remarks
CREATE TABLE IF NOT EXISTS celebration_remarks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  user_id        UUID NOT NULL,
  category       TEXT DEFAULT 'general'
                 CHECK (category IN ('general','decor','catering','music','rituals','logistics','other')),
  body           TEXT NOT NULL,
  is_for_agency  BOOLEAN DEFAULT FALSE,
  resolved       BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE celebration_remarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own remarks" ON celebration_remarks;
CREATE POLICY "users manage own remarks" ON celebration_remarks
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- 9. wedding_showflow (Phase 4)
CREATE TABLE IF NOT EXISTS wedding_showflow (
  wedding_id UUID PRIMARY KEY REFERENCES weddings(id) ON DELETE CASCADE,
  cues       JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wedding_showflow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage showflow" ON wedding_showflow;
CREATE POLICY "Company members can manage showflow"
  ON wedding_showflow FOR ALL
  USING (
    wedding_id IN (
      SELECT w.id FROM weddings w
      JOIN company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );
