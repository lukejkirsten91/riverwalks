-- Comprehensive fix for infinite recursion in collaboration RLS policies
-- This removes all problematic policies and creates simple, non-recursive ones

-- First, drop all existing collaboration-related RLS policies to start fresh
DROP POLICY IF EXISTS "Collaborators can view collaboration metadata for accessible river walks" ON collaboration_metadata;
DROP POLICY IF EXISTS "Users can view collaboration metadata for their river walks" ON collaboration_metadata;
DROP POLICY IF EXISTS "Users can view their collaborator access records" ON collaborator_access;
DROP POLICY IF EXISTS "Users can insert collaborator access records for their collaborations" ON collaborator_access;
DROP POLICY IF EXISTS "Users can update their collaborator access records" ON collaborator_access;
DROP POLICY IF EXISTS "Users can delete their collaborator access records" ON collaborator_access;

-- Create simple, non-recursive RLS policies

-- collaboration_metadata policies
CREATE POLICY "collaboration_metadata_select_policy" ON collaboration_metadata FOR SELECT
USING (
  -- Owners can see their own collaboration metadata
  owner_id = auth.uid()
);

-- collaborator_access policies - simple and non-recursive
CREATE POLICY "collaborator_access_select_policy" ON collaborator_access FOR SELECT
USING (
  -- Users can see records where they are the invited user
  user_email = auth.email()
);

CREATE POLICY "collaborator_access_insert_policy" ON collaborator_access FOR INSERT
WITH CHECK (
  -- Users can insert records for collaborations they own
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "collaborator_access_update_policy" ON collaborator_access FOR UPDATE
USING (
  -- Users can update their own records OR records in collaborations they own
  user_email = auth.email() 
  OR 
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "collaborator_access_delete_policy" ON collaborator_access FOR DELETE
USING (
  -- Users can delete records in collaborations they own
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);