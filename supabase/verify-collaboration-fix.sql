-- Verify that the collaboration system is now working
-- Test the full chain from collaborator_access -> collaboration_metadata -> river_walks

-- 1. Check current user's auth context
SELECT 
  'Current user context:' as info,
  auth.uid() as user_id,
  auth.email() as user_email;

-- 2. Check user's accepted collaborations
SELECT 
  'User collaborations:' as info,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at
FROM collaborator_access ca
WHERE ca.user_email = auth.email()
  AND ca.accepted_at IS NOT NULL;

-- 3. Check if user can now access collaboration_metadata
SELECT 
  'Accessible metadata:' as info,
  cm.id,
  cm.river_walk_reference_id,
  cm.owner_id
FROM collaboration_metadata cm
WHERE EXISTS (
  SELECT 1 
  FROM collaborator_access ca
  WHERE ca.collaboration_id = cm.id
  AND ca.user_email = auth.email()
  AND ca.accepted_at IS NOT NULL
);

-- 4. Check if user can access the collaborated river walk
SELECT 
  'Accessible river walks:' as info,
  rw.id,
  rw.name,
  rw.user_id as owner_id,
  'collaborated' as access_type
FROM river_walks rw
INNER JOIN collaboration_metadata cm ON rw.id = cm.river_walk_reference_id
INNER JOIN collaborator_access ca ON cm.id = ca.collaboration_id
WHERE ca.user_email = auth.email()
  AND ca.accepted_at IS NOT NULL
  AND rw.archived = false;