-- Fix for missing collaboration metadata
-- This script creates the missing collaboration_metadata record for the accepted collaboration

-- First, let's check what collaboration records exist
SELECT 
  ca.id as collaborator_id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  ca.invite_token,
  cm.id as metadata_id,
  cm.river_walk_reference_id,
  cm.owner_id
FROM collaborator_access ca
LEFT JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL;

-- Create the missing collaboration metadata record
-- The collaboration_id from the logs is: 7872270d-bbdf-40a8-9cc6-074c7f10b5b0
-- The river_walk_id from acceptance is: 9cf2aa3b-e4d8-4bf4-a725-f449af371239

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
SELECT 
  ca.id as collaborator_id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  cm.id as metadata_id,
  cm.river_walk_reference_id,
  cm.owner_id,
  rw.name as river_walk_name
FROM collaborator_access ca
JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
JOIN river_walks rw ON cm.river_walk_reference_id = rw.id
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL;