-- Debug script for the other email address
-- Replace 'OTHER_EMAIL_HERE' with the actual email that's not working

-- Step 1: Check if the user exists in auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'OTHER_EMAIL_HERE';

-- Step 2: Check if there's a subscription record for this user
SELECT 
  s.id,
  s.subscription_type,
  s.status,
  s.stripe_customer_id,
  s.created_at,
  u.email
FROM subscriptions s
RIGHT JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'OTHER_EMAIL_HERE';

-- Step 3: Check payment_events for this user (if any)
SELECT 
  pe.stripe_event_id,
  pe.event_type,
  pe.processed_at,
  u.email
FROM payment_events pe
RIGHT JOIN auth.users u ON pe.user_id = u.id
WHERE u.email = 'OTHER_EMAIL_HERE'
ORDER BY pe.processed_at DESC;

-- If no subscription exists, create one manually:
-- (Uncomment and run this if the user paid but has no subscription record)

/*
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
  (SELECT id FROM auth.users WHERE email = 'OTHER_EMAIL_HERE'),
  'lifetime', -- Change to 'annual' if they paid for yearly
  'active',
  'manual_' || (SELECT id FROM auth.users WHERE email = 'OTHER_EMAIL_HERE'),
  'price_1RgTPF4CotGwBUxNiayDAzep', -- lifetime price
  NOW(),
  NOW() + INTERVAL '100 years',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  subscription_type = EXCLUDED.subscription_type,
  status = EXCLUDED.status,
  updated_at = NOW();
*/

-- Step 4: Verify after creation
SELECT 
  s.subscription_type,
  s.status,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'OTHER_EMAIL_HERE';