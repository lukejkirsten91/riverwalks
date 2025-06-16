-- Fix storage RLS policies for photo uploads
-- Run this SQL in Supabase SQL Editor to fix RLS policy violations

-- First, drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can upload their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own site photos" ON storage.objects;

-- Create corrected RLS policies for storage.objects
-- Policy for uploading files
CREATE POLICY "Users can upload site photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'site-photos' AND
    auth.uid() IS NOT NULL
);

-- Policy for viewing files  
CREATE POLICY "Users can view site photos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'site-photos' AND
    auth.uid() IS NOT NULL
);

-- Policy for updating files
CREATE POLICY "Users can update site photos" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'site-photos' AND
    auth.uid() IS NOT NULL
);

-- Policy for deleting files
CREATE POLICY "Users can delete site photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'site-photos' AND
    auth.uid() IS NOT NULL
);

-- Alternative: If you want user-specific folders, use this instead:
/*
-- Drop the above policies and use these user-specific ones:

DROP POLICY IF EXISTS "Users can upload site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete site photos" ON storage.objects;

CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view own folder" ON storage.objects
FOR SELECT USING (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update own folder" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own folder" ON storage.objects
FOR DELETE USING (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
);
*/

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%site%photo%';