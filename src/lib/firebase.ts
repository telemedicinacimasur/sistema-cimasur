import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize only if critical keys are present
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== '');

let app = null;
let db: any = null;
let auth: any = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)");
    auth = getAuth(app);
  } catch (error) {
    console.warn("Firebase failed to initialize:", error);
  }
}

export { app, db, auth };
export const isFirebaseReady = !!app;
