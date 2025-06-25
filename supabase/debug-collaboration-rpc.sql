-- Debug RPC functions to help troubleshoot collaboration issues

-- Function to test basic authentication
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

-- Function to debug collaboration data
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

-- Function to get detailed collaboration info for current user
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_collaboration_data() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_collaborations() TO authenticated;