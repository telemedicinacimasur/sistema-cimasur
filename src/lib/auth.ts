import { auth, db, isFirebaseReady } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'lab' | 'crm' | 'school' | 'viewer';
}

export const localAuth = {
  login: async (email: string, pass: string): Promise<any> => {
    if (isFirebaseReady && auth) {
      return await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al iniciar sesión');
      }
      const userData = await response.json();
      // Store in session storage to mimic firebase state for local mode
      sessionStorage.setItem('cimasur_user', JSON.stringify(userData));
      return userData;
    }
  },
  logout: async () => {
    if (isFirebaseReady && auth) {
      await signOut(auth);
    }
    sessionStorage.removeItem('cimasur_user');
  },
  getCurrentUser: () => {
    if (isFirebaseReady && auth) return auth.currentUser;
    const local = sessionStorage.getItem('cimasur_user');
    return local ? JSON.parse(local) : null;
  },
  getUserById: async (uid: string): Promise<UserProfile | null> => {
    if (isFirebaseReady && db) {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
      }
    } else {
      const res = await fetch('/api/users');
      const users: any[] = await res.json();
      return users.find(u => u.uid === uid) || null;
    }
    return null;
  },
  // Admin Methods
  getAllUsers: async (): Promise<UserProfile[]> => {
    if (isFirebaseReady && db) {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
    } else {
      const res = await fetch('/api/users');
      return await res.json();
    }
  },
  updateUser: async (uid: string, data: Partial<UserProfile>) => {
    if (isFirebaseReady && db) {
      await updateDoc(doc(db, 'users', uid), data);
    } else {
      await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  },
  createUser: async (userData: UserProfile) => {
    if (isFirebaseReady && db) {
      try {
        await addDoc(collection(db, 'users'), {
          email: userData.email,
          displayName: userData.displayName || 'Anónimo',
          role: userData.role,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error creating user document:", error);
        throw error;
      }
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    }
  },
  deleteUser: async (uid: string) => {
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, 'users', uid));
    } else {
      await fetch(`/api/users/${uid}`, { method: 'DELETE' });
    }
  }
};

export async function addAuditLog(user: UserProfile, action: string, module: string) {
  const logData = {
    displayName: user.displayName || 'Anónimo',
    email: user.email,
    role: user.role,
    action,
    module,
    timestamp: new Date().toISOString()
  };

  if (isFirebaseReady && db) {
    await addDoc(collection(db, 'audit_logs'), logData);
  } else {
    await fetch('/api/records/audit_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...logData, id: `log_${Date.now()}` })
    });
  }
}

// Firebase Database Logic
export const localDB = {
  getCollection: async (name: string): Promise<any[]> => {
    if (isFirebaseReady && db) {
      const snapshot = await getDocs(collection(db, name));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const res = await fetch(`/api/records/${name}`);
      return await res.json();
    }
  },
  saveToCollection: async (name: string, item: any) => {
    if (isFirebaseReady && db) {
      const docRef = await addDoc(collection(db, name), {
        ...item,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...item };
    } else {
      const id = item.id || `rec_${Date.now()}`;
      await fetch(`/api/records/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, id })
      });
      return { ...item, id };
    }
  },
  updateInCollection: async (name: string, id: string, updates: any) => {
    if (isFirebaseReady && db) {
      await updateDoc(doc(db, name, id), updates);
    } else {
      await fetch(`/api/records/${name}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    }
  },
  deleteFromCollection: async (name: string, id: string) => {
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, name, id));
    } else {
      await fetch(`/api/records/${name}/${id}`, { method: 'DELETE' });
    }
  }
};
