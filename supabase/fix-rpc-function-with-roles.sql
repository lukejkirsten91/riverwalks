-- Drop and recreate the RPC function with role information
-- First drop the existing function
DROP FUNCTION IF EXISTS get_user_accessible_river_walks();

-- Create new function with updated return type including collaboration_role
CREATE OR REPLACE FUNCTION get_user_accessible_river_walks()
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
  date_created TIMESTAMPTZ,
  access_type TEXT,
  collaboration_role TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Return owned river walks
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
    rw.date_created,
    'owned'::TEXT as access_type,
    'owner'::TEXT as collaboration_role
  FROM river_walks rw
  WHERE rw.user_id = auth.uid()
    AND rw.archived = false;

  -- Return collaborated river walks with role information
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
    rw.date_created,
    'collaborated'::TEXT as access_type,
    ca.role::TEXT as collaboration_role
  FROM river_walks rw
  INNER JOIN collaboration_metadata cm ON rw.id = cm.river_walk_reference_id
  INNER JOIN collaborator_access ca ON cm.id = ca.collaboration_id
  WHERE ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL
    AND rw.archived = false
    AND rw.user_id != auth.uid(); -- Don't duplicate owned river walks
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_accessible_river_walks() TO authenticated;

SELECT 'RPC function successfully updated with role information' as status;