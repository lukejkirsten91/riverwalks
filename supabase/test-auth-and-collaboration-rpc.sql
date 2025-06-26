-- Create RPC function to test auth context and collaboration access from application
CREATE OR REPLACE FUNCTION test_collaboration_access_with_auth()
RETURNS TABLE (
  step TEXT,
  auth_user_id UUID,
  auth_user_email TEXT,
  collaboration_count BIGINT,
  metadata_count BIGINT,
  river_walk_count BIGINT,
  details JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Check auth context
  RETURN QUERY 
  SELECT 
    'auth_context'::TEXT as step,
    auth.uid() as auth_user_id,
    auth.email() as auth_user_email,
    0::BIGINT as collaboration_count,
    0::BIGINT as metadata_count,
    0::BIGINT as river_walk_count,
    jsonb_build_object(
      'auth_uid', auth.uid(),
      'auth_email', auth.email(),
      'has_auth', (auth.uid() IS NOT NULL AND auth.email() IS NOT NULL)
    ) as details;

  -- Step 2: Check user's collaborations
  RETURN QUERY 
  SELECT 
    'user_collaborations'::TEXT as step,
    auth.uid() as auth_user_id,
    auth.email() as auth_user_email,
    COUNT(*)::BIGINT as collaboration_count,
    0::BIGINT as metadata_count,
    0::BIGINT as river_walk_count,
    jsonb_agg(
      jsonb_build_object(
        'collaboration_id', ca.collaboration_id,
        'user_email', ca.user_email,
        'accepted_at', ca.accepted_at
      )
    ) as details
  FROM collaborator_access ca
  WHERE ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL
  GROUP BY auth.uid(), auth.email();

  -- Step 3: Check accessible metadata
  RETURN QUERY 
  SELECT 
    'accessible_metadata'::TEXT as step,
    auth.uid() as auth_user_id,
    auth.email() as auth_user_email,
    0::BIGINT as collaboration_count,
    COUNT(*)::BIGINT as metadata_count,
    0::BIGINT as river_walk_count,
    jsonb_agg(
      jsonb_build_object(
        'metadata_id', cm.id,
        'river_walk_reference_id', cm.river_walk_reference_id,
        'owner_id', cm.owner_id
      )
    ) as details
  FROM collaboration_metadata cm
  WHERE EXISTS (
    SELECT 1 
    FROM collaborator_access ca
    WHERE ca.collaboration_id = cm.id
    AND ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL
  )
  GROUP BY auth.uid(), auth.email();

  -- Step 4: Check accessible river walks
  RETURN QUERY 
  SELECT 
    'accessible_river_walks'::TEXT as step,
    auth.uid() as auth_user_id,
    auth.email() as auth_user_email,
    0::BIGINT as collaboration_count,
    0::BIGINT as metadata_count,
    COUNT(*)::BIGINT as river_walk_count,
    jsonb_agg(
      jsonb_build_object(
        'river_walk_id', rw.id,
        'river_walk_name', rw.name,
        'owner_id', rw.user_id
      )
    ) as details
  FROM river_walks rw
  INNER JOIN collaboration_metadata cm ON rw.id = cm.river_walk_reference_id
  INNER JOIN collaborator_access ca ON cm.id = ca.collaboration_id
  WHERE ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL
    AND rw.archived = false
  GROUP BY auth.uid(), auth.email();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_collaboration_access_with_auth() TO authenticated;