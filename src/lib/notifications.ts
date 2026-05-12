import { localDB } from './auth';
import { db, isFirebaseReady } from './firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  recipientRoles: string[]; // ['admin', 'lab', 'crm', 'school', 'gestion']
  sender: string;
  createdAt: any;
  read: boolean;
}

export const subscribeToNotifications = (userRoles: string[], currentUserName: string, callback: (notifications: Notification[]) => void) => {
  const isRecipient = (notification: Notification) => {
    // Filter out notifications created by the same user
    if (notification.sender === currentUserName) return false;

    if (!notification.recipientRoles || notification.recipientRoles.length === 0) return true;
    
    const normalizedUserRoles = userRoles.map(r => r.toLowerCase());
    const normalizedRecipientRoles = notification.recipientRoles.map(r => r.toLowerCase());
    
    // Check if any of the user's roles matches or encompasses the recipient role
    // e.g. user with 'viewer_lab' should receive notifications for 'lab'
    return normalizedUserRoles.includes('admin') || 
           normalizedRecipientRoles.some(rRole => 
             normalizedUserRoles.some(uRole => uRole === rRole || uRole === `viewer_${rRole}`)
           );
  };

  if (isFirebaseReady && db) {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      const filtered = data.filter(isRecipient);
      callback(filtered);
    });
  }
  
  // Local mode fallback
  const handleLocalChange = async () => {
    const data = await localDB.getCollection('notifications');
    const sorted = [...data].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    const filtered = sorted.filter(isRecipient);
    callback(filtered);
  };

  handleLocalChange();
  window.addEventListener('db-change', handleLocalChange);
  
  // Polling for local mode
  const pollInterval = setInterval(handleLocalChange, 5000); // More frequent polling (5s)
  
  return () => {
    window.removeEventListener('db-change', handleLocalChange);
    clearInterval(pollInterval);
  };
};

export const markNotificationAsRead = async (id: string) => {
  if (isFirebaseReady && db) {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } else {
    await localDB.updateInCollection('notifications', id, { read: true });
  }
  window.dispatchEvent(new Event('db-change'));
};

export const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  if (isFirebaseReady && db) {
    await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp()
    });
  } else {
    await localDB.saveToCollection('notifications', {
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
    });
  }
  window.dispatchEvent(new Event('db-change'));
};
