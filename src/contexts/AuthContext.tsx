import React, { createContext, useContext, useEffect, useState } from 'react';
import { authInstance as auth, dbInstance as db, isFirebaseReady } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
  hasError: boolean;
  hasQuotaError: boolean;
  login: (email: string, pass: string) => Promise<void>; 
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasQuotaError, setHasQuotaError] = useState(false);

  const checkErrorIsQuotaOrUnavailable = (error: any) => {
    if (!error) return false;
    const code = String(error.code || '').toLowerCase();
    const message = String(error.message || '').toLowerCase();
    return (
      code === 'resource-exhausted' ||
      code === 'unavailable' ||
      code.includes('quota') ||
      code.includes('resource-exhausted') ||
      message.includes('quota') ||
      message.includes('resource-exhausted') ||
      message.includes('unavailable') ||
      message.includes('exceeded')
    );
  };

  const handleFirestoreError = (error: any, fallbackUser?: UserProfile | null) => {
    console.error("Firestore error intercepted:", error);
    setHasError(true);
    if (checkErrorIsQuotaOrUnavailable(error)) {
      setHasQuotaError(true);
    }
    // Prevent app from getting stuck on blank loading screen
    if (fallbackUser !== undefined) {
      setUser(prev => prev || fallbackUser);
    }
    setLoading(false);
  };

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
            handleFirestoreError(error);
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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && db) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const checkAndProvision = async () => {
            try {
                const { getDoc, getDocs, collection, query, where, setDoc, deleteDoc, limit } = await import('firebase/firestore');
                
                // Helper to populate state from user data object
                const applyUserProfile = (userData: any) => {
                  const roles = Array.isArray(userData.roles) 
                      ? userData.roles 
                      : (userData.roles && typeof userData.roles === 'object' ? Object.values(userData.roles) : [userData.role || 'viewer']);

                  const profile: UserProfile = {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      displayName: userData.displayName || firebaseUser.displayName || 'Usuario Cimasur',
                      photoURL: userData.photoURL || firebaseUser.photoURL,
                      role: userData.role || 'viewer',
                      roles: roles as string[],
                      permissions: userData.permissions,
                      allowedSubmodules: userData.allowedSubmodules
                  };
                  setUser(profile);
                  sessionStorage.setItem('cimasur_user', JSON.stringify(profile));
                  setLoading(false);
                };

                // 1. Verify if user document exists in Firestore by UID
                const snap = await getDoc(userDocRef);
                
                if (snap.exists()) {
                    applyUserProfile(snap.data());
                    return;
                }

                // 2. Check if document exists by email
                let existingUserData: any = null;
                let existingDocId: string | null = null;

                if (firebaseUser.email) {
                    const emailClean = firebaseUser.email.trim();
                    const q1 = query(collection(db, 'users'), where('email', '==', emailClean), limit(20));
                    const emailSnap1 = await getDocs(q1);

                    if (!emailSnap1.empty) {
                        existingDocId = emailSnap1.docs[0].id;
                        existingUserData = emailSnap1.docs[0].data();
                    } else {
                        const q2 = query(collection(db, 'users'), where('email', '==', emailClean.toLowerCase()), limit(20));
                        const emailSnap2 = await getDocs(q2);
                        if (!emailSnap2.empty) {
                            existingDocId = emailSnap2.docs[0].id;
                            existingUserData = emailSnap2.docs[0].data();
                        }
                    }
                }

                if (existingUserData) {
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

                    applyUserProfile(preservedProfile);
                    return;
                }

                // 3. Create basic default profile
                const defaultProfile = {
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || 'Nuevo Usuario',
                    role: 'viewer',
                    roles: ['viewer'],
                    createdAt: new Date().toISOString(),
                    uid: firebaseUser.uid
                };
                await setDoc(userDocRef, defaultProfile);
                applyUserProfile(defaultProfile);

            } catch (err: any) {
                console.error("Provisioning error:", err);
                const fallbackUser: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || 'Usuario Cimasur',
                  photoURL: firebaseUser.photoURL,
                  role: 'viewer',
                  roles: ['viewer']
                };
                handleFirestoreError(err, fallbackUser);
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
    hasError,
    hasQuotaError,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {hasQuotaError && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs md:text-sm font-medium flex items-center justify-between shadow-lg sticky top-0 z-[9999] animate-fadeIn border-b border-amber-700">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <span className="bg-amber-800 text-amber-100 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider shrink-0">
              Límite alcanzado
            </span>
            <span>
              Se ha alcanzado el límite diario de consultas de Firestore o la conexión no está disponible. La aplicación continuará funcionando en modo seguro con datos almacenados en caché local para evitar la pantalla en blanco.
            </span>
          </div>
          <button 
            onClick={() => setHasQuotaError(false)} 
            className="ml-4 hover:bg-amber-700 p-1.5 rounded-lg transition-colors text-white/90 hover:text-white shrink-0"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}
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
