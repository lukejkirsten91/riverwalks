-- Fix duplicate collaboration_metadata records
-- This script removes duplicate entries keeping only the newest one for each river walk

BEGIN;

-- First, let's see what duplicates we have
SELECT 
  river_walk_reference_id,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at DESC) as metadata_ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM collaboration_metadata 
GROUP BY river_walk_reference_id 
HAVING COUNT(*) > 1;

-- Create a temporary table with the IDs we want to keep (newest for each river walk)
CREATE TEMP TABLE metadata_to_keep AS
SELECT DISTINCT ON (river_walk_reference_id) 
  id,
  river_walk_reference_id,
  created_at
FROM collaboration_metadata 
ORDER BY river_walk_reference_id, created_at DESC;

-- Show what we're keeping vs what we're deleting
SELECT 
  'KEEPING' as action,
  id,
  river_walk_reference_id,
  created_at
FROM metadata_to_keep
UNION ALL
SELECT 
  'DELETING' as action,
  cm.id,
  cm.river_walk_reference_id,
  cm.created_at
FROM collaboration_metadata cm
LEFT JOIN metadata_to_keep mtk ON cm.id = mtk.id
WHERE mtk.id IS NULL
ORDER BY river_walk_reference_id, created_at DESC;

-- First, delete orphaned collaborator_access records that reference metadata we're about to delete
DELETE FROM collaborator_access 
WHERE collaboration_id IN (
  SELECT cm.id 
  FROM collaboration_metadata cm
  LEFT JOIN metadata_to_keep mtk ON cm.id = mtk.id
  WHERE mtk.id IS NULL
);

-- Now delete the duplicate collaboration_metadata records (keeping only the newest)
DELETE FROM collaboration_metadata 
WHERE id NOT IN (SELECT id FROM metadata_to_keep);

-- Verify the cleanup
SELECT 
  river_walk_reference_id,
  COUNT(*) as remaining_count
FROM collaboration_metadata 
GROUP BY river_walk_reference_id 
ORDER BY river_walk_reference_id;

-- Add a unique constraint to prevent future duplicates
ALTER TABLE collaboration_metadata 
ADD CONSTRAINT collaboration_metadata_river_walk_unique 
UNIQUE (river_walk_reference_id);

SELECT 'Duplicate collaboration metadata cleanup completed successfully' as status;

COMMIT;