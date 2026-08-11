import React, { createContext, useContext, useEffect, useState } from 'react';
import { authInstance as auth, dbInstance as db, isFirebaseReady } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onActivityStateChange } from '../lib/idleTracker';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  roles?: string[];
  permissions?: any;
  allowedSubmodules?: any;
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
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const roles = Array.isArray(userData.roles) 
                    ? userData.roles 
                    : (userData.roles && typeof userData.roles === 'object' ? Object.values(userData.roles) : [userData.role || 'viewer']);
                setUser({
                    uid: auth.currentUser.uid,
                    email: auth.currentUser.email,
                    displayName: userData.displayName || auth.currentUser.displayName || 'Usuario Cimasur',
                    photoURL: userData.photoURL || auth.currentUser.photoURL,
                    role: userData.role || 'viewer',
                    roles: roles as string[],
                    permissions: userData.permissions,
                    allowedSubmodules: userData.allowedSubmodules
                });
            }
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
      if (local && local !== 'undefined') {
        try {
          setUser(JSON.parse(local));
        } catch (e) {}
      }
      setLoading(false);
      
      // Polling for local mode to sync user data across tabs (only when tab is visible)
      const interval = setInterval(async () => {
        if (document.hidden) return;
        try {
          const localUser = sessionStorage.getItem('cimasur_user');
          if (localUser && localUser !== 'undefined') {
            const parsedLocal = JSON.parse(localUser);
            const { localAuth } = await import('../lib/auth');
            const updated = await localAuth.getUserById(parsedLocal.uid);
            if (updated && JSON.stringify(updated) !== JSON.stringify(parsedLocal)) {
              setUser(updated);
              sessionStorage.setItem('cimasur_user', JSON.stringify(updated));
            }
          }
        } catch (error) {
          console.warn("Polling user session temporarily failed", error);
        }
      }, 15000); // Check every 15 seconds

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
        
        let unsubActivityDoc: (() => void) | null = null;

        const setupDocListener = (docId: string) => {
            if (unsubscribeUserDoc) unsubscribeUserDoc();
            if (unsubActivityDoc) unsubActivityDoc();

            let activeSnapshotUnsub: (() => void) | null = null;

            const startDocSnapshot = () => {
              if (activeSnapshotUnsub) return;
              activeSnapshotUnsub = onSnapshot(doc(db, 'users', docId), (docSnap) => {
                if (docSnap.exists()) {
                  const userData = docSnap.data();
                  const roles = Array.isArray(userData.roles) 
                      ? userData.roles 
                      : (userData.roles && typeof userData.roles === 'object' ? Object.values(userData.roles) : [userData.role || 'viewer']);

                  const newUser = {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      displayName: userData.displayName || firebaseUser.displayName || 'Usuario Cimasur',
                      photoURL: userData.photoURL || firebaseUser.photoURL,
                      role: userData.role || 'viewer',
                      roles: roles as string[],
                      permissions: userData.permissions,
                      allowedSubmodules: userData.allowedSubmodules
                  };

                  setUser(prev => {
                    if (prev && JSON.stringify(prev) === JSON.stringify(newUser)) {
                      return prev;
                    }
                    return newUser;
                  });
                } else {
                  // If it doesn't exist, we fallback to viewer
                  const defaultUser = {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      displayName: firebaseUser.displayName || 'Usuario Cimasur',
                      photoURL: firebaseUser.photoURL,
                      role: 'viewer',
                      roles: ['viewer']
                  };
                  setUser(prev => {
                    if (prev && JSON.stringify(prev) === JSON.stringify(defaultUser)) {
                      return prev;
                    }
                    return defaultUser;
                  });
                }
                setLoading(false);
              }, (error) => {
                console.error("Error listening to user data:", error);
                setLoading(false);
              });
            };

            const stopDocSnapshot = () => {
              if (activeSnapshotUnsub) {
                activeSnapshotUnsub();
                activeSnapshotUnsub = null;
              }
            };

            unsubActivityDoc = onActivityStateChange((active) => {
              if (active) {
                startDocSnapshot();
              } else {
                stopDocSnapshot();
              }
            });

            unsubscribeUserDoc = () => {
              if (unsubActivityDoc) unsubActivityDoc();
              stopDocSnapshot();
            };
        };

        // Attempt initial sync: check by UID first, if not found try email query before setting default values
        const checkAndProvision = async () => {
            try {
                const { getDoc, getDocs, collection, query, where, setDoc, deleteDoc } = await import('firebase/firestore');
                
                // 1. Verify if user document exists in Firestore by UID
                const snap = await getDoc(userDocRef);
                
                if (snap.exists()) {
                    // Document ALREADY exists in Firestore:
                    // DO NOT perform any setDoc or overwrite. Pure read & snapshot subscription.
                    setupDocListener(firebaseUser.uid);
                    return;
                }

                // 2. Document does not exist by UID. Check if document exists by email before creating a default profile.
                let existingUserData: any = null;
                let existingDocId: string | null = null;

                if (firebaseUser.email) {
                    const emailClean = firebaseUser.email.trim();
                    const q1 = query(collection(db, 'users'), where('email', '==', emailClean));
                    const emailSnap1 = await getDocs(q1);

                    if (!emailSnap1.empty) {
                        existingDocId = emailSnap1.docs[0].id;
                        existingUserData = emailSnap1.docs[0].data();
                    } else {
                        const q2 = query(collection(db, 'users'), where('email', '==', emailClean.toLowerCase()));
                        const emailSnap2 = await getDocs(q2);
                        if (!emailSnap2.empty) {
                            existingDocId = emailSnap2.docs[0].id;
                            existingUserData = emailSnap2.docs[0].data();
                        }
                    }
                }

                if (existingUserData) {
                    // Document found by email: Preserve ALL existing fields (displayName, roles, permissions, allowedSubmodules)
                    const preservedProfile = {
                        ...existingUserData,
                        uid: firebaseUser.uid,
                        email: existingUserData.email || firebaseUser.email,
                        displayName: existingUserData.displayName || firebaseUser.displayName || 'Usuario Cimasur',
                        role: existingUserData.role || 'viewer',
                        roles: Array.isArray(existingUserData.roles)
                            ? existingUserData.roles
                            : (existingUserData.roles && typeof existingUserData.roles === 'object' ? Object.values(existingUserData.roles) : [existingUserData.role || 'viewer']),
                        lastLogin: new Date().toISOString()
                    };

                    await setDoc(userDocRef, preservedProfile, { merge: true });

                    if (existingDocId && existingDocId !== firebaseUser.uid) {
                        try {
                            await deleteDoc(doc(db, 'users', existingDocId));
                        } catch (delErr) {
                            console.warn("Could not remove legacy user doc ID:", delErr);
                        }
                    }

                    setupDocListener(firebaseUser.uid);
                    return;
                }

                // 3. ONLY if !userSnap.exists() AND no document exists by email in Firestore:
                // Create basic default profile
                const defaultProfile = {
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || 'Nuevo Usuario',
                    role: 'viewer',
                    roles: ['viewer'],
                    createdAt: new Date().toISOString(),
                    uid: firebaseUser.uid
                };
                await setDoc(userDocRef, defaultProfile);
                setupDocListener(firebaseUser.uid);

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
