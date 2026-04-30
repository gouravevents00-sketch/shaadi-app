-- B2C Celebrations: personal event planning without a company/agency

CREATE TABLE celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,               -- 'wedding', 'namkaran', 'griha_pravesh', etc.
  name TEXT NOT NULL,               -- e.g. "Priya & Arjun Wedding"
  event_date DATE,
  venue TEXT,
  city TEXT,
  budget BIGINT DEFAULT 0,
  guest_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE celebration_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  due_date DATE,
  notes TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_celebrations_user_id ON celebrations(user_id);
CREATE INDEX idx_celebration_tasks_celebration_id ON celebration_tasks(celebration_id);
CREATE INDEX idx_celebration_tasks_status ON celebration_tasks(status);

-- RLS
ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebration_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own celebrations" ON celebrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own celebration tasks" ON celebration_tasks
  FOR ALL USING (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  ) WITH CHECK (
    celebration_id IN (SELECT id FROM celebrations WHERE user_id = auth.uid())
  );
