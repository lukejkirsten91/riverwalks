-- Fixed version of RPC function to get collaborated river walks
-- This function uses SECURITY DEFINER to bypass RLS and perform the joins at the database level

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_collaborated_river_walks() TO authenticated;