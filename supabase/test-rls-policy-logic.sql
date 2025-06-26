-- Test the RLS policy logic step by step

-- 1. Check if the user has accepted collaboration access
SELECT 
  ca.id,
  ca.collaboration_id,
  ca.user_email,
  ca.accepted_at,
  'User has accepted collaboration' as status
FROM collaborator_access ca
WHERE ca.user_email = 'luke.kirsten@gmail.com'
  AND ca.accepted_at IS NOT NULL;

-- 2. Check if collaboration_metadata exists for the collaboration
SELECT 
  cm.id,
  cm.river_walk_reference_id,
  cm.owner_id,
  cm.collaboration_enabled,
  'Metadata exists' as status
FROM collaboration_metadata cm
WHERE cm.id IN (
  SELECT ca.collaboration_id 
  FROM collaborator_access ca 
  WHERE ca.user_email = 'luke.kirsten@gmail.com' 
    AND ca.accepted_at IS NOT NULL
);

-- 3. Check if the river walk exists and matches the metadata
SELECT 
  rw.id,
  rw.name,
  rw.user_id,
  rw.archived,
  'River walk exists' as status
FROM river_walks rw
WHERE rw.id IN (
  SELECT cm.river_walk_reference_id
  FROM collaboration_metadata cm
  WHERE cm.id IN (
    SELECT ca.collaboration_id 
    FROM collaborator_access ca 
    WHERE ca.user_email = 'luke.kirsten@gmail.com' 
      AND ca.accepted_at IS NOT NULL
  )
);

-- 4. Test the exact RLS policy condition for the specific river walk
SELECT 
  rw.id,
  rw.name,
  EXISTS (
    SELECT 1 
    FROM collaboration_metadata cm
    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
    WHERE cm.river_walk_reference_id = rw.id
    AND ca.user_email = 'luke.kirsten@gmail.com'
    AND ca.accepted_at IS NOT NULL
  ) as collaboration_condition_met,
  ('0b5c270b-0e30-4d2c-9c94-d4d0baf07e88'::uuid = rw.user_id) as owner_condition_met
FROM river_walks rw
WHERE rw.id = '9cf2aa3b-e4d8-4bf4-a725-f449af371239';

-- 5. Full test of RLS policy logic
SELECT 
  rw.id,
  rw.name,
  (
    '0b5c270b-0e30-4d2c-9c94-d4d0baf07e88'::uuid = rw.user_id 
    OR 
    EXISTS (
      SELECT 1 
      FROM collaboration_metadata cm
      JOIN collaborator_access ca ON cm.id = ca.collaboration_id
      WHERE cm.river_walk_reference_id = rw.id
      AND ca.user_email = 'luke.kirsten@gmail.com'
      AND ca.accepted_at IS NOT NULL
    )
  ) as should_be_accessible
FROM river_walks rw
WHERE rw.archived = false
ORDER BY rw.date DESC;