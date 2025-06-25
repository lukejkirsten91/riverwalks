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
    river_walk_local_id: site.river_walk_id,
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
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncWhenOnline();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      // Cache user ID from localStorage if available
      this.cachedUserId = localStorage.getItem('riverwalks_user_id');
    }
  }

  // Check if we're online
  private checkOnline(): boolean {
    return this.isOnline && typeof window !== 'undefined' && navigator.onLine;
  }

  // Cache user ID for offline use
  private async cacheUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        this.cachedUserId = user.id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('riverwalks_user_id', user.id);
        }
        return user.id;
      }
    } catch (error) {
      console.error('Failed to cache user ID:', error);
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

    await offlineDB.addToSyncQueue(queueItem);
    console.log('Added to sync queue:', queueItem);
  }

  // Sync data when coming back online
  private async syncWhenOnline(): Promise<void> {
    if (!this.checkOnline()) return;

    console.log('Syncing offline data...');
    
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
            console.warn('Removing item after 3 failed attempts:', item);
            await offlineDB.removeSyncQueueItem(item.id);
          } else {
            await offlineDB.updateSyncQueueItem(item);
          }
        }
      }
      
      // Refresh local data from server
      await this.downloadLatestData();
      
      // Force sync status update before dispatching completion event
      window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
      
      window.dispatchEvent(new CustomEvent('riverwalks-sync-completed'));
      console.log('Sync completed successfully');
      
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
            console.log('Site deleted from server:', data.id);
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
            console.log('Measurement point deleted from server:', data.id);
          }
        }
        break;
        
      case 'photos':
        if (type === 'CREATE') {
          // Upload photo to server
          try {
            const { file, type: photoType, relatedId } = data;
            const photoUrl = await this.uploadPhotoToServer(file, photoType, relatedId);
            
            if (photoUrl) {
              // Mark the local photo as synced
              const allPhotos = await offlineDB.getAll<OfflinePhoto>('photos');
              const localPhoto = allPhotos.find(p => p.localId === item.localId);
              if (localPhoto) {
                localPhoto.synced = true;
                await offlineDB.addPhoto(localPhoto);
              }
              console.log('Photo uploaded and marked as synced:', photoUrl);
            }
          } catch (error) {
            console.error('Failed to upload photo during sync:', error);
            throw error;
          }
        }
        break;
    }
  }

  // Download latest data from server and update local storage
  private async downloadLatestData(): Promise<void> {
    if (!this.checkOnline()) return;

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Download river walks
      const { data: riverWalks } = await supabase
        .from('river_walks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (riverWalks) {
        for (const rw of riverWalks) {
          await offlineDB.addRiverWalk(toOfflineRiverWalk(rw));
        }
      }

      // Download sites
      const { data: sites } = await supabase
        .from('sites')
        .select('*')
        .in('river_walk_id', riverWalks?.map(rw => rw.id) || []);

      if (sites) {
        for (const site of sites) {
          await offlineDB.addSite(toOfflineSite(site));
        }
      }

      // Download measurement points
      const { data: measurementPoints } = await supabase
        .from('measurement_points')
        .select('*')
        .in('site_id', sites?.map(s => s.id) || []);

      if (measurementPoints) {
        for (const mp of measurementPoints) {
          await offlineDB.addMeasurementPoint(toOfflineMeasurementPoint(mp));
        }
      }

      console.log('Latest data downloaded and cached');
    } catch (error) {
      console.error('Failed to download latest data:', error);
    }
  }

  // River Walks methods
  async getRiverWalks(): Promise<RiverWalk[]> {
    if (this.checkOnline()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('river_walks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Cache data locally
        if (data) {
          for (const rw of data) {
            await offlineDB.addRiverWalk(toOfflineRiverWalk(rw));
          }
        }

        return data || [];
      } catch (error) {
        console.error('Online fetch failed, using offline data:', error);
      }
    }

    // Use offline data
    const offlineData = await offlineDB.getRiverWalks();
    return offlineData.map(rw => fromOfflineRiverWalk(rw) as RiverWalk);
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
    
    if (!existingRiverWalk) {
      throw new Error('River walk not found');
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
          console.log('Attempting online update for river walk:', { riverWalkId, serverId: existingRiverWalk.id });
          const { data, error } = await supabase
            .from('river_walks')
            .update({
              ...riverWalkData,
              user_id: userId,
            })
            .eq('id', existingRiverWalk.id)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            // Successfully updated online - mark as synced
            updatedRiverWalk.synced = true;
            await offlineDB.addRiverWalk(updatedRiverWalk);
            console.log('River walk updated online successfully - marked as synced:', riverWalkId);
            // Trigger sync status update
            window.dispatchEvent(new CustomEvent('riverwalks-data-changed'));
            return data;
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
        console.error('Failed to update online, will sync later:', error);
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

        // Cache data locally
        if (data) {
          for (const site of data) {
            await offlineDB.addSite(toOfflineSite(site));
            
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

    // Use offline data - need to handle both local and server IDs
    let offlineSites: any[] = [];
    
    // First try to find by exact river_walk_id match
    const allSites = await offlineDB.getSites();
    offlineSites = allSites.filter(site => 
      site.river_walk_id === riverWalkId || 
      site.river_walk_local_id === riverWalkId
    );

    // Sort by site_number to match online ordering
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
          offlineSite.id = data.id;
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
          return uploadedUrl;
        }
      } catch (error) {
        console.log('Immediate upload failed, will sync later:', error);
      }
    }
    
    // Add to sync queue for later upload
    await this.addToSyncQueue('CREATE', 'photos', {
      file,
      type,
      relatedId
    }, localId);
    
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

  async uploadPhotoToServer(file: File, type: 'site_photo' | 'sediment_photo', relatedId: string): Promise<string | null> {
    if (!this.checkOnline()) {
      console.log('Cannot upload photo while offline');
      return null;
    }

    try {
      // Get user session for upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Import upload function dynamically to avoid circular dependencies
      const { uploadSitePhoto } = await import('./api/storage');
      
      // Map photo types to storage types
      const storageType = type === 'sediment_photo' ? 'sedimentation' : 'site';
      
      // Upload to server
      const photoUrl = await uploadSitePhoto(relatedId, file, session.user.id, storageType);
      console.log('Photo uploaded to server:', { type, relatedId, photoUrl });
      
      return photoUrl;
    } catch (error) {
      console.error('Error uploading photo to server:', error);
      return null;
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
      await offlineDB.init();
      
      // Cache user ID if online
      if (this.checkOnline()) {
        await this.cacheUserId();
        await this.downloadLatestData();
        
        // Auto-sync any pending items when coming online
        const syncQueue = await offlineDB.getSyncQueue();
        if (syncQueue.length > 0) {
          console.log('Found pending sync items, starting auto-sync...');
          setTimeout(() => this.syncWhenOnline(), 1000); // Small delay to ensure everything is initialized
        }
      }
      
      console.log('OfflineDataService initialized');
    } catch (error) {
      console.error('Failed to initialize OfflineDataService:', error);
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

  // Get sync status
  async getSyncStatus(): Promise<{ pendingItems: number; isOnline: boolean }> {
    const syncQueue = await offlineDB.getSyncQueue();
    console.log('Getting sync status:', { 
      queueLength: syncQueue.length, 
      queueItems: syncQueue.map(item => ({ 
        type: item.type, 
        table: item.table, 
        localId: item.localId,
        attempts: item.attempts,
        timestamp: new Date(item.timestamp).toLocaleString()
      }))
    });
    return {
      pendingItems: syncQueue.length,
      isOnline: this.checkOnline()
    };
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
}

// Export singleton instance
export const offlineDataService = new OfflineDataService();