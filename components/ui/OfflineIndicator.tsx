import React from 'react';
import { Wifi, WifiOff, CloudOff, AlertTriangle } from 'lucide-react';
import { useOfflineIndicator } from '../../hooks/useOffline';

interface OfflineIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function OfflineIndicator({ className = '', showText = true }: OfflineIndicatorProps) {
  const { showOfflineWarning, showOfflineMode, showConnectivityIssue } = useOfflineIndicator();

  if (!showOfflineWarning) {
    return null;
  }

  if (showOfflineMode) {
    return (
      <div className={`flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg ${className}`}>
        <CloudOff className="w-4 h-4" />
        {showText && (
          <span className="text-sm font-medium">
            Working offline - data will sync when connected
          </span>
        )}
      </div>
    );
  }

  if (showConnectivityIssue) {
    return (
      <div className={`flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg ${className}`}>
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
    <div className={`flex items-center gap-2 bg-gray-50 text-gray-800 px-3 py-2 rounded-lg ${className}`}>
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