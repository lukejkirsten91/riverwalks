-- SAFE USER DELETION SCRIPT
-- This script will delete test users and ALL their associated data
-- Target users: ljkirsten@aldenham.com, ljkirsten91@gmail.com

-- WARNING: This operation is IRREVERSIBLE
-- Make sure you want to delete these users permanently

BEGIN;

-- First, let's find the user IDs for the emails we want to delete
DO $$
DECLARE
    aldenham_user_id UUID;
    gmail_user_id UUID;
    deleted_count INTEGER := 0;
BEGIN
    -- Get user IDs
    SELECT id INTO aldenham_user_id FROM auth.users WHERE email = 'ljkirsten@aldenham.com';
    SELECT id INTO gmail_user_id FROM auth.users WHERE email = 'ljkirsten91@gmail.com';
    
    RAISE NOTICE 'Found aldenham user: %', aldenham_user_id;
    RAISE NOTICE 'Found gmail user: %', gmail_user_id;
    
    -- Delete data for ljkirsten@aldenham.com if user exists
    IF aldenham_user_id IS NOT NULL THEN
        RAISE NOTICE 'Deleting data for ljkirsten@aldenham.com (ID: %)', aldenham_user_id;
        
        -- 1. Delete collaboration access records by email
        DELETE FROM collaborator_access WHERE user_email = 'ljkirsten@aldenham.com';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collaborator_access records for aldenham', deleted_count;
        
        -- 2. Delete collaboration metadata owned by this user
        DELETE FROM collaboration_metadata WHERE owner_id = aldenham_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collaboration_metadata records for aldenham', deleted_count;
        
        -- 3. Delete payment events (not CASCADE, so manual delete)
        DELETE FROM payment_events WHERE user_id = aldenham_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % payment_events records for aldenham', deleted_count;
        
        -- 4. Delete vouchers created by this user
        DELETE FROM vouchers WHERE created_by = aldenham_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % vouchers created by aldenham', deleted_count;
        
        -- 5. Delete storage objects (site photos)
        DELETE FROM storage.objects 
        WHERE bucket_id = 'site-photos' 
        AND (storage.foldername(name))[1] = aldenham_user_id::text;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % storage objects for aldenham', deleted_count;
        
        -- 6. Delete the user (this will CASCADE delete river_walks, sites, measurement_points, subscriptions, user_agreements)
        DELETE FROM auth.users WHERE id = aldenham_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % auth.users record for aldenham (this cascades to related data)', deleted_count;
    ELSE
        RAISE NOTICE 'User ljkirsten@aldenham.com not found in database';
    END IF;
    
    -- Delete data for ljkirsten91@gmail.com if user exists
    IF gmail_user_id IS NOT NULL THEN
        RAISE NOTICE 'Deleting data for ljkirsten91@gmail.com (ID: %)', gmail_user_id;
        
        -- 1. Delete collaboration access records by email
        DELETE FROM collaborator_access WHERE user_email = 'ljkirsten91@gmail.com';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collaborator_access records for gmail', deleted_count;
        
        -- 2. Delete collaboration metadata owned by this user
        DELETE FROM collaboration_metadata WHERE owner_id = gmail_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collaboration_metadata records for gmail', deleted_count;
        
        -- 3. Delete payment events (not CASCADE, so manual delete)
        DELETE FROM payment_events WHERE user_id = gmail_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % payment_events records for gmail', deleted_count;
        
        -- 4. Delete vouchers created by this user
        DELETE FROM vouchers WHERE created_by = gmail_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % vouchers created by gmail', deleted_count;
        
        -- 5. Delete storage objects (site photos)
        DELETE FROM storage.objects 
        WHERE bucket_id = 'site-photos' 
        AND (storage.foldername(name))[1] = gmail_user_id::text;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % storage objects for gmail', deleted_count;
        
        -- 6. Delete the user (this will CASCADE delete river_walks, sites, measurement_points, subscriptions, user_agreements)
        DELETE FROM auth.users WHERE id = gmail_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % auth.users record for gmail (this cascades to related data)', deleted_count;
    ELSE
        RAISE NOTICE 'User ljkirsten91@gmail.com not found in database';
    END IF;
    
    RAISE NOTICE 'User deletion completed successfully!';
END $$;

-- Verify deletion by checking if users still exist
SELECT 'Verification - Users after deletion:' as status;
SELECT email, created_at FROM auth.users WHERE email IN ('ljkirsten@aldenham.com', 'ljkirsten91@gmail.com');

-- Count remaining data to make sure everything was cleaned up
SELECT 'Remaining data check:' as status;
SELECT 
    (SELECT COUNT(*) FROM river_walks) as total_river_walks,
    (SELECT COUNT(*) FROM sites) as total_sites,
    (SELECT COUNT(*) FROM subscriptions) as total_subscriptions,
    (SELECT COUNT(*) FROM user_agreements) as total_user_agreements,
    (SELECT COUNT(*) FROM collaboration_metadata) as total_collaboration_metadata,
    (SELECT COUNT(*) FROM collaborator_access) as total_collaborator_access,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'site-photos') as total_site_photos;

COMMIT;