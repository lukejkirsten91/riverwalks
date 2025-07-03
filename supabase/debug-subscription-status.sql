-- Debug Subscription Status
-- Run this to check why subscription isn't being detected after payment

-- Step 1: Find your user account (replace with your actual email)
SELECT 
  id as user_id, 
  email, 
  created_at 
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with your actual email

-- Step 2: Check if subscription record exists for your user
SELECT 
  s.id,
  s.user_id,
  s.subscription_type,
  s.status,
  s.stripe_customer_id,
  s.stripe_price_id,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE'; -- Replace with your actual email

-- Step 3: Check payment_events table for your transactions
SELECT 
  pe.id,
  pe.stripe_event_id,
  pe.event_type,
  pe.data,
  pe.processed_at,
  u.email
FROM payment_events pe
JOIN auth.users u ON pe.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE' -- Replace with your actual email
ORDER BY pe.processed_at DESC
LIMIT 10;

-- Step 4: Check if subscription tables exist and have correct structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('subscriptions', 'payment_events', 'vouchers')
ORDER BY table_name, ordinal_position;

-- Step 5: Test the helper function
SELECT has_active_subscription((SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')) as has_subscription;

-- Step 6: Check RLS policies that might be blocking access
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'payment_events');

-- If no subscription record exists after payment, we need to:
-- 1. Set up webhooks properly 
-- 2. Or manually create the subscription record
-- 3. Check Stripe dashboard for successful payments