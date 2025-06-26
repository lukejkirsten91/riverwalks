-- Debug RPC function to bypass RLS and check collaboration metadata
CREATE OR REPLACE FUNCTION debug_get_collaboration_metadata(collaboration_ids UUID[])
RETURNS TABLE (
  id UUID,
  river_walk_reference_id UUID,
  owner_id UUID,
  collaboration_enabled BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- This function bypasses RLS to check if metadata records exist
  RETURN QUERY 
  SELECT 
    cm.id,
    cm.river_walk_reference_id,
    cm.owner_id,
    cm.collaboration_enabled
  FROM collaboration_metadata cm
  WHERE cm.id = ANY(collaboration_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_get_collaboration_metadata(UUID[]) TO authenticated;