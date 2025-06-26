-- Debug script to check collaboration state after acceptance
-- Run this to see the current state of collaboration data

-- 1. Check collaborator_access records for the user
SELECT 
  ca.id,
  ca.collaboration_id,
  ca.user_email,
  ca.role,
  ca.accepted_at,
  ca.invited_at,
  ca.invite_expires_at
FROM collaborator_access ca
WHERE ca.user_email = 'luke.kirsten@gmail.com'
ORDER BY ca.invited_at DESC;

-- 2. Check collaboration_metadata records
SELECT 
  cm.id,
  cm.river_walk_reference_id,
  cm.owner_id,
  cm.collaboration_enabled,
  cm.created_at
FROM collaboration_metadata cm
ORDER BY cm.created_at DESC;

-- 3. Check if there's a metadata record for the expected collaboration ID
SELECT 
  ca.id as collaborator_id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  cm.id as metadata_id,
  cm.river_walk_reference_id,
  cm.owner_id,
  rw.id as river_walk_id,
  rw.name as river_walk_name,
  rw.user_id as river_walk_owner_id
FROM collaborator_access ca
LEFT JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
LEFT JOIN river_walks rw ON cm.river_walk_reference_id = rw.id
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL
ORDER BY ca.accepted_at DESC;

-- 4. Check the specific river walk that should be accessible
SELECT 
  id,
  name,
  user_id,
  archived,
  created_at
FROM river_walks 
WHERE id = '9cf2aa3b-e4d8-4bf4-a725-f449af371239';

-- 5. Test the RLS policy directly - this should return the river walk if RLS is working
-- Note: This query should be run by the authenticated user (luke.kirsten@gmail.com)
SELECT 
  id,
  name,
  user_id,
  archived
FROM river_walks 
WHERE archived = false
ORDER BY date DESC;