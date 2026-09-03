import { onActivityStateChange } from './idleTracker';

type UnsubscribeFn = () => void;
const activeUnsubscribes: Set<UnsubscribeFn> = new Set();

export const registerListener = (unsubscribe: UnsubscribeFn): UnsubscribeFn => {
  activeUnsubscribes.add(unsubscribe);
  return () => {
    try {
      unsubscribe();
    } catch (e) {}
    activeUnsubscribes.delete(unsubscribe);
  };
};

export const clearAllListeners = () => {
  activeUnsubscribes.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (e) {
      console.warn("Error unsubscribing listener on idle/tab switch:", e);
    }
  });
  activeUnsubscribes.clear();
};

// Automatically unsubscribe and clean up all listeners when user leaves the tab or goes idle
if (typeof window !== 'undefined') {
  onActivityStateChange((isActive) => {
    if (!isActive) {
      clearAllListeners();
    }
  });
}

