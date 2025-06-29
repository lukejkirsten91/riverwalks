import { supabase } from '../supabase';

// Types for collaboration
export interface CollaborationMetadata {
  id: string;
  river_walk_reference_id: string;
  owner_id: string;
  collaboration_enabled: boolean;
  created_at: string;
}

export interface CollaboratorAccess {
  id: string;
  collaboration_id: string;
  user_email: string;
  role: 'editor' | 'viewer';
  invited_at: string;
  accepted_at: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
}

export interface InviteResult {
  invite_token: string;
  invite_url: string;
}

export interface AcceptInviteResult {
  success: boolean;
  river_walk_id: string | null;
  message: string;
}

export interface UserAccess {
  has_access: boolean;
  role: string | null;
}

export interface InviteDetails {
  valid: boolean;
  user_email: string;
  role: string;
  expires_at: string;
  river_walk_name?: string;
  invited_by?: string;
}

/**
 * Creates a collaboration invite for a river walk
 */
export async function createCollaborationInvite(
  riverWalkId: string,
  userEmail: string = '*',
  role: 'editor' | 'viewer' = 'editor'
): Promise<InviteResult> {
  console.log('🔍 [DEBUG] createCollaborationInvite: Starting function', {
    riverWalkId,
    userEmail: userEmail === '*' ? 'WILDCARD' : '[EMAIL_PROVIDED]',
    role,
    timestamp: new Date().toISOString()
  });

  console.log('🔍 [DEBUG] createCollaborationInvite: Calling Supabase RPC function', {
    functionName: 'create_collaboration_invite',
    parameters: {
      p_river_walk_id: riverWalkId,
      p_user_email: userEmail === '*' ? 'WILDCARD' : '[EMAIL_PROVIDED]',
      p_role: role
    }
  });

  const { data, error } = await supabase.rpc('create_collaboration_invite', {
    p_river_walk_id: riverWalkId,
    p_user_email: userEmail,
    p_role: role
  });

  console.log('🔍 [DEBUG] createCollaborationInvite: Supabase RPC response', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    hasData: !!data,
    dataType: typeof data,
    dataIsArray: Array.isArray(data),
    dataLength: data ? (Array.isArray(data) ? data.length : 'not-array') : 0,
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : null
  });

  if (error) {
    console.error('🔍 [DEBUG] createCollaborationInvite: Database error occurred', {
      error,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      errorCode: error.code
    });
    console.error('Error creating collaboration invite:', error);
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.error('🔍 [DEBUG] createCollaborationInvite: No data returned from RPC', {
      data,
      dataLength: data ? data.length : 'null/undefined'
    });
    throw new Error('No invite data returned');
  }

  const result = data[0];
  console.log('🔍 [DEBUG] createCollaborationInvite: Successful result', {
    hasInviteToken: !!result.invite_token,
    hasInviteUrl: !!result.invite_url,
    inviteTokenLength: result.invite_token ? result.invite_token.length : 0,
    inviteUrlLength: result.invite_url ? result.invite_url.length : 0,
    inviteUrlPreview: result.invite_url ? result.invite_url.substring(0, 50) + '...' : null
  });

  return result;
}

/**
 * Gets invite details without accepting it (for validation)
 */
export async function getInviteDetails(token: string): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from('collaborator_access')
    .select(`
      user_email,
      role,
      invite_expires_at,
      collaboration_metadata!inner (
        river_walk_reference_id
      )
    `)
    .eq('invite_token', token)
    .gt('invite_expires_at', new Date().toISOString())
    .is('accepted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching invite details:', error);
    return { valid: false, user_email: '', role: '', expires_at: '' };
  }

  if (!data) {
    return { valid: false, user_email: '', role: '', expires_at: '' };
  }

  return {
    valid: true,
    user_email: data.user_email,
    role: data.role,
    expires_at: data.invite_expires_at,
  };
}

/**
 * Accepts a collaboration invite using a token
 */
