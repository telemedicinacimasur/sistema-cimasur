import { useState, useEffect, useCallback, useRef } from 'react';
import { localDB } from '../lib/auth';
import { isTabActive } from '../lib/idleTracker';

export interface UseFirestorePaginationOptions {
  pageSize?: number;
  dateField?: string;
  startDate?: string;
  endDate?: string;
  pollingInterval?: number; // In ms, default 0 (off). E.g. 180000 (3 min)
}

export function useFirestorePagination<T = any>(
  collectionName: string,
  options?: UseFirestorePaginationOptions
) {
  const pageSize = options?.pageSize ?? 20;
  const [items, setItems] = useState<T[]>([]);
  const [limitCount, setLimitCount] = useState<number>(pageSize);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadData = useCallback(
    async (currentLimit: number, isMore = false) => {
      if (isMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await localDB.getCollection(collectionName, {
          limitCount: currentLimit,
          dateField: options?.dateField,
          startDate: options?.startDate,
          endDate: options?.endDate,
        });

        if (!isMounted.current) return;

        const list = Array.isArray(data) ? data : [];
        setItems(list as T[]);
        setHasMore(list.length >= currentLimit);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(`Error loading paginated collection ${collectionName}:`, err);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [collectionName, options?.dateField, options?.startDate, options?.endDate]
  );

  // Initial load
  useEffect(() => {
    loadData(limitCount);
  }, [loadData, limitCount]);

  // Listen for local DB changes without triggering remote Firestore reads
  useEffect(() => {
    const handleDbChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.collection || detail.collection === collectionName) {
        // Read directly from updated local cache
        loadData(limitCount);
      }
    };

    window.addEventListener('db-change', handleDbChange);
    return () => {
      window.removeEventListener('db-change', handleDbChange);
    };
  }, [collectionName, limitCount, loadData]);

  // Controlled spaced polling (optional)
  useEffect(() => {
    const pollingMs = options?.pollingInterval ?? 0;
    if (pollingMs <= 0) return;

    const intervalId = setInterval(() => {
      if (isTabActive() && isMounted.current) {
        loadData(limitCount);
      }
    }, pollingMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [options?.pollingInterval, limitCount, loadData]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setLimitCount((prev) => prev + pageSize);
  }, [isLoadingMore, hasMore, pageSize]);

  const refresh = useCallback(async () => {
    // Force refresh from localDB
    setIsLoading(true);
    try {
      const data = await localDB.getCollection(collectionName, {
        limitCount,
        dateField: options?.dateField,
        startDate: options?.startDate,
        endDate: options?.endDate,
        forceRefresh: true,
      });
      if (isMounted.current) {
        const list = Array.isArray(data) ? data : [];
        setItems(list as T[]);
        setHasMore(list.length >= limitCount);
        setLastUpdated(new Date());
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [collectionName, limitCount, options?.dateField, options?.startDate, options?.endDate]);

  return {
    items,
    setItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    lastUpdated,
    totalLoaded: items.length,
  };
}
