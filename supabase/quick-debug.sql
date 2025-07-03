-- Quick debug for ljkirsten91@gmail.com
-- Run this in Supabase SQL Editor

-- Check if user exists
SELECT id, email FROM auth.users WHERE email = 'ljkirsten91@gmail.com';

-- Check if subscriptions table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'subscriptions';

-- Check subscription for your user
SELECT * FROM subscriptions WHERE user_id = '92071462-23ad-4815-afa5-8ea7f54cb411';

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'subscriptions';

-- Manual subscription creation for you
INSERT INTO subscriptions (
  user_id,
  subscription_type,
  status,
  stripe_customer_id,
  stripe_price_id,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  '92071462-23ad-4815-afa5-8ea7f54cb411',
  'lifetime', -- Change to 'annual' if you paid for yearly
  'active',
  'manual_ljk_' || extract(epoch from now()),
  'price_1RgTPF4CotGwBUxNiayDAzep', -- lifetime price
  NOW(),
  NOW() + INTERVAL '100 years',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Verify subscription was created
SELECT 
  s.subscription_type,
  s.status,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'ljkirsten91@gmail.com';