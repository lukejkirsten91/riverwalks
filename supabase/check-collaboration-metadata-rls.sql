-- Check current RLS policies on collaboration_metadata table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'collaboration_metadata';

-- Test direct access to collaboration_metadata
SELECT 
  'Direct metadata query result:' as info,
  cm.id,
  cm.river_walk_reference_id,
  cm.owner_id,
  cm.collaboration_enabled
FROM collaboration_metadata cm
WHERE cm.id = '7872270d-bbdf-40a8-9cc6-074c7f10b5b0';

-- Test the exact query used in the application
SELECT 
  'App query simulation:' as info,
  cm.river_walk_reference_id
FROM collaboration_metadata cm
WHERE cm.id IN ('7872270d-bbdf-40a8-9cc6-074c7f10b5b0');