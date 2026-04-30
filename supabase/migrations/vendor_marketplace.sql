-- Vendor Marketplace: public vendor directory for B2C discovery

CREATE TABLE marketplace_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies,         -- NULL = independent vendor
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,                        -- 'Photographer', 'Caterer', etc.
  city TEXT NOT NULL,
  cities TEXT[] DEFAULT '{}',                    -- multiple cities served
  description TEXT,
  tagline TEXT,                                  -- short line for card display
  price_from INT,                                -- starting price in INR
  price_unit TEXT DEFAULT 'per event',           -- 'per day', 'per plate', etc.
  phone TEXT,
  email TEXT,
  website TEXT,
  instagram TEXT,
  images TEXT[] DEFAULT '{}',                    -- image URLs
  tags TEXT[] DEFAULT '{}',                      -- searchable tags
  rating NUMERIC(3,2) DEFAULT 0,                 -- 0.00 to 5.00
  review_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_vendor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES marketplace_vendors ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users,
  celebration_id UUID REFERENCES celebrations,   -- optional: which celebration
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_marketplace_vendors_category ON marketplace_vendors(category);
CREATE INDEX idx_marketplace_vendors_city ON marketplace_vendors(city);
CREATE INDEX idx_marketplace_vendors_is_active ON marketplace_vendors(is_active);
CREATE INDEX idx_marketplace_vendors_is_featured ON marketplace_vendors(is_featured);
CREATE INDEX idx_marketplace_vendor_reviews_vendor_id ON marketplace_vendor_reviews(vendor_id);

-- RLS
ALTER TABLE marketplace_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_vendor_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read active vendors
CREATE POLICY "public can read active vendors" ON marketplace_vendors
  FOR SELECT USING (is_active = true);

-- Reviews readable by all
CREATE POLICY "public can read reviews" ON marketplace_vendor_reviews
  FOR SELECT USING (true);

-- Only authenticated users can write reviews
CREATE POLICY "authenticated users can write reviews" ON marketplace_vendor_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
