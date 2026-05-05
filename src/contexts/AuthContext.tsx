import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, isFirebaseReady } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'lab' | 'crm' | 'school' | 'viewer';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>; 
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      const local = sessionStorage.getItem('cimasur_user');
      if (local) {
        setUser(JSON.parse(local));
      }
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && db) {
        try {
          // Fetch role from firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : { role: 'viewer' };
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: userData.role || 'viewer'
          });
        } catch (error) {
          console.error("Error fetching user data from Firebase:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, pass: string) => {
    const { localAuth } = await import('../lib/auth');
    const userData = await localAuth.login(email, pass);
    if (!isFirebaseReady) {
      setUser(userData);
    }
  };

  const logout = async () => {
    const { localAuth } = await import('../lib/auth');
    await localAuth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    login,
    logout
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
