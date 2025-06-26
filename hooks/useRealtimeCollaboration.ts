import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAccessibleRiverWalks, isCollaborationEnabled } from '../lib/api/collaboration';
import type { RiverWalk } from '../types';

/**
 * Real-time collaboration hook that enhances existing data with live updates
 * This is an ADDITIVE feature that doesn't break existing offline functionality
 */
export function useRealtimeCollaboration(
  existingRiverWalks: RiverWalk[],
  onRiverWalksUpdate?: (riverWalks: RiverWalk[]) => void
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Refresh river walks from server when collaboration data changes
  const refreshCollaborationData = useCallback(async () => {
    if (!isCollaborationEnabled() || !onRiverWalksUpdate) {
      return;
    }

    try {
      console.log('🔄 [REALTIME] Refreshing collaboration data due to real-time update');
      
      // Get fresh data from server (this includes both owned and shared river walks)
      const freshRiverWalks = await getAccessibleRiverWalks();
      
      // Update the parent component with fresh data
      onRiverWalksUpdate(freshRiverWalks);
      setLastUpdateTime(new Date());
      
      console.log('✅ [REALTIME] Successfully refreshed collaboration data', {
        riverWalkCount: freshRiverWalks.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [REALTIME] Error refreshing collaboration data:', error);
    }
  }, [onRiverWalksUpdate]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isCollaborationEnabled()) {
      console.log('🔄 [REALTIME] Collaboration disabled, skipping real-time subscriptions');
      return;
    }

    console.log('🚀 [REALTIME] Setting up real-time collaboration subscriptions');

    // Subscribe to collaboration_metadata changes (new shares, settings changes)
    const collaborationMetadataSubscription = supabase
      .channel('collaboration_metadata_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'collaboration_metadata',
        },
        (payload) => {
          console.log('🔄 [REALTIME] Collaboration metadata changed:', payload);
          refreshCollaborationData();
        }
      )
      .subscribe();

    // Subscribe to collaborator_access changes (invites accepted, roles changed)
    const collaboratorAccessSubscription = supabase
      .channel('collaborator_access_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'collaborator_access',
        },
        (payload) => {
          console.log('🔄 [REALTIME] Collaborator access changed:', payload);
          refreshCollaborationData();
        }
      )
      .subscribe();

    // Subscribe to river_walks changes that might affect shared content
    const riverWalksSubscription = supabase
      .channel('river_walks_collaboration_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'river_walks',
        },
        (payload) => {
          console.log('🔄 [REALTIME] River walk changed:', payload);
          // Only refresh if this might affect collaboration (e.g., name changes, archive status)
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            refreshCollaborationData();
          }
        }
      )
      .subscribe();

    setIsSubscribed(true);
    console.log('✅ [REALTIME] Real-time subscriptions established');

    // Cleanup subscriptions
    return () => {
      console.log('🧹 [REALTIME] Cleaning up real-time subscriptions');
      
      collaborationMetadataSubscription.unsubscribe();
      collaboratorAccessSubscription.unsubscribe();
      riverWalksSubscription.unsubscribe();
      
      setIsSubscribed(false);
    };
  }, [refreshCollaborationData]);

  return {
    isSubscribed,
    lastUpdateTime,
    refreshCollaborationData,
  };
}