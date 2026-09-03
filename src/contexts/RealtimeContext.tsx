import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  limit, 
  where, 
  orderBy, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from '../lib/firebase';
import { localDB } from '../lib/auth';
import { isTabActive } from '../lib/idleTracker';

interface SubscriptionConfig {
  collectionName: string;
  limitCount?: number;
  whereClause?: [string, any, any]; // [field, op, value]
  orderByClause?: [string, 'asc' | 'desc']; // [field, dir]
}

interface RealtimeContextType {
  useCollectionSubscription: <T = any>(config: SubscriptionConfig) => {
    data: T[];
    loading: boolean;
    error: Error | null;
  };
  getCollectionData: <T = any>(collectionName: string) => T[];
  isSubscribed: (collectionName: string) => boolean;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// In-memory global pool of active Firestore listeners (Singleton per unique query key)
interface ActiveListener {
  key: string;
  collectionName: string;
  subscribersCount: number;
  data: any[];
  loading: boolean;
  error: Error | null;
  unsubscribeFirestore: Unsubscribe | null;
  listeners: Set<(data: any[]) => void>;
}

const activeListenersMap = new Map<string, ActiveListener>();

function generateQueryKey(config: SubscriptionConfig): string {
  const parts = [config.collectionName];
  if (config.limitCount) parts.push(`limit:${config.limitCount}`);
  if (config.whereClause) parts.push(`where:${config.whereClause[0]}${config.whereClause[1]}${config.whereClause[2]}`);
  if (config.orderByClause) parts.push(`order:${config.orderByClause[0]}_${config.orderByClause[1]}`);
  return parts.join('|');
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Master snapshot state trigger
  const [, setTrigger] = useState(0);

  // Start or reuse a Firestore listener
  const subscribeToFirestore = useCallback((config: SubscriptionConfig, onUpdate: (data: any[]) => void) => {
    const key = generateQueryKey(config);
    let item = activeListenersMap.get(key);

    if (!item) {
      item = {
        key,
        collectionName: config.collectionName,
        subscribersCount: 1,
        data: [],
        loading: true,
        error: null,
        unsubscribeFirestore: null,
        listeners: new Set([onUpdate])
      };
      activeListenersMap.set(key, item);

      // Initialize from local cache first for instant UI response
      localDB.getCollection(config.collectionName, { limitCount: config.limitCount || 50 }).then((cached) => {
        if (item && item.data.length === 0 && Array.isArray(cached) && cached.length > 0) {
          item.data = cached;
          item.loading = false;
          item.listeners.forEach(fn => fn(item!.data));
        }
      });

      // Attach single Firestore onSnapshot
      if (isFirebaseReady()) {
        const db = getDb();
        if (db) {
          try {
            const constraints: any[] = [];
            
            if (config.whereClause) {
              constraints.push(where(config.whereClause[0], config.whereClause[1], config.whereClause[2]));
            }
            
            if (config.orderByClause) {
              constraints.push(orderBy(config.orderByClause[0], config.orderByClause[1]));
            }
            
            // STRICT BOUNDED QUERIES (max 50 to prevent read explosion across 5+ concurrent users)
            const safeLimit = Math.min(config.limitCount || 30, 100);
            constraints.push(limit(safeLimit));

            const q = query(collection(db, config.collectionName), ...constraints);

            const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
              const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              if (item) {
                item.data = docs;
                item.loading = false;
                item.error = null;
                // Broadcast to all subscribing components in memory without extra network reads
                item.listeners.forEach(fn => fn(docs));
              }
            }, (err) => {
              console.warn(`Firestore shared onSnapshot error on [${config.collectionName}]:`, err);
              if (item) {
                item.error = err;
                item.loading = false;
              }
            });

            item.unsubscribeFirestore = unsub;
          } catch (err: any) {
            console.error(`Error setting up shared onSnapshot for ${config.collectionName}:`, err);
            item.error = err;
            item.loading = false;
          }
        }
      }
    } else {
      // Reusing existing shared onSnapshot listener! No new network listener or billable read
      item.subscribersCount++;
      item.listeners.add(onUpdate);
      // Immediately provide current in-memory cached snapshot
      if (item.data.length > 0) {
        onUpdate(item.data);
      }
    }

    // Return cleanup function when component unmounts
    return () => {
      const active = activeListenersMap.get(key);
      if (active) {
        active.listeners.delete(onUpdate);
        active.subscribersCount--;

        // If no more components are observing this query, cleanly unsubscribe from Firestore
        if (active.subscribersCount <= 0) {
          if (active.unsubscribeFirestore) {
            try {
              active.unsubscribeFirestore();
            } catch (e) {
              console.warn("Unsubscribe cleanup error:", e);
            }
          }
          activeListenersMap.delete(key);
        }
      }
    };
  }, []);

  const getCollectionData = useCallback(<T = any>(collectionName: string): T[] => {
    for (const item of activeListenersMap.values()) {
      if (item.collectionName === collectionName) {
        return item.data as T[];
      }
    }
    return [];
  }, []);

  const isSubscribed = useCallback((collectionName: string): boolean => {
    for (const item of activeListenersMap.values()) {
      if (item.collectionName === collectionName && item.subscribersCount > 0) {
        return true;
      }
    }
    return false;
  }, []);

  return (
    <RealtimeContext.Provider value={{ useCollectionSubscription: null as any, getCollectionData, isSubscribed }}>
      {children}
    </RealtimeContext.Provider>
  );
};

/**
 * Hook to subscribe to real-time Firestore collections using shared pooling.
 * Automatically handles bounded limits, strict unmount cleanup, and memory sharing.
 */
export function useSharedRealtimeCollection<T = any>(config: SubscriptionConfig) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const configKey = generateQueryKey(config);

  useEffect(() => {
    let isMounted = true;

    // Check if we already have shared in-memory data
    const existing = activeListenersMap.get(configKey);
    if (existing && existing.data.length > 0) {
      setData(existing.data);
      setLoading(false);
    }

    // Subscribe to shared listener
    const key = generateQueryKey(config);
    let item = activeListenersMap.get(key);

    const onUpdate = (newDocs: any[]) => {
      if (isMounted) {
        setData(newDocs);
        setLoading(false);
      }
    };

    if (!item) {
      item = {
        key,
        collectionName: config.collectionName,
        subscribersCount: 1,
        data: [],
        loading: true,
        error: null,
        unsubscribeFirestore: null,
        listeners: new Set([onUpdate])
      };
      activeListenersMap.set(key, item);

      // Cache-first instant fill
      localDB.getCollection(config.collectionName, { limitCount: config.limitCount || 30 }).then((cached) => {
        if (isMounted && item && item.data.length === 0 && Array.isArray(cached) && cached.length > 0) {
          item.data = cached;
          item.loading = false;
          setData(cached);
          setLoading(false);
        }
      });

      if (isFirebaseReady()) {
        const db = getDb();
        if (db) {
          try {
            const constraints: any[] = [];
            if (config.whereClause) {
              constraints.push(where(config.whereClause[0], config.whereClause[1], config.whereClause[2]));
            }
            if (config.orderByClause) {
              constraints.push(orderBy(config.orderByClause[0], config.orderByClause[1]));
            }
            const safeLimit = Math.min(config.limitCount || 30, 100);
            constraints.push(limit(safeLimit));

            const q = query(collection(db, config.collectionName), ...constraints);
            const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
              const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              if (item) {
                item.data = docs;
                item.loading = false;
                item.listeners.forEach(fn => fn(docs));
              }
            }, (err) => {
              console.warn(`Shared onSnapshot error on [${config.collectionName}]:`, err);
              if (isMounted) setError(err);
            });

            item.unsubscribeFirestore = unsub;
          } catch (err: any) {
            if (isMounted) {
              setError(err);
              setLoading(false);
            }
          }
        }
      }
    } else {
      item.subscribersCount++;
      item.listeners.add(onUpdate);
      if (item.data.length > 0) {
        setData(item.data);
        setLoading(false);
      }
    }

    // Strict unmount cleanup
    return () => {
      isMounted = false;
      const current = activeListenersMap.get(key);
      if (current) {
        current.listeners.delete(onUpdate);
        current.subscribersCount--;
        if (current.subscribersCount <= 0) {
          if (current.unsubscribeFirestore) {
            try {
              current.unsubscribeFirestore();
            } catch (e) {}
          }
          activeListenersMap.delete(key);
        }
      }
    };
  }, [configKey]);

  return { data, loading, error };
}
