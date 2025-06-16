-- Check if the photo_url column exists in the sites table
-- Run this in Supabase SQL Editor to verify database schema

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sites' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if notes column exists in river_walks table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'river_walks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'site-photos';