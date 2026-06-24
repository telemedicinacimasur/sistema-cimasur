// Safe storage polyfills for sandboxed iframe environments
(() => {
  let storageSupported = false;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      storageSupported = true;
    }
  } catch (e) {
    storageSupported = false;
  }

  if (!storageSupported && typeof window !== 'undefined') {
    const createMemoryStorage = () => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() { return Object.keys(store).length; }
      };
    };

    try {
      Object.defineProperty(window, 'localStorage', {
        value: createMemoryStorage(),
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: createMemoryStorage(),
        writable: true,
        configurable: true
      });
    } catch (err) {
      console.warn("Could not polyfill storage:", err);
    }
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

