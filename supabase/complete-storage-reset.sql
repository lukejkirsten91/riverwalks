-- Complete storage reset and proper setup
-- Run this SQL in Supabase SQL Editor

-- 1. Drop ALL existing storage policies to start fresh
DROP POLICY IF EXISTS "Users can upload site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own folder" ON storage.objects;

-- 2. Create simple, permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload to site-photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'site-photos' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view site-photos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'site-photos' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update site-photos" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'site-photos' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete site-photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'site-photos' AND
    auth.role() = 'authenticated'
);

-- 3. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
    'site-photos',
    'site-photos', 
    true,
    5242880, -- 5MB
    '{"image/png","image/jpeg","image/jpg","image/webp"}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = '{"image/png","image/jpeg","image/jpg","image/webp"}',
    updated_at = NOW();

-- 4. Verify everything is set up correctly
SELECT 'Storage Bucket:' as check_type, id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'site-photos';

SELECT 'Storage Policies:' as check_type, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%site-photos%';

-- 5. Test query to ensure RLS is working
SELECT 'Test Access:' as check_type, 'Can access storage.objects' as result
WHERE EXISTS (
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'site-photos' 
    LIMIT 1
);