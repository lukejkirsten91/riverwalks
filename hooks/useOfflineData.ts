import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { offlineDataService } from '../lib/offlineDataService';
import { useSyncStatus } from '../contexts/SyncStatusContext';
import { getAccessibleRiverWalks, isCollaborationEnabled } from '../lib/api/collaboration';
import { useRealtimeCollaboration } from './useRealtimeCollaboration';
import type { RiverWalk, Site, MeasurementPoint } from '../types';

// Hook for accessing shared sync status (now just a wrapper around context)
export function useOfflineData() {
  return useSyncStatus();
}

// Hook for offline-aware river walks
export function useOfflineRiverWalks() {
  const [riverWalks, setRiverWalks] = useState<RiverWalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifiedRiverWalks, setModifiedRiverWalks] = useState<Set<string>>(new Set());
  const { updateSyncStatus, syncStatus } = useSyncStatus();

  // Real-time collaboration callback to update river walks when collaboration data changes
  const handleRealtimeUpdate = useCallback((freshRiverWalks: RiverWalk[]) => {
    setRiverWalks(freshRiverWalks);
  }, [riverWalks.length]);

  // Set up real-time collaboration subscriptions (additive feature)
  const { isSubscribed, lastUpdateTime } = useRealtimeCollaboration(
    riverWalks,
    handleRealtimeUpdate
  );

  const fetchRiverWalks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get owned river walks from offline service
      const ownedRiverWalks = await offlineDataService.getRiverWalks();
      
      // Get shared river walks if collaboration is enabled
      let allRiverWalks = ownedRiverWalks;
      if (isCollaborationEnabled()) {
        try {
          console.log('🔍 [DEBUG] useOfflineRiverWalks: Fetching accessible river walks (including shared)');
          const accessibleRiverWalks = await getAccessibleRiverWalks();
          
          // Combine and deduplicate (owned + shared)
          const riverWalkMap = new Map();
          
          // Add owned river walks first
          ownedRiverWalks.forEach(rw => riverWalkMap.set(rw.id, rw));
          
          // Add shared river walks (will not overwrite owned ones due to map behavior)
          accessibleRiverWalks.forEach(rw => {
            if (!riverWalkMap.has(rw.id)) {
              riverWalkMap.set(rw.id, rw);
            }
          });
          
          allRiverWalks = Array.from(riverWalkMap.values());
          
          console.log('🔍 [DEBUG] useOfflineRiverWalks: Combined river walks', {
            ownedCount: ownedRiverWalks.length,
            accessibleCount: accessibleRiverWalks.length,
            totalCount: allRiverWalks.length,
            ownedIds: ownedRiverWalks.map(rw => rw.id),
            accessibleIds: accessibleRiverWalks.map(rw => rw.id),
            allIds: allRiverWalks.map(rw => rw.id)
          });
        } catch (collabError) {
          console.error('Failed to fetch shared river walks, using owned only:', collabError);
          // Continue with owned river walks only
        }
      }
      
      setRiverWalks(allRiverWalks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch river walks');
      console.error('Error fetching river walks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRiverWalk = useCallback(async (riverWalkData: Partial<RiverWalk>) => {
    try {
      const newRiverWalk = await offlineDataService.createRiverWalk(riverWalkData);
      setRiverWalks(prev => [newRiverWalk, ...prev]);
      await updateSyncStatus();
      return newRiverWalk;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create river walk';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus]);

  const updateRiverWalk = useCallback(async (riverWalkId: string, riverWalkData: Partial<RiverWalk>) => {
    try {
      const updatedRiverWalk = await offlineDataService.updateRiverWalk(riverWalkId, riverWalkData);
      setRiverWalks(prev => prev.map(rw => 
        rw.id === riverWalkId ? {
          ...updatedRiverWalk,
          // CRITICAL: Preserve collaboration metadata that might be lost in server response
          collaboration_role: rw.collaboration_role, 
          access_type: rw.access_type
        } : rw
      ));
      
      // Only mark as modified if the returned river walk has a local ID (meaning it wasn't synced immediately)
      if (updatedRiverWalk.id && updatedRiverWalk.id.startsWith('local_')) {
        setModifiedRiverWalks(prev => new Set([...prev, riverWalkId]));
      }
      
      await updateSyncStatus();
      return updatedRiverWalk;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update river walk';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus]);

  useEffect(() => {
    fetchRiverWalks();
  }, [fetchRiverWalks]);

  // Refresh when sync completes or status changes
  useEffect(() => {
    const handleSyncCompleted = () => {
      fetchRiverWalks();
    };

    const handleSiteModified = (event: CustomEvent) => {
      const { riverWalkId } = event.detail;
      if (riverWalkId) {
        console.log('Site modified, marking river walk as pending:', riverWalkId);
        setModifiedRiverWalks(prev => new Set([...prev, riverWalkId]));
      }
    };

    window.addEventListener('riverwalks-sync-completed', handleSyncCompleted);
    window.addEventListener('riverwalks-site-modified', handleSiteModified as EventListener);
    
    return () => {
      window.removeEventListener('riverwalks-sync-completed', handleSyncCompleted);
      window.removeEventListener('riverwalks-site-modified', handleSiteModified as EventListener);
    };
  }, [fetchRiverWalks]);

  // Force UI update when sync status changes
  useEffect(() => {
    console.log('River walks sync status changed, pending items:', syncStatus.pendingItems);
    // Force a re-render when sync status changes to update sync icons
    setRiverWalks(prev => [...prev]);
    
    // Clear modified tracking when sync completes
    if (syncStatus.pendingItems === 0 && !syncStatus.isSyncing) {
      setModifiedRiverWalks(new Set());
    }
  }, [syncStatus.pendingItems, syncStatus.isSyncing]);

  // Helper to check if a river walk is synced
  const isRiverWalkSynced = useCallback((riverWalk: RiverWalk): boolean => {
    // Check if river walk itself is synced (has server ID, not local)
    const riverWalkSynced = Boolean(riverWalk.id && !riverWalk.id.startsWith('local_'));
    
    // Check if this specific river walk has been modified (has pending changes)
    const hasBeenModified = modifiedRiverWalks.has(riverWalk.id);
    
    const result = riverWalkSynced && !hasBeenModified;
    
    console.log(`Sync check for ${riverWalk.name}:`, {
      riverWalkId: riverWalk.id,
      riverWalkSynced,
      hasBeenModified,
      pendingItems: syncStatus.pendingItems,
      result
    });
    
    return result;
  }, [modifiedRiverWalks, syncStatus.pendingItems]);

  const archiveRiverWalk = useCallback(async (riverWalkId: string) => {
    try {
      const archivedRiverWalk = await offlineDataService.archiveRiverWalk(riverWalkId);
      // Update local state optimistically instead of fetching from server
      setRiverWalks(prev => prev.map(rw => 
        rw.id === riverWalkId ? archivedRiverWalk : rw
      ));
      await updateSyncStatus();
      return archivedRiverWalk;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to archive river walk';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus]);

  const restoreRiverWalk = useCallback(async (riverWalkId: string) => {
    try {
      const restoredRiverWalk = await offlineDataService.restoreRiverWalk(riverWalkId);
      // Update local state optimistically instead of fetching from server
      setRiverWalks(prev => prev.map(rw => 
        rw.id === riverWalkId ? restoredRiverWalk : rw
      ));
      await updateSyncStatus();
      return restoredRiverWalk;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to restore river walk';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus]);

  const deleteRiverWalk = useCallback(async (riverWalkId: string) => {
    try {
      await offlineDataService.deleteRiverWalk(riverWalkId);
      // Remove from local state immediately
      setRiverWalks(prev => prev.filter(rw => rw.id !== riverWalkId));
      await updateSyncStatus();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete river walk';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus]);

  return {
    riverWalks,
    loading,
    error,
    createRiverWalk,
    updateRiverWalk,
    archiveRiverWalk,
    restoreRiverWalk,
    deleteRiverWalk,
    refetch: fetchRiverWalks,
    isRiverWalkSynced,
    // Real-time collaboration info (additive)
    realtimeStatus: {
      isSubscribed,
      lastUpdateTime,
    }
  };
}

// Hook for offline-aware sites
export function useOfflineSites(riverWalkId?: string) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateSyncStatus } = useSyncStatus();
  const [realtimeSubscribed, setRealtimeSubscribed] = useState(false);
  

  const fetchSites = useCallback(async () => {
    if (!riverWalkId) {
      setSites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await offlineDataService.getSitesByRiverWalk(riverWalkId);
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
    }
  }, [riverWalkId]);

  const createSite = useCallback(async (siteData: Partial<Site>) => {
    try {
      const newSite = await offlineDataService.createSite(siteData);
      setSites(prev => [...prev, newSite]);
      
      // Only mark as modified if the site has a local ID (meaning it wasn't synced immediately)
      if (riverWalkId && newSite.id && newSite.id.startsWith('local_')) {
        // Dispatch custom event to notify river walk hook
        window.dispatchEvent(new CustomEvent('riverwalks-site-modified', { 
          detail: { riverWalkId } 
        }));
      }
      
      // Force immediate sync status update
      setTimeout(async () => {
        await updateSyncStatus();
        console.log('Sync status updated after site creation');
      }, 100);
      
      return newSite;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create site';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus, riverWalkId]);

  const updateSite = useCallback(async (siteId: string, siteData: Partial<Site>) => {
    try {
      const updatedSite = await offlineDataService.updateSite(siteId, siteData);
      setSites(prev => prev.map(s => 
        s.id === siteId ? updatedSite : s
      ));
      
      // Only mark as modified if the returned site has a local ID (meaning it wasn't synced immediately)
      if (riverWalkId && updatedSite.id && updatedSite.id.startsWith('local_')) {
        // Dispatch custom event to notify river walk hook
        window.dispatchEvent(new CustomEvent('riverwalks-site-modified', { 
          detail: { riverWalkId } 
        }));
      }
      
      // Force immediate sync status update with a small delay to ensure IndexedDB write completes
      setTimeout(async () => {
        await updateSyncStatus();
        console.log('Sync status updated after site change');
      }, 100);
      
      return updatedSite;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update site';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus, riverWalkId]);

  const deleteSite = useCallback(async (siteId: string) => {
    try {
      // Track whether this was an immediate deletion
      let wasImmediateDeletion = false;
      
      // Listen for immediate deletion event
      const handleImmediateDeletion = () => {
        wasImmediateDeletion = true;
      };
      
      window.addEventListener('riverwalks-site-deleted-immediately', handleImmediateDeletion);
      
      await offlineDataService.deleteSite(siteId);
      setSites(prev => prev.filter(s => s.id !== siteId));
      
      // Clean up listener
      window.removeEventListener('riverwalks-site-deleted-immediately', handleImmediateDeletion);
      
      // Only mark as modified if the deletion was queued (not immediate)
      if (riverWalkId && !wasImmediateDeletion) {
        // Dispatch custom event to notify river walk hook
        window.dispatchEvent(new CustomEvent('riverwalks-site-modified', { 
          detail: { riverWalkId } 
        }));
      }
      
      // Force immediate sync status update
      setTimeout(async () => {
        await updateSyncStatus();
        console.log('Sync status updated after site deletion');
      }, 100);
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete site';
      setError(error);
      throw err;
    }
  }, [updateSyncStatus, riverWalkId]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Real-time subscriptions for site changes (additive feature)
  useEffect(() => {
    if (!riverWalkId || !isCollaborationEnabled()) {
      return;
    }

    console.log('🚀 [REALTIME] Setting up real-time site subscriptions for:', riverWalkId);

    // Subscribe to sites changes for this specific river walk
    const sitesSubscription = supabase
      .channel(`sites_changes_${riverWalkId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
          filter: `river_walk_id=eq.${riverWalkId}`,
        },
        (payload) => {
          // Refresh sites when changes occur
          fetchSites();
        }
      )
      .subscribe();

    // Subscribe to measurement_points changes for sites in this river walk
    const measurementPointsSubscription = supabase
      .channel(`measurement_points_changes_${riverWalkId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'measurement_points',
        },
        (payload) => {
          // Refresh sites to get updated measurement points
          fetchSites();
        }
      )
      .subscribe();

    setRealtimeSubscribed(true);

    return () => {
      console.log('🧹 [REALTIME] Cleaning up site subscriptions for:', riverWalkId);
      sitesSubscription.unsubscribe();
      measurementPointsSubscription.unsubscribe();
      setRealtimeSubscribed(false);
    };
  }, [riverWalkId, fetchSites]);

  // Refresh when sync completes
  useEffect(() => {
    const handleSyncCompleted = () => {
      fetchSites();
    };

    window.addEventListener('riverwalks-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('riverwalks-sync-completed', handleSyncCompleted);
  }, [fetchSites]);

  return {
    sites,
    loading,
    error,
    createSite,
    updateSite,
    deleteSite,
    refetch: fetchSites,
    // Real-time status (additive)
    realtimeSubscribed
  };
}