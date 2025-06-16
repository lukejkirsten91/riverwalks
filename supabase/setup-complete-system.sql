-- Complete setup script for photo upload system
-- Run this entire script in Supabase SQL Editor

-- 1. Add missing columns to existing tables (if they don't exist)
DO $$ 
BEGIN 
    -- Add notes column to river_walks if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'river_walks' AND column_name = 'notes'
    ) THEN
        ALTER TABLE river_walks ADD COLUMN notes TEXT;
    END IF;

    -- Add coordinates and photo columns to sites if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sites' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE sites ADD COLUMN latitude DECIMAL(10,8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sites' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE sites ADD COLUMN longitude DECIMAL(11,8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sites' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE sites ADD COLUMN photo_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sites' AND column_name = 'notes'
    ) THEN
        ALTER TABLE sites ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 2. Create storage bucket (insert directly into storage.buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
    'site-photos',
    'site-photos', 
    true,
    5242880, -- 5MB
    '{"image/png","image/jpeg","image/jpg","image/webp"}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for storage
-- Allow users to upload files to their own folder
CREATE POLICY "Users can upload site photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view site photos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete site photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'site-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Create index for better performance when searching by coordinates
CREATE INDEX IF NOT EXISTS idx_sites_coordinates ON sites(latitude, longitude);

-- Verification queries
SELECT 'Database Schema Check:' as check_type;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('sites', 'river_walks') 
  AND column_name IN ('notes', 'latitude', 'longitude', 'photo_url')
ORDER BY table_name, column_name;

SELECT 'Storage Bucket Check:' as check_type;
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'site-photos';

SELECT 'Storage Policies Check:' as check_type;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%site%photo%';