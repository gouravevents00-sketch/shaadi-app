-- Phase 2c: Event Sub-type + Smart Templates
-- Run this in Supabase SQL Editor

-- Add sub_type column to org_events
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS sub_type text;

-- Add description column to org_events
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS description text;
