-- Clean migration script for Riverwalks staging setup
-- This should be run in your NEW staging Supabase project
-- Replace the exported schema from production

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Example core tables (you'll replace this with your actual schema export)
-- This is just a template - use the actual export from your production DB

-- Users table (if you have a custom one beyond auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- River walks table
CREATE TABLE IF NOT EXISTS river_walks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  river_walk_id UUID REFERENCES river_walks(id) ON DELETE CASCADE,
  site_number INTEGER NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  depth DECIMAL(5, 2),
  velocity DECIMAL(5, 2),
  width DECIMAL(5, 2),
  measurement_point INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT CHECK (subscription_type IN ('annual', 'lifetime')),
  status TEXT CHECK (status IN ('active', 'inactive', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2),
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  valid_until TIMESTAMPTZ,
  plan_types TEXT[] DEFAULT '{"annual", "lifetime"}',
  is_active BOOLEAN DEFAULT TRUE,
  stripe_coupon_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE river_walks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you may have more complex ones)
CREATE POLICY "Users can view own river walks" ON river_walks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own river walks" ON river_walks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own river walks" ON river_walks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own river walks" ON river_walks
  FOR DELETE USING (auth.uid() = user_id);

-- Sites policies
CREATE POLICY "Users can manage sites for own river walks" ON sites
  FOR ALL USING (
    river_walk_id IN (
      SELECT id FROM river_walks WHERE user_id = auth.uid()
    )
  );

-- Measurements policies  
CREATE POLICY "Users can manage measurements for own sites" ON measurements
  FOR ALL USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN river_walks rw ON s.river_walk_id = rw.id
      WHERE rw.user_id = auth.uid()
    )
  );

-- Admin access to subscriptions and vouchers (replace with your actual admin function)
CREATE POLICY "Admin access to subscriptions" ON subscriptions
  FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true');

CREATE POLICY "Admin access to vouchers" ON vouchers
  FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS river_walks_user_id_idx ON river_walks(user_id);
CREATE INDEX IF NOT EXISTS sites_river_walk_id_idx ON sites(river_walk_id);
CREATE INDEX IF NOT EXISTS measurements_site_id_idx ON measurements(site_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

-- Set up admin user (run this after the above)
-- You'll need to replace this with the actual admin setup
-- INSERT INTO auth.users (email, raw_user_meta_data) 
-- VALUES ('luke.kirsten@gmail.com', '{"is_admin": true}')
-- ON CONFLICT (email) DO UPDATE SET raw_user_meta_data = '{"is_admin": true}';

COMMENT ON SCHEMA public IS 'Riverwalks staging database - migrated from production';