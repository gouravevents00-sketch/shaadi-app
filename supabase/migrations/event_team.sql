-- Event Team: assign company members to specific events with a role
CREATE TABLE IF NOT EXISTS event_team (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- exactly one of these is set
  wedding_id    uuid REFERENCES weddings(id) ON DELETE CASCADE,
  org_event_id  uuid REFERENCES org_events(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'coordinator',
  -- roles: owner, project_head, coordinator, accounts, logistics, hospitality, fb_team, decor_team, creative, photography, view_only
  is_project_head boolean NOT NULL DEFAULT false,
  is_freelancer   boolean NOT NULL DEFAULT false,
  expires_at    timestamptz,  -- for freelancers
  added_by      uuid REFERENCES users(id),
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT unique_user_wedding     UNIQUE (user_id, wedding_id),
  CONSTRAINT unique_user_org_event   UNIQUE (user_id, org_event_id),
  CONSTRAINT one_event_only CHECK (
    (wedding_id IS NOT NULL)::int + (org_event_id IS NOT NULL)::int = 1
  )
);

-- One project head per event
CREATE UNIQUE INDEX IF NOT EXISTS one_project_head_per_wedding
  ON event_team (wedding_id) WHERE is_project_head = true AND wedding_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS one_project_head_per_org_event
  ON event_team (org_event_id) WHERE is_project_head = true AND org_event_id IS NOT NULL;

-- Extend invites table for org events and freelancers
ALTER TABLE invites ADD COLUMN IF NOT EXISTS org_event_id uuid REFERENCES org_events(id) ON DELETE CASCADE;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS is_freelancer boolean NOT NULL DEFAULT false;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS event_role text;

-- RLS
ALTER TABLE event_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can view event_team"
  ON event_team FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins and owners can manage event_team"
  ON event_team FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'project_head')
    )
  );
