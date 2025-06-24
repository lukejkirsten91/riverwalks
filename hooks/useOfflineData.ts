import { useState, useEffect, useCallback } from 'react';
import { offlineDataService } from '../lib/offlineDataService';
import { useToast } from '../components/ui/ToastProvider';
import type { RiverWalk, Site, MeasurementPoint } from '../types';

interface SyncStatus {
  pendingItems: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: number;
  syncError?: string;
}

// Hook for managing offline data operations
export function useOfflineData() {
  const { showSuccess, showError } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingItems: 0,
    isOnline: true,
    isSyncing: false
  });

  // Initialize the service
  useEffect(() => {
    const initService = async () => {
      try {
        await offlineDataService.init();
        updateSyncStatus();
      } catch (error) {
        console.error('Failed to initialize offline data service:', error);
      }
    };

    initService();
  }, []);

  // Listen for sync events
  useEffect(() => {
    const handleSyncStarted = () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: undefined }));
    };

    const handleSyncCompleted = () => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSyncTime: Date.now(),
        syncError: undefined
      }));
      updateSyncStatus();
      showSuccess('Sync Complete', 'All your data has been successfully synced to the cloud.');
    };

    const handleSyncFailed = (event: CustomEvent) => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncError: event.detail?.message || 'Sync failed'
      }));
      showError('Sync Failed', event.detail?.message || 'Failed to sync data. Please try again.');
    };

    window.addEventListener('riverwalks-sync-started', handleSyncStarted);
    window.addEventListener('riverwalks-sync-completed', handleSyncCompleted);
    window.addEventListener('riverwalks-sync-failed', handleSyncFailed as EventListener);

    return () => {
      window.removeEventListener('riverwalks-sync-started', handleSyncStarted);
      window.removeEventListener('riverwalks-sync-completed', handleSyncCompleted);
      window.removeEventListener('riverwalks-sync-failed', handleSyncFailed as EventListener);
    };
  }, []);

  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await offlineDataService.getSyncStatus();
      console.log('Updating sync status:', status);
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingItems: status.pendingItems,
        isOnline: status.isOnline
      }));
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await offlineDataService.forceSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  return {
    syncStatus,
    forceSync,
    updateSyncStatus
  };
}

// Hook for offline-aware river walks
export function useOfflineRiverWalks() {
  const [riverWalks, setRiverWalks] = useState<RiverWalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateSyncStatus, syncStatus } = useOfflineData();

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
    // Force a re-render when sync status changes to update sync icons
    setRiverWalks(prev => [...prev]);
  }, [syncStatus.pendingItems]);

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
  const { updateSyncStatus } = useOfflineData();

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
      await updateSyncStatus();
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