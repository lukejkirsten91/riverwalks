-- Fix the missing collaboration metadata record
-- Based on the logs, we have collaboration ID 7872270d-bbdf-40a8-9cc6-074c7f10b5b0 
-- but no corresponding metadata record

-- First, check what's currently in the tables
SELECT 'collaborator_access records:' as info;
SELECT 
  ca.id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  ca.invite_token
FROM collaborator_access ca
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL
ORDER BY ca.accepted_at DESC;

SELECT 'collaboration_metadata records:' as info;
SELECT 
  cm.id,
  cm.river_walk_reference_id,
  cm.owner_id,
  cm.collaboration_enabled
FROM collaboration_metadata cm
WHERE cm.id = '7872270d-bbdf-40a8-9cc6-074c7f10b5b0';

-- Insert the missing collaboration metadata record
-- We know from previous logs that the river walk ID should be 9cf2aa3b-e4d8-4bf4-a725-f449af371239
INSERT INTO collaboration_metadata (
  id,
  river_walk_reference_id,
  owner_id,
  collaboration_enabled,
  created_at
) VALUES (
  '7872270d-bbdf-40a8-9cc6-074c7f10b5b0',
  '9cf2aa3b-e4d8-4bf4-a725-f449af371239',
  (SELECT user_id FROM river_walks WHERE id = '9cf2aa3b-e4d8-4bf4-a725-f449af371239'),
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  river_walk_reference_id = EXCLUDED.river_walk_reference_id,
  owner_id = EXCLUDED.owner_id,
  collaboration_enabled = EXCLUDED.collaboration_enabled;

-- Verify the fix
SELECT 'After fix - full collaboration chain:' as info;
SELECT 
  ca.id as collaborator_id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  cm.id as metadata_id,
  cm.river_walk_reference_id,
  cm.owner_id,
  rw.id as river_walk_id,
  rw.name as river_walk_name
FROM collaborator_access ca
JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
JOIN river_walks rw ON cm.river_walk_reference_id = rw.id
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL
ORDER BY ca.accepted_at DESC;