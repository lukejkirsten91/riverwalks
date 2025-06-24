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

    window.addEventListener('riverwalks-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('riverwalks-sync-completed', handleSyncCompleted);
  }, [fetchRiverWalks]);

  // Force UI update when sync status changes
  useEffect(() => {
    console.log('River walks sync status changed, pending items:', syncStatus.pendingItems);
    // Force a re-render when sync status changes to update sync icons
    setRiverWalks(prev => [...prev]);
  }, [syncStatus.pendingItems, syncStatus.isSyncing]);

  // Helper to check if a river walk is synced
  const isRiverWalkSynced = (riverWalk: RiverWalk): boolean => {
    // First check: river walk itself must be synced (server ID, not local)
    const riverWalkSynced = Boolean(riverWalk.id && !riverWalk.id.startsWith('local_'));
    
    // Second check: no pending sync items globally (this is a simple check for now)
    // If there are ANY pending items, we consider everything as potentially unsynced
    const noPendingItems = syncStatus.pendingItems === 0;
    
    const result = riverWalkSynced && noPendingItems;
    console.log(`Sync check for ${riverWalk.name}:`, {
      riverWalkId: riverWalk.id,
      riverWalkSynced,
      pendingItems: syncStatus.pendingItems,
      noPendingItems,
      result
    });
    
    // Only consider synced if river walk is synced AND no pending sync items
    // This ensures that ANY offline changes mark ALL river walks as pending
    // until everything is synced - which is more accurate than partial sync status
    return result;
  };

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
  }, [updateSyncStatus]);

  const updateSite = useCallback(async (siteId: string, siteData: Partial<Site>) => {
    try {
      const updatedSite = await offlineDataService.updateSite(siteId, siteData);
      setSites(prev => prev.map(s => 
        s.id === siteId ? updatedSite : s
      ));
      
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
  }, [updateSyncStatus]);

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