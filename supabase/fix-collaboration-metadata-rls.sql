-- Fix collaboration_metadata RLS to allow collaborators to view metadata
-- This addresses the issue where shared river walks don't appear after invite acceptance

-- Allow collaborators to view collaboration metadata for river walks they have access to
CREATE POLICY "Collaborators can view collaboration metadata for accessible river walks"
ON collaboration_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborator_access ca
    WHERE ca.collaboration_id = collaboration_metadata.id
      AND ca.user_email = auth.email()
      AND ca.accepted_at IS NOT NULL
  )
);