// Offline-aware data service that handles both online and offline operations
import { supabase } from './supabase';
import { offlineDB, type OfflineRiverWalk, type OfflineSite, type OfflineMeasurementPoint, type SyncQueueItem, type OfflinePhoto } from './indexedDB';
import type { RiverWalk, Site, MeasurementPoint } from '../types';

// Generate unique local IDs for offline items
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Convert online data to offline format
function toOfflineRiverWalk(riverWalk: RiverWalk): OfflineRiverWalk {
  return {
    ...riverWalk,
    localId: riverWalk.id || generateLocalId(),
    synced: true,
    lastModified: Date.now()
  };
}

function toOfflineSite(site: Site): OfflineSite {
  return {
    ...site,
    localId: site.id || generateLocalId(),
    // Only set river_walk_local_id for locally created sites (no server river_walk_id)
    river_walk_local_id: site.river_walk_id?.startsWith('local_') ? site.river_walk_id : undefined,
    synced: true,
    lastModified: Date.now()
  };
}

function toOfflineMeasurementPoint(point: MeasurementPoint): OfflineMeasurementPoint {
  return {
    ...point,
    localId: point.id || generateLocalId(),
    site_local_id: point.site_id,
    synced: true,
    lastModified: Date.now()
  };
}

// Convert offline data back to online format
function fromOfflineRiverWalk(offlineRiverWalk: OfflineRiverWalk): Partial<RiverWalk> {
  const { localId, synced, lastModified, ...riverWalk } = offlineRiverWalk;
  return riverWalk;
}

function fromOfflineSite(offlineSite: OfflineSite): Partial<Site> {
  const { localId, river_walk_local_id, synced, lastModified, ...site } = offlineSite;
  return site;
}

function fromOfflineMeasurementPoint(offlinePoint: OfflineMeasurementPoint): Partial<MeasurementPoint> {
  const { localId, site_local_id, synced, lastModified, ...point } = offlinePoint;
  return point;
}

export class OfflineDataService {
  private isOnline: boolean = true;
  private cachedUserId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      // Enhanced online detection
      const handleOnline = () => {
        this.isOnline = true;
        // Small delay to ensure network is actually ready
        setTimeout(() => {
          this.syncWhenOnline();
        }, 1000);
      };
      
      const handleOffline = () => {
        this.isOnline = false;
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Additional sync triggers for better reliability
      window.addEventListener('focus', () => {
        if (this.checkOnline()) {
          this.syncWhenOnline();
        }
      });
      
      // Sync on page visibility change (user switches back to tab)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.checkOnline()) {
          this.syncWhenOnline();
        }
      });
      
      // Periodic sync check (every 30 seconds when online)
      setInterval(() => {
        if (this.checkOnline()) {
          this.periodicSyncCheck();
        }
      }, 30000);
      
      // More frequent sync check (every 5 seconds) for critical periods
      setInterval(() => {
        if (this.checkOnline()) {
          this.quickSyncCheck();
        }
      }, 5000);
      
      // Cache user ID from localStorage if available
      this.cachedUserId = localStorage.getItem('riverwalks_user_id');
    }
  }

  // Check if we're online - be more conservative to avoid false positives
  private checkOnline(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Base online check
    const basicOnline = this.isOnline && navigator.onLine;
    
    // If basic check fails, definitely offline
    if (!basicOnline) return false;
    
    // Additional checks for more accurate online detection
    // Check if we're on a limited connection
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      // If connection type indicates no connection, consider offline
      if (connection.effectiveType === 'slow-2g' && connection.downlink < 0.1) {
        return false;
      }
    }
    
    return true;
  }

  // Periodic sync check to catch missed sync opportunities
  private async periodicSyncCheck(): Promise<void> {
    try {
      const syncQueue = await offlineDB.getSyncQueue();
      if (syncQueue.length > 0) {
        await this.syncWhenOnline();
      }
    } catch (error) {
      console.error('Periodic sync check failed:', error);
    }
  }

  // Quick sync check (runs every 5 seconds, silent unless it finds items)
  private async quickSyncCheck(): Promise<void> {
    try {
      const syncQueue = await offlineDB.getSyncQueue();
      if (syncQueue.length > 0) {
        await this.syncWhenOnline();
      }
    } catch (error) {
      // Silent failure for quick checks to avoid spam
    }
  }

  // Cache user ID for offline use
  private async cacheUserId(retryCount: number = 0): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        this.cachedUserId = user.id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('riverwalks_user_id', user.id);
        }
        console.log('User ID cached successfully:', user.id);
        return user.id;
      } else if (retryCount < 3) {
        // Retry after a short delay for OAuth session establishment
        console.log('No user found, retrying...', retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.cacheUserId(retryCount + 1);
      }
    } catch (error) {
      console.error('Failed to cache user ID:', error);
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.cacheUserId(retryCount + 1);
      }
    }
    return null;
  }

  // Get user ID (cached or from auth)
  private async getUserId(): Promise<string | null> {
    // Try to get from auth first if online
    if (this.checkOnline()) {
      const userId = await this.cacheUserId();
      if (userId) return userId;
    }

    // Fall back to cached user ID
    return this.cachedUserId;
  }

  // Add item to sync queue
  private async addToSyncQueue(type: 'CREATE' | 'UPDATE' | 'DELETE', table: 'river_walks' | 'sites' | 'measurement_points' | 'photos', data: any, localId: string): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: generateLocalId(),
      type,
      table,
      data,
      localId,
      timestamp: Date.now(),
      attempts: 0
    };

    try {
      await offlineDB.addToSyncQueue(queueItem);
      
      // Verify the item was actually added
      const syncQueue = await offlineDB.getSyncQueue();
      const wasAdded = syncQueue.some(item => item.id === queueItem.id);
      if (!wasAdded) {
        throw new Error('Sync queue item was not persisted correctly');
      }
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
      throw error;
    }
  }

  // Public method for manual sync trigger
  async manualSync(): Promise<{ success: boolean; message: string; details?: any }> {
    
    if (!this.checkOnline()) {
      return {
        success: false,
        message: 'Cannot sync: Device is offline'
      };
    }

    try {
      await this.syncWhenOnline();
      return {
        success: true,
        message: 'Sync completed successfully'
      };
    } catch (error) {
      console.error('Manual sync failed:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  // Get sync queue status for debugging
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingItems: number;
    queueItems: any[];
    offlinePhotos: any[];
    sitesWithLocalPhotos: any[];
  }> {
    const syncQueue = await offlineDB.getSyncQueue();
    const allPhotos = await offlineDB.getAll('photos');
    const allSites = await offlineDB.getAll('sites');
    
    const offlinePhotos = allPhotos.filter((photo: any) => !photo.synced);
    const sitesWithLocalPhotos = allSites.filter((site: any) => {
      return (site.photo_url && site.photo_url.startsWith('local_')) ||
             (site.sedimentation_photo_url && site.sedimentation_photo_url.startsWith('local_'));
    });

    return {
      isOnline: this.checkOnline(),
      pendingItems: syncQueue.length,
      queueItems: syncQueue,
      offlinePhotos,
      sitesWithLocalPhotos
    };
  }

  // Validate that a photo with local ID is properly queued for sync
  private async validatePhotoInSyncQueue(localPhotoId: string): Promise<boolean> {
    if (!localPhotoId.startsWith('local_')) {
      return true; // Server URLs are fine
    }
    
    const syncQueue = await offlineDB.getSyncQueue();
    const isQueued = syncQueue.some(item => 
      item.table === 'photos' && item.localId === localPhotoId
    );
    
    if (!isQueued) {
    }
    
    return isQueued;
  }

  // Detect and report orphaned photos (for monitoring/alerting)
  private async detectAndReportOrphanedPhotos(): Promise<void> {
    try {
      const allSites = await offlineDB.getAll('sites') as OfflineSite[];
      const syncQueue = await offlineDB.getSyncQueue();
      
      const orphanedPhotos: string[] = [];
      
      for (const site of allSites) {
        // Check site photo
        if (site.photo_url && site.photo_url.startsWith('local_')) {
          const isQueued = syncQueue.some(item => 
            item.table === 'photos' && item.localId === site.photo_url
          );
          if (!isQueued) {
            orphanedPhotos.push(`Site ${site.site_number}: site_photo=${site.photo_url}`);
          }
        }
        
        // Check sediment photo
        if (site.sedimentation_photo_url && site.sedimentation_photo_url.startsWith('local_')) {
          const isQueued = syncQueue.some(item => 
            item.table === 'photos' && item.localId === site.sedimentation_photo_url
          );
          if (!isQueued) {
            orphanedPhotos.push(`Site ${site.site_number}: sediment_photo=${site.sedimentation_photo_url}`);
          }
        }
      }
      
      if (orphanedPhotos.length > 0) {
        // Could trigger user notification or automatic cleanup here
      } else {
      }
    } catch (error) {
      console.error('Failed to detect orphaned photos:', error);
    }
  }

  // Fix orphaned local photo IDs by adding them to sync queue
  async fixOrphanedPhotos(): Promise<{ 
    success: boolean; 
    message: string; 
    fixed: number;
    details?: any[];
  }> {
    
    if (!this.checkOnline()) {
      return {
        success: false,
        message: 'Cannot fix orphaned photos: Device is offline',
        fixed: 0
      };
    }

    try {
      const allSites = await offlineDB.getAll('sites') as OfflineSite[];
      const allPhotos = await offlineDB.getAll('photos') as OfflinePhoto[];
      const syncQueue = await offlineDB.getSyncQueue();
      
      // Find sites with local photo IDs
      const sitesWithLocalPhotos = allSites.filter((site: OfflineSite) => {
        return (site.photo_url && site.photo_url.startsWith('local_')) ||
               (site.sedimentation_photo_url && site.sedimentation_photo_url.startsWith('local_'));
      });

      
      const fixedPhotos: any[] = [];
      
      for (const site of sitesWithLocalPhotos) {
        // Check site photo
        if (site.photo_url && site.photo_url.startsWith('local_')) {
          const photoLocalId = site.photo_url;
          
          // Check if already in sync queue
          const alreadyQueued = syncQueue.some(item => 
            item.table === 'photos' && item.localId === photoLocalId
          );
          
          if (!alreadyQueued) {
            // Find the photo in IndexedDB
            const photo = allPhotos.find((p: OfflinePhoto) => p.localId === photoLocalId);
            
            if (photo && photo.file) {
              
              // Add to sync queue
              await this.addToSyncQueue('CREATE', 'photos', {
                file: photo.file,
                type: 'site_photo',
                relatedId: site.id
              }, photoLocalId);
              
              fixedPhotos.push({
                siteId: site.id,
                photoType: 'site_photo',
                localId: photoLocalId
              });
            } else {
              
              // Clean up the invalid photo reference
              site.photo_url = null;
              await offlineDB.addSite(site);
              
              // Also update the server record if we're online and have a server ID
              if (this.checkOnline() && site.id && !site.id.startsWith('local_')) {
                try {
                  const { error } = await supabase
                    .from('sites')
                    .update({ photo_url: null })
                    .eq('id', site.id);
                  
                  if (error) {
                    console.error('Failed to clean up photo reference on server:', error);
                  } else {
                  }
                } catch (error) {
                  console.error('Error cleaning up photo reference on server:', error);
                }
              }
              
              fixedPhotos.push({
                siteId: site.id,
                photoType: 'site_photo',
                localId: photoLocalId,
                action: 'cleaned_up_invalid_reference'
              });
            }
          }
        }
        
        // Check sediment photo
        if (site.sedimentation_photo_url && site.sedimentation_photo_url.startsWith('local_')) {
          const photoLocalId = site.sedimentation_photo_url;
          
          // Check if already in sync queue
          const alreadyQueued = syncQueue.some(item => 
            item.table === 'photos' && item.localId === photoLocalId
          );
          
          if (!alreadyQueued) {
            // Find the photo in IndexedDB
            const photo = allPhotos.find((p: OfflinePhoto) => p.localId === photoLocalId);
            
            if (photo && photo.file) {
              
              // Add to sync queue
              await this.addToSyncQueue('CREATE', 'photos', {
                file: photo.file,
                type: 'sediment_photo',
                relatedId: site.id
              }, photoLocalId);
              
              fixedPhotos.push({
                siteId: site.id,
                photoType: 'sediment_photo',
                localId: photoLocalId
              });
            } else {
              
              // Clean up the invalid photo reference
              site.sedimentation_photo_url = null;
              await offlineDB.addSite(site);
              
              // Also update the server record if we're online and have a server ID
              if (this.checkOnline() && site.id && !site.id.startsWith('local_')) {
                try {
                  const { error } = await supabase
                    .from('sites')
                    .update({ sedimentation_photo_url: null })
                    .eq('id', site.id);
                  
                  if (error) {
                    console.error('Failed to clean up sediment photo reference on server:', error);
                  } else {
                  }
                } catch (error) {
                  console.error('Error cleaning up sediment photo reference on server:', error);
                }
              }
              
              fixedPhotos.push({
                siteId: site.id,
                photoType: 'sediment_photo',
                localId: photoLocalId,
                action: 'cleaned_up_invalid_reference'
              });
            }
          }
        }
      }
      
      // Trigger sync if we fixed any photos
      if (fixedPhotos.length > 0) {
        await this.syncWhenOnline();
      }
      
      return {
        success: true,
        message: `Fixed ${fixedPhotos.length} orphaned photos and triggered sync`,
        fixed: fixedPhotos.length,
        details: fixedPhotos
      };
      
    } catch (error) {
      console.error('Failed to fix orphaned photos:', error);
      return {
        success: false,
        message: `Failed to fix orphaned photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fixed: 0
      };
    }
  }

  // Sync data when coming back online
  private async syncWhenOnline(): Promise<void> {
    if (!this.checkOnline()) {
      return;
    }

    
    // Check if there's actually anything to sync
    const syncQueue = await offlineDB.getSyncQueue();
    if (syncQueue.length === 0) {
      return;
    }
    
    
    try {
      // Trigger sync event for UI updates
      window.dispatchEvent(new CustomEvent('riverwalks-sync-started'));
      
      const syncQueue = await offlineDB.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item);
          await offlineDB.removeSyncQueueItem(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          
          // Increment attempts and remove if too many failures
          item.attempts++;
          if (item.attempts >= 3) {
            await offlineDB.removeSyncQueueItem(item.id);
          } else {
            await offlineDB.updateSyncQueueItem(item);
          }
        }
      }
      
      // Refresh local data from server
      await this.downloadLatestData();
      
      // Check for and automatically fix any orphaned photos after sync
      await this.detectAndReportOrphanedPhotos();
      
      // Check if there are any sites with local photo IDs that need fixing
      const syncStatus = await this.getSyncStatus();
      if (syncStatus.sitesWithLocalPhotos.length > 0) {
        await this.fixOrphanedPhotos();
      }
      
      // Force sync status update before dispatching completion event
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      
      window.dispatchEvent(new CustomEvent('riverwalks-sync-completed'));
      
    } catch (error) {
      console.error('Sync failed:', error);
      window.dispatchEvent(new CustomEvent('riverwalks-sync-failed', { detail: error }));
    }
  }

  // Process individual sync queue item
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const { type, table, data } = item;
    
    switch (table) {
      case 'river_walks':
        if (type === 'CREATE') {
          const { data: newRiverWalk, error } = await supabase
            .from('river_walks')
            .insert(data)
            .select()
            .single();
          
          if (error) throw error;
          
          // Update local data with server ID
          if (newRiverWalk) {
            const offlineData = await offlineDB.getAll<OfflineRiverWalk>('riverWalks');
            const localItem = offlineData.find(rw => rw.localId === item.localId);
            if (localItem) {
              localItem.id = newRiverWalk.id;
              localItem.synced = true;
              await offlineDB.addRiverWalk(localItem);
            }
          }
        } else if (type === 'UPDATE') {
          // Find the local item to get the server ID
          const offlineData = await offlineDB.getAll<OfflineRiverWalk>('riverWalks');
          const localItem = offlineData.find(rw => rw.localId === item.localId);
          
          if (localItem && localItem.id && !localItem.id.startsWith('local_')) {
            const { data: updatedRiverWalk, error } = await supabase
              .from('river_walks')
              .update(data)
              .eq('id', localItem.id)
              .select()
              .single();
            
            if (error) throw error;
            
            if (updatedRiverWalk) {
              localItem.synced = true;
              localItem.lastModified = Date.now();
              await offlineDB.addRiverWalk(localItem);
            }
          }
        }
        break;
        
      case 'sites':
        if (type === 'CREATE') {
          const { data: newSite, error } = await supabase
            .from('sites')
            .insert(data)
            .select()
            .single();
          
          if (error) throw error;
          
          if (newSite) {
            const offlineData = await offlineDB.getAll<OfflineSite>('sites');
            const localItem = offlineData.find(s => s.localId === item.localId);
            if (localItem) {
              localItem.id = newSite.id;
              localItem.synced = true;
              await offlineDB.addSite(localItem);
            }
          }
        } else if (type === 'UPDATE') {
          // Find the local item to get the server ID
          const offlineData = await offlineDB.getAll<OfflineSite>('sites');
          const localItem = offlineData.find(s => s.localId === item.localId);
          
          if (localItem && localItem.id && !localItem.id.startsWith('local_')) {
            const { data: updatedSite, error } = await supabase
              .from('sites')
              .update(data)
              .eq('id', localItem.id)
              .select()
              .single();
            
            if (error) throw error;
            
            if (updatedSite) {
              localItem.synced = true;
              localItem.lastModified = Date.now();
              await offlineDB.addSite(localItem);
            }
          }
        } else if (type === 'DELETE') {
          // Delete from server using the ID provided in data
          if (data.id) {
            const { error } = await supabase
              .from('sites')
              .delete()
              .eq('id', data.id);
            
            if (error) throw error;
          }
        }
        break;
        
      case 'measurement_points':
        if (type === 'CREATE') {
          const { data: newPoint, error } = await supabase
            .from('measurement_points')
            .insert(data)
            .select()
            .single();
          
          if (error) throw error;
          
          if (newPoint) {
            const offlineData = await offlineDB.getAll<OfflineMeasurementPoint>('measurementPoints');
            const localItem = offlineData.find(mp => mp.localId === item.localId);
            if (localItem) {
              localItem.id = newPoint.id;
              localItem.synced = true;
              await offlineDB.addMeasurementPoint(localItem);
            }
          }
        } else if (type === 'DELETE') {
          // Delete from server using the ID provided in data
          if (data.id) {
            const { error } = await supabase
              .from('measurement_points')
              .delete()
              .eq('id', data.id);
            
            if (error) throw error;
          }
        }
        break;
        
      case 'photos':
        if (type === 'CREATE') {
          // Upload photo to server with robust retry logic
          
          try {
            const { file, type: photoType, relatedId } = data;
            
            // Validate we have everything we need
            if (!file || !photoType || !relatedId) {
              throw new Error(`Missing photo data: file=${!!file}, type=${photoType}, relatedId=${relatedId}`);
            }
            
            const photoUrl = await this.uploadPhotoToServerWithRetry(file, photoType, relatedId, item.attempts || 0);
            
            if (!photoUrl) {
              throw new Error('Photo upload returned null URL');
            }
            
            
            // Mark the local photo as synced
            const allPhotos = await offlineDB.getAll<OfflinePhoto>('photos');
            const localPhoto = allPhotos.find(p => p.localId === item.localId);
            if (localPhoto) {
              localPhoto.synced = true;
              await offlineDB.addPhoto(localPhoto);
            }
            
            // Update the site record to use the server photo URL instead of local ID
            await this.updateSitePhotoUrl(relatedId, item.localId, photoUrl, photoType);
            
            // Verify the update was successful to prevent orphans
            const allSites = await offlineDB.getAll<OfflineSite>('sites');
            const updatedSite = allSites.find(s => s.localId === relatedId || s.id === relatedId);
            const photoField = photoType === 'site_photo' ? 'photo_url' : 'sedimentation_photo_url';
            if (updatedSite && (updatedSite as any)[photoField] === item.localId) {
              await this.updateSitePhotoUrl(relatedId, item.localId, photoUrl, photoType);
            }
            
            console.log('🎉 Photo sync completed:', { 
              relatedId, 
              localId: item.localId, 
              serverUrl: photoUrl,
              photoType 
            });
            
          } catch (error) {
            // Re-throw so retry logic in main sync loop can handle it
            throw error;
          }
        }
        break;
    }
  }

  // Update site record to replace local photo ID with server URL
  private async updateSitePhotoUrl(
    siteId: string, 
    localPhotoId: string, 
    serverPhotoUrl: string, 
    photoType: 'site_photo' | 'sediment_photo'
  ): Promise<void> {
    try {
      // Determine which field to update based on photo type
      const photoField = photoType === 'site_photo' ? 'photo_url' : 'sedimentation_photo_url';
      
      // Update the server record
      console.log(`Updating site ${siteId} ${photoField} from ${localPhotoId} to ${serverPhotoUrl}`);
      
      const { data, error } = await supabase
        .from('sites')
        .update({ [photoField]: serverPhotoUrl })
        .eq('id', siteId)
        .eq(photoField, localPhotoId) // Only update if it still has the local ID
        .select();
      
      console.log('Site photo URL update result:', { data, error, updated: data?.length });
      
      if (error) {
        console.error('Failed to update site photo URL on server:', error);
        return;
      }
      
      // Update the local record if it exists
      const allSites = await offlineDB.getAll<OfflineSite>('sites');
      const localSite = allSites.find(s => s.id === siteId || s.localId === siteId);
      
      console.log('Found local site for photo URL update:', { 
        siteId, 
        foundSite: !!localSite, 
        currentPhotoUrl: localSite ? (photoType === 'site_photo' ? localSite.photo_url : localSite.sedimentation_photo_url) : null 
      });
      
      if (localSite) {
        if (photoType === 'site_photo') {
          localSite.photo_url = serverPhotoUrl;
        } else {
          localSite.sedimentation_photo_url = serverPhotoUrl;
        }
        await offlineDB.addSite(localSite);
        console.log(`Updated local site ${photoField} from ${localPhotoId} to ${serverPhotoUrl}`);
      }
      
    } catch (error) {
      console.error('Error updating site photo URL:', error);
    }
  }

  // Download latest data with retry logic
  private async downloadLatestDataWithRetry(retryCount: number = 0): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = [1000, 2000, 4000][retryCount] || 4000; // Exponential backoff
    
    try {
      console.log(`Attempting data download (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      // Dispatch event to inform UI about download progress
      window.dispatchEvent(new CustomEvent('riverwalks-data-download-started', {
        detail: { attempt: retryCount + 1, maxAttempts: maxRetries + 1 }
      }));
      
      await this.downloadLatestData();
      console.log(`✅ Data download successful on attempt ${retryCount + 1}`);
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('riverwalks-data-download-success'));
      
      return true;
    } catch (error) {
      console.error(`❌ Data download attempt ${retryCount + 1} failed:`, error);
      
      // Dispatch progress event
      window.dispatchEvent(new CustomEvent('riverwalks-data-download-failed', {
        detail: { 
          attempt: retryCount + 1, 
          maxAttempts: maxRetries + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          willRetry: retryCount < maxRetries
        }
      }));
      
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying data download in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await this.downloadLatestDataWithRetry(retryCount + 1);
      } else {
        console.error('💥 All data download attempts failed');
        return false;
      }
    }
  }

  // Download latest data from server and update local storage
  private async downloadLatestData(): Promise<void> {
    if (!this.checkOnline()) {
      throw new Error('Cannot download data while offline');
    }

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Downloading latest data for user:', user.id);

    // Download river walks
    const { data: riverWalks, error: riverWalksError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (riverWalksError) {
      throw new Error(`Failed to download river walks: ${riverWalksError.message}`);
    }

    if (riverWalks) {
      for (const rw of riverWalks) {
        await offlineDB.addRiverWalk(toOfflineRiverWalk(rw));
      }
      console.log(`Downloaded ${riverWalks.length} river walks`);
    }

    // Download sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .in('river_walk_id', riverWalks?.map(rw => rw.id) || []);

    if (sitesError) {
      throw new Error(`Failed to download sites: ${sitesError.message}`);
    }

    if (sites) {
      for (const site of sites) {
        await offlineDB.addSite(toOfflineSite(site));
      }
      console.log(`Downloaded ${sites.length} sites`);
    }

    // Download measurement points
    const { data: measurementPoints, error: measurementPointsError } = await supabase
      .from('measurement_points')
      .select('*')
      .in('site_id', sites?.map(s => s.id) || []);

    if (measurementPointsError) {
      throw new Error(`Failed to download measurement points: ${measurementPointsError.message}`);
    }

    if (measurementPoints) {
      for (const mp of measurementPoints) {
        await offlineDB.addMeasurementPoint(toOfflineMeasurementPoint(mp));
      }
      console.log(`Downloaded ${measurementPoints.length} measurement points`);
    }

    console.log('Latest data downloaded and cached successfully');
  }

  // River Walks methods
  async getRiverWalks(): Promise<RiverWalk[]> {
    // Always try offline data first for faster loading
    const offlineData = await offlineDB.getRiverWalks();
    const offlineRiverWalks = offlineData.map(rw => fromOfflineRiverWalk(rw) as RiverWalk);

    if (this.checkOnline()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // No user, return offline data if available
          return offlineRiverWalks;
        }

        // Try to fetch fresh data from server
        const { data, error } = await supabase
          .from('river_walks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('API fetch failed, using offline data:', error);
          return offlineRiverWalks;
        }

        // Cache fresh data locally and clean up deleted items
        if (data) {
          try {
            // Get current offline data to compare
            const currentOfflineData = await offlineDB.getRiverWalks();
            const serverIds = new Set(data.map(rw => rw.id));
            
            // Remove offline items that no longer exist on server
            for (const offlineRw of currentOfflineData) {
              if (offlineRw.id && !offlineRw.id.startsWith('local_') && !serverIds.has(offlineRw.id)) {
                console.log('Cleaning up deleted river walk from cache:', offlineRw.id);
                await offlineDB.deleteRiverWalk(offlineRw.localId);
              }
            }
            
            // Add/update fresh server data
            for (const rw of data) {
              await offlineDB.addRiverWalk(toOfflineRiverWalk(rw));
            }
          } catch (cacheError) {
            console.warn('Failed to cache river walks:', cacheError);
          }
        }

        return data || offlineRiverWalks;
      } catch (error) {
        console.warn('Network request failed, using offline data:', error);
        return offlineRiverWalks;
      }
    }

    // Offline - return cached data
    return offlineRiverWalks;
  }

  async createRiverWalk(riverWalkData: Partial<RiverWalk>): Promise<RiverWalk> {
    const localId = generateLocalId();
    const timestamp = Date.now();

    // Get user ID (cached or from auth)
    const userId = await this.getUserId();

    if (!userId) {
      throw new Error('User not authenticated. Please sign in to create river walks.');
    }

    // Create offline version
    const offlineRiverWalk: OfflineRiverWalk = {
      ...riverWalkData,
      id: localId, // Use local ID as temp ID
      localId,
      user_id: userId,
      archived: false,
      synced: false,
      lastModified: timestamp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      date_created: new Date().toISOString(),
    } as OfflineRiverWalk;

    // Save locally first
    await offlineDB.addRiverWalk(offlineRiverWalk);

    if (this.checkOnline()) {
      try {
        const dataToInsert = {
          ...riverWalkData,
          user_id: userId,
          archived: false
        };

        const { data, error } = await supabase
          .from('river_walks')
          .insert(dataToInsert)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          // Update local data with server ID
          offlineRiverWalk.id = data.id;
          offlineRiverWalk.synced = true;
          await offlineDB.addRiverWalk(offlineRiverWalk);
          // Trigger sync status update
          window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
          return data;
        }
      } catch (error) {
        console.error('Failed to create online, will sync later:', error);
        // Add to sync queue
        const dataToSync = {
          ...riverWalkData,
          user_id: userId,
          archived: false
        };
        await this.addToSyncQueue('CREATE', 'river_walks', dataToSync, localId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    } else {
      // Add to sync queue
      const dataToSync = {
        ...riverWalkData,
        user_id: userId,
        archived: false
      };
      await this.addToSyncQueue('CREATE', 'river_walks', dataToSync, localId);
      // Trigger sync status update
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
    }

    return fromOfflineRiverWalk(offlineRiverWalk) as RiverWalk;
  }

  async updateRiverWalk(riverWalkId: string, riverWalkData: Partial<RiverWalk>): Promise<RiverWalk> {
    console.log('Updating river walk:', { riverWalkId, riverWalkData });

    // Get existing river walk from offline storage
    const allRiverWalks = await offlineDB.getRiverWalks();
    const existingRiverWalk = allRiverWalks.find(rw => rw.id === riverWalkId || rw.localId === riverWalkId);
    
    // Handle shared river walks that aren't stored locally
    if (!existingRiverWalk) {
      console.log('River walk not found in offline storage, attempting direct server update for shared river walk');
      
      if (this.checkOnline()) {
        try {
          // Direct server update for shared river walks
          const { data, error } = await supabase
            .from('river_walks')
            .update(riverWalkData) // Don't override user_id for shared river walks
            .eq('id', riverWalkId)
            .select()
            .single();

          if (error) {
            console.error('Server update error for shared river walk:', error);
            throw error;
          }

          console.log('Successfully updated shared river walk on server:', data);
          return data;
        } catch (error) {
          console.error('Failed to update shared river walk:', error);
          throw error;
        }
      } else {
        throw new Error('Cannot update shared river walk while offline');
      }
    }

    // Update the offline version
    const updatedRiverWalk: OfflineRiverWalk = {
      ...existingRiverWalk,
      ...riverWalkData,
      synced: false, // Initially mark as unsynced
      lastModified: Date.now(),
      updated_at: new Date().toISOString(),
    };

    // Save locally first
    await offlineDB.addRiverWalk(updatedRiverWalk);

    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Try to update online immediately if connected
    if (this.checkOnline()) {
      try {
        // Only attempt server update if we have a real server ID (not local)
        if (existingRiverWalk.id && !existingRiverWalk.id.startsWith('local_')) {
          console.log('Attempting online update for river walk:', { 
            riverWalkId, 
            serverId: existingRiverWalk.id, 
            updateData: riverWalkData,
            isOnline: this.checkOnline()
          });
          
          // CRITICAL: Preserve original ownership for shared river walks
          // Only set user_id for new river walks, never overwrite existing ones
          const updatePayload = {
            ...riverWalkData,
            // DO NOT include user_id in updates - preserve original owner
          };
          console.log('Update payload:', updatePayload);
          
          const { data, error } = await supabase
            .from('river_walks')
            .update(updatePayload)
            .eq('id', existingRiverWalk.id)
            .select()
            .single();

          console.log('Supabase update result:', { data, error });

          if (error) {
            console.error('Supabase update error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            throw error;
          }

          if (data) {
            // Successfully updated online - mark as synced
            updatedRiverWalk.synced = true;
            await offlineDB.addRiverWalk(updatedRiverWalk);
            console.log('River walk updated online successfully - marked as synced:', riverWalkId);
            // Trigger sync status update
            window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
            return data;
          } else {
            console.error('No data returned from update operation');
            throw new Error('No data returned from update operation');
          }
        } else {
          console.log('River walk has local ID, adding to sync queue:', { riverWalkId, localId: existingRiverWalk.id });
          // Local item - add to sync queue
          await this.addToSyncQueue('UPDATE', 'river_walks', {
            ...riverWalkData,
            user_id: userId,
          }, updatedRiverWalk.localId);
          // Trigger sync status update
          window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
        }
      } catch (error) {
        console.error('Failed to update online, will sync later. Error details:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          riverWalkId,
          serverId: existingRiverWalk.id
        });
        // Add to sync queue for later
        await this.addToSyncQueue('UPDATE', 'river_walks', {
          ...riverWalkData,
          user_id: userId,
        }, updatedRiverWalk.localId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    } else {
      // Offline - add to sync queue
      console.log('Offline - adding river walk to sync queue:', riverWalkId);
      await this.addToSyncQueue('UPDATE', 'river_walks', {
        ...riverWalkData,
        user_id: userId,
      }, updatedRiverWalk.localId);
      // Trigger sync status update
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
    }

    return fromOfflineRiverWalk(updatedRiverWalk) as RiverWalk;
  }

  async archiveRiverWalk(riverWalkId: string): Promise<RiverWalk> {
    console.log('Archiving river walk:', { riverWalkId });
    return await this.updateRiverWalk(riverWalkId, { archived: true });
  }

  async restoreRiverWalk(riverWalkId: string): Promise<RiverWalk> {
    console.log('Restoring river walk:', { riverWalkId });
    return await this.updateRiverWalk(riverWalkId, { archived: false });
  }

  async deleteRiverWalk(riverWalkId: string): Promise<boolean> {
    console.log('Deleting river walk:', { riverWalkId });

    // Get existing river walk from offline storage
    const allRiverWalks = await offlineDB.getRiverWalks();
    const existingRiverWalk = allRiverWalks.find(rw => rw.id === riverWalkId || rw.localId === riverWalkId);
    
    if (!existingRiverWalk) {
      throw new Error('River walk not found');
    }

    // Delete from local storage first
    await offlineDB.deleteRiverWalk(existingRiverWalk.localId);

    // If online and has server ID, delete from server immediately
    if (this.checkOnline() && existingRiverWalk.id && !existingRiverWalk.id.startsWith('local_')) {
      try {
        const { error } = await supabase
          .from('river_walks')
          .delete()
          .eq('id', existingRiverWalk.id);

        if (error) throw error;
        
        console.log('River walk deleted from server successfully:', riverWalkId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
        return true;
      } catch (error) {
        console.error('Failed to delete from server, will sync later:', error);
        // Add to sync queue for later deletion
        await this.addToSyncQueue('DELETE', 'river_walks', { id: existingRiverWalk.id }, existingRiverWalk.localId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    } else if (existingRiverWalk.id && existingRiverWalk.id.startsWith('local_')) {
      // Local-only river walk - just delete locally
      console.log('Deleted local-only river walk:', riverWalkId);
      // Trigger sync status update
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
    } else if (!this.checkOnline()) {
      // Offline - add to sync queue if it has a server ID
      if (existingRiverWalk.id && !existingRiverWalk.id.startsWith('local_')) {
        await this.addToSyncQueue('DELETE', 'river_walks', { id: existingRiverWalk.id }, existingRiverWalk.localId);
        console.log('River walk delete queued for sync:', riverWalkId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    }

    return true;
  }

  // Sites methods
  async getSitesByRiverWalk(riverWalkId: string): Promise<Site[]> {
    if (this.checkOnline()) {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select(`
            *,
            measurement_points (*)
          `)
          .eq('river_walk_id', riverWalkId)
          .order('site_number', { ascending: true });

        if (error) throw error;

        // Clear existing cached sites for this river walk first to prevent stale data
        const existingCachedSites = await offlineDB.getSites();
        for (const cachedSite of existingCachedSites) {
          if (cachedSite.river_walk_id === riverWalkId && cachedSite.synced) {
            // Only clear synced sites (not unsynced local ones in queue)
            await offlineDB.deleteSite(cachedSite.localId);
            // Also clear cached measurement points for this site
            const cachedPoints = await offlineDB.getMeasurementPointsBySite(cachedSite.localId);
            for (const point of cachedPoints) {
              if (point.synced) {
                await offlineDB.deleteMeasurementPoint(point.localId);
              }
            }
          }
        }

        // Cache fresh data from server
        if (data) {
          for (const site of data) {
            const offlineSite = {
              ...site,
              localId: site.id || generateLocalId(),
              // Don't set river_walk_local_id for server sites to avoid confusion
              synced: true,
              lastModified: Date.now()
            };
            await offlineDB.addSite(offlineSite);
            
            // Cache measurement points
            if (site.measurement_points) {
              for (const mp of site.measurement_points) {
                await offlineDB.addMeasurementPoint(toOfflineMeasurementPoint(mp));
              }
            }
          }
        }

        return data || [];
      } catch (error) {
        console.error('Online fetch failed, using offline data:', error);
      }
    }

    // Use offline data - need to handle both local and server IDs with deduplication
    const allSites = await offlineDB.getSites();
    let offlineSites = allSites.filter(site => 
      site.river_walk_id === riverWalkId || 
      site.river_walk_local_id === riverWalkId
    );

    // Deduplicate sites: prefer server IDs over local IDs
    const siteMap = new Map<string, any>();
    const seenSiteNumbers = new Set<number>();

    for (const site of offlineSites) {
      const siteNumber = site.site_number;
      const hasServerId = site.id && !site.id.startsWith('local_');
      
      // Skip if we already have a site with this site number and a server ID
      if (seenSiteNumbers.has(siteNumber)) {
        const existingKey = Array.from(siteMap.keys()).find(key => 
          siteMap.get(key).site_number === siteNumber
        );
        if (existingKey) {
          const existingSite = siteMap.get(existingKey);
          const existingHasServerId = existingSite.id && !existingSite.id.startsWith('local_');
          
          // Keep the one with server ID, or keep the existing one if both are local
          if (hasServerId && !existingHasServerId) {
            siteMap.delete(existingKey);
            seenSiteNumbers.delete(siteNumber);
          } else {
            continue; // Skip this duplicate
          }
        }
      }

      const key = site.id || site.localId;
      siteMap.set(key, site);
      seenSiteNumbers.add(siteNumber);
    }

    // Convert map back to array and sort
    offlineSites = Array.from(siteMap.values());
    offlineSites.sort((a, b) => (a.site_number || 0) - (b.site_number || 0));

    const sites: Site[] = [];

    for (const offlineSite of offlineSites) {
      const site = fromOfflineSite(offlineSite) as Site;
      
      // Get measurement points for this site and preserve all data
      const offlinePoints = await offlineDB.getMeasurementPointsBySite(offlineSite.localId);
      site.measurement_points = offlinePoints.map(mp => fromOfflineMeasurementPoint(mp) as MeasurementPoint);
      
      sites.push(site);
    }

    return sites;
  }

  async createSite(siteData: Partial<Site>): Promise<Site> {
    const localId = generateLocalId();
    const timestamp = Date.now();

    console.log('Creating site with data:', siteData);

    // Get user ID for the site
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('User not authenticated. Please sign in to create sites.');
    }

    // Create offline version
    const offlineSite: OfflineSite = {
      ...siteData,
      id: localId,
      localId,
      river_walk_local_id: siteData.river_walk_id || '',
      synced: false,
      lastModified: timestamp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as OfflineSite;

    // Save locally first
    await offlineDB.addSite(offlineSite);

    if (this.checkOnline()) {
      try {
        const { data, error } = await supabase
          .from('sites')
          .insert(siteData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          // Remove the local version first to prevent duplicates
          await offlineDB.deleteSite(localId);
          
          // Now add the server version with server ID
          offlineSite.id = data.id;
          offlineSite.localId = data.id; // Use server ID as localId too
          offlineSite.synced = true;
          await offlineDB.addSite(offlineSite);
          
          // Trigger sync status update
          window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
          return data;
        }
      } catch (error) {
        console.error('Failed to create site online, will sync later:', error);
        await this.addToSyncQueue('CREATE', 'sites', siteData, localId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    } else {
      await this.addToSyncQueue('CREATE', 'sites', siteData, localId);
      // Trigger sync status update
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
    }

    return fromOfflineSite(offlineSite) as Site;
  }

  async updateSite(siteId: string, siteData: Partial<Site>): Promise<Site> {
    console.log('Updating site:', { siteId, siteData });

    // Get existing site from offline storage
    const allSites = await offlineDB.getSites();
    const existingSite = allSites.find(s => s.id === siteId || s.localId === siteId);
    
    if (!existingSite) {
      throw new Error('Site not found');
    }

    // Update the offline version
    const updatedSite: OfflineSite = {
      ...existingSite,
      ...siteData,
      synced: false, // Initially mark as unsynced
      lastModified: Date.now(),
      updated_at: new Date().toISOString(),
    };

    // Save locally first
    await offlineDB.addSite(updatedSite);

    // Try to update online immediately if connected
    if (this.checkOnline()) {
      try {
        // Only attempt server update if we have a real server ID (not local)
        if (existingSite.id && !existingSite.id.startsWith('local_')) {
          console.log('Attempting online update for site:', { siteId, serverId: existingSite.id });
          const { data, error } = await supabase
            .from('sites')
            .update(siteData)
            .eq('id', existingSite.id)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            // Successfully updated online - mark as synced
            updatedSite.synced = true;
            await offlineDB.addSite(updatedSite);
            console.log('Site updated online successfully - marked as synced:', siteId);
            // Trigger sync status update
            window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
            return data;
          }
        } else {
          console.log('Site has local ID, adding to sync queue:', { siteId, localId: existingSite.id });
          // Local item - add to sync queue
          await this.addToSyncQueue('UPDATE', 'sites', siteData, updatedSite.localId);
          // Trigger sync status update
          window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
        }
      } catch (error) {
        console.error('Failed to update site online, will sync later:', error);
        // Add to sync queue for later
        await this.addToSyncQueue('UPDATE', 'sites', siteData, updatedSite.localId);
        // Trigger sync status update
        window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      }
    } else {
      // Offline - add to sync queue
      console.log('Offline - adding site to sync queue:', siteId);
      await this.addToSyncQueue('UPDATE', 'sites', siteData, updatedSite.localId);
      // Trigger sync status update
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
    }
    
    console.log('Site updated:', { siteId, synced: updatedSite.synced });

    return fromOfflineSite(updatedSite) as Site;
  }

  async deleteSite(siteId: string): Promise<boolean> {
    console.log('Deleting site:', { siteId });

    // Get existing site from offline storage
    const allSites = await offlineDB.getSites();
    const existingSite = allSites.find(s => s.id === siteId || s.localId === siteId);
    
    if (!existingSite) {
      throw new Error('Site not found');
    }

    // Store site info for renumbering
    const deletedSiteNumber = existingSite.site_number;
    const riverWalkId = existingSite.river_walk_id;

    // Remove from local storage
    await offlineDB.deleteSite(existingSite.localId);

    // Auto-renumber remaining sites
    await this.renumberSitesAfterDeletion(riverWalkId, deletedSiteNumber);

    // Only try to delete from server if the site exists on server (has server ID)
    if (existingSite.id && !existingSite.id.startsWith('local_')) {
      if (this.checkOnline()) {
        try {
          // Try to delete from server immediately
          const { error } = await supabase
            .from('sites')
            .delete()
            .eq('id', existingSite.id);

          if (error) throw error;
          
          console.log('Site deleted from server immediately:', { siteId, serverId: existingSite.id });
          // Trigger sync status update but don't mark as modified since it completed immediately
          window.dispatchEvent(new CustomEvent('riverwalks-data-changed', {
            detail: { skipSyncCompleteToast: true } // Skip the sync complete toast for immediate operations
          }));
          // Signal that this was an immediate deletion (not queued)
          window.dispatchEvent(new CustomEvent('riverwalks-site-deleted-immediately', { 
            detail: { siteId, riverWalkId: existingSite.river_walk_id } 
          }));
          return true;
        } catch (error) {
          console.error('Failed to delete from server, adding to sync queue:', error);
          // Add to sync queue as fallback
          await this.addToSyncQueue('DELETE', 'sites', { id: existingSite.id }, existingSite.localId);
          console.log('Site deleted locally and added to sync queue:', { siteId, localId: existingSite.localId });
        }
      } else {
        // Offline - add to sync queue
        await this.addToSyncQueue('DELETE', 'sites', { id: existingSite.id }, existingSite.localId);
        console.log('Site deleted locally and added to sync queue (offline):', { siteId, localId: existingSite.localId });
      }
    } else {
      console.log('Site deleted locally (was local-only):', { siteId, localId: existingSite.localId });
    }

    return true;
  }

  // Auto-renumber sites after deletion
  private async renumberSitesAfterDeletion(riverWalkId: string, deletedSiteNumber: number): Promise<void> {
    try {
      // Get all sites for this river walk
      const allSites = await offlineDB.getSites();
      const riverWalkSites = allSites.filter(site => 
        (site.river_walk_id === riverWalkId || site.river_walk_local_id === riverWalkId) &&
        site.site_number > deletedSiteNumber
      );

      console.log(`Renumbering ${riverWalkSites.length} sites after deleting site ${deletedSiteNumber}`);

      // Renumber sites that come after the deleted site
      for (const site of riverWalkSites) {
        const newSiteNumber = site.site_number - 1;
        const newSiteName = `Site ${newSiteNumber}`;
        
        // Update site number and name
        const updatedSite = {
          ...site,
          site_number: newSiteNumber,
          site_name: newSiteName,
          synced: false, // Mark as unsynced since we're changing it
          lastModified: Date.now()
        };

        await offlineDB.addSite(updatedSite);

        // If online and site has server ID, update on server or queue for sync
        if (site.id && !site.id.startsWith('local_')) {
          if (this.checkOnline()) {
            try {
              const { error } = await supabase
                .from('sites')
                .update({ 
                  site_number: newSiteNumber,
                  site_name: newSiteName
                })
                .eq('id', site.id);

              if (error) throw error;
              
              // Mark as synced if server update succeeded
              updatedSite.synced = true;
              await offlineDB.addSite(updatedSite);
              
              console.log(`Site ${site.id} renumbered on server: ${site.site_number} → ${newSiteNumber}`);
            } catch (error) {
              console.error('Failed to renumber site on server, will sync later:', error);
              // Add to sync queue for later
              await this.addToSyncQueue('UPDATE', 'sites', { 
                site_number: newSiteNumber,
                site_name: newSiteName
              }, site.localId);
            }
          } else {
            // Offline - add to sync queue
            await this.addToSyncQueue('UPDATE', 'sites', { 
              site_number: newSiteNumber,
              site_name: newSiteName
            }, site.localId);
          }
        }
      }

      // Trigger data change event to update UI
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      
    } catch (error) {
      console.error('Error renumbering sites:', error);
      // Don't throw - deletion should still succeed even if renumbering fails
    }
  }

  // Measurement Points methods
  async getMeasurementPointsBySite(siteId: string): Promise<MeasurementPoint[]> {
    // Use offline data - need to handle both local and server IDs
    const offlinePoints = await offlineDB.getMeasurementPointsBySite(siteId);
    return offlinePoints.map(mp => fromOfflineMeasurementPoint(mp) as MeasurementPoint);
  }

  async createMeasurementPoint(pointData: Partial<MeasurementPoint>): Promise<MeasurementPoint> {
    const localId = generateLocalId();
    const timestamp = Date.now();

    console.log('Creating measurement point with data:', pointData);

    // Create offline version
    const offlinePoint: OfflineMeasurementPoint = {
      ...pointData,
      id: localId,
      localId,
      site_local_id: pointData.site_id || '',
      synced: false,
      lastModified: timestamp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as OfflineMeasurementPoint;

    // Save locally first
    await offlineDB.addMeasurementPoint(offlinePoint);

    if (this.checkOnline()) {
      try {
        const { data, error } = await supabase
          .from('measurement_points')
          .insert(pointData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          offlinePoint.id = data.id;
          offlinePoint.synced = true;
          await offlineDB.addMeasurementPoint(offlinePoint);
          return data;
        }
      } catch (error) {
        console.error('Failed to create measurement point online, will sync later:', error);
        await this.addToSyncQueue('CREATE', 'measurement_points', pointData, localId);
      }
    } else {
      await this.addToSyncQueue('CREATE', 'measurement_points', pointData, localId);
    }

    return fromOfflineMeasurementPoint(offlinePoint) as MeasurementPoint;
  }

  async deleteMeasurementPointsForSite(siteId: string): Promise<boolean> {
    console.log('Deleting measurement points for site:', { siteId });

    // Get all measurement points for this site
    const allPoints = await offlineDB.getMeasurementPointsBySite(siteId);
    
    for (const point of allPoints) {
      // Remove from local storage
      await offlineDB.deleteMeasurementPoint(point.localId);

      // Only add to sync queue if the point exists on server (has server ID)
      if (point.id && !point.id.startsWith('local_')) {
        await this.addToSyncQueue('DELETE', 'measurement_points', { id: point.id }, point.localId);
        console.log('Measurement point deleted locally and added to sync queue:', { pointId: point.id, localId: point.localId });
      } else {
        console.log('Measurement point deleted locally (was local-only):', { localId: point.localId });
      }
    }

    return true;
  }

  async createMeasurementPoints(siteId: string, pointsData: Partial<MeasurementPoint>[]): Promise<MeasurementPoint[]> {
    console.log('Creating multiple measurement points for site:', { siteId, count: pointsData.length });

    const createdPoints: MeasurementPoint[] = [];
    
    for (const pointData of pointsData) {
      const pointWithSiteId = { ...pointData, site_id: siteId };
      const createdPoint = await this.createMeasurementPoint(pointWithSiteId);
      createdPoints.push(createdPoint);
    }

    return createdPoints;
  }

  // Photo handling methods
  async storePhotoOffline(file: File, type: 'site_photo' | 'sediment_photo', relatedId: string): Promise<string> {
    const localId = generateLocalId();
    const timestamp = Date.now();

    const offlinePhoto: OfflinePhoto = {
      id: localId,
      localId,
      file,
      type,
      relatedId,
      synced: false,
      timestamp
    };

    await offlineDB.addPhoto(offlinePhoto);
    console.log('Photo stored offline:', { localId, type, relatedId });
    
    // Add to sync queue for later upload
    if (this.checkOnline()) {
      try {
        // Try to upload immediately if online
        const uploadedUrl = await this.uploadPhotoToServer(file, type, relatedId);
        if (uploadedUrl) {
          // Mark as synced and store server URL
          offlinePhoto.synced = true;
          await offlineDB.addPhoto(offlinePhoto);
          
          // Update the site record to use the server photo URL instead of local ID
          await this.updateSitePhotoUrl(relatedId, localId, uploadedUrl, type);
          
          return uploadedUrl;
        }
      } catch (error) {
        console.log('Immediate upload failed, will sync later:', error);
      }
    }
    
    // Add to sync queue for later upload
    try {
      await this.addToSyncQueue('CREATE', 'photos', {
        file,
        type,
        relatedId
      }, localId);
    } catch (error) {
      // This is critical - if we can't queue for sync, we shouldn't save the local ID
      throw new Error('Failed to queue photo for sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    return localId;
  }

  async getPhotosByRelatedId(relatedId: string): Promise<OfflinePhoto[]> {
    return await offlineDB.getPhotosByRelatedId(relatedId);
  }

  async getPhotoUrl(photoId: string, relatedId: string): Promise<string | null> {
    try {
      // First try to get from offline storage
      const photos = await this.getPhotosByRelatedId(relatedId);
      const photo = photos.find(p => p.id === photoId || p.localId === photoId);
      
      if (photo) {
        // Create blob URL for offline photo
        return URL.createObjectURL(photo.file);
      }
      
      // If not found offline and we're online, it might be a server photo
      if (this.checkOnline() && !photoId.startsWith('local_')) {
        // This would be a server photo URL - implement based on your storage solution
        return null; // For now, return null for server photos
      }
      
      return null;
    } catch (error) {
      console.error('Error getting photo URL:', error);
      return null;
    }
  }

  async deletePhotoOffline(photoId: string, relatedId: string): Promise<boolean> {
    try {
      const photos = await this.getPhotosByRelatedId(relatedId);
      const photo = photos.find(p => p.id === photoId || p.localId === photoId);
      
      if (photo) {
        await offlineDB.deletePhoto(photo.localId);
        console.log('Photo deleted offline:', photoId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting photo offline:', error);
      return false;
    }
  }

  async removeOnlinePhoto(photoUrl: string, relatedId: string, photoType: 'site_photo' | 'sediment_photo'): Promise<void> {
    try {
      // Delete from storage
      const { deleteSitePhoto } = await import('./api/storage');
      await deleteSitePhoto(photoUrl);
      
      // Clear photo URL from site record
      const photoField = photoType === 'site_photo' ? 'photo_url' : 'sedimentation_photo_url';
      
      // Update both local and server records
      const allSites = await offlineDB.getAll<OfflineSite>('sites');
      const site = allSites.find(s => s.localId === relatedId || s.id === relatedId);
      if (site) {
        (site as any)[photoField] = null;
        await offlineDB.put('sites', site);
        
        // If online, also update server
        if (this.isOnline && !site.id?.startsWith('local_')) {
          const { error } = await supabase
            .from('sites')
            .update({ [photoField]: null })
            .eq('id', site.id);
          
          if (error) {
            console.error('Failed to update site on server:', error);
            throw error;
          }
        }
      }
      
      console.log('Online photo removed:', photoUrl);
    } catch (error) {
      console.error('Error removing online photo:', error);
      throw new Error('Failed to remove photo');
    }
  }

  // Upload photo with retry logic (like other data sync)
  async uploadPhotoToServerWithRetry(file: File, type: 'site_photo' | 'sediment_photo', relatedId: string, attemptNumber: number = 0): Promise<string | null> {
    const maxRetries = 3;
    const retryDelay = [1000, 2000, 5000][attemptNumber] || 5000; // Exponential backoff
    
    try {
      return await this.uploadPhotoToServer(file, type, relatedId);
    } catch (error) {
      
      if (attemptNumber < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await this.uploadPhotoToServerWithRetry(file, type, relatedId, attemptNumber + 1);
      } else {
        throw error;
      }
    }
  }

  async uploadPhotoToServer(file: File, type: 'site_photo' | 'sediment_photo', relatedId: string): Promise<string | null> {
    if (!this.checkOnline()) {
      throw new Error('Cannot upload photo while offline');
    }

    try {
      // Get user session for upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated - please log in again');
      }

      // Import upload function dynamically to avoid circular dependencies
      const { uploadSitePhoto } = await import('./api/storage');
      
      // Map photo types to storage types
      const storageType = type === 'sediment_photo' ? 'sedimentation' : 'site';
      
      // Upload to server
      const photoUrl = await uploadSitePhoto(relatedId, file, session.user.id, storageType);
      
      if (!photoUrl) {
        throw new Error('Storage upload returned empty URL');
      }
      
      return photoUrl;
      
    } catch (error) {
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('STORAGE_SETUP_REQUIRED')) {
          throw new Error('Storage bucket not configured - cannot upload photos');
        }
        if (error.message.includes('User not authenticated')) {
          throw new Error('Authentication expired - please log in again');
        }
        if (error.message.includes('row-level security')) {
          throw new Error('Storage permissions error - check RLS policies');
        }
      }
      
      // Re-throw the original error for retry logic
      throw error;
    }
  }

  async uploadPhotoWhenOnline(photoId: string): Promise<string | null> {
    if (!this.checkOnline()) {
      console.log('Cannot upload photo while offline');
      return null;
    }

    try {
      // Find the photo in offline storage
      const allPhotos = await offlineDB.getAll<OfflinePhoto>('photos');
      const photo = allPhotos.find(p => p.id === photoId || p.localId === photoId);
      
      if (!photo) {
        console.error('Photo not found for upload:', photoId);
        return null;
      }

      // Upload to server
      const photoUrl = await this.uploadPhotoToServer(photo.file, photo.type, photo.relatedId);
      
      if (photoUrl) {
        // Mark as synced
        photo.synced = true;
        await offlineDB.addPhoto(photo);
        console.log('Photo synced successfully:', photoId);
      }
      
      return photoUrl;
    } catch (error) {
      console.error('Error uploading photo when online:', error);
      return null;
    }
  }

  // Initialize the service
  async init(): Promise<void> {
    try {
      console.log('Initializing OfflineDataService...');
      await offlineDB.init();
      
      // Cache user ID if online
      if (this.checkOnline()) {
        const userId = await this.cacheUserId();
        if (userId) {
          // Try to download latest data with retry logic
          const downloadSuccess = await this.downloadLatestDataWithRetry();
          if (!downloadSuccess) {
            console.warn('Failed to download initial data, but service will continue with cached data');
            // Dispatch event to inform UI about data initialization issues
            window.dispatchEvent(new CustomEvent('riverwalks-init-warning', {
              detail: { message: 'Using cached data - some data may be outdated' }
            }));
          } else {
            // If download succeeded, clean up stale records on every launch
            console.log('Running stale record cleanup after successful data download');
            await this.cleanupStaleRecords();
          }
        }
        
        // Auto-sync any pending items when coming online
        const syncQueue = await offlineDB.getSyncQueue();
        if (syncQueue.length > 0) {
          console.log('Found pending sync items, starting auto-sync...', {
            queueLength: syncQueue.length,
            items: syncQueue.map(item => ({ table: item.table, type: item.type, localId: item.localId }))
          });
          setTimeout(() => this.syncWhenOnline(), 1000); // Small delay to ensure everything is initialized
        }
      }
      
      console.log('OfflineDataService initialized successfully');
      // Dispatch successful initialization event
      window.dispatchEvent(new CustomEvent('riverwalks-init-complete'));
    } catch (error) {
      console.error('Failed to initialize OfflineDataService:', error);
      // Dispatch initialization error event
      window.dispatchEvent(new CustomEvent('riverwalks-init-error', {
        detail: { error: error instanceof Error ? error.message : 'Unknown error' }
      }));
      // Don't throw - we want the app to continue working with whatever data is available
    }
  }

  // Force sync (for manual trigger)
  async forceSync(): Promise<void> {
    if (this.checkOnline()) {
      await this.syncWhenOnline();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }


  // Debug method to get detailed sync queue info
  async getDetailedSyncQueue(): Promise<any[]> {
    const syncQueue = await offlineDB.getSyncQueue();
    return syncQueue.map(item => ({
      id: item.id,
      type: item.type,
      table: item.table,
      localId: item.localId,
      attempts: item.attempts,
      timestamp: new Date(item.timestamp).toLocaleString(),
      data: item.data
    }));
  }

  // Clear all sync queue items (for debugging)
  async clearSyncQueue(): Promise<void> {
    const syncQueue = await offlineDB.getSyncQueue();
    console.log(`Clearing ${syncQueue.length} items from sync queue`);
    for (const item of syncQueue) {
      await offlineDB.removeSyncQueueItem(item.id);
    }
    console.log('Sync queue cleared');
  }

  // Check if a specific river walk has pending sync items
  async isRiverWalkSynced(riverWalkId: string): Promise<boolean> {
    try {
      // Check if river walk itself is synced (has server ID)
      const riverWalkSynced = Boolean(riverWalkId && !riverWalkId.startsWith('local_'));
      
      // Check sync queue for items related to this river walk
      const syncQueue = await offlineDB.getSyncQueue();
      const riverWalkPendingItems = syncQueue.filter(item => {
        if (item.table === 'river_walks') {
          // Check if this sync item is for this river walk
          return item.localId === riverWalkId || item.data?.id === riverWalkId;
        }
        if (item.table === 'sites') {
          // Check if this site belongs to this river walk
          return item.data?.river_walk_id === riverWalkId;
        }
        return false;
      });

      const hasPendingItems = riverWalkPendingItems.length > 0;
      
      console.log(`River walk ${riverWalkId} sync check:`, {
        riverWalkSynced,
        hasPendingItems,
        pendingItemsCount: riverWalkPendingItems.length,
        result: riverWalkSynced && !hasPendingItems
      });

      return riverWalkSynced && !hasPendingItems;
    } catch (error) {
      console.error('Error checking river walk sync status:', error);
      return false;
    }
  }

  // Clear cached user data (call on sign out)
  clearUserCache(): void {
    this.cachedUserId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('riverwalks_user_id');
    }
  }

  // Clear all offline data (for debugging or user switching)
  async clearAllOfflineData(): Promise<void> {
    console.log('Clearing all offline data...');
    try {
      // Clear all IndexedDB data
      await offlineDB.clearAll();
      
      // Clear user cache
      this.clearUserCache();
      
      // Clear cached subscription data
      const { clearCachedSubscription } = await import('../hooks/useSubscription');
      clearCachedSubscription();
      
      // Clear any relevant localStorage items
      if (typeof window !== 'undefined') {
        localStorage.removeItem('riverwalks_sync_queue_cleared');
        // Clear existing user flags for all users
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('riverwalks_existing_user_') || key.startsWith('riverwalks_permanent_existing_user_')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      console.log('All offline data cleared successfully');
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  // Clean up stale records that no longer exist on server
  private async cleanupStaleRecords(): Promise<void> {
    try {
      console.log('Starting stale record cleanup...');
      
      // Get user ID - use session first for better offline resilience
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user || null;
      
      // Fallback to getUser only if session doesn't have user
      if (!user) {
        const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Failed to get user during cleanup, skipping stale record cleanup:', error);
          return;
        }
        user = fetchedUser || null;
      }
      
      if (!user) {
        console.log('No user found during cleanup, skipping stale record cleanup');
        return;
      }

      // Fetch current server data
      const { data: serverRiverWalks } = await supabase
        .from('river_walks')
        .select('id')
        .eq('user_id', user.id);

      if (!serverRiverWalks) return;

      const serverRiverWalkIds = new Set(serverRiverWalks.map(rw => rw.id));
      
      // Get all cached river walks
      const cachedRiverWalks = await offlineDB.getRiverWalks();
      
      // Remove river walks that no longer exist on server
      let cleanedRiverWalks = 0;
      for (const cachedRw of cachedRiverWalks) {
        if (cachedRw.id && 
            !cachedRw.id.startsWith('local_') && 
            !serverRiverWalkIds.has(cachedRw.id)) {
          console.log('Cleaning up stale river walk:', cachedRw.id);
          await offlineDB.deleteRiverWalk(cachedRw.localId);
          cleanedRiverWalks++;
        }
      }

      // Get server sites and clean up stale ones
      const { data: serverSites } = await supabase
        .from('sites')
        .select('id')
        .in('river_walk_id', Array.from(serverRiverWalkIds));

      if (serverSites) {
        const serverSiteIds = new Set(serverSites.map(s => s.id));
        const cachedSites = await offlineDB.getSites();
        
        let cleanedSites = 0;
        for (const cachedSite of cachedSites) {
          if (cachedSite.id && 
              !cachedSite.id.startsWith('local_') && 
              !serverSiteIds.has(cachedSite.id)) {
            console.log('Cleaning up stale site:', cachedSite.id);
            await offlineDB.deleteSite(cachedSite.localId);
            cleanedSites++;
          }
        }

        // Get server measurement points and clean up stale ones
        const { data: serverMeasurementPoints } = await supabase
          .from('measurement_points')
          .select('id')
          .in('site_id', Array.from(serverSiteIds));

        if (serverMeasurementPoints) {
          const serverMpIds = new Set(serverMeasurementPoints.map(mp => mp.id));
          const cachedMps = await offlineDB.getAll<OfflineMeasurementPoint>('measurementPoints');
          
          let cleanedMeasurementPoints = 0;
          for (const cachedMp of cachedMps) {
            if (cachedMp.id && 
                !cachedMp.id.startsWith('local_') && 
                !serverMpIds.has(cachedMp.id)) {
              console.log('Cleaning up stale measurement point:', cachedMp.id);
              await offlineDB.deleteMeasurementPoint(cachedMp.localId);
              cleanedMeasurementPoints++;
            }
          }

          console.log(`Stale record cleanup complete: ${cleanedRiverWalks} river walks, ${cleanedSites} sites, ${cleanedMeasurementPoints} measurement points`);
        }
      }
    } catch (error) {
      console.error('Error during stale record cleanup:', error);
      // Don't throw - this is a cleanup operation that shouldn't break initialization
    }
  }

  // Clear all site cache for debugging/testing
  async clearSiteCache(riverWalkId?: string): Promise<void> {
    console.log('Clearing site cache for river walk:', riverWalkId || 'all');
    
    const allSites = await offlineDB.getSites();
    const sitesToClear = riverWalkId 
      ? allSites.filter(site => site.river_walk_id === riverWalkId)
      : allSites;

    for (const site of sitesToClear) {
      await offlineDB.deleteSite(site.localId);
      
      // Also clear measurement points for this site
      const points = await offlineDB.getMeasurementPointsBySite(site.localId);
      for (const point of points) {
        await offlineDB.deleteMeasurementPoint(point.localId);
      }
    }
    
  }
}

// Export singleton instance
export const offlineDataService = new OfflineDataService();