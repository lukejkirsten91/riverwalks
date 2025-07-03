-- Create Test Subscription for Current User (FIXED VERSION)
-- Run this AFTER running fix-subscriptions-table.sql
-- Replace the email with your actual test email

-- Step 1: Check if your user exists and get the ID
SELECT id, email FROM auth.users WHERE email = 'test@test.com'; -- Replace with your email

-- Step 2: Insert a test subscription (replace the email in the query)
INSERT INTO subscriptions (
  user_id,
  subscription_type,
  status,
  stripe_customer_id,
  stripe_price_id,
  current_period_start,
  current_period_end
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@test.com'), -- Replace with your email
  'lifetime', -- Change to 'annual' if you want to test annual subscription
  'active',
  'test_customer_123',
  'price_1RgTPF4CotGwBUxNiayDAzep', -- lifetime price ID
  NOW(),
  CASE 
    WHEN 'lifetime' = 'lifetime' THEN NOW() + INTERVAL '100 years'
    ELSE NOW() + INTERVAL '1 year'
  END
);

-- Step 3: Verify the subscription was created
SELECT 
  s.id,
  s.subscription_type,
  s.status,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'test@test.com'; -- Replace with your email

-- Step 4: Test the helper function
SELECT has_active_subscription((SELECT id FROM auth.users WHERE email = 'test@test.com')) as has_subscription;

SELECT 'Test subscription created successfully!' as status;