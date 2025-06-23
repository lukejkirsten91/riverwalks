// Offline-aware data service that handles both online and offline operations
import { supabase } from './supabase';
import { offlineDB, type OfflineRiverWalk, type OfflineSite, type OfflineMeasurementPoint, type SyncQueueItem } from './indexedDB';
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
  private async addToSyncQueue(type: 'CREATE' | 'UPDATE' | 'DELETE', table: 'river_walks' | 'sites' | 'measurement_points', data: any, localId: string): Promise<void> {
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
      }
    } else {
      // Add to sync queue
      const dataToSync = {
        ...riverWalkData,
        user_id: userId,
        archived: false
      };
      await this.addToSyncQueue('CREATE', 'river_walks', dataToSync, localId);
    }

    return fromOfflineRiverWalk(offlineRiverWalk) as RiverWalk;
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

    const sites: Site[] = [];

    for (const offlineSite of offlineSites) {
      const site = fromOfflineSite(offlineSite) as Site;
      
      // Get measurement points for this site
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
          return data;
        }
      } catch (error) {
        console.error('Failed to create site online, will sync later:', error);
        await this.addToSyncQueue('CREATE', 'sites', siteData, localId);
      }
    } else {
      await this.addToSyncQueue('CREATE', 'sites', siteData, localId);
    }

    return fromOfflineSite(offlineSite) as Site;
  }

  // Initialize the service
  async init(): Promise<void> {
    try {
      await offlineDB.init();
      
      // Cache user ID if online
      if (this.checkOnline()) {
        await this.cacheUserId();
        await this.downloadLatestData();
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
    return {
      pendingItems: syncQueue.length,
      isOnline: this.checkOnline()
    };
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