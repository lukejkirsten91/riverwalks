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
  const { data, error } = await supabase.rpc('create_collaboration_invite', {
    p_river_walk_id: riverWalkId,
    p_user_email: userEmail,
    p_role: role
  });

  if (error) {
    console.error('Error creating collaboration invite:', error);
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No invite data returned');
  }

  return data[0];
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
  const { data, error } = await supabase.rpc('accept_collaboration_invite', {
    p_token: token
  });

  if (error) {
    console.error('Error accepting collaboration invite:', error);
    throw new Error(`Failed to accept invite: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No response from invite acceptance');
  }

  return data[0];
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
  const { data, error } = await supabase
    .from('collaboration_metadata')
    .select('*')
    .eq('river_walk_reference_id', riverWalkId)
    .maybeSingle();

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
  const currentTime = new Date().toISOString();
  console.log('🔍 [DEBUG] getUserPendingInvites: Query parameters', {
    userEmail,
    currentTime,
    queryConditions: {
      user_email: userEmail,
      accepted_at: 'null',
      invite_expires_at_gt: currentTime
    }
  });

  const { data, error } = await supabase
    .from('collaborator_access')
    .select(`
      *,
      collaboration_metadata!inner (
        river_walk_reference_id,
        owner_id
      )
    `)
    .eq('user_email', userEmail)
    .is('accepted_at', null)
    .gt('invite_expires_at', currentTime)
    .order('invited_at', { ascending: false });

  console.log('🔍 [DEBUG] getUserPendingInvites: Database query result', {
    hasError: !!error,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null,
    dataCount: data ? data.length : 0,
    data: data ? data.map(invite => ({
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
    invites: result.map(invite => ({
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
 * Gets all river walks that the user has access to (owned or collaborated)
 */
export async function getAccessibleRiverWalks() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Get owned river walks
  const { data: ownedWalks, error: ownedError } = await supabase
    .from('river_walks')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('archived', false)
    .order('date', { ascending: false });

  if (ownedError) {
    console.error('Error fetching owned river walks:', ownedError);
    throw new Error(`Failed to fetch owned river walks: ${ownedError.message}`);
  }

  // Get collaborated river walks
  const { data: collaboratedWalks, error: collabError } = await supabase
    .from('collaborator_access')
    .select(`
      collaboration_metadata!inner (
        river_walk_reference_id
      )
    `)
    .eq('user_email', user.user.email)
    .not('accepted_at', 'is', null);

  if (collabError) {
    console.error('Error fetching collaborated river walks:', collabError);
    // Don't throw error here, just continue with owned walks
  }

  // Fetch the actual river walk data for collaborated walks
  const collaboratedWalkIds = collaboratedWalks?.map(
    (item: any) => item.collaboration_metadata.river_walk_reference_id
  ) || [];

  let collaboratedWalkData = [];
  if (collaboratedWalkIds.length > 0) {
    const { data, error } = await supabase
      .from('river_walks')
      .select('*')
      .in('id', collaboratedWalkIds)
      .eq('archived', false)
      .order('date', { ascending: false });

    if (!error && data) {
      collaboratedWalkData = data;
    }
  }

  // Combine and deduplicate
  const allWalks = [...(ownedWalks || []), ...collaboratedWalkData];
  const uniqueWalks = allWalks.filter((walk, index, self) => 
    index === self.findIndex(w => w.id === walk.id)
  );

  return uniqueWalks;
}