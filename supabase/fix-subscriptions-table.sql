-- Fix subscriptions table - check if it exists and create/fix it
-- Run this in Supabase SQL Editor

-- First, let's check what exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- If the table doesn't exist or is missing columns, let's drop and recreate it
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;

-- Now create the tables fresh
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_type TEXT CHECK (subscription_type IN ('annual', 'lifetime')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')) DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
  discount_value INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  plan_types TEXT[] DEFAULT ARRAY['annual', 'lifetime'],
  new_users_only BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_id ON payment_events(stripe_event_id);

-- Set up RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Only system can update subscriptions" ON subscriptions
  FOR UPDATE USING (false);

CREATE POLICY "Anyone can view active vouchers" ON vouchers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admin can manage vouchers" ON vouchers
  FOR ALL USING (auth.email() = 'luke.kirsten@gmail.com');

CREATE POLICY "Users can view their payment events" ON payment_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert payment events" ON payment_events
  FOR INSERT WITH CHECK (false);

-- Create helper functions
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_voucher(voucher_code_input TEXT, user_uuid UUID, plan_type_input TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_type TEXT,
  discount_value INTEGER,
  final_discount_pence INTEGER,
  error_message TEXT
) AS $$
DECLARE
  voucher_record RECORD;
  user_has_subscription BOOLEAN;
  discount_amount INTEGER := 0;
BEGIN
  SELECT * INTO voucher_record
  FROM vouchers v
  WHERE v.code = voucher_code_input
  AND v.is_active = true
  AND (v.valid_until IS NULL OR v.valid_until > NOW())
  AND v.uses_count < v.max_uses
  AND plan_type_input = ANY(v.plan_types);
  
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'Invalid or expired voucher code';
    RETURN;
  END IF;
  
  IF voucher_record.new_users_only THEN
    SELECT has_active_subscription(user_uuid) INTO user_has_subscription;
    IF user_has_subscription THEN
      RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'This voucher is only valid for new users';
      RETURN;
    END IF;
  END IF;
  
  IF voucher_record.discount_type = 'percentage' THEN
    IF plan_type_input = 'yearly' THEN
      discount_amount := ROUND((199 * voucher_record.discount_value) / 100.0);
    ELSE
      discount_amount := ROUND((349 * voucher_record.discount_value) / 100.0);
    END IF;
  ELSE
    discount_amount := voucher_record.discount_value;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    voucher_record.discount_type,
    voucher_record.discount_value,
    discount_amount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample vouchers
INSERT INTO vouchers (code, discount_type, discount_value, max_uses, plan_types, new_users_only) VALUES
  ('LAUNCH50', 'percentage', 50, 1000, ARRAY['annual', 'lifetime'], false),
  ('TEACHER100', 'percentage', 100, 100, ARRAY['annual', 'lifetime'], false),
  ('FREEYEAR', 'percentage', 100, 50, ARRAY['annual'], true)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON vouchers TO anon, authenticated;
GRANT SELECT ON payment_events TO authenticated;

-- Verify tables were created correctly
SELECT 'Tables created successfully!' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('subscriptions', 'vouchers', 'payment_events')
ORDER BY table_name, ordinal_position;