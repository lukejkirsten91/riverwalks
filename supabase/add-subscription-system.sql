-- Stripe Payment System Database Schema
-- Run this in your Supabase SQL editor to add subscription functionality

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
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

-- 2. Create vouchers table for discount codes
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
  discount_value INTEGER NOT NULL, -- percentage (0-100) or pence amount
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  plan_types TEXT[] DEFAULT ARRAY['annual', 'lifetime'], -- which plans this voucher applies to
  new_users_only BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create payment_events table for tracking Stripe webhooks
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_id ON payment_events(stripe_event_id);

-- 5. Set up Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (false); -- Only server-side code can insert

CREATE POLICY "Only system can update subscriptions" ON subscriptions
  FOR UPDATE USING (false); -- Only server-side code can update

-- 7. Create RLS policies for vouchers
CREATE POLICY "Anyone can view active vouchers" ON vouchers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admin can manage vouchers" ON vouchers
  FOR ALL USING (
    auth.email() = 'luke.kirsten@gmail.com' -- Replace with admin email
  );

-- 8. Create RLS policies for payment_events
CREATE POLICY "Users can view their payment events" ON payment_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert payment events" ON payment_events
  FOR INSERT WITH CHECK (false); -- Only server-side code can insert

-- 9. Create helper functions
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
  -- Check if voucher exists and is active
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
  
  -- Check if user already has subscription (for new_users_only vouchers)
  IF voucher_record.new_users_only THEN
    SELECT has_active_subscription(user_uuid) INTO user_has_subscription;
    IF user_has_subscription THEN
      RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'This voucher is only valid for new users';
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  IF voucher_record.discount_type = 'percentage' THEN
    IF plan_type_input = 'yearly' THEN
      discount_amount := ROUND((199 * voucher_record.discount_value) / 100.0); -- £1.99 = 199p
    ELSE -- lifetime
      discount_amount := ROUND((349 * voucher_record.discount_value) / 100.0); -- £3.49 = 349p
    END IF;
  ELSE -- fixed_amount
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

-- 10. Insert sample vouchers
INSERT INTO vouchers (code, discount_type, discount_value, max_uses, plan_types, new_users_only) VALUES
  ('LAUNCH50', 'percentage', 50, 1000, ARRAY['annual', 'lifetime'], false),
  ('TEACHER100', 'percentage', 100, 100, ARRAY['annual', 'lifetime'], false),
  ('FREEYEAR', 'percentage', 100, 50, ARRAY['annual'], true)
ON CONFLICT (code) DO NOTHING;

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON vouchers TO anon, authenticated;
GRANT SELECT ON payment_events TO authenticated;

-- Success message
SELECT 'Stripe subscription system created successfully! Tables: subscriptions, vouchers, payment_events' as status;