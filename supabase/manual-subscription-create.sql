-- Manual Subscription Creation for Debugging
-- Use this to manually create a subscription record after payment

-- STEP 1: Replace 'YOUR_EMAIL_HERE' with your actual email address
-- STEP 2: Choose subscription type: 'lifetime' or 'annual'  
-- STEP 3: Run this in Supabase SQL Editor

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
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'), -- Replace with your actual email
  'lifetime', -- Change to 'annual' if you paid for yearly
  'active',
  'manual_customer_' || (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'),
  CASE 
    WHEN 'lifetime' = 'lifetime' THEN 'price_1RgTPF4CotGwBUxNiayDAzep'
    ELSE 'price_1RgTO54CotGwBUxNPQl3SLAP'
  END,
  NOW(),
  CASE 
    WHEN 'lifetime' = 'lifetime' THEN NOW() + INTERVAL '100 years'
    ELSE NOW() + INTERVAL '1 year'
  END,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_type = EXCLUDED.subscription_type,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

-- Verify the subscription was created
SELECT 
  s.id,
  s.subscription_type,
  s.status,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE'; -- Replace with your actual email

SELECT 'Subscription created successfully! Refresh the app to see Pro status.' as result;