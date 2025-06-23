import { useState, useEffect } from 'react';
import { serviceWorker } from '../lib/serviceWorker';

interface OfflineState {
  isOnline: boolean;
  isOfflineCapable: boolean;
  hasServiceWorker: boolean;
}

export function useOffline(): OfflineState {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Register service worker
    const initServiceWorker = async () => {
      const registered = await serviceWorker.register();
      setHasServiceWorker(registered);
    };

    initServiceWorker();

    // Subscribe to online status changes
    const unsubscribe = serviceWorker.onOnlineStatusChange((online) => {
      setIsOnline(online);
    });

    // Cleanup function
    return () => {
      // Note: We can't actually unsubscribe with current API
      // This would need to be enhanced if we add unsubscribe functionality
    };
  }, []);

  return {
    isOnline,
    isOfflineCapable: hasServiceWorker && 'serviceWorker' in navigator,
    hasServiceWorker
  };
}

// Hook for detecting when the app should show offline indicators
export function useOfflineIndicator() {
  const { isOnline, isOfflineCapable } = useOffline();
  
  return {
    showOfflineWarning: !isOnline,
    showOfflineMode: !isOnline && isOfflineCapable,
    showConnectivityIssue: !isOnline && !isOfflineCapable
  };
}