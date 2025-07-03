-- Simple RLS Fix - Update existing policy
-- This avoids the "already exists" error

-- Drop the problematic restrictive policies only
DROP POLICY IF EXISTS "Only system can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only system can update subscriptions" ON subscriptions;

-- Make sure the existing policy allows proper access
-- Replace the existing policy with a more permissive one
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

-- Create the correct policy
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- Also ensure service role can manage subscriptions for webhooks
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Test query - this should work now
SELECT 
  s.subscription_type,
  s.status,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'ljkirsten91@gmail.com';

SELECT 'RLS policy updated successfully!' as result;