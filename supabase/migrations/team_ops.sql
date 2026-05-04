-- ═══════════════════════════════════════════════════════
-- TEAM OPS — Staff shifts, Staff tasks
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── Staff Shifts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_shifts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id     uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  staff_name     text,    -- for non-user staff
  staff_phone    text,
  role           text NOT NULL DEFAULT 'coordinator',
  shift_date     date NOT NULL,
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  location       text,
  notes          text,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_select" ON staff_shifts FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "ss_insert" ON staff_shifts FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "ss_update" ON staff_shifts FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "ss_delete" ON staff_shifts FOR DELETE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )));

CREATE INDEX IF NOT EXISTS idx_staff_shifts_wedding ON staff_shifts(wedding_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date    ON staff_shifts(shift_date);

-- ── Staff Tasks (assigned to team members) ──────────────
CREATE TABLE IF NOT EXISTS staff_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id   uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  assigned_to  uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_name text,   -- for non-user staff
  title        text NOT NULL,
  description  text,
  category     text NOT NULL DEFAULT 'general',
  -- values: setup | decor | guest | vendor | logistics | hospitality | fb | general
  due_date     date,
  due_time     time,
  status       text NOT NULL DEFAULT 'pending',
  -- values: pending | in_progress | done | blocked
  priority     text NOT NULL DEFAULT 'medium',
  -- values: low | medium | high | urgent
  event_id     uuid REFERENCES events(id) ON DELETE SET NULL,
  notes        text,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "st_select" ON staff_tasks FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "st_insert" ON staff_tasks FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "st_update" ON staff_tasks FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "st_delete" ON staff_tasks FOR DELETE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )));

CREATE INDEX IF NOT EXISTS idx_staff_tasks_wedding     ON staff_tasks(wedding_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status      ON staff_tasks(status);
