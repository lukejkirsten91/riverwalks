-- Create RPC function to manually test the RLS policy logic
CREATE OR REPLACE FUNCTION test_rls_policy_manually(p_river_walk_id UUID)
RETURNS TABLE (
  current_user_id UUID,
  current_user_email TEXT,
  target_river_walk_id UUID,
  owner_condition BOOLEAN,
  collaboration_condition BOOLEAN,
  should_have_access BOOLEAN,
  collaboration_data JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the target river walk's owner
  SELECT rw.user_id INTO target_user_id 
  FROM river_walks rw 
  WHERE rw.id = p_river_walk_id;

  RETURN QUERY 
  SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    p_river_walk_id as target_river_walk_id,
    (auth.uid() = target_user_id) as owner_condition,
    EXISTS (
      SELECT 1 
      FROM collaboration_metadata cm
      JOIN collaborator_access ca ON cm.id = ca.collaboration_id
      WHERE cm.river_walk_reference_id = p_river_walk_id
      AND ca.user_email = auth.email()
      AND ca.accepted_at IS NOT NULL
    ) as collaboration_condition,
    (
      auth.uid() = target_user_id 
      OR 
      EXISTS (
        SELECT 1 
        FROM collaboration_metadata cm
        JOIN collaborator_access ca ON cm.id = ca.collaboration_id
        WHERE cm.river_walk_reference_id = p_river_walk_id
        AND ca.user_email = auth.email()
        AND ca.accepted_at IS NOT NULL
      )
    ) as should_have_access,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'collaboration_id', ca.collaboration_id,
          'user_email', ca.user_email,
          'accepted_at', ca.accepted_at,
          'river_walk_reference_id', cm.river_walk_reference_id
        )
      )
      FROM collaboration_metadata cm
      JOIN collaborator_access ca ON cm.id = ca.collaboration_id
      WHERE cm.river_walk_reference_id = p_river_walk_id
      AND ca.user_email = auth.email()
    ) as collaboration_data;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_rls_policy_manually(UUID) TO authenticated;