import { authInstance as auth, dbInstance as db, isFirebaseReady } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, where, limit } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  roles?: string[];
  password?: string;
  permissions?: any;
  allowedSubmodules?: Record<string, string[]>;
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
    try {
      const local = sessionStorage.getItem('cimasur_user');
      return local && local !== 'undefined' ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  },
  getUserById: async (uid: string): Promise<UserProfile | null> => {
    if (isFirebaseReady && db) {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
      }
    } else {
      let res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 429 || (await res.clone().text()) === 'Rate exceeded.') {
           console.warn('Rate limit exceeded, retrying in 2 seconds...');
           await new Promise(resolve => setTimeout(resolve, 2000));
           res = await fetch('/api/users');
        }
        if (!res.ok) throw new Error(await res.text());
      }
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
      let res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 429 || (await res.clone().text()) === 'Rate exceeded.') {
           console.warn('Rate limit exceeded, retrying in 2 seconds...');
           await new Promise(resolve => setTimeout(resolve, 2000));
           res = await fetch('/api/users');
        }
        if (!res.ok) throw new Error(await res.text());
      }
      return await res.json();
    }
  },
  updateUser: async (uid: string, data: Partial<UserProfile>) => {
    if (isFirebaseReady && db) {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
    } else {
      await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  },
  createUser: async (userData: any) => {
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, 'users', userData.uid || `user-${Date.now()}`), {
          email: userData.email || 'anónimo@cimasur.cl',
          displayName: userData.displayName || 'Anónimo',
          role: userData.role || 'viewer',
          roles: userData.roles || [userData.role || 'viewer'],
          permissions: userData.permissions || {},
          allowedSubmodules: userData.allowedSubmodules || {},
          pass: userData.pass || '',
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
        body: JSON.stringify({
          uid: userData.uid || `user-${Date.now()}`,
          email: userData.email || 'anónimo@cimasur.cl',
          displayName: userData.displayName || 'Anónimo',
          role: userData.role || 'viewer',
          roles: userData.roles || [userData.role || 'viewer'],
          permissions: userData.permissions || {},
          allowedSubmodules: userData.allowedSubmodules || {},
          pass: userData.pass || '',
          createdAt: new Date().toISOString()
        })
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
    displayName: user.displayName || 'Usuario registrado',
    email: user.email || 'usuario@cimasur.cl',
    role: user.role || 'viewer',
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
// Cache TTL in milliseconds (12 hours to prevent quota exhaustion)
const CACHE_TTL = 12 * 60 * 60 * 1000;

const getFromLocalStorage = (key: string) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.error(`Error parsing cache for ${key}`, e);
  }
  localStorage.removeItem(key);
  return null;
};

const saveToLocalStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const collectionCache: Record<string, any[]> = {};
const pendingRequests: Record<string, Promise<any[]>> = {};

if (typeof window !== 'undefined') {
  window.addEventListener('db-change', (e: Event) => {
    const detail = (e as CustomEvent)?.detail;
    if (!detail?.collection) {
      // Clear all caches on database changes so views always read fresh updated data
      Object.keys(collectionCache).forEach(key => delete collectionCache[key]);
    } else {
      invalidateCollectionCache(detail.collection);
    }
  });
}

const invalidateCollectionCache = (name: string) => {
  Object.keys(collectionCache).forEach(key => {
    if (key === name || key.startsWith(`${name}_`)) {
      delete collectionCache[key];
    }
  });
};

const updateCachedCollectionItem = (name: string, savedItem: { id: string, [key: string]: any }) => {
  // Update in memory cache and localStorage cache for base collection and any query variants
  Object.keys(collectionCache).forEach(cacheKey => {
    if (cacheKey === name || cacheKey.startsWith(`${name}_`)) {
      const list = collectionCache[cacheKey];
      if (list) {
        const idx = list.findIndex(r => r.id === savedItem.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...savedItem };
        } else {
          list.unshift(savedItem);
        }
      }
    }
  });

  // Also update localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const lsKey = localStorage.key(i);
    if (lsKey && (lsKey === name || lsKey.startsWith(`${name}_`))) {
      const cached = localStorage.getItem(lsKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.data)) {
            const idx = parsed.data.findIndex((r: any) => r.id === savedItem.id);
            if (idx >= 0) {
              parsed.data[idx] = { ...parsed.data[idx], ...savedItem };
            } else {
              parsed.data.unshift(savedItem);
            }
            localStorage.setItem(lsKey, JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
};

const removeCachedCollectionItem = (name: string, id: string) => {
  Object.keys(collectionCache).forEach(cacheKey => {
    if (cacheKey === name || cacheKey.startsWith(`${name}_`)) {
      const list = collectionCache[cacheKey];
      if (list) {
        collectionCache[cacheKey] = list.filter(r => r.id !== id);
      }
    }
  });

  for (let i = 0; i < localStorage.length; i++) {
    const lsKey = localStorage.key(i);
    if (lsKey && (lsKey === name || lsKey.startsWith(`${name}_`))) {
      const cached = localStorage.getItem(lsKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.data)) {
            parsed.data = parsed.data.filter((r: any) => r.id !== id);
            localStorage.setItem(lsKey, JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
};

export const localDB = {
  clearCache: () => {
    Object.keys(collectionCache).forEach(key => delete collectionCache[key]);
  },
  getCollection: async (name: string, options?: { dateField?: string; startDate?: string; endDate?: string; limitCount?: number }): Promise<any[]> => {
    const limitVal = options?.limitCount || 200;
    const cacheKey = options 
      ? `${name}_${options.dateField}_${options.startDate}_${options.endDate}_${limitVal}` 
      : `${name}_limit_${limitVal}`;

    const cachedData = getFromLocalStorage(cacheKey);
    if (cachedData) return cachedData;

    if (isFirebaseReady && db) {
      if (collectionCache[cacheKey]) {
        return [...collectionCache[cacheKey]];
      }
      if (pendingRequests[cacheKey]) {
        const data = await pendingRequests[cacheKey];
        return [...data];
      }
      
      const fetchPromise = (async () => {
        try {
          let qRef: any;
          if (options && options.dateField && options.startDate && options.endDate) {
            qRef = query(
              collection(db, name),
              where(options.dateField, '>=', options.startDate),
              where(options.dateField, '<=', options.endDate),
              limit(limitVal)
            );
          } else {
            qRef = query(
              collection(db, name),
              limit(limitVal)
            );
          }
          const snapshot = await getDocs(qRef);
          const data = snapshot.docs.map(doc => {
            const docData = doc.data() as any;
            return { ...docData, id: doc.id };
          });
          collectionCache[cacheKey] = data;
          saveToLocalStorage(cacheKey, data);
          return data;
        } finally {
          delete pendingRequests[cacheKey];
        }
      })();
      
      pendingRequests[cacheKey] = fetchPromise;
      const result = await fetchPromise;
      return [...result];
    } else {
      if (pendingRequests[cacheKey]) {
        const data = await pendingRequests[cacheKey];
        return [...data];
      }

      const fetchPromise = (async () => {
        const MAX_RETRIES = 2;
        let lastError: any = null;
        
        try {
          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              let res = await fetch(`/api/records/${name}`);
              if (!res.ok) {
                if (res.status === 429 || (await res.clone().text()) === 'Rate exceeded.') {
                   console.warn(`Rate limit exceeded for ${name}, attempt ${attempt + 1}/${MAX_RETRIES + 1}. Retrying...`);
                   await new Promise(resolve => setTimeout(resolve, 2000));
                   continue;
                }
                const text = await res.text();
                throw new Error(`Failed to fetch ${name}: ${text}`);
              }
              
              const contentType = res.headers.get('Content-Type');
              if (contentType && contentType.includes('text/html')) {
                throw new Error(`Response is HTML (possible cookie check or redirect), expected JSON`);
              }
              if (res.url && (res.url.includes('__cookie_check') || res.url.includes('login'))) {
                throw new Error(`Redirected to ${res.url} (possible cookie check or login screen)`);
              }
              
              let data = await res.json();
              if (options && options.dateField && options.startDate && options.endDate) {
                data = data.filter((item: any) => {
                  const val = item[options.dateField!];
                  return val >= options.startDate! && val <= options.endDate!;
                });
              }
              if (Array.isArray(data) && data.length > limitVal) {
                data = data.slice(0, limitVal);
              }
              saveToLocalStorage(cacheKey, data);
              return data;
            } catch (err: any) {
              lastError = err;
              if (attempt < MAX_RETRIES) {
                console.warn(`Fetch ${name} failed (Attempt ${attempt + 1}), retrying in 2s...`, err);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          if (lastError && (lastError.message?.includes('HTML') || lastError.message?.includes('JSON') || lastError.message?.includes('token') || lastError.message?.includes('Redirected'))) {
            console.warn(`localDB.getCollection(${name}) returned HTML redirect/cookie-check instead of JSON. This is normal behavior in sandbox previews when third-party cookies are blocked or checking credentials. Returning empty array.`);
          } else {
            console.error(`Final failure in localDB.getCollection(${name}) after retries:`, lastError);
          }
          return [];
        } finally {
          delete pendingRequests[cacheKey];
        }
      })();

      pendingRequests[cacheKey] = fetchPromise;
      const result = await fetchPromise;
      return [...result];
    }
  },
  saveToCollection: async (name: string, item: any) => {
    if (isFirebaseReady && db) {
      if (item.id) {
        await setDoc(doc(db, name, item.id), {
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        const saved = { ...item, updatedAt: new Date().toISOString() };
        updateCachedCollectionItem(name, saved);
        if (name === 'students') {
          window.dispatchEvent(new CustomEvent('sync-students-trigger'));
        }
        return saved;
      }
      const docRef = await addDoc(collection(db, name), {
        ...item,
        createdAt: new Date().toISOString()
      });
      const saved = { id: docRef.id, ...item, createdAt: new Date().toISOString() };
      updateCachedCollectionItem(name, saved);
      if (name === 'students') {
        window.dispatchEvent(new CustomEvent('sync-students-trigger'));
      }
      return saved;
    } else {
      const id = item.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(`/api/records/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, id })
      });
      if (!response.ok) {
        throw new Error(`Failed to save to ${name}: ${response.statusText}`);
      }
      const saved = { ...item, id };
      updateCachedCollectionItem(name, saved);
      if (name === 'students') {
        window.dispatchEvent(new CustomEvent('sync-students-trigger'));
      }
      return saved;
    }
  },
  updateInCollection: async (name: string, id: string, updates: any) => {
    if (isFirebaseReady && db) {
      try {
        const updatedAt = new Date().toISOString();
        await setDoc(doc(db, name, id), {
          ...updates,
          updatedAt
        }, { merge: true });
        updateCachedCollectionItem(name, { id, ...updates, updatedAt });
        if (name === 'students') {
          window.dispatchEvent(new CustomEvent('sync-students-trigger'));
        }
      } catch (error) {
        console.error(`Firebase update error in ${name}/${id}:`, error);
        throw error;
      }
    } else {
      const response = await fetch(`/api/records/${name}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API update error in ${name}/${id}:`, response.status, errorText);
        throw new Error(`Failed to update ${id} in ${name}: Status ${response.status} - ${errorText}`);
      }
      updateCachedCollectionItem(name, { id, ...updates });
      if (name === 'students') {
        window.dispatchEvent(new CustomEvent('sync-students-trigger'));
      }
    }
  },
  updateBulkCategory: async (ids: string[], category: string) => {
    invalidateCollectionCache('contacts');
    if (isFirebaseReady && db) {
      try {
        await Promise.all(ids.map(id => 
          setDoc(doc(db, 'contacts', id), {
            categoria: category,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        ));
      } catch (error) {
        console.error(`Firebase bulk category update error:`, error);
        throw error;
      }
    } else {
      const response = await fetch('/api/crm/clients/bulk-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, categoria: category })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API bulk category update error:`, response.status, errorText);
        throw new Error(`Failed bulk category update: Status ${response.status} - ${errorText}`);
      }
    }
  },
  deleteFromCollection: async (name: string, id: string) => {
    if (name === 'trash_bin') {
      invalidateCollectionCache(name);
      if (isFirebaseReady && db) {
        await deleteDoc(doc(db, name, id));
      } else {
        await fetch(`/api/records/${name}/${id}`, { method: 'DELETE' });
      }
      return;
    }

    try {
      let recordToDelete: any = null;
      if (isFirebaseReady && db) {
        const docSnap = await getDoc(doc(db, name, id));
        if (docSnap.exists()) {
          recordToDelete = { id: docSnap.id, ...docSnap.data() };
        }
      } else {
        const res = await fetch(`/api/records/${name}`);
        if (!res.ok) {
          if (res.status === 429 || (await res.clone().text()) === 'Rate exceeded.') {
             // Basic retry
             console.warn('Rate limit exceeded, retrying in 2 seconds...');
             await new Promise(resolve => setTimeout(resolve, 2000));
             const retryRes = await fetch(`/api/records/${name}`);
             if (!retryRes.ok) throw new Error(await retryRes.text());
             const list = await retryRes.json();
             recordToDelete = list.find((item: any) => item.id === id);
          } else {
             throw new Error(await res.text());
          }
        } else {
          const list = await res.json();
          recordToDelete = list.find((item: any) => item.id === id);
        }
      }

      if (recordToDelete) {
        const trashRecord = {
          id: `trash_${Date.now()}_${id}`,
          originalCollection: name,
          originalId: id,
          deletedAt: new Date().toISOString(),
          recordData: recordToDelete
        };
        // Re-use saveToCollection without invalidating of the same collection
        invalidateCollectionCache('trash_bin');
        if (isFirebaseReady && db) {
          await setDoc(doc(db, 'trash_bin', trashRecord.id), {
            ...trashRecord,
            createdAt: new Date().toISOString()
          });
        } else {
          await fetch('/api/records/trash_bin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...trashRecord, id: trashRecord.id })
          });
        }
      }
    } catch (e) {
      console.error("Failed to backup deleted record into trash bin:", e);
    }

    removeCachedCollectionItem(name, id);
    console.log(`Debug: Attempting to delete from ${name} with id: ${id}`);
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, name, id));
      console.log(`Debug: Deleted (Firebase) from ${name} with id: ${id}`);
      if (name === 'students') {
        window.dispatchEvent(new CustomEvent('sync-students-trigger'));
      }
    } else {
      const response = await fetch(`/api/records/${name}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        console.error(`Debug: Failed to delete ${id} from ${name}: ${response.statusText}`);
        throw new Error(`Failed to delete ${id} from ${name}: ${response.statusText}`);
      }
      console.log(`Debug: Deleted (API) from ${name} with id: ${id}`);
      if (name === 'students') {
        window.dispatchEvent(new CustomEvent('sync-students-trigger'));
      }
    }
  }
};