export async function acceptCollaborationInvite(token: string): Promise<AcceptInviteResult> {
  console.log('🔍 [DEBUG] acceptCollaborationInvite: Starting function', {
    token: token ? token.substring(0, 10) + '...' : null,
    tokenLength: token ? token.length : 0,
    timestamp: new Date().toISOString()
  });

  console.log('🔍 [DEBUG] acceptCollaborationInvite: Calling Supabase RPC function', {
    functionName: 'accept_collaboration_invite',
    parameters: { p_token: token ? token.substring(0, 10) + '...' : null }
  });

  const { data, error } = await supabase.rpc('accept_collaboration_invite', {
    p_token: token
  });

  console.log('🔍 [DEBUG] acceptCollaborationInvite: Supabase RPC response', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    hasData: !!data,
    dataType: data ? typeof data : null,
    dataIsArray: Array.isArray(data),
    dataLength: data ? data.length : 0
  });

  if (error) {
    console.error('🔍 [DEBUG] acceptCollaborationInvite: Database error', error);
    throw new Error(`Failed to accept invite: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.error('🔍 [DEBUG] acceptCollaborationInvite: No data returned');
    throw new Error('No response from invite acceptance');
  }

  const result = data[0];
  console.log('🔍 [DEBUG] acceptCollaborationInvite: Successful result', {
    success: result.success,
    message: result.message,
    riverWalkId: result.river_walk_id,
    hasRiverWalkId: !!result.river_walk_id
  });

  return result;
}

/**
 * Checks if the current user has access to a river walk
 */
export async function checkUserAccess(riverWalkId: string): Promise<UserAccess> {
  const { data, error } = await supabase.rpc('user_has_collaboration_access', {
    p_river_walk_id: riverWalkId
  });

  if (error) {
    console.error('Error checking user access:', error);
    return { has_access: false, role: null };
  }

  if (!data || data.length === 0) {
    return { has_access: false, role: null };
  }

  return data[0];
}

/**
 * Gets collaboration metadata for a river walk
 */
export async function getCollaborationMetadata(riverWalkId: string): Promise<CollaborationMetadata | null> {
  // First try the expected case (0 or 1 record)
  const { data, error } = await supabase
    .from('collaboration_metadata')
    .select('*')
    .eq('river_walk_reference_id', riverWalkId)
    .maybeSingle();

  // If we get the "multiple rows" error, handle it gracefully
  if (error && error.message.includes('multiple (or no) rows returned')) {
    console.warn('Multiple collaboration metadata records found for river walk:', riverWalkId);
    
    // Query again to get all records and take the newest one
    const { data: multipleData, error: multipleError } = await supabase
      .from('collaboration_metadata')
      .select('*')
      .eq('river_walk_reference_id', riverWalkId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (multipleError) {
      console.error('Error fetching collaboration metadata (fallback):', multipleError);
      throw new Error(`Failed to fetch collaboration metadata: ${multipleError.message}`);
    }
    
    return multipleData && multipleData.length > 0 ? multipleData[0] : null;
  }
  
  if (error) {
    console.error('Error fetching collaboration metadata:', error);
    throw new Error(`Failed to fetch collaboration metadata: ${error.message}`);
  }

  return data;
}

/**
 * Gets all collaborators for a river walk
 */
export async function getCollaborators(riverWalkId: string): Promise<CollaboratorAccess[]> {
  // First get the collaboration metadata
  const collaborationMetadata = await getCollaborationMetadata(riverWalkId);
  if (!collaborationMetadata) {
    return [];
  }

  const { data, error } = await supabase
    .from('collaborator_access')
    .select('*')
    .eq('collaboration_id', collaborationMetadata.id)
    .order('invited_at', { ascending: false });

  if (error) {
    console.error('Error fetching collaborators:', error);
    throw new Error(`Failed to fetch collaborators: ${error.message}`);
  }

  return data || [];
}

/**
 * Revokes access for a collaborator
 */
export async function revokeCollaboratorAccess(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('collaborator_access')
    .delete()
    .eq('id', collaboratorId);

  if (error) {
    console.error('Error revoking collaborator access:', error);
    throw new Error(`Failed to revoke access: ${error.message}`);
  }
}

/**
 * Updates collaboration settings for a river walk
 */
export async function updateCollaborationSettings(
  riverWalkId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('collaboration_metadata')
    .update({ collaboration_enabled: enabled })
    .eq('river_walk_reference_id', riverWalkId);

  if (error) {
    console.error('Error updating collaboration settings:', error);
    throw new Error(`Failed to update collaboration settings: ${error.message}`);
  }
}

/**
 * Checks if collaboration is enabled for the application
 */
export function isCollaborationEnabled(): boolean {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_COLLAB === 'true';
  console.log('🔍 [DEBUG] isCollaborationEnabled:', {
    envValue: process.env.NEXT_PUBLIC_ENABLE_COLLAB,
    enabled,
    timestamp: new Date().toISOString()
  });
  return enabled;
}

/**
 * Gets pending invites for the current user
 */
export async function getUserPendingInvites(): Promise<CollaboratorAccess[]> {
  console.log('🔍 [DEBUG] getUserPendingInvites: Starting function');
  
  const { data: user } = await supabase.auth.getUser();
  console.log('🔍 [DEBUG] getUserPendingInvites: User data retrieved', {
    hasUser: !!user.user,
    email: user.user?.email,
    userId: user.user?.id
  });
  
  if (!user.user?.email) {
    console.log('🔍 [DEBUG] getUserPendingInvites: No user email found, returning empty array');
    return [];
  }

  const userEmail = user.user.email;
  const userEmailLower = userEmail.toLowerCase();
  const currentTime = new Date().toISOString();
  
  console.log('🔍 [DEBUG] getUserPendingInvites: Query parameters', {
    userEmail,
    userEmailLower,
    currentTime,
    queryConditions: {
      user_email: userEmail,
      accepted_at: 'null',
      invite_expires_at_gt: currentTime
    }
  });

  // First, let's check what invites exist in the database regardless of RLS
  console.log('🔍 [DEBUG] getUserPendingInvites: Testing auth.email() vs user.email equivalency');
  const { data: authTest } = await supabase.rpc('debug_auth_email_test');
  console.log('🔍 [DEBUG] getUserPendingInvites: Auth email test result', authTest);

  // Run comprehensive debug check
  console.log('🔍 [DEBUG] getUserPendingInvites: Running comprehensive debug check');
  const { data: debugData } = await supabase.rpc('debug_comprehensive_invite_check', { test_email: userEmail });
  console.log('🔍 [DEBUG] getUserPendingInvites: Comprehensive debug results', debugData);

  // Test RLS bypass to see if RLS is blocking the results
  console.log('🔍 [DEBUG] getUserPendingInvites: Testing RLS bypass');
  const { data: rlsBypassData, error: rlsBypassError } = await supabase.rpc('debug_get_user_pending_invites_bypass_rls', { test_email: userEmail });
  console.log('🔍 [DEBUG] getUserPendingInvites: RLS bypass result', {
    hasError: !!rlsBypassError,
    error: rlsBypassError,
    dataCount: rlsBypassData ? rlsBypassData.length : 0,
    data: rlsBypassData
  });

  // Test 1: Query without the inner join to see if that's the issue
  console.log('🔍 [DEBUG] getUserPendingInvites: Test query WITHOUT inner join');
  const { data: testData1, error: testError1 } = await supabase
    .from('collaborator_access')
    .select('*')
    .eq('user_email', userEmail)
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime);

  console.log('🔍 [DEBUG] getUserPendingInvites: Test 1 result (no join)', {
    hasError: !!testError1,
    error: testError1,
    dataCount: testData1 ? testData1.length : 0,
    data: testData1 ? testData1.map(record => ({
      id: record.id,
      collaboration_id: record.collaboration_id,
      user_email: record.user_email,
      role: record.role,
      invite_expires_at: record.invite_expires_at,
      accepted_at: record.accepted_at,
      invite_token: record.invite_token ? 'present' : 'missing'
    })) : null
  });

  // Test 1b: Query with LEFT join instead of INNER join
  console.log('🔍 [DEBUG] getUserPendingInvites: Test query with LEFT join');
  const { data: testData1b, error: testError1b } = await supabase
    .from('collaborator_access')
    .select(`
      *,
      collaboration_metadata (
        river_walk_reference_id,
        owner_id
      )
    `)
    .eq('user_email', userEmail)
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime);

  console.log('🔍 [DEBUG] getUserPendingInvites: Test 1b result (left join)', {
    hasError: !!testError1b,
    error: testError1b,
    dataCount: testData1b ? testData1b.length : 0,
    data: testData1b ? testData1b.map(record => ({
      id: record.id,
      collaboration_id: record.collaboration_id,
      user_email: record.user_email,
      role: record.role,
      has_collaboration_metadata: !!record.collaboration_metadata,
      collaboration_metadata: record.collaboration_metadata
    })) : null
  });

  // Test 2: Query with case-insensitive email matching
  console.log('🔍 [DEBUG] getUserPendingInvites: Test query with LOWER email comparison');
  const { data: testData2, error: testError2 } = await supabase
    .from('collaborator_access')
    .select('*')
    .ilike('user_email', userEmailLower)
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime);

  console.log('🔍 [DEBUG] getUserPendingInvites: Test 2 result (case insensitive)', {
    hasError: !!testError2,
    error: testError2,
    dataCount: testData2 ? testData2.length : 0,
    data: testData2
  });

  // Test 3: Query all unexpired invites to see what's there
  console.log('🔍 [DEBUG] getUserPendingInvites: Test query for ALL unexpired invites');
  const { data: testData3, error: testError3 } = await supabase
    .from('collaborator_access')
    .select('*')
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime);

  console.log('🔍 [DEBUG] getUserPendingInvites: Test 3 result (all unexpired)', {
    hasError: !!testError3,
    error: testError3,
    dataCount: testData3 ? testData3.length : 0,
    data: testData3 ? testData3.map((invite: any) => ({
      id: invite.id,
      user_email: invite.user_email,
      user_email_match_exact: invite.user_email === userEmail,
      user_email_match_lower: invite.user_email.toLowerCase() === userEmailLower,
      role: invite.role,
      invited_at: invite.invited_at,
      invite_expires_at: invite.invite_expires_at
    })) : null
  });

  // Now try the actual query
  const { data, error } = await supabase
    .from('collaborator_access')
    .select(`
      *,
      collaboration_metadata (
        river_walk_reference_id,
        owner_id
      )
    `)
    .eq('user_email', userEmail)
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime)
    .order('invited_at', { ascending: false });

  console.log('🔍 [DEBUG] getUserPendingInvites: Main query result', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    dataCount: data ? data.length : 0,
    data: data ? data.map((invite: any) => ({
      id: invite.id,
      user_email: invite.user_email,
      role: invite.role,
      invited_at: invite.invited_at,
      accepted_at: invite.accepted_at,
      invite_expires_at: invite.invite_expires_at,
      invite_token: invite.invite_token ? 'present' : 'missing',
      collaboration_id: invite.collaboration_id,
      river_walk_id: invite.collaboration_metadata?.river_walk_reference_id
    })) : null
  });

  if (error) {
    console.error('🔍 [DEBUG] getUserPendingInvites: Database error', error);
    return [];
  }

  const result = data || [];
  console.log('🔍 [DEBUG] getUserPendingInvites: Final result', {
    count: result.length,
    invites: result.map((invite: any) => ({
      id: invite.id,
      user_email: invite.user_email,
      role: invite.role,
      expires_at: invite.invite_expires_at,
      is_expired: new Date(invite.invite_expires_at) <= new Date()
    }))
  });

  return result;
}

/**
 * Alternative implementation using RPC to ensure auth.email() consistency
 */
export async function getUserPendingInvitesRPC(): Promise<CollaboratorAccess[]> {
  console.log('🔍 [DEBUG] getUserPendingInvitesRPC: Starting RPC-based function');
  
  const { data, error } = await supabase.rpc('get_user_pending_invites');
  
  console.log('🔍 [DEBUG] getUserPendingInvitesRPC: RPC result', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    dataCount: data ? data.length : 0,
    data: data ? data.map((invite: any) => ({
      id: invite.id,
      user_email: invite.user_email,
      role: invite.role,
      invited_at: invite.invited_at,
      accepted_at: invite.accepted_at,
      invite_expires_at: invite.invite_expires_at,
      invite_token: invite.invite_token ? 'present' : 'missing',
      collaboration_id: invite.collaboration_id,
      river_walk_id: invite.river_walk_reference_id
    })) : null
  });

  if (error) {
    console.error('🔍 [DEBUG] getUserPendingInvitesRPC: Database error', error);
    return [];
  }

  return data || [];
}

/**
 * Gets all river walks that the user has access to (owned or collaborated)
 * Now works with the fixed RLS policy that allows both owned and collaborated access
 */
export async function getAccessibleRiverWalks(): Promise<any[]> {
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Starting with RLS policy fix');
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  console.log('🔍 [DEBUG] getAccessibleRiverWalks: User info', {
    userId: user.user.id,
    userEmail: user.user.email
  });

  // Test authentication context before querying
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Testing auth context');
  const { data: authTest } = await supabase.rpc('debug_auth_context_test');
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Auth context test result', {
    hasData: !!authTest,
    dataLength: authTest?.length || 0,
    authData: authTest?.[0] || null,
    expectedUserId: user.user.id,
    expectedUserEmail: user.user.email
  });

  // Test direct access to the specific collaborated river walk
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Testing direct access to collaborated river walk');
  const { data: directTest, error: directError } = await supabase
    .from('river_walks')
    .select('*')
    .eq('id', '9cf2aa3b-e4d8-4bf4-a725-f449af371239');
  
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Direct access test result', {
    hasError: !!directError,
    error: directError,
    found: !!directTest?.length,
    riverWalk: directTest?.[0] || null
  });

  // Test the exact RLS policy logic manually
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Testing RLS policy logic manually');
  const { data: rlsTest } = await supabase.rpc('test_rls_policy_manually', {
    p_river_walk_id: '9cf2aa3b-e4d8-4bf4-a725-f449af371239'
  });
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Manual RLS test result', {
    hasData: !!rlsTest,
    dataLength: rlsTest?.length || 0,
    testResult: rlsTest?.[0] || null
  });

  // Test collaboration access with new comprehensive function
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Testing comprehensive collaboration access');
  const { data: collaborationTest } = await supabase.rpc('test_collaboration_access_with_auth');
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Comprehensive collaboration test result', {
    hasData: !!collaborationTest,
    dataLength: collaborationTest?.length || 0,
    testResults: collaborationTest || null
  });

  // Try the RPC approach first (better for access type info)
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Trying RPC approach for access types');
  const { data: rpcWalks, error: rpcError } = await supabase.rpc('get_user_accessible_river_walks');
  
  if (!rpcError && rpcWalks && rpcWalks.length > 0) {
    console.log('🔍 [DEBUG] getAccessibleRiverWalks: RPC approach successful', {
      walkCount: rpcWalks.length,
      walkIds: rpcWalks.map((w: any) => w.id),
      accessTypes: rpcWalks.map((w: any) => ({ id: w.id, access_type: w.access_type }))
    });
    
    return rpcWalks.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Fallback to RLS policy approach
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: RPC failed, trying RLS approach', { rpcError });
  const { data: allWalks, error } = await supabase
    .from('river_walks')
    .select('*')
    .eq('archived', false)
    .order('date', { ascending: false });

  console.log('🔍 [DEBUG] getAccessibleRiverWalks: RLS query result', {
    walkCount: allWalks?.length || 0,
    walks: allWalks?.map(w => ({
      id: w.id,
      name: w.name,
      user_id: w.user_id,
      current_user_id: user.user?.id,
      is_owner: w.user_id === user.user?.id
    })) || []
  });

  // If RLS approach fails or doesn't return collaborated river walks, use RPC fallback
  if (!error && allWalks) {
    const expectedCollaboratedId = '9cf2aa3b-e4d8-4bf4-a725-f449af371239';
    const hasCollaboratedWalk = allWalks.some(walk => walk.id === expectedCollaboratedId);
    
    if (!hasCollaboratedWalk) {
      console.log('🔍 [DEBUG] getAccessibleRiverWalks: RLS policy not returning collaborated walks, trying direct fallback');
      
      try {
        // Get user's accepted collaborations with role information
        const { data: userCollabs, error: userCollabError } = await supabase
          .from('collaborator_access')
          .select('collaboration_id, role')
          .eq('user_email', user.user.email)
          .not('accepted_at', 'is', null);

        console.log('🔍 [DEBUG] getAccessibleRiverWalks: User collaborations', {
          hasError: !!userCollabError,
          error: userCollabError,
          collabCount: userCollabs?.length || 0,
          collaborations: userCollabs?.map(c => ({ 
            collaboration_id: c.collaboration_id, 
            role: c.role 
          })) || []
        });

        if (!userCollabError && userCollabs && userCollabs.length > 0) {
          // Get collaboration metadata
          const { data: collabMetadata, error: metadataError } = await supabase
            .from('collaboration_metadata')
            .select('id, river_walk_reference_id')
            .in('id', userCollabs.map(c => c.collaboration_id));

          console.log('🔍 [DEBUG] getAccessibleRiverWalks: Collaboration metadata', {
            hasError: !!metadataError,
            error: metadataError,
            metadataCount: collabMetadata?.length || 0,
            metadata: collabMetadata?.map(m => ({ 
              id: m.id, 
              river_walk_reference_id: m.river_walk_reference_id 
            })) || []
          });

          if (!metadataError && collabMetadata && collabMetadata.length > 0) {
            // Get the actual river walks (bypassing RLS by using service key if needed)
            const { data: collaboratedWalks, error: walksError } = await supabase
              .from('river_walks')
              .select('*')
              .in('id', collabMetadata.map(m => m.river_walk_reference_id))
              .eq('archived', false);

            console.log('🔍 [DEBUG] getAccessibleRiverWalks: Direct collaborated walks query', {
              hasError: !!walksError,
              error: walksError,
              walkCount: collaboratedWalks?.length || 0,
              walkIds: collaboratedWalks?.map(w => w.id) || []
            });

            if (!walksError && collaboratedWalks && collaboratedWalks.length > 0) {
              // Add access type and role to walks
              const ownedWalksWithType = allWalks.map(walk => ({ 
                ...walk, 
                access_type: 'owned',
                collaboration_role: 'owner'
              }));
              
              // Get role information for collaborated walks
              const collaboratedWalksWithType = collaboratedWalks.map(walk => {
                // Find the user's role for this specific walk
                const userCollab = userCollabs?.find(uc => {
                  const matchingMetadata = collabMetadata?.find(cm => cm.river_walk_reference_id === walk.id);
                  return matchingMetadata && uc.collaboration_id === matchingMetadata.id;
                });
                
                return {
                  ...walk, 
                  access_type: 'collaborated',
                  collaboration_role: userCollab?.role || 'viewer' // Default to viewer if role not found
                };
              });
              
              // Combine owned and collaborated walks
              // Note: collaborated walks should take precedence over owned for the same walk ID
              const combinedWalks = [...collaboratedWalksWithType, ...ownedWalksWithType];
              const uniqueWalks = combinedWalks.filter((walk, index, self) => 
                index === self.findIndex(w => w.id === walk.id)
              );
              
              console.log('🔍 [DEBUG] getAccessibleRiverWalks: Direct fallback successful', {
                ownedCount: allWalks.length,
                collaboratedCount: collaboratedWalks.length,
                totalCount: uniqueWalks.length,
                finalWalkIds: uniqueWalks.map(w => w.id),
                accessAndRoles: uniqueWalks.map(w => ({ 
                  id: w.id, 
                  access_type: w.access_type, 
                  collaboration_role: w.collaboration_role 
                }))
              });

              return uniqueWalks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }
          } else {
            // No collaborated walks found, but we still need to add role info to owned walks
            const ownedWalksWithType = allWalks.map(walk => ({ 
              ...walk, 
              access_type: 'owned',
              collaboration_role: 'owner'
            }));
            
            console.log('🔍 [DEBUG] getAccessibleRiverWalks: No collaborated walks, returning owned only', {
              ownedCount: allWalks.length,
              walksWithRoles: ownedWalksWithType.map(w => ({
                id: w.id,
                access_type: w.access_type,
                collaboration_role: w.collaboration_role
              }))
            });
            
            return ownedWalksWithType.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
        }
      } catch (fallbackError) {
        console.error('🔍 [DEBUG] getAccessibleRiverWalks: Direct fallback error', fallbackError);
      }
    } else {
      // RLS returned results but no collaborated walks found, add role info to owned walks
      const ownedWalksWithType = allWalks.map(walk => ({ 
        ...walk, 
        access_type: 'owned',
        collaboration_role: 'owner'
      }));
      
      console.log('🔍 [DEBUG] getAccessibleRiverWalks: RLS success, no collaboration needed', {
        ownedCount: allWalks.length,
        walksWithRoles: ownedWalksWithType.map(w => ({
          id: w.id,
          access_type: w.access_type,
          collaboration_role: w.collaboration_role
        }))
      });
      
      return ownedWalksWithType.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }

  console.log('🔍 [DEBUG] getAccessibleRiverWalks: Query result', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    walkCount: allWalks?.length || 0,
    walkIds: allWalks?.map(w => w.id) || [],
    expectedCollaboratedId: '9cf2aa3b-e4d8-4bf4-a725-f449af371239'
  });

  if (error) {
    console.error('Error fetching accessible river walks:', error);
    throw new Error(`Failed to fetch river walks: ${error.message}`);
  }

  // Add access type and role to RLS results
  // Since RLS combines everything, we need to determine ownership per walk
  const walksWithAccessType = (allWalks || []).map(walk => {
    // Check if the current user owns this walk
    const isOwner = walk.user_id === user.user?.id;
    
    return {
      ...walk, 
      access_type: isOwner ? 'owned' : 'collaborated',
      collaboration_role: isOwner ? 'owner' : 'editor' // Default to editor for collaborated walks
    };
  });
  
  console.log('🔍 [DEBUG] getAccessibleRiverWalks: RLS approach with roles', {
    walkCount: walksWithAccessType.length,
    accessAndRoles: walksWithAccessType.map(w => ({ 
      id: w.id, 
      access_type: w.access_type, 
      collaboration_role: w.collaboration_role,
      user_id: w.user_id,
      current_user_id: user.user?.id
    }))
  });
  
  return walksWithAccessType;
}