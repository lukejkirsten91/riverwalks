import React from 'react';
import { RefreshCw, CloudOff, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useOfflineData } from '../../hooks/useOfflineData';

interface SyncStatusProps {
  className?: string;
  showText?: boolean;
}

export function SyncStatus({ className = '', showText = true }: SyncStatusProps) {
  const { syncStatus, forceSync } = useOfflineData();
  const { pendingItems, isOnline, isSyncing, lastSyncTime, syncError } = syncStatus;

  const handleForceSync = async () => {
    if (!isOnline || isSyncing) return;
    
    try {
      await forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Don't show if everything is synced and online
  if (isOnline && pendingItems === 0 && !isSyncing && !syncError) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sync button/status */}
      <button
        onClick={handleForceSync}
        disabled={!isOnline || isSyncing}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isSyncing 
            ? 'bg-blue-50 text-blue-700 cursor-not-allowed'
            : syncError 
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : pendingItems > 0 
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-green-50 text-green-700 hover:bg-green-100'
        }`}
        title={
          isSyncing 
            ? 'Syncing...'
            : syncError 
            ? `Sync error: ${syncError}`
            : pendingItems > 0 
            ? `${pendingItems} items pending sync`
            : 'All data synced'
        }
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : syncError ? (
          <AlertCircle className="w-4 h-4" />
        ) : pendingItems > 0 ? (
          <Clock className="w-4 h-4" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        
        {showText && (
          <span className="text-sm font-medium">
            {isSyncing 
              ? 'Syncing...'
              : syncError 
              ? 'Sync failed'
              : pendingItems > 0 
              ? `${pendingItems} pending`
              : 'Synced'
            }
          </span>
        )}
      </button>

      {/* Additional info */}
      {showText && (
        <div className="text-xs text-gray-500">
          {!isOnline && (
            <div className="flex items-center gap-1">
              <CloudOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
          {isOnline && lastSyncTime && (
            <span>Last sync: {formatLastSync(lastSyncTime)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for navigation
export function SyncStatusIcon() {
  const { syncStatus } = useOfflineData();
  const { pendingItems, isSyncing, syncError } = syncStatus;

  // Only show if there's something to indicate
  if (!isSyncing && pendingItems === 0 && !syncError) {
    return null;
  }

  return (
    <div className="relative">
      {isSyncing ? (
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      ) : syncError ? (
        <AlertCircle className="w-4 h-4 text-red-600" />
      ) : pendingItems > 0 ? (
        <div className="relative">
          <Clock className="w-4 h-4 text-amber-600" />
          {pendingItems > 0 && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
              {pendingItems > 9 ? '9+' : pendingItems}
            </div>
          )}
        </div>
      ) : (
        <CheckCircle className="w-4 h-4 text-green-600" />
      )}
    </div>
  );
}