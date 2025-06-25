-- Debug function to test auth.email() vs client-side email
CREATE OR REPLACE FUNCTION debug_auth_email_test()
RETURNS TABLE (
  auth_email TEXT,
  auth_uid UUID,
  current_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.email() as auth_email,
    auth.uid() as auth_uid,
    NOW() as current_timestamp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Debug function to get all collaborator access records with detailed info
CREATE OR REPLACE FUNCTION debug_get_all_collaborator_access()
RETURNS TABLE (
  id UUID,
  collaboration_id UUID,
  user_email TEXT,
  role TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  river_walk_id UUID,
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
    (ca.invite_expires_at <= NOW()) as is_expired,
    cm.river_walk_reference_id as river_walk_id,
    cm.owner_id
  FROM collaborator_access ca
  LEFT JOIN collaboration_metadata cm ON ca.collaboration_id = cm.id
  ORDER BY ca.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Debug function to test RLS policy access
CREATE OR REPLACE FUNCTION debug_test_rls_access(test_email TEXT)
RETURNS TABLE (
  can_see_record BOOLEAN,
  record_count INTEGER,
  auth_email_matches BOOLEAN,
  user_email TEXT,
  auth_email TEXT
) AS $$
DECLARE
  v_count INTEGER;
  v_auth_email TEXT;
BEGIN
  v_auth_email := auth.email();
  
  SELECT COUNT(*)
  INTO v_count
  FROM collaborator_access
  WHERE user_email = test_email
    AND accepted_at IS NULL
    AND invite_expires_at > NOW();
  
  RETURN QUERY SELECT 
    (v_count > 0) as can_see_record,
    v_count as record_count,
    (v_auth_email = test_email) as auth_email_matches,
    test_email as user_email,
    v_auth_email as auth_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive debug function to bypass RLS and show all data
CREATE OR REPLACE FUNCTION debug_comprehensive_invite_check(test_email TEXT)
RETURNS TABLE (
  test_phase TEXT,
  description TEXT,
  count_result INTEGER,
  sample_data JSONB,
  notes TEXT
) AS $$
DECLARE
  v_auth_email TEXT;
  v_auth_uid UUID;
  v_count INTEGER;
  v_sample JSONB;
BEGIN
  v_auth_email := auth.email();
  v_auth_uid := auth.uid();
  
  -- Phase 1: Show auth context
  RETURN QUERY SELECT 
    'auth_context'::TEXT,
    'Current authentication context'::TEXT,
    0::INTEGER,
    jsonb_build_object(
      'auth_email', v_auth_email,
      'auth_uid', v_auth_uid,
      'test_email', test_email,
      'emails_match', (v_auth_email = test_email)
    ),
    'Authentication context information'::TEXT;
  
  -- Phase 2: All collaborator_access records (RLS bypassed via SECURITY DEFINER)
  SELECT COUNT(*), 
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'user_email', user_email,
           'accepted_at', accepted_at,
           'invite_expires_at', invite_expires_at,
           'is_expired', (invite_expires_at <= NOW())
         )), '[]'::jsonb)
  INTO v_count, v_sample
  FROM collaborator_access;
  
  RETURN QUERY SELECT 
    'all_records'::TEXT,
    'All collaborator_access records in database'::TEXT,
    v_count,
    v_sample,
    'Shows all records regardless of RLS'::TEXT;
  
  -- Phase 3: Records matching test email
  SELECT COUNT(*), 
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'user_email', user_email,
           'accepted_at', accepted_at,
           'invite_expires_at', invite_expires_at,
           'is_expired', (invite_expires_at <= NOW()),
           'email_match_exact', (user_email = test_email),
           'email_match_lower', (LOWER(user_email) = LOWER(test_email))
         )), '[]'::jsonb)
  INTO v_count, v_sample
  FROM collaborator_access
  WHERE user_email = test_email;
  
  RETURN QUERY SELECT 
    'email_match'::TEXT,
    'Records matching test email exactly'::TEXT,
    v_count,
    v_sample,
    'Exact email match results'::TEXT;
  
  -- Phase 4: Pending invites for test email
  SELECT COUNT(*), 
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'user_email', user_email,
           'accepted_at', accepted_at,
           'invite_expires_at', invite_expires_at,
           'is_expired', (invite_expires_at <= NOW())
         )), '[]'::jsonb)
  INTO v_count, v_sample
  FROM collaborator_access
  WHERE user_email = test_email
    AND accepted_at IS NULL
    AND invite_expires_at > NOW();
  
  RETURN QUERY SELECT 
    'pending_invites'::TEXT,
    'Valid pending invites for test email'::TEXT,
    v_count,
    v_sample,
    'Should be >0 if invites exist and are valid'::TEXT;
  
  -- Phase 5: Test with RLS policy simulation (using auth.email())
  SELECT COUNT(*), 
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'user_email', user_email,
           'auth_email', v_auth_email,
           'auth_email_match', (user_email = v_auth_email)
         )), '[]'::jsonb)
  INTO v_count, v_sample
  FROM collaborator_access
  WHERE user_email = v_auth_email
    AND accepted_at IS NULL
    AND invite_expires_at > NOW();
  
  RETURN QUERY SELECT 
    'rls_simulation'::TEXT,
    'Simulating RLS policy using auth.email()'::TEXT,
    v_count,
    v_sample,
    'This shows what RLS policy should return'::TEXT;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user pending invites by bypassing RLS completely
CREATE OR REPLACE FUNCTION debug_get_user_pending_invites_bypass_rls(test_email TEXT)
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
  WHERE ca.user_email = test_email
    AND ca.accepted_at IS NULL
    AND ca.invite_expires_at > NOW()
  ORDER BY ca.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;