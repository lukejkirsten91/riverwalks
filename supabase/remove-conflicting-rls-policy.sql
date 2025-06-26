-- Remove the conflicting RLS policy that's blocking collaboration access
-- The issue is that we have two SELECT policies that are combined with AND logic

-- Check current SELECT policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'river_walks' AND cmd = 'SELECT';

-- Remove the restrictive policy that only allows owner access
DROP POLICY IF EXISTS "Users can view their own river walks" ON river_walks;

-- Verify only the collaboration-enabled policy remains
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'river_walks' AND cmd = 'SELECT';