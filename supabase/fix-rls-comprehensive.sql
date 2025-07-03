-- Comprehensive RLS Fix for Subscriptions
-- This should resolve the 406 "Not Acceptable" errors

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'subscriptions';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only system can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only system can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON subscriptions;

-- Disable RLS temporarily to test
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create a simple, permissive policy for authenticated users
CREATE POLICY "authenticated_users_can_read_own_subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role full access for webhooks
CREATE POLICY "service_role_full_access" ON subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Test the policies
SELECT 'Testing subscription access...' as status;

-- This should work for the current user
SELECT 
  s.id,
  s.user_id,
  s.subscription_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'ljkirsten91@gmail.com';

SELECT 'RLS policies updated successfully!' as result;