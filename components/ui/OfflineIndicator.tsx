import React, { useState, useEffect } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Hide OfflineIndicator when SyncStatus is actively showing
  const isSyncStatusShowing = isSyncing || pendingItems > 0 || syncError;
  
  // Auto-collapse after 5 seconds
  useEffect(() => {
    if (showOfflineWarning && !isHovered) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showOfflineWarning, isHovered]);

  // Reset expansion when status changes
  useEffect(() => {
    if (showOfflineWarning) {
      setIsExpanded(true);
    }
  }, [showOfflineWarning, showOfflineMode, showConnectivityIssue]);

  if (!showOfflineWarning || isSyncStatusShowing) {
    return null;
  }

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Start auto-collapse timer again
    setTimeout(() => {
      if (!isHovered) {
        setIsExpanded(false);
      }
    }, 5000);
  };

  if (showOfflineMode) {
    return (
      <div 
        className={`flex items-center justify-center gap-2 bg-blue-50/90 text-blue-800 rounded-xl backdrop-blur-sm border-blue-200/50 transition-all duration-300 cursor-pointer ${
          isExpanded ? 'px-4 py-2' : 'px-2 py-2'
        } ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CloudOff className="w-4 h-4 flex-shrink-0" />
        {showText && isExpanded && (
          <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap">
            Working offline - changes will sync when online
          </span>
        )}
      </div>
    );
  }

  if (showConnectivityIssue) {
    return (
      <div 
        className={`flex items-center justify-center gap-2 bg-amber-50/90 text-amber-800 rounded-xl backdrop-blur-sm transition-all duration-300 cursor-pointer ${
          isExpanded ? 'px-4 py-2' : 'px-2 py-2'
        } ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {showText && isExpanded && (
          <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap">
            No internet - limited features
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center gap-2 bg-gray-50/90 text-gray-800 rounded-xl backdrop-blur-sm transition-all duration-300 cursor-pointer ${
        isExpanded ? 'px-4 py-2' : 'px-2 py-2'
      } ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      {showText && isExpanded && (
        <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap">
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