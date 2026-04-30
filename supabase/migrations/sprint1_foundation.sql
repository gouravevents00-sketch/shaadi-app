-- ─── Sprint 1: Foundation ─────────────────────────────────────────────────────

-- 1A. Generic event type + ownership on weddings
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS celebration_type TEXT DEFAULT 'wedding',
  ADD COLUMN IF NOT EXISTS owner_type       TEXT DEFAULT 'agency'
    CHECK (owner_type IN ('agency', 'individual')),
  ADD COLUMN IF NOT EXISTS owner_user_id    UUID REFERENCES auth.users;

-- 1B. Link celebrations → company + wedding (for Pro workspace)
ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies,
  ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings;

-- 1C. Personal companies for B2C Pro users
--     (auto-created on upgrade, invisible to user)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT FALSE;

-- Index for fast owner lookup
CREATE INDEX IF NOT EXISTS idx_weddings_owner_user ON weddings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_celebrations_wedding ON celebrations(wedding_id);
