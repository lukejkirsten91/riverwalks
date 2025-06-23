// IndexedDB wrapper for offline data storage
import type { RiverWalk, Site, MeasurementPoint } from '../types';

const DB_NAME = 'RiverwalksOfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  RIVER_WALKS: 'riverWalks',
  SITES: 'sites', 
  MEASUREMENT_POINTS: 'measurementPoints',
  SYNC_QUEUE: 'syncQueue',
  PHOTOS: 'photos'
} as const;

export interface OfflineRiverWalk extends Omit<RiverWalk, 'id'> {
  id: string;
  localId: string; // For offline-created items
  synced: boolean;
  lastModified: number;
}

export interface OfflineSite extends Omit<Site, 'id' | 'river_walk_id'> {
  id: string;
  localId: string;
  river_walk_id: string;
  river_walk_local_id?: string; // For offline-created river walks
  synced: boolean;
  lastModified: number;
}

export interface OfflineMeasurementPoint extends Omit<MeasurementPoint, 'id' | 'site_id'> {
  id: string;
  localId: string;
  site_id: string;
  site_local_id?: string; // For offline-created sites
  synced: boolean;
  lastModified: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'river_walks' | 'sites' | 'measurement_points';
  data: any;
  localId: string;
  timestamp: number;
  attempts: number;
}

export interface OfflinePhoto {
  id: string;
  localId: string;
  file: File;
  type: 'site_photo' | 'sediment_photo';
  relatedId: string; // Site local ID
  synced: boolean;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Initialize the database
  async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available on server'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });

    return this.initPromise;
  }

  // Create object stores
  private createStores(db: IDBDatabase): void {
    // River walks store
    if (!db.objectStoreNames.contains(STORES.RIVER_WALKS)) {
      const riverWalksStore = db.createObjectStore(STORES.RIVER_WALKS, { keyPath: 'localId' });
      riverWalksStore.createIndex('id', 'id', { unique: false });
      riverWalksStore.createIndex('synced', 'synced', { unique: false });
      riverWalksStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Sites store
    if (!db.objectStoreNames.contains(STORES.SITES)) {
      const sitesStore = db.createObjectStore(STORES.SITES, { keyPath: 'localId' });
      sitesStore.createIndex('id', 'id', { unique: false });
      sitesStore.createIndex('river_walk_local_id', 'river_walk_local_id', { unique: false });
      sitesStore.createIndex('synced', 'synced', { unique: false });
    }

    // Measurement points store
    if (!db.objectStoreNames.contains(STORES.MEASUREMENT_POINTS)) {
      const measurementsStore = db.createObjectStore(STORES.MEASUREMENT_POINTS, { keyPath: 'localId' });
      measurementsStore.createIndex('id', 'id', { unique: false });
      measurementsStore.createIndex('site_local_id', 'site_local_id', { unique: false });
      measurementsStore.createIndex('synced', 'synced', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('type', 'type', { unique: false });
    }

    // Photos store
    if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
      const photosStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'localId' });
      photosStore.createIndex('relatedId', 'relatedId', { unique: false });
      photosStore.createIndex('synced', 'synced', { unique: false });
    }

    console.log('IndexedDB stores created');
  }

  // Generic method to get data from a store
  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to add data to a store
  async add<T>(storeName: string, data: T): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to update data in a store
  async put<T>(storeName: string, data: T): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to delete data from a store
  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get data by index
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // River Walks specific methods
  async getRiverWalks(): Promise<OfflineRiverWalk[]> {
    return this.getAll<OfflineRiverWalk>(STORES.RIVER_WALKS);
  }

  async addRiverWalk(riverWalk: OfflineRiverWalk): Promise<void> {
    return this.put(STORES.RIVER_WALKS, riverWalk);
  }

  async deleteRiverWalk(localId: string): Promise<void> {
    return this.delete(STORES.RIVER_WALKS, localId);
  }

  // Sites specific methods
  async getSites(): Promise<OfflineSite[]> {
    return this.getAll<OfflineSite>(STORES.SITES);
  }

  async getSitesByRiverWalk(riverWalkLocalId: string): Promise<OfflineSite[]> {
    return this.getByIndex<OfflineSite>(STORES.SITES, 'river_walk_local_id', riverWalkLocalId);
  }

  async addSite(site: OfflineSite): Promise<void> {
    return this.put(STORES.SITES, site);
  }

  async deleteSite(localId: string): Promise<void> {
    return this.delete(STORES.SITES, localId);
  }

  // Measurement points specific methods
  async getMeasurementPoints(): Promise<OfflineMeasurementPoint[]> {
    return this.getAll<OfflineMeasurementPoint>(STORES.MEASUREMENT_POINTS);
  }

  async getMeasurementPointsBySite(siteLocalId: string): Promise<OfflineMeasurementPoint[]> {
    return this.getByIndex<OfflineMeasurementPoint>(STORES.MEASUREMENT_POINTS, 'site_local_id', siteLocalId);
  }

  async addMeasurementPoint(point: OfflineMeasurementPoint): Promise<void> {
    return this.put(STORES.MEASUREMENT_POINTS, point);
  }

  async deleteMeasurementPoint(localId: string): Promise<void> {
    return this.delete(STORES.MEASUREMENT_POINTS, localId);
  }

  // Sync queue methods
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    return this.add(STORES.SYNC_QUEUE, item);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const items = await this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return this.delete(STORES.SYNC_QUEUE, id);
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    return this.put(STORES.SYNC_QUEUE, item);
  }

  // Photo methods
  async addPhoto(photo: OfflinePhoto): Promise<void> {
    return this.put(STORES.PHOTOS, photo);
  }

  async getPhotosByRelatedId(relatedId: string): Promise<OfflinePhoto[]> {
    return this.getByIndex<OfflinePhoto>(STORES.PHOTOS, 'relatedId', relatedId);
  }

  async deletePhoto(localId: string): Promise<void> {
    return this.delete(STORES.PHOTOS, localId);
  }

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    await this.init();
    
    const storeNames = Object.values(STORES);
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeNames, 'readwrite');
      
      let completed = 0;
      const total = storeNames.length;
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            console.log('All IndexedDB stores cleared');
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Export singleton instance
export const offlineDB = new IndexedDBManager();