-- Guest list for B2C celebrations (Pro feature)
CREATE TABLE celebration_guests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  phone        TEXT,
  dietary      TEXT,
  plus_count   INTEGER DEFAULT 0,
  side         TEXT DEFAULT 'both',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE celebration_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own celebration guests" ON celebration_guests
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );

-- Budget tracker for B2C celebrations (Pro feature)
CREATE TABLE celebration_budget (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  category       TEXT NOT NULL,
  description    TEXT NOT NULL,
  estimated      NUMERIC(12,2) DEFAULT 0,
  actual         NUMERIC(12,2),
  status         TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'paid')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE celebration_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own celebration budget" ON celebration_budget
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );
