-- Create RPC function to get all accessible river walks (owned + collaborated)
-- This bypasses RLS and implements the logic directly
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
  access_type TEXT
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
    'owned'::TEXT as access_type
  FROM river_walks rw
  WHERE rw.user_id = auth.uid()
    AND rw.archived = false;

  -- Return collaborated river walks
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
    'collaborated'::TEXT as access_type
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