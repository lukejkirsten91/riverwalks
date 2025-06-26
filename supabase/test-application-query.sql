-- Test the exact query that the application is running
-- This should return both river walks if RLS is working correctly

-- Set the context to match the application user
-- Note: Run this as the authenticated user luke.kirsten@gmail.com

SELECT 
  *
FROM river_walks
WHERE archived = false
ORDER BY date DESC;

-- Also test with explicit user context
-- Check what auth.uid() and auth.email() return
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email,
  '0b5c270b-0e30-4d2c-9c94-d4d0baf07e88' as expected_user_id,
  'luke.kirsten@gmail.com' as expected_user_email,
  (auth.uid()::text = '0b5c270b-0e30-4d2c-9c94-d4d0baf07e88') as uid_matches,
  (auth.email() = 'luke.kirsten@gmail.com') as email_matches;