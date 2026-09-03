import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache freshness
      gcTime: 30 * 60 * 1000, // 30 minutes in garbage collection memory
      refetchOnWindowFocus: false, // Prevent Firestore read bursts when switching tabs
      refetchOnReconnect: false,
      refetchOnMount: false, // Reuse cached data across view switches and re-renders
      retry: 1,
    },
  },
});

/**
 * Invalidates queries for a specific collection in TanStack Query.
 */
export function invalidateCollectionQuery(collectionName: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && (key === collectionName || key.startsWith(`${collectionName}_`));
    },
  });
}

/**
 * Optimistically updates an item in the TanStack Query cache for a collection.
 */
export function updateQueryCacheItem(collectionName: string, item: { id: string; [key: string]: any }) {
  queryClient.setQueriesData({ queryKey: [collectionName] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    const idx = old.findIndex((r: any) => r.id === item.id);
    if (idx >= 0) {
      const updated = [...old];
      updated[idx] = { ...updated[idx], ...item };
      return updated;
    }
    return [item, ...old];
  });
}

/**
 * Optimistically removes an item in the TanStack Query cache for a collection.
 */
export function removeQueryCacheItem(collectionName: string, id: string) {
  queryClient.setQueriesData({ queryKey: [collectionName] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.filter((r: any) => r.id !== id);
  });
}
