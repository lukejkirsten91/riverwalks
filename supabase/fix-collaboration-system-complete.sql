-- Complete fix for collaboration system RPC and RLS issues
-- Run this script to fix the 400 Bad Request errors and infinite recursion

-- 1. First ensure RLS is enabled on both tables
ALTER TABLE collaboration_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_access ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing problematic policies to start fresh
DROP POLICY IF EXISTS "Collaborators can view collaboration metadata for accessible river walks" ON collaboration_metadata;
DROP POLICY IF EXISTS "Users can view collaboration metadata for their river walks" ON collaboration_metadata;
DROP POLICY IF EXISTS "Users can view their collaborator access records" ON collaborator_access;
DROP POLICY IF EXISTS "Users can insert collaborator access records for their collaborations" ON collaborator_access;
DROP POLICY IF EXISTS "Users can update their collaborator access records" ON collaborator_access;
DROP POLICY IF EXISTS "Users can delete their collaborator access records" ON collaborator_access;
DROP POLICY IF EXISTS "collaboration_metadata_select_policy" ON collaboration_metadata;
DROP POLICY IF EXISTS "collaborator_access_select_policy" ON collaborator_access;
DROP POLICY IF EXISTS "collaborator_access_insert_policy" ON collaborator_access;
DROP POLICY IF EXISTS "collaborator_access_update_policy" ON collaborator_access;
DROP POLICY IF EXISTS "collaborator_access_delete_policy" ON collaborator_access;

-- 3. Create simple, non-recursive RLS policies
CREATE POLICY "collaboration_metadata_owners_only" ON collaboration_metadata FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "collaboration_metadata_owners_insert" ON collaboration_metadata FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "collaboration_metadata_owners_update" ON collaboration_metadata FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "collaborator_access_user_email" ON collaborator_access FOR SELECT
USING (user_email = auth.email());

CREATE POLICY "collaborator_access_insert_owners" ON collaborator_access FOR INSERT
WITH CHECK (
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "collaborator_access_update_users_and_owners" ON collaborator_access FOR UPDATE
USING (
  user_email = auth.email() 
  OR 
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "collaborator_access_delete_owners" ON collaborator_access FOR DELETE
USING (
  collaboration_id IN (
    SELECT id FROM collaboration_metadata WHERE owner_id = auth.uid()
  )
);

-- 4. Drop existing RPC functions
DROP FUNCTION IF EXISTS get_collaborated_river_walks();
DROP FUNCTION IF EXISTS debug_auth_info();
DROP FUNCTION IF EXISTS debug_collaboration_data();
DROP FUNCTION IF EXISTS debug_user_collaborations();

-- 5. Create fixed RPC function with proper syntax
CREATE OR REPLACE FUNCTION get_collaborated_river_walks()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  location TEXT,
  date DATE,
  weather_conditions TEXT,
  flow_rate NUMERIC,
  temperature NUMERIC,
  user_id UUID,
  archived BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  date_created TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Get river walks that the current user has collaborated access to
  RETURN QUERY 
  SELECT 
    rw.id,
    rw.name,
    rw.description,
    rw.location,
    rw.date,
    rw.weather_conditions,
    rw.flow_rate,
    rw.temperature,
    rw.user_id,
    rw.archived,
    rw.created_at,
    rw.updated_at,
    rw.date_created
  FROM river_walks rw
  INNER JOIN collaboration_metadata cm ON rw.id = cm.river_walk_reference_id
  INNER JOIN collaborator_access ca ON cm.id = ca.collaboration_id
  WHERE ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL
    AND rw.archived = false
  ORDER BY rw.date DESC;
END;
$$;

-- 6. Create debug RPC functions
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS TABLE (
  current_user_id UUID,
  current_user_email TEXT,
  is_authenticated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    (auth.uid() IS NOT NULL) as is_authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION debug_collaboration_data()
RETURNS TABLE (
  collaboration_count BIGINT,
  collaborator_access_count BIGINT,
  user_collaborations BIGINT,
  accepted_collaborations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM collaboration_metadata) as collaboration_count,
    (SELECT COUNT(*) FROM collaborator_access) as collaborator_access_count,
    (SELECT COUNT(*) FROM collaborator_access WHERE user_email = auth.email()) as user_collaborations,
    (SELECT COUNT(*) FROM collaborator_access WHERE user_email = auth.email() AND accepted_at IS NOT NULL) as accepted_collaborations;
END;
$$;

CREATE OR REPLACE FUNCTION debug_user_collaborations()
RETURNS TABLE (
  collaboration_id UUID,
  river_walk_id UUID,
  user_email TEXT,
  role TEXT,
  accepted_at TIMESTAMPTZ,
  river_walk_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.collaboration_id,
    cm.river_walk_reference_id as river_walk_id,
    ca.user_email,
    ca.role,
    ca.accepted_at,
    rw.name as river_walk_name
  FROM collaborator_access ca
  INNER JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
  LEFT JOIN river_walks rw ON cm.river_walk_reference_id = rw.id
  WHERE ca.user_email = auth.email()
  ORDER BY ca.invited_at DESC;
END;
$$;

-- 7. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_collaborated_river_walks() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_collaboration_data() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_collaborations() TO authenticated;

-- 8. Ensure authenticated role has proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON river_walks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON collaboration_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON collaborator_access TO authenticated;