-- Create Test Subscription for Current User
-- Run this in Supabase SQL Editor to manually create a subscription for testing
-- Replace the email with your actual test email

-- First, find your user ID (replace with your email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert a subscription (replace USER_ID_HERE with the UUID from above)
INSERT INTO subscriptions (
  user_id,
  subscription_type,
  status,
  stripe_customer_id,
  stripe_price_id,
  current_period_start,
  current_period_end
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'), -- Replace with your email
  'lifetime', -- or 'annual'
  'active',
  'test_customer_123',
  'price_1RgTPF4CotGwBUxNiayDAzep', -- lifetime price ID
  NOW(),
  CASE 
    WHEN 'lifetime' = 'lifetime' THEN NOW() + INTERVAL '100 years'
    ELSE NOW() + INTERVAL '1 year'
  END
);

-- Verify the subscription was created
SELECT 
  s.*,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'your-email@example.com'; -- Replace with your email

SELECT 'Test subscription created successfully!' as status;