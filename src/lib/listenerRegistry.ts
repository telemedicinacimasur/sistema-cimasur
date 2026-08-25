type UnsubscribeFn = () => void;
const activeUnsubscribes: Set<UnsubscribeFn> = new Set();

export const registerListener = (unsubscribe: UnsubscribeFn): UnsubscribeFn => {
  activeUnsubscribes.add(unsubscribe);
  return () => {
    activeUnsubscribes.delete(unsubscribe);
  };
};

export const clearAllListeners = () => {
  activeUnsubscribes.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (e) {
      console.warn("Error unsubscribing listener on idle timeout:", e);
    }
  });
  activeUnsubscribes.clear();
};
