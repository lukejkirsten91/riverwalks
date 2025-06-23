// Service Worker Registration and Management
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = true;
  private onlineCallbacks: Array<(online: boolean) => void> = [];

  private constructor() {
    // Only setup in browser environment
    if (typeof window !== 'undefined') {
      this.setupOnlineDetection();
    }
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  // Register the service worker
  async register(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported or not in browser');
      return false;
    }

    try {
      console.log('Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              this.showUpdateNotification();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Handle messages from service worker
  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_REQUESTED':
        console.log('Service Worker requested sync');
        // Trigger data sync in main application
        this.triggerDataSync();
        break;

      default:
        console.log('Unknown message from service worker:', type);
    }
  }

  // Trigger data synchronization
  private async triggerDataSync() {
    // This will be implemented when we add the sync system
    console.log('Triggering data sync...');
    
    // Dispatch custom event that the app can listen to
    window.dispatchEvent(new CustomEvent('riverwalks-sync-requested'));
  }

  // Show update notification to user
  private showUpdateNotification() {
    // This could be enhanced with a proper notification component
    if (confirm('A new version of Riverwalks is available. Reload to update?')) {
      this.updateServiceWorker();
    }
  }

  // Update to new service worker
  private updateServiceWorker() {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Setup online/offline detection
  private setupOnlineDetection() {
    if (typeof window === 'undefined') return;
    
    this.isOnline = navigator.onLine;

    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (wasOnline !== this.isOnline) {
        console.log(`Connection status changed: ${this.isOnline ? 'online' : 'offline'}`);
        this.notifyOnlineStatusChange();
        
        // Trigger background sync when coming back online
        if (this.isOnline && 'serviceWorker' in navigator) {
          this.requestBackgroundSync();
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  // Request background sync
  private async requestBackgroundSync() {
    // Background sync requires proper types - using any for now
    const registration = this.registration as any;
    
    if (registration?.sync) {
      try {
        await registration.sync.register('riverwalks-sync');
        console.log('Background sync registered');
      } catch (error) {
        console.log('Background sync registration failed:', error);
        // Fallback to immediate sync
        this.triggerDataSync();
      }
    } else {
      // Fallback for browsers without background sync
      this.triggerDataSync();
    }
  }

  // Subscribe to online status changes
  onOnlineStatusChange(callback: (online: boolean) => void) {
    this.onlineCallbacks.push(callback);
    // Immediately call with current status
    callback(this.isOnline);
  }

  // Notify all subscribers of online status change
  private notifyOnlineStatusChange() {
    this.onlineCallbacks.forEach(callback => callback(this.isOnline));
  }

  // Get current online status
  isConnected(): boolean {
    return this.isOnline;
  }

  // Unregister service worker (for debugging)
  async unregister(): Promise<boolean> {
    if (this.registration) {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  }
}

// Export singleton instance
export const serviceWorker = ServiceWorkerManager.getInstance();