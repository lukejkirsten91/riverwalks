import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { offlineDataService } from '../lib/offlineDataService';
import { useToast } from '../components/ui/ToastProvider';

interface SyncStatus {
  pendingItems: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: number;
  syncError?: string;
}

interface SyncStatusContextType {
  syncStatus: SyncStatus;
  updateSyncStatus: () => Promise<void>;
  forceSync: () => Promise<void>;
}

const SyncStatusContext = createContext<SyncStatusContextType | undefined>(undefined);

interface SyncStatusProviderProps {
  children: ReactNode;
}

export function SyncStatusProvider({ children }: SyncStatusProviderProps) {
  const { showSuccess, showError } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingItems: 0,
    isOnline: true,
    isSyncing: false
  });
  
  const [hasShownOfflineMessage, setHasShownOfflineMessage] = useState(false);


  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await offlineDataService.getSyncStatus();
      
      const wasOnline = syncStatus.isOnline;
      const isNowOffline = !status.isOnline;
      
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingItems: status.pendingItems,
        isOnline: status.isOnline
      }));
      
      // Show helpful message when first going offline
      if (wasOnline && isNowOffline && !hasShownOfflineMessage) {
        setHasShownOfflineMessage(true);
        showSuccess('📱 Working offline');
      }
      
      // Reset message flag when back online
      if (!wasOnline && status.isOnline) {
        setHasShownOfflineMessage(false);
      }
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  }, [syncStatus.isOnline, hasShownOfflineMessage, showSuccess]);

  const forceSync = useCallback(async () => {
    try {
      await offlineDataService.forceSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  // Initialize the service
  useEffect(() => {
    const initService = async () => {
      try {
        await offlineDataService.init();
        updateSyncStatus();
      } catch (error) {
        console.error('Failed to initialize offline data service:', error);
        showError('Failed to initialize offline features');
      }
    };

    initService();
  }, [updateSyncStatus, showError]);

  // Listen for sync events and data changes
  useEffect(() => {
    const handleSyncStarted = () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: undefined }));
    };

    const handleSyncCompleted = () => {
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingItems: 0, // Force pending items to 0 after sync completion
        isSyncing: false, 
        lastSyncTime: Date.now(),
        syncError: undefined
      }));
      // Small delay to ensure sync queue is fully processed
      setTimeout(() => {
        updateSyncStatus();
      }, 100);
      showSuccess('Synced to cloud');
    };

    const handleSyncFailed = (event: CustomEvent) => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncError: event.detail?.message || 'Sync failed'
      }));
      showError('Sync failed');
    };

    const handleDataChanged = () => {
      // Update sync status when data changes
      updateSyncStatus();
    };

    const handleInitWarning = (event: CustomEvent) => {
      showError(event.detail?.message || 'Some data may be outdated');
    };

    const handleInitError = (event: CustomEvent) => {
      showError(event.detail?.error || 'Failed to initialize offline features');
    };

    const handleDownloadStarted = (event: CustomEvent) => {
      if (event.detail?.attempt > 1) {
        showError(`Retrying data download (attempt ${event.detail.attempt}/${event.detail.maxAttempts})`);
      }
    };

    const handleDownloadFailed = (event: CustomEvent) => {
      if (event.detail?.willRetry) {
        showError(`Download failed, retrying... (${event.detail.attempt}/${event.detail.maxAttempts})`);
      } else {
        showError('Failed to download latest data - using cached data');
      }
    };

    window.addEventListener('riverwalks-sync-started', handleSyncStarted);
    window.addEventListener('riverwalks-sync-completed', handleSyncCompleted);
    window.addEventListener('riverwalks-sync-failed', handleSyncFailed as EventListener);
    window.addEventListener('riverwalks-data-changed', handleDataChanged);
    window.addEventListener('riverwalks-init-warning', handleInitWarning as EventListener);
    window.addEventListener('riverwalks-init-error', handleInitError as EventListener);
    window.addEventListener('riverwalks-data-download-started', handleDownloadStarted as EventListener);
    window.addEventListener('riverwalks-data-download-failed', handleDownloadFailed as EventListener);

    return () => {
      window.removeEventListener('riverwalks-sync-started', handleSyncStarted);
      window.removeEventListener('riverwalks-sync-completed', handleSyncCompleted);
      window.removeEventListener('riverwalks-sync-failed', handleSyncFailed as EventListener);
      window.removeEventListener('riverwalks-data-changed', handleDataChanged);
      window.removeEventListener('riverwalks-init-warning', handleInitWarning as EventListener);
      window.removeEventListener('riverwalks-init-error', handleInitError as EventListener);
      window.removeEventListener('riverwalks-data-download-started', handleDownloadStarted as EventListener);
      window.removeEventListener('riverwalks-data-download-failed', handleDownloadFailed as EventListener);
    };
  }, [showSuccess, showError, updateSyncStatus]);

  return (
    <SyncStatusContext.Provider value={{ syncStatus, updateSyncStatus, forceSync }}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextType {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}