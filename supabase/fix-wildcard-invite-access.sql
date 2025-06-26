-- Fix wildcard ("anyone") collaboration invite access
-- The current RLS policy on collaborator_access only allows users to see records 
-- where user_email = auth.email(), which blocks wildcard invites (user_email = '*')

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "collab_access_user_v2" ON collaborator_access;

-- Create new policy that allows access to both specific email invites AND wildcard invites
CREATE POLICY "collab_access_user_v3" ON collaborator_access FOR SELECT
USING (
  user_email = auth.email()  -- Allow users to see their specific email invites
  OR 
  user_email = '*'           -- Allow anyone to see wildcard invites
);

-- Verify the fix with a test query (commented out - for manual testing only)
-- SELECT * FROM collaborator_access WHERE user_email = '*' AND accepted_at IS NULL;