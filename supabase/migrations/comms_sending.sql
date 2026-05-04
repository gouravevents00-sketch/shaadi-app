-- ═══════════════════════════════════════════════════════
-- COMMS SENDING — Scheduled messages, MSG91 fields,
--                 Delivery log, Company settings
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── Communications: scheduling + delivery tracking ─────
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS scheduled_for       timestamptz,
  ADD COLUMN IF NOT EXISTS msg91_message_id     text,
  ADD COLUMN IF NOT EXISTS delivery_status      text,
  -- values: queued | sent | delivered | failed | partial
  ADD COLUMN IF NOT EXISTS recipient_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS template_id          text;   -- MSG91 template ID

-- ── Communication Delivery Log (per-recipient) ─────────
CREATE TABLE IF NOT EXISTS comm_delivery_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comm_id          uuid NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  wedding_id       uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id         uuid REFERENCES guests(id) ON DELETE SET NULL,
  phone            text,
  email            text,
  status           text NOT NULL DEFAULT 'queued',
  -- values: queued | sent | delivered | read | failed | bounced
  msg91_request_id text,
  error_message    text,
  sent_at          timestamptz,
  delivered_at     timestamptz,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comm_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdl_select" ON comm_delivery_log FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "cdl_insert" ON comm_delivery_log FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "cdl_update" ON comm_delivery_log FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )));

CREATE INDEX IF NOT EXISTS idx_comm_delivery_comm    ON comm_delivery_log(comm_id);
CREATE INDEX IF NOT EXISTS idx_comm_delivery_wedding ON comm_delivery_log(wedding_id);

-- ── Company Settings (MSG91 keys, defaults) ────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  msg91_auth_key    text,
  msg91_sender_id   text,
  whatsapp_enabled  boolean NOT NULL DEFAULT false,
  sms_enabled       boolean NOT NULL DEFAULT false,
  default_from_name text,
  default_reply_to  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select" ON company_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "cs_upsert" ON company_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
