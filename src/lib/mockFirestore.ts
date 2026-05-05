
// Simple Mock Firestore implementation using LocalStorage
// Provides onSnapshot, addDoc, query, orderBy, etc.

type Callback = (snapshot: { docs: any[] }) => void;
const listeners: Record<string, Callback[]> = {};

const notify = (collectionName: string) => {
  if (listeners[collectionName]) {
    const data = getLocalCollection(collectionName);
    // Sort by createdAt desc if it exists by default for simplicity in this mock
    const sorted = [...data].sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    const snapshot = {
      docs: sorted.map(item => ({
        id: item.id,
        data: () => item
      }))
    };
    listeners[collectionName].forEach(cb => cb(snapshot));
  }
};

const getLocalCollection = (name: string): any[] => {
  return JSON.parse(localStorage.getItem(`db_${name}`) || '[]');
};

const setLocalCollection = (name: string, data: any[]) => {
  localStorage.setItem(`db_${name}`, JSON.stringify(data));
};

export const collection = (db: any, name: string) => name;
export const query = (colName: string, ...rest: any[]) => colName;
export const orderBy = (...args: any[]) => ({ type: 'orderBy', args });
export const where = (...args: any[]) => ({ type: 'where', args });

export const onSnapshot = (colName: any, callback: Callback) => {
  if (!listeners[colName]) listeners[colName] = [];
  listeners[colName].push(callback);
  
  // Initial call
  notify(colName);

  return () => {
    listeners[colName] = listeners[colName].filter(cb => cb !== callback);
  };
};

export const addDoc = async (colName: string, data: any) => {
  const items = getLocalCollection(colName);
  const newItem = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: data.createdAt || { seconds: Date.now() / 1000 }
  };
  items.push(newItem);
  setLocalCollection(colName, items);
  notify(colName);
  return newItem;
};

export const updateDoc = async (docRef: any, data: any) => {
    // Basic mock update logic
};

export const Timestamp = {
  now: () => ({ seconds: Date.now() / 1000, toDate: () => new Date() })
};

export const increment = (val: number) => val;
export const doc = (db: any, col: string, id: string) => ({ col, id });
export const getDoc = async (docRef: any) => ({ exists: () => false, data: () => ({}) });
export const setDoc = async (docRef: any, data: any) => {
    const items = getLocalCollection(docRef.col);
    const existingIndex = items.findIndex(i => i.id === docRef.id);
    if (existingIndex > -1) items[existingIndex] = { ...data, id: docRef.id };
    else items.push({ ...data, id: docRef.id });
    setLocalCollection(docRef.col, items);
};
