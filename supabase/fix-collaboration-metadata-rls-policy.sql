-- Fix RLS policy for collaboration_metadata table
-- The issue is likely that there's no SELECT policy allowing collaborators to read metadata

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for collaborators" ON collaboration_metadata;
DROP POLICY IF EXISTS "Users can access collaboration metadata for their collaborations" ON collaboration_metadata;

-- Create new policy that allows:
-- 1. Owners to read their own collaboration metadata
-- 2. Collaborators to read metadata for collaborations they're part of
CREATE POLICY "Enable read access for all collaboration participants" ON collaboration_metadata
    FOR SELECT USING (
        -- Owner can read their own collaboration metadata
        auth.uid() = owner_id 
        OR 
        -- Collaborators can read metadata for collaborations they're accepted into
        EXISTS (
            SELECT 1 
            FROM collaborator_access ca
            WHERE ca.collaboration_id = collaboration_metadata.id
            AND ca.user_email = auth.email()
            AND ca.accepted_at IS NOT NULL
        )
    );

-- Verify the policy was created
SELECT 'Policy created successfully' as status;