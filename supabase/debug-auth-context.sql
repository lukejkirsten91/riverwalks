-- Debug why auth.uid() and auth.email() are null

-- 1. Check the current RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'river_walks'
ORDER BY cmd, policyname;

-- 2. Check what the river_walks query returns with null auth context
-- This simulates what happens when auth.uid() and auth.email() are null
SELECT 
  id,
  name,
  user_id,
  archived,
  (null::uuid = user_id) as owner_condition,
  EXISTS (
    SELECT 1 
    FROM collaboration_metadata cm
    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
    WHERE cm.river_walk_reference_id = river_walks.id
    AND ca.user_email = null::text
    AND ca.accepted_at IS NOT NULL
  ) as collaboration_condition
FROM river_walks
WHERE archived = false
ORDER BY date DESC;

-- 3. Test if this is a service role vs authenticated user issue
-- When running in the dashboard, you might be using the service role
-- instead of an authenticated user session