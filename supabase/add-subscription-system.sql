-- Subscription System Database Schema
-- Comprehensive setup for Stripe payments, subscriptions, vouchers, and GDPR compliance

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe identifiers
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  
  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('yearly', 'lifetime')),
  plan_price_pence INTEGER NOT NULL, -- Store in pence for precision (199 = £1.99)
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'unpaid')),
  
  -- Timestamps
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Voucher tracking
  voucher_code TEXT,
  discount_applied_pence INTEGER DEFAULT 0,
  
  -- Metadata
  payment_method TEXT, -- card, paypal, etc
  currency TEXT DEFAULT 'gbp',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Only system can insert subscriptions (via API)
CREATE POLICY "System can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- VOUCHERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Voucher details
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value INTEGER NOT NULL, -- Percentage (0-100) or pence amount
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Restrictions
  plan_types TEXT[] DEFAULT ARRAY['yearly', 'lifetime'], -- Which plans this applies to
  new_users_only BOOLEAN DEFAULT false,
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id),
  description TEXT,
  internal_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for vouchers
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Only admin users can manage vouchers
CREATE POLICY "Admin can manage vouchers" ON vouchers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'lukekirsten91@gmail.com' -- Admin email
    )
  );

-- Regular users can only read active vouchers for validation
CREATE POLICY "Users can validate vouchers" ON vouchers
  FOR SELECT USING (
    is_active = true 
    AND (valid_until IS NULL OR valid_until > NOW())
    AND uses_count < max_uses
  );

-- =====================================================
-- VOUCHER USAGE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS voucher_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Usage details
  discount_applied_pence INTEGER NOT NULL,
  original_price_pence INTEGER NOT NULL,
  final_price_pence INTEGER NOT NULL,
  
  -- Metadata
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_email TEXT NOT NULL,
  stripe_payment_intent_id TEXT
);

-- RLS Policies for voucher usage
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voucher usage" ON voucher_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all voucher usage" ON voucher_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'lukekirsten91@gmail.com'
    )
  );

CREATE POLICY "System can insert voucher usage" ON voucher_usage
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PAYMENT EVENTS (for audit trail and GDPR compliance)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'payment_succeeded', 'payment_failed', 'subscription_created', 
    'subscription_updated', 'subscription_canceled', 'refund_created'
  )),
  stripe_event_id TEXT UNIQUE,
  
  -- Payment details
  amount_pence INTEGER,
  currency TEXT DEFAULT 'gbp',
  payment_method TEXT,
  
  -- Metadata
  stripe_data JSONB, -- Store full Stripe event data for compliance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for payment events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment events" ON payment_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all payment events" ON payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'lukekirsten91@gmail.com'
    )
  );

CREATE POLICY "System can insert payment events" ON payment_events
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- GDPR DATA REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'data_correction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Data
  requested_data JSONB, -- What data was requested
  export_url TEXT, -- Temporary URL for data download
  export_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Processing
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for GDPR requests
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own GDPR requests" ON gdpr_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create GDPR requests" ON gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage GDPR requests" ON gdpr_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'lukekirsten91@gmail.com'
    )
  );

-- =====================================================
-- USER PROFILE EXTENSIONS (for GDPR)
-- =====================================================
-- Add GDPR-related fields to user metadata
-- Note: This extends the existing auth.users table conceptually through metadata

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
    AND (
      plan_type = 'lifetime' 
      OR (plan_type = 'yearly' AND current_period_end > NOW())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  plan_type TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_trial BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.id IS NOT NULL, false) as has_subscription,
    s.plan_type,
    s.status,
    CASE 
      WHEN s.plan_type = 'lifetime' THEN NULL
      ELSE s.current_period_end
    END as expires_at,
    COALESCE(s.subscription_start > NOW() - INTERVAL '7 days', false) as is_trial
  FROM subscriptions s
  WHERE s.user_id = user_uuid
  AND s.status IN ('active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate voucher
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
      discount_amount := ROUND((199 * voucher_record.discount_value) / 100.0);
    ELSE -- lifetime
      discount_amount := ROUND((350 * voucher_record.discount_value) / 100.0);
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

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_user_id ON voucher_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample vouchers for testing
-- =====================================================
INSERT INTO vouchers (code, discount_type, discount_value, max_uses, description, created_by)
VALUES 
  ('LAUNCH50', 'percentage', 50, 100, '50% off launch promotion', 
   (SELECT id FROM auth.users WHERE email = 'lukekirsten91@gmail.com' LIMIT 1)),
  ('TEACHER100', 'percentage', 100, 50, '100% off for teachers', 
   (SELECT id FROM auth.users WHERE email = 'lukekirsten91@gmail.com' LIMIT 1)),
  ('FREEYEAR', 'fixed_amount', 199, 25, 'Free first year', 
   (SELECT id FROM auth.users WHERE email = 'lukekirsten91@gmail.com' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Note: Run this script in your Supabase SQL editor
-- Remember to set up your Stripe webhook endpoint after deployment