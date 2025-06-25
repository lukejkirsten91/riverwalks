-- Fix the ambiguous column reference in collaboration functions

-- Drop and recreate the token generation function
DROP FUNCTION IF EXISTS generate_invite_token();

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  -- Use base64 and make it URL-safe by replacing characters
  RETURN replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the create_collaboration_invite function to remove ambiguous column reference
DROP FUNCTION IF EXISTS create_collaboration_invite(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_collaboration_invite(
  p_river_walk_id UUID,
  p_user_email TEXT DEFAULT '*',
  p_role TEXT DEFAULT 'editor'
)
RETURNS TABLE (
  invite_token TEXT,
  invite_url TEXT
) AS $$
DECLARE
  v_collaboration_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Set expiration to 7 days from now
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Get or create collaboration metadata
  SELECT id INTO v_collaboration_id
  FROM collaboration_metadata
  WHERE river_walk_reference_id = p_river_walk_id AND owner_id = auth.uid();
  
  IF v_collaboration_id IS NULL THEN
    INSERT INTO collaboration_metadata (river_walk_reference_id, owner_id)
    VALUES (p_river_walk_id, auth.uid())
    RETURNING id INTO v_collaboration_id;
  END IF;
  
  -- Generate token
  v_token := generate_invite_token();
  
  -- Create collaborator access (removed ON CONFLICT to avoid ambiguity)
  INSERT INTO collaborator_access (
    collaboration_id,
    user_email,
    role,
    invite_token,
    invite_expires_at
  ) VALUES (
    v_collaboration_id,
    p_user_email,
    p_role,
    v_token,
    v_expires_at
  );
  
  RETURN QUERY SELECT 
    v_token as invite_token,
    'https://riverwalks.co.uk/invite/' || v_token as invite_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;