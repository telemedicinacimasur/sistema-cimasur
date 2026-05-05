import { auth, db } from './firebase';
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
    return await signInWithEmailAndPassword(auth, email, pass);
  },
  logout: () => signOut(auth),
  getCurrentUser: () => auth.currentUser,
  // Admin Methods
  getAllUsers: async (): Promise<UserProfile[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
  },
  updateUser: async (uid: string, data: Partial<UserProfile>) => {
    await updateDoc(doc(db, 'users', uid), data);
  },
  createUser: async (userData: UserProfile) => {
    // This requires enabling Admin Auth SDK in a full-stack setup, 
    // or just creating the document for now.
    // For now, save to users collection
  },
  deleteUser: async (uid: string) => {
    await deleteDoc(doc(db, 'users', uid));
  }
};

export async function addAuditLog(user: UserProfile, action: string, module: string) {
  await addDoc(collection(db, 'audit_logs'), {
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    action,
    module,
    timestamp: new Date().toISOString()
  });
}

// Firebase Database Logic
export const localDB = {
  getCollection: async (name: string): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, name));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  saveToCollection: async (name: string, item: any) => {
    const docRef = await addDoc(collection(db, name), {
      ...item,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...item };
  },
  updateInCollection: async (name: string, id: string, updates: any) => {
    await updateDoc(doc(db, name, id), updates);
  },
  deleteFromCollection: async (name: string, id: string) => {
    await deleteDoc(doc(db, name, id));
  }
};
