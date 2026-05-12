import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, isFirebaseReady } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  roles?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>; 
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (isFirebaseReady && auth?.currentUser && db) {
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : { role: 'viewer' };
            setUser({
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                role: userData.role || 'viewer',
                roles: Array.isArray(userData.roles) 
                    ? userData.roles 
                    : (userData.roles && typeof userData.roles === 'object' ? Object.values(userData.roles) : [userData.role || 'viewer'])
            });
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    } else if (!isFirebaseReady && user) {
        // Local mode refresh
        const { localAuth } = await import('../lib/auth');
        const updatedUser = await localAuth.getUserById(user.uid);
        if (updatedUser) {
            setUser(updatedUser);
            sessionStorage.setItem('cimasur_user', JSON.stringify(updatedUser));
        }
    }
  };

  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      const local = sessionStorage.getItem('cimasur_user');
      if (local) {
        setUser(JSON.parse(local));
      }
      setLoading(false);
      
      // Polling for local mode to sync user data across tabs
      const interval = setInterval(async () => {
        const localUser = sessionStorage.getItem('cimasur_user');
        if (localUser) {
          const parsedLocal = JSON.parse(localUser);
          const { localAuth } = await import('../lib/auth');
          const updated = await localAuth.getUserById(parsedLocal.uid);
          if (updated && JSON.stringify(updated) !== JSON.stringify(parsedLocal)) {
            setUser(updated);
            sessionStorage.setItem('cimasur_user', JSON.stringify(updated));
          }
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous user doc subscription if any
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser && db) {
        // First, check if a document with the UID exists
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const setupDocListener = (docId: string) => {
            if (unsubscribeUserDoc) unsubscribeUserDoc();
            unsubscribeUserDoc = onSnapshot(doc(db, 'users', docId), (docSnap) => {
              if (docSnap.exists()) {
                const userData = docSnap.data();
                const roles = Array.isArray(userData.roles) 
                    ? userData.roles 
                    : (userData.roles && typeof userData.roles === 'object' ? Object.values(userData.roles) : [userData.role || 'viewer']);

                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: userData.displayName || firebaseUser.displayName || 'Usuario Cimasur',
                    photoURL: userData.photoURL || firebaseUser.photoURL,
                    role: userData.role || 'viewer',
                    roles: roles as string[]
                });
              } else {
                // If it doesn't exist, we fallback to viewer
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || 'Usuario Cimasur',
                    photoURL: firebaseUser.photoURL,
                    role: 'viewer',
                    roles: ['viewer']
                });
              }
              setLoading(false);
            }, (error) => {
              console.error("Error listening to user data:", error);
              setLoading(false);
            });
        };

        // Attempt initial sync: check by UID, if not found try email
        const checkAndProvision = async () => {
            try {
                const { getDoc, getDocs, collection, query, where, setDoc, deleteDoc } = await import('firebase/firestore');
                const snap = await getDoc(userDocRef);
                
                if (snap.exists()) {
                    setupDocListener(firebaseUser.uid);
                } else {
                    // Try to find by email
                    const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                    const emailSnap = await getDocs(q);
                    
                    if (!emailSnap.empty) {
                        const existingDoc = emailSnap.docs[0];
                        const existingData = existingDoc.data();
                        
                        // Migrate existing data to UID-based document
                        await setDoc(userDocRef, {
                            ...existingData,
                            uid: firebaseUser.uid,
                            lastLogin: new Date().toISOString()
                        });
                        
                        // Delete old document if ID was different
                        if (existingDoc.id !== firebaseUser.uid) {
                            await deleteDoc(doc(db, 'users', existingDoc.id));
                        }
                        
                        setupDocListener(firebaseUser.uid);
                    } else {
                        // Create basic profile if nothing found
                        const newProfile = {
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || 'Nuevo Usuario',
                            role: 'viewer',
                            roles: ['viewer'],
                            createdAt: new Date().toISOString(),
                            uid: firebaseUser.uid
                        };
                        await setDoc(userDocRef, newProfile);
                        setupDocListener(firebaseUser.uid);
                    }
                }
            } catch (err) {
                console.error("Provisioning error:", err);
                setLoading(false);
            }
        };

        checkAndProvision();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { localAuth, addAuditLog } = await import('../lib/auth');
    const userData = await localAuth.login(email, pass);
    if (!isFirebaseReady) {
      setUser(userData);
    }
    if (userData) {
      await addAuditLog(userData, 'Inició Sesión', 'Sistema');
    }
  };

  const logout = async () => {
    const { localAuth, addAuditLog } = await import('../lib/auth');
    if (user) {
      await addAuditLog(user, 'Cerró Sesión', 'Sistema');
    }
    await localAuth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin' || (user?.roles || []).includes('admin'),
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
