-- Safe fix for RLS policy on river_walks table to allow collaborative updates
-- This version handles existing policies properly

-- Drop all existing UPDATE policies that might conflict
DROP POLICY IF EXISTS "Users can update their own river walks" ON river_walks;
DROP POLICY IF EXISTS "Users can update owned and collaborated river walks" ON river_walks;

-- Create the correct UPDATE policy that allows both owners AND collaborators with editor role
CREATE POLICY "Users can update owned and collaborated river walks" ON river_walks
    FOR UPDATE USING (
        -- Allow if user owns the river walk
        auth.uid() = user_id 
        OR 
        -- Allow if user has collaboration access with editor role
        EXISTS (
            SELECT 1 
            FROM collaboration_metadata cm
            JOIN collaborator_access ca ON cm.id = ca.collaboration_id
            WHERE cm.river_walk_reference_id = river_walks.id
            AND ca.user_email = auth.email()
            AND ca.accepted_at IS NOT NULL
            AND ca.role = 'editor'  -- Only editors can update, not viewers
        )
    );

-- Verify the fix
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'river_walks' AND cmd = 'UPDATE';