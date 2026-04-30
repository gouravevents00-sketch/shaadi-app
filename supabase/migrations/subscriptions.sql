-- Subscription Plans & Company Plan Tracking

-- Plan definitions (read-only reference table)
CREATE TABLE plans (
  id TEXT PRIMARY KEY,           -- 'free', 'starter', 'pro', 'enterprise'
  name TEXT NOT NULL,
  price_monthly INT DEFAULT 0,   -- in INR
  price_yearly INT DEFAULT 0,    -- in INR (discounted)
  max_weddings INT DEFAULT 1,
  max_org_events INT DEFAULT 1,
  max_guests_per_event INT DEFAULT 100,
  max_team_members INT DEFAULT 1,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO plans (id, name, price_monthly, price_yearly, max_weddings, max_org_events, max_guests_per_event, max_team_members, features) VALUES
  ('free',       'Free',       0,    0,    1,  1,   100,  1,  '["1 active wedding", "Basic checklist", "Up to 100 guests", "Client portal"]'),
  ('starter',    'Starter',    1499, 14990, 5,  5,   500,  3,  '["5 weddings", "All wedding features", "Up to 500 guests", "3 team members", "AI assistant"]'),
  ('pro',        'Pro',        3999, 39990, 25, 25, 2000,  10, '["25 weddings", "Corporate events", "Unlimited guests", "10 team members", "AI assistant", "Priority support"]'),
  ('enterprise', 'Enterprise', 0,    0,    9999, 9999, 99999, 99999, '["Unlimited events", "Custom integrations", "Dedicated support", "Custom branding"]');

-- Company subscription state
CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id TEXT REFERENCES plans(id) DEFAULT 'free',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create free subscription for all existing companies
INSERT INTO company_subscriptions (company_id, plan_id, status)
SELECT id, 'free', 'active' FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- Indexes
CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_plan_id ON company_subscriptions(plan_id);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans are public readable" ON plans FOR SELECT USING (true);

CREATE POLICY "company members can read their subscription" ON company_subscriptions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );
