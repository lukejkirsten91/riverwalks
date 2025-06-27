import React from 'react';
import { Wifi, WifiOff, CloudOff, AlertTriangle } from 'lucide-react';
import { useOfflineIndicator } from '../../hooks/useOffline';
import { useSyncStatus } from '../../contexts/SyncStatusContext';

interface OfflineIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function OfflineIndicator({ className = '', showText = true }: OfflineIndicatorProps) {
  const { showOfflineWarning, showOfflineMode, showConnectivityIssue } = useOfflineIndicator();
  const { syncStatus } = useSyncStatus();
  const { pendingItems, isSyncing, syncError } = syncStatus;

  // Hide OfflineIndicator when SyncStatus is actively showing
  const isSyncStatusShowing = isSyncing || pendingItems > 0 || syncError;
  
  if (!showOfflineWarning || isSyncStatusShowing) {
    return null;
  }

  if (showOfflineMode) {
    return (
      <div className={`flex items-center justify-center gap-2 bg-blue-50/90 text-blue-800 px-4 py-2 rounded-xl backdrop-blur-sm border-blue-200/50 ${className}`}>
        <CloudOff className="w-4 h-4" />
        {showText && (
          <span className="text-sm font-medium">
            📱 Working offline - You can keep working! All changes will sync when you get signal again.
          </span>
        )}
      </div>
    );
  }

  if (showConnectivityIssue) {
    return (
      <div className={`flex items-center justify-center gap-2 bg-amber-50/90 text-amber-800 px-4 py-2 rounded-xl backdrop-blur-sm ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        {showText && (
          <span className="text-sm font-medium">
            No internet connection - some features unavailable
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 bg-gray-50/90 text-gray-800 px-4 py-2 rounded-xl backdrop-blur-sm ${className}`}>
      <WifiOff className="w-4 h-4" />
      {showText && (
        <span className="text-sm font-medium">
          Connection lost
        </span>
      )}
    </div>
  );
}

// Compact version for navigation bars
export function OfflineStatusIcon() {
  const { showOfflineWarning, showOfflineMode, showConnectivityIssue } = useOfflineIndicator();

  if (!showOfflineWarning) {
    return (
      <div className="flex items-center text-green-600" title="Online">
        <Wifi className="w-4 h-4" />
      </div>
    );
  }

  if (showOfflineMode) {
    return (
      <div className="flex items-center text-blue-600" title="Working offline">
        <CloudOff className="w-4 h-4" />
      </div>
    );
  }

  if (showConnectivityIssue) {
    return (
      <div className="flex items-center text-amber-600" title="Limited functionality">
        <AlertTriangle className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center text-red-600" title="No connection">
      <WifiOff className="w-4 h-4" />
    </div>
  );
}