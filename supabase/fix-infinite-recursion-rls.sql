-- Fix infinite recursion in collaboration_metadata RLS policy

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Collaborators can view collaboration metadata for accessible river walks" ON collaboration_metadata;

-- Create a better policy that avoids recursion by using a direct join approach
-- This policy allows collaborators to view collaboration metadata without causing recursion
CREATE POLICY "Collaborators can view collaboration metadata for accessible river walks"
ON collaboration_metadata FOR SELECT
USING (
  -- Allow owners to see their own collaboration metadata
  owner_id = auth.uid()
  OR
  -- Allow collaborators to see metadata for collaborations they're part of
  id IN (
    SELECT collaboration_id 
    FROM collaborator_access 
    WHERE user_email = auth.email() 
    AND accepted_at IS NOT NULL
  )
);