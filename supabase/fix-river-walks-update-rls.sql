-- Fix river_walks table UPDATE/DELETE policies to support collaboration
-- Currently collaborators can view but not edit river walks

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'river_walks' AND cmd IN ('UPDATE', 'DELETE');

-- Drop existing UPDATE/DELETE policies if they exist
DROP POLICY IF EXISTS "Users can update their own river walks" ON river_walks;
DROP POLICY IF EXISTS "Users can delete their own river walks" ON river_walks;

-- Create new UPDATE policy that supports collaboration
CREATE POLICY "Users can update owned and collaborated river walks" ON river_walks
    FOR UPDATE USING (
        -- Owner access
        user_id = auth.uid()
        OR
        -- Collaborator access (only editors can update)
        EXISTS (
            SELECT 1 
            FROM collaboration_metadata cm
            JOIN collaborator_access ca ON cm.id = ca.collaboration_id
            WHERE cm.river_walk_reference_id = river_walks.id
            AND ca.user_email = auth.email()
            AND ca.accepted_at IS NOT NULL
            AND ca.role = 'editor'
        )
    );

-- Create new DELETE policy that supports collaboration 
-- Note: Only owners should be able to delete, not collaborators
CREATE POLICY "Users can delete their own river walks" ON river_walks
    FOR DELETE USING (
        user_id = auth.uid()
    );

SELECT 'RLS policies updated for river_walks to support collaborative editing' as status;