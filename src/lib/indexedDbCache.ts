// IndexedDB Cache implementation for large datasets (bypasses 5MB localStorage limit)

const DB_NAME = 'cimasur_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_cache';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const getDB = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('[indexedDbCache] Failed to open IndexedDB:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[indexedDbCache] IndexedDB initialization error:', e);
      resolve(null);
    }
  });

  return dbPromise;
};

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttlMs?: number;
}

export const getIndexedDbCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result: CacheEntry<T> = req.result;
          if (!result) {
            resolve(null);
            return;
          }

          if (result.ttlMs && Date.now() - result.timestamp > result.ttlMs) {
            // Expired: asynchronously remove it
            removeIndexedDbCache(key).catch(() => {});
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.warn(`[indexedDbCache] Error reading key "${key}":`, err);
        resolve(null);
      }
    });
  } catch (e) {
    console.warn(`[indexedDbCache] Exception reading key "${key}":`, e);
    return null;
  }
};

export const setIndexedDbCache = async <T = any>(key: string, data: T, ttlMs?: number): Promise<boolean> => {
  try {
    const db = await getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: Date.now(),
          ttlMs
        };
        const req = store.put(entry);

        req.onsuccess = () => {
          resolve(true);
        };

        req.onerror = (err) => {
          console.warn(`[indexedDbCache] Error setting key "${key}":`, err);
          resolve(false);
        };
      } catch (err) {
        console.warn(`[indexedDbCache] Exception setting key "${key}":`, err);
        resolve(false);
      }
    });
  } catch (e) {
    console.warn(`[indexedDbCache] Exception in setIndexedDbCache for "${key}":`, e);
    return false;
  }
};

export const removeIndexedDbCache = async (key: string): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (_) {
        resolve();
      }
    });
  } catch (_) {}
};
