-- Phase 10: River-Walk Collaboration (Link-Based Sharing) Database Schema
-- NEW Tables for collaboration functionality

-- Table: collaboration_metadata (one row per river walk that opts in)
CREATE TABLE IF NOT EXISTS collaboration_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  river_walk_reference_id UUID NOT NULL,      -- NO FK CONSTRAINT to avoid breaking existing sync
  owner_id UUID NOT NULL,
  collaboration_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: collaborator_access (one row per invited user)
CREATE TABLE IF NOT EXISTS collaborator_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID REFERENCES collaboration_metadata(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT CHECK (role IN ('editor','viewer')) DEFAULT 'editor',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_metadata_river_walk ON collaboration_metadata(river_walk_reference_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_metadata_owner ON collaboration_metadata(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_access_token ON collaborator_access(invite_token);
CREATE INDEX IF NOT EXISTS idx_collaborator_access_email ON collaborator_access(user_email);

-- Enable RLS on new tables
ALTER TABLE collaboration_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_metadata
-- Owner can see all collaboration metadata for their river walks
CREATE POLICY "Users can view collaboration metadata for their river walks"
ON collaboration_metadata FOR SELECT
USING (owner_id = auth.uid());

-- Owner can create collaboration metadata for their river walks
CREATE POLICY "Users can create collaboration metadata for their river walks"
ON collaboration_metadata FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Owner can update collaboration metadata for their river walks
CREATE POLICY "Users can update collaboration metadata for their river walks"
ON collaboration_metadata FOR UPDATE
USING (owner_id = auth.uid());

-- Owner can delete collaboration metadata for their river walks
CREATE POLICY "Users can delete collaboration metadata for their river walks"
ON collaboration_metadata FOR DELETE
USING (owner_id = auth.uid());

-- RLS Policies for collaborator_access
-- Owner can see all collaborators for their river walks
CREATE POLICY "Owners can view collaborators for their river walks"
ON collaborator_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaboration_metadata cm
    WHERE cm.id = collaboration_id AND cm.owner_id = auth.uid()
  )
);

-- Invited users can see their own collaborator records
CREATE POLICY "Users can view their own collaborator records"
ON collaborator_access FOR SELECT
USING (user_email = auth.email());

-- Owner can create collaborator access records
CREATE POLICY "Owners can create collaborator access records"
ON collaborator_access FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaboration_metadata cm
    WHERE cm.id = collaboration_id AND cm.owner_id = auth.uid()
  )
);

-- Owner can update collaborator access records
CREATE POLICY "Owners can update collaborator access records"
ON collaborator_access FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaboration_metadata cm
    WHERE cm.id = collaboration_id AND cm.owner_id = auth.uid()
  )
);

-- Owner can delete collaborator access records
CREATE POLICY "Owners can delete collaborator access records"
ON collaborator_access FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaboration_metadata cm
    WHERE cm.id = collaboration_id AND cm.owner_id = auth.uid()
  )
);

-- Function to generate invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  -- Use base64 and make it URL-safe by replacing characters
  RETURN replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invite link
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
  
  -- Create or update collaborator access
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
  )
  ON CONFLICT (invite_token) DO UPDATE SET
    invite_expires_at = v_expires_at;
  
  RETURN QUERY SELECT 
    v_token as invite_token,
    'https://riverwalks.co.uk/invite/' || v_token as invite_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invite
CREATE OR REPLACE FUNCTION accept_collaboration_invite(p_token TEXT)
RETURNS TABLE (
  success BOOLEAN,
  river_walk_id UUID,
  message TEXT
) AS $$
DECLARE
  v_invite_record RECORD;
BEGIN
  -- Find the invite record
  SELECT ca.*, cm.river_walk_reference_id
  INTO v_invite_record
  FROM collaborator_access ca
  JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
  WHERE ca.invite_token = p_token
    AND ca.invite_expires_at > NOW()
    AND ca.accepted_at IS NULL;
  
  IF v_invite_record IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite token';
    RETURN;
  END IF;
  
  -- Check if this is a universal invite (*) or specific email
  IF v_invite_record.user_email != '*' AND v_invite_record.user_email != auth.email() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'This invite is not for your email address';
    RETURN;
  END IF;
  
  -- Update the invite record with acceptance
  UPDATE collaborator_access
  SET 
    accepted_at = NOW(),
    user_email = CASE 
      WHEN user_email = '*' THEN auth.email()
      ELSE user_email
    END
  WHERE invite_token = p_token;
  
  RETURN QUERY SELECT 
    TRUE,
    v_invite_record.river_walk_reference_id,
    'Successfully joined collaboration';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a river walk
CREATE OR REPLACE FUNCTION user_has_collaboration_access(p_river_walk_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  role TEXT
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check if user is owner
  SELECT 'owner' as role, TRUE as has_access
  INTO v_result
  FROM river_walks
  WHERE id = p_river_walk_id AND user_id = auth.uid();
  
  IF v_result.has_access THEN
    RETURN QUERY SELECT v_result.has_access, v_result.role;
    RETURN;
  END IF;
  
  -- Check if user is collaborator
  SELECT ca.role, TRUE as has_access
  INTO v_result
  FROM collaborator_access ca
  JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
  WHERE cm.river_walk_reference_id = p_river_walk_id
    AND ca.user_email = auth.email()
    AND ca.accepted_at IS NOT NULL;
  
  IF v_result.has_access THEN
    RETURN QUERY SELECT v_result.has_access, v_result.role;
    RETURN;
  END IF;
  
  -- No access
  RETURN QUERY SELECT FALSE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;