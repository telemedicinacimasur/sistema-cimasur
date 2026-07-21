import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

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

  const getEnv = (key: string) => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) return (import.meta as any).env[key];
    return undefined;
  };

  const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
  };

  const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== '');

  if (isConfigValid) {
    try {
      app = initializeApp(firebaseConfig);
      const dbId = getEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || "(default)";
      
      // Initialize Firestore with persistent local cache for better performance and reduced reads
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, dbId);

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
