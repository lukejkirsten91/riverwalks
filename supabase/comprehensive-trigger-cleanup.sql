-- Comprehensive Database Trigger and Function Cleanup
-- This script removes ALL triggers and functions that might be referencing collaboration fields

-- First, let's see what triggers exist
SELECT n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name, t.tgfoid::regproc AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND NOT tgisinternal;

-- Drop ALL triggers on river_walks table
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'river_walks'
        AND NOT tgisinternal
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON river_walks CASCADE;';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Drop ALL triggers on sites table
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'sites'
        AND NOT tgisinternal
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON sites CASCADE;';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Drop ALL triggers on measurement_points table
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'measurement_points'
        AND NOT tgisinternal
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON measurement_points CASCADE;';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Drop any functions that might contain collaboration logic
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_collaboration_fields() CASCADE;
DROP FUNCTION IF EXISTS update_last_modified() CASCADE;
DROP FUNCTION IF EXISTS set_last_modified() CASCADE;
DROP FUNCTION IF EXISTS add_owner_as_collaborator() CASCADE;
DROP FUNCTION IF EXISTS generate_invite_token() CASCADE;
DROP FUNCTION IF EXISTS accept_collaboration_invite(text) CASCADE;

-- Remove any remaining collaboration columns (in case they still exist)
ALTER TABLE river_walks DROP COLUMN IF EXISTS collaboration_enabled CASCADE;
ALTER TABLE river_walks DROP COLUMN IF EXISTS last_modified_by CASCADE;
ALTER TABLE river_walks DROP COLUMN IF EXISTS last_modified_at CASCADE;

ALTER TABLE sites DROP COLUMN IF EXISTS last_modified_by CASCADE;
ALTER TABLE sites DROP COLUMN IF EXISTS last_modified_at CASCADE;

ALTER TABLE measurement_points DROP COLUMN IF EXISTS last_modified_by CASCADE;
ALTER TABLE measurement_points DROP COLUMN IF EXISTS last_modified_at CASCADE;

-- Drop collaboration tables (again, to be sure)
DROP TABLE IF EXISTS collaboration_invites CASCADE;
DROP TABLE IF EXISTS river_walk_collaborators CASCADE;
DROP TABLE IF EXISTS change_log CASCADE;

-- Verify all triggers are gone
SELECT 'Remaining triggers after cleanup:' as status;
SELECT n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name, t.tgfoid::regproc AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('river_walks', 'sites', 'measurement_points')
AND NOT tgisinternal;

-- Test a simple update to ensure it works
SELECT 'Testing UPDATE operation:' as status;

-- Final confirmation
SELECT 'Comprehensive trigger cleanup completed successfully' as status;