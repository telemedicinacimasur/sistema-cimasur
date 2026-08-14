// Safe storage utilities to prevent QuotaExceededError crashes

export const safeLocalStorageSet = (key: string, value: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`[safeLocalStorageSet] Error saving key "${key}":`, e?.message || e);
    // If quota exceeded, attempt to clear heavy/obsolete cache keys
    try {
      cleanupLocalStorageQuota();
      // Try one more time after clearing non-essential caches
      localStorage.setItem(key, value);
      return true;
    } catch (innerErr) {
      console.warn(`[safeLocalStorageSet] Failed to save key "${key}" even after cache cleanup:`, innerErr);
      return false;
    }
  }
};

export const safeLocalStorageGet = (key: string): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[safeLocalStorageGet] Error reading key "${key}":`, e);
    return null;
  }
};

export const safeLocalStorageRemove = (key: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[safeLocalStorageRemove] Error removing key "${key}":`, e);
  }
};

/**
 * Cleans up large or obsolete cache keys from localStorage
 */
export const cleanupLocalStorageQuota = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Remove large cache collections and query snapshots
      if (
        k === 'cache_todos_los_lotes' ||
        k.startsWith('cache_lotes_') ||
        k.startsWith('cache_') ||
        k.includes('_limit_') ||
        k.includes('_nolimit') ||
        k.includes('undefined')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
    if (keysToRemove.length > 0) {
      console.log(`[cleanupLocalStorageQuota] Cleared ${keysToRemove.length} cache keys from localStorage.`);
    }
  } catch (err) {
    console.warn('[cleanupLocalStorageQuota] Error during cleanup:', err);
  }
};

// Immediately execute cleanup on import to free any existing exhausted quota
if (typeof window !== 'undefined') {
  try {
    cleanupLocalStorageQuota();
  } catch (_) {}
}
