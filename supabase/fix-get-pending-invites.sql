-- Fixed function to get user pending invites that uses auth.email() consistently
CREATE OR REPLACE FUNCTION get_user_pending_invites()
RETURNS TABLE (
  id UUID,
  collaboration_id UUID,
  user_email TEXT,
  role TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  river_walk_reference_id UUID,
  owner_id UUID
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ca.id,
    ca.collaboration_id,
    ca.user_email,
    ca.role,
    ca.invited_at,
    ca.accepted_at,
    ca.invite_token,
    ca.invite_expires_at,
    cm.river_walk_reference_id,
    cm.owner_id
  FROM collaborator_access ca
  LEFT JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
  WHERE ca.user_email = auth.email()
    AND ca.accepted_at IS NULL
    AND ca.invite_expires_at > NOW()
  ORDER BY ca.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;