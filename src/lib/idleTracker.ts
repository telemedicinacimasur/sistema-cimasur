// Helper module to track user presence and tab visibility.
// This prevents unused open tabs from consuming Firestore reads in background.

const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes of inactivity = idle

let lastActivityTime = Date.now();
let isCurrentlyActive = typeof document !== 'undefined' ? !document.hidden : true;
const listeners = new Set<(active: boolean) => void>();

function updateActivity() {
  lastActivityTime = Date.now();
  checkState();
}

function checkState() {
  if (typeof document === 'undefined') return;
  
  const isHidden = document.hidden;
  const isIdle = (Date.now() - lastActivityTime) > IDLE_TIMEOUT_MS;
  const newActiveState = !isHidden && !isIdle;

  if (newActiveState !== isCurrentlyActive) {
    isCurrentlyActive = newActiveState;
    listeners.forEach(cb => {
      try { cb(isCurrentlyActive); } catch (e) { console.warn("Idle listener error:", e); }
    });
  }
}

// Global window event listeners
if (typeof window !== 'undefined') {
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus'];
  events.forEach(evt => {
    window.addEventListener(evt, updateActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastActivityTime = Date.now();
    }
    checkState();
  });

  // Check idle timer every 15 seconds
  setInterval(checkState, 15000);
}

/**
 * Returns true if the tab is visible and the user was active in the last 3 minutes.
 */
export function isTabActive(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.hidden) return false;
  return (Date.now() - lastActivityTime) <= IDLE_TIMEOUT_MS;
}

/**
 * Subscribe to state changes when the tab toggles between Active <-> Idle/Hidden.
 */
export function onActivityStateChange(callback: (active: boolean) => void): () => void {
  listeners.add(callback);
  // Immediately notify with current state
  callback(isCurrentlyActive);
  return () => {
    listeners.delete(callback);
  };
}
