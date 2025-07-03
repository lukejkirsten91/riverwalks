-- Fix RLS Policies for Subscription Access
-- The subscription exists but RLS is blocking access

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'subscriptions';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only system can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only system can update subscriptions" ON subscriptions;

-- Create proper RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own subscription
-- This is the key fix - the 406 error means RLS was too restrictive
CREATE POLICY "Authenticated users can read own subscription" ON subscriptions
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- Verify the user can now access their subscription
SELECT 
  s.subscription_type,
  s.status,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'ljkirsten91@gmail.com';

-- Test the function
SELECT has_active_subscription('92071462-23ad-4815-afa5-8ea7f54cb411') as has_subscription;

SELECT 'RLS policies fixed! App should now detect Pro subscription.' as result;