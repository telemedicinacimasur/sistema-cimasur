import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDB } from '../lib/auth';
import { isTabActive } from '../lib/idleTracker';

export interface UseFirestoreCollectionOptions {
  limitCount?: number;
  dateField?: string;
  startDate?: string;
  endDate?: string;
  staleTime?: number; // Custom stale time (default 5 min)
  pollingInterval?: number; // In ms, default 0 (no polling). If set (e.g. 180000), polls only if tab is active
  enabled?: boolean;
}

export function useFirestoreCollection<T = any>(
  collectionName: string,
  options?: UseFirestoreCollectionOptions
) {
  const limitCount = options?.limitCount ?? 20;
  const staleTime = options?.staleTime ?? 5 * 60 * 1000;
  const pollingInterval = options?.pollingInterval ?? 0;
  const enabled = options?.enabled ?? true;

  const queryKey = [
    collectionName,
    {
      limitCount,
      dateField: options?.dateField,
      startDate: options?.startDate,
      endDate: options?.endDate,
    },
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await localDB.getCollection(collectionName, {
        limitCount,
        dateField: options?.dateField,
        startDate: options?.startDate,
        endDate: options?.endDate,
      });
      return (data || []) as T[];
    },
    staleTime,
    enabled,
    refetchInterval: (query) => {
      // Controlled spaced polling only if tab is active and visible
      if (!pollingInterval || pollingInterval <= 0) return false;
      if (!isTabActive()) return false;
      return pollingInterval;
    },
  });

  const manualRefetch = useCallback(async () => {
    return await query.refetch();
  }, [query]);

  return {
    data: (query.data || []) as T[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: manualRefetch,
  };
}
