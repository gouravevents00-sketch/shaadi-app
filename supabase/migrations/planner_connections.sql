-- B2C → Agency connection requests

CREATE TABLE planner_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,          -- B2C user who sent the request
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,                                          -- optional note from client
  wedding_id UUID REFERENCES weddings,                  -- set when agency accepts → creates wedding
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebration_id, company_id)                    -- one request per agency
);

CREATE INDEX idx_planner_connections_company_id ON planner_connections(company_id);
CREATE INDEX idx_planner_connections_user_id ON planner_connections(user_id);
CREATE INDEX idx_planner_connections_status ON planner_connections(status);

ALTER TABLE planner_connections ENABLE ROW LEVEL SECURITY;

-- B2C users can manage their own requests
CREATE POLICY "users can manage own connections" ON planner_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agency members can read + update connections for their company
CREATE POLICY "agency members can manage leads" ON planner_connections
  FOR ALL USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );
