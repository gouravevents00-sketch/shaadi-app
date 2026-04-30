-- Add plan column to celebrations for B2C upgrade flow
ALTER TABLE celebrations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
