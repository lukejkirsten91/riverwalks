-- Remove Collaboration System Columns and Tables
-- This script removes all collaboration-related database changes to restore pre-collaboration state

-- Drop collaboration tables
DROP TABLE IF EXISTS collaboration_invites CASCADE;
DROP TABLE IF EXISTS river_walk_collaborators CASCADE;
DROP TABLE IF EXISTS change_log CASCADE;

-- Remove collaboration columns from river_walks table
ALTER TABLE river_walks DROP COLUMN IF EXISTS collaboration_enabled;
ALTER TABLE river_walks DROP COLUMN IF EXISTS last_modified_by;
ALTER TABLE river_walks DROP COLUMN IF EXISTS last_modified_at;

-- Remove collaboration columns from sites table
ALTER TABLE sites DROP COLUMN IF EXISTS last_modified_by;
ALTER TABLE sites DROP COLUMN IF EXISTS last_modified_at;

-- Remove collaboration columns from measurement_points table
ALTER TABLE measurement_points DROP COLUMN IF EXISTS last_modified_by;
ALTER TABLE measurement_points DROP COLUMN IF EXISTS last_modified_at;

-- Drop collaboration-related functions
DROP FUNCTION IF EXISTS add_owner_as_collaborator() CASCADE;
DROP FUNCTION IF EXISTS generate_invite_token() CASCADE;
DROP FUNCTION IF EXISTS accept_collaboration_invite(text) CASCADE;

-- Drop collaboration-related triggers
DROP TRIGGER IF EXISTS trigger_add_owner_collaborator ON river_walks;

-- Drop collaboration-related indexes
DROP INDEX IF EXISTS idx_collaboration_invites_token;
DROP INDEX IF EXISTS idx_collaboration_invites_email;
DROP INDEX IF EXISTS idx_collaboration_invites_river_walk;
DROP INDEX IF EXISTS idx_collaborators_river_walk;
DROP INDEX IF EXISTS idx_collaborators_user;
DROP INDEX IF EXISTS idx_change_log_river_walk;
DROP INDEX IF EXISTS idx_change_log_timestamp;

-- Verify cleanup
SELECT 'Collaboration system successfully removed from database' as status;