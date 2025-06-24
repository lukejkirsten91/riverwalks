import { useState, useEffect, useCallback } from 'react';
import { offlineDataService } from '../lib/offlineDataService';
import { useSyncStatus } from '../contexts/SyncStatusContext';
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

  const fetchRiverWalks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offlineDataService.getRiverWalks();
      setRiverWalks(data);
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
        rw.id === riverWalkId ? updatedRiverWalk : rw
      ));
      
      // Mark this river walk as modified
      setModifiedRiverWalks(prev => new Set([...prev, riverWalkId]));
      
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

  return {
    riverWalks,
    loading,
    error,
    createRiverWalk,
    updateRiverWalk,
    refetch: fetchRiverWalks,
    isRiverWalkSynced
  };
}

// Hook for offline-aware sites
export function useOfflineSites(riverWalkId?: string) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateSyncStatus } = useSyncStatus();
  

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
      
      // Mark the parent river walk as modified when a site is created
      if (riverWalkId) {
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
      
      // Mark the parent river walk as modified when a site is updated
      if (riverWalkId) {
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

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

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
    refetch: fetchSites
  };
}