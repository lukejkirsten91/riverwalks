import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  createCollaborationInvite,
  acceptCollaborationInvite,
  checkUserAccess,
  getCollaborationMetadata,
  getCollaborators,
  revokeCollaboratorAccess,
  updateCollaborationSettings,
  getAccessibleRiverWalks,
  getUserPendingInvites,
  isCollaborationEnabled,
  type CollaborationMetadata,
  type CollaboratorAccess,
  type InviteResult,
  type AcceptInviteResult,
  type UserAccess
} from '../lib/api/collaboration';

// Custom hook for managing collaboration state and operations
export function useCollaboration(riverWalkId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if collaboration is enabled globally
  const collaborationEnabled = isCollaborationEnabled();

  // Fetch collaboration metadata for a specific river walk
  const {
    data: collaborationMetadata,
    error: metadataError,
    mutate: mutateMetadata
  } = useSWR<CollaborationMetadata | null>(
    riverWalkId && collaborationEnabled ? `collaboration-metadata-${riverWalkId}` : null,
    () => riverWalkId ? getCollaborationMetadata(riverWalkId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  // Fetch collaborators for a specific river walk
  const {
    data: collaborators,
    error: collaboratorsError,
    mutate: mutateCollaborators
  } = useSWR<CollaboratorAccess[]>(
    riverWalkId && collaborationEnabled ? `collaborators-${riverWalkId}` : null,
    () => riverWalkId ? getCollaborators(riverWalkId) : [],
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  // Fetch user access for a specific river walk
  const {
    data: userAccess,
    error: accessError,
    mutate: mutateUserAccess
  } = useSWR<UserAccess>(
    riverWalkId && collaborationEnabled ? `user-access-${riverWalkId}` : null,
    () => riverWalkId ? checkUserAccess(riverWalkId) : { has_access: false, role: null },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  // Fetch all accessible river walks
  const {
    data: accessibleRiverWalks,
    error: accessibleError,
    mutate: mutateAccessibleRiverWalks
  } = useSWR(
    collaborationEnabled ? 'accessible-river-walks' : null,
    getAccessibleRiverWalks,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // 1 minute
    }
  );

  // Fetch pending invites for current user
  const swrKey = collaborationEnabled ? 'user-pending-invites' : null;
  
  const {
    data: pendingInvites,
    error: pendingError,
    mutate: mutatePendingInvites
  } = useSWR(
    swrKey,
    async () => {
      try {
        const result = await getUserPendingInvites();
        return result;
      } catch (error) {
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
      onSuccess: (data) => {
        // Success callback
      },
      onError: (error) => {
        // Error callback
      }
    }
  );

  // Create an invite for the river walk
  const createInvite = useCallback(async (
    userEmail: string = '*',
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<InviteResult> => {
    if (!riverWalkId) {
      throw new Error('River walk ID is required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createCollaborationInvite(riverWalkId, userEmail, role);
      
      // Refresh the data
      await Promise.all([
        mutateMetadata(),
        mutateCollaborators()
      ]);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invite';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [riverWalkId, mutateMetadata, mutateCollaborators]);

  // Accept an invite using a token
  const acceptInvite = useCallback(async (token: string): Promise<AcceptInviteResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptCollaborationInvite(token);
      
      // Refresh accessible river walks and pending invites
      await Promise.all([
        mutateAccessibleRiverWalks(),
        mutatePendingInvites()
      ]);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutateAccessibleRiverWalks, mutatePendingInvites]);

  // Revoke a collaborator's access
  const revokeAccess = useCallback(async (collaboratorId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await revokeCollaboratorAccess(collaboratorId);
      
      // Refresh the collaborators list
      await mutateCollaborators();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke access';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutateCollaborators]);

  // Update collaboration settings
  const updateSettings = useCallback(async (enabled: boolean): Promise<void> => {
    if (!riverWalkId) {
      throw new Error('River walk ID is required');
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateCollaborationSettings(riverWalkId, enabled);
      
      // Refresh the metadata
      await mutateMetadata();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [riverWalkId, mutateMetadata]);

  // Helper function to check if current user is owner
  const isOwner = useCallback((): boolean => {
    return userAccess?.role === 'owner';
  }, [userAccess]);

  // Helper function to check if current user can edit
  const canEdit = useCallback((): boolean => {
    return userAccess?.role === 'owner' || userAccess?.role === 'editor';
  }, [userAccess]);

  // Helper function to check if current user can view
  const canView = useCallback((): boolean => {
    return userAccess?.has_access === true;
  }, [userAccess]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Combine all errors
  const combinedError = error || metadataError?.message || collaboratorsError?.message || 
                       accessError?.message || accessibleError?.message || pendingError?.message;


  return {
    // Data
    collaborationMetadata,
    collaborators: collaborators || [],
    userAccess,
    accessibleRiverWalks: accessibleRiverWalks || [],
    pendingInvites: pendingInvites || [],
    
    // State
    isLoading,
    error: combinedError,
    collaborationEnabled,
    
    // Actions
    createInvite,
    acceptInvite,
    revokeAccess,
    updateSettings,
    clearError,
    
    // Helpers
    isOwner,
    canEdit,
    canView,
    
    // Mutation functions for manual refresh
    refreshMetadata: mutateMetadata,
    refreshCollaborators: mutateCollaborators,
    refreshUserAccess: mutateUserAccess,
    refreshAccessibleRiverWalks: mutateAccessibleRiverWalks,
    refreshPendingInvites: mutatePendingInvites
  };
}

// Hook for just checking if collaboration is enabled
export function useCollaborationFeatureFlag() {
  return {
    collaborationEnabled: isCollaborationEnabled()
  };
}