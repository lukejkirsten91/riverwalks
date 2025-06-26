-- Safe fix for RLS policy on river_walks table to allow access to collaborated river walks
-- This version handles existing policies properly

-- First, let's see the current RLS policies on river_walks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'river_walks';

-- Drop existing restrictive SELECT policies that only allow owner access
DROP POLICY IF EXISTS "Users can only access their own river walks" ON river_walks;
DROP POLICY IF EXISTS "Users can view own river walks" ON river_walks;
DROP POLICY IF EXISTS "RLS Policy for river_walks" ON river_walks;
DROP POLICY IF EXISTS "Users can access owned and collaborated river walks" ON river_walks;

-- Create new policy that allows access to owned AND collaborated river walks
CREATE POLICY "Users can access owned and collaborated river walks" ON river_walks
    FOR SELECT USING (
        -- Allow if user owns the river walk
        auth.uid() = user_id 
        OR 
        -- Allow if user has collaboration access
        EXISTS (
            SELECT 1 
            FROM collaboration_metadata cm
            JOIN collaborator_access ca ON cm.id = ca.collaboration_id
            WHERE cm.river_walk_reference_id = river_walks.id
            AND ca.user_email = auth.email()
            AND ca.accepted_at IS NOT NULL
        )
    );

-- Create INSERT policy only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'river_walks' 
        AND policyname = 'Users can insert their own river walks'
    ) THEN
        CREATE POLICY "Users can insert their own river walks" ON river_walks
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create UPDATE policy only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'river_walks' 
        AND policyname = 'Users can update their own river walks'
    ) THEN
        CREATE POLICY "Users can update their own river walks" ON river_walks
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create DELETE policy only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'river_walks' 
        AND policyname = 'Users can delete their own river walks'
    ) THEN
        CREATE POLICY "Users can delete their own river walks" ON river_walks
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'river_walks';