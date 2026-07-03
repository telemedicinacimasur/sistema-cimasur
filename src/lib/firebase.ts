import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app: any = null;
let db: any = null;
let auth: any = null;
let initialized = false;

function initFirebase() {
  if (initialized) return;
  initialized = true;

  // If we are in Node (server), we don't need or want to initialize
  // the client-side Firebase SDK. The server should use firebase-admin.
  if (typeof window === 'undefined') {
    return;
  }

  const firebaseConfig = {
    apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  };

  const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== '');

  if (isConfigValid) {
    try {
      app = initializeApp(firebaseConfig);
      const dbId = (import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
      db = getFirestore(app, dbId);
      auth = getAuth(app);
    } catch (error) {
      console.warn("Firebase failed to initialize:", error);
    }
  }
}

export const getApp = () => { initFirebase(); return app; };
export const getDb = () => { initFirebase(); return db; };
export const getAuthInstance = () => { initFirebase(); return auth; };
export const isFirebaseReady = () => { initFirebase(); return !!app; };

// For backward compatibility until refactored
export const authInstance = getAuthInstance();
export const dbInstance = getDb();
