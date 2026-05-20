import { localDB } from './auth';
import { db, isFirebaseReady } from './firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  recipientRoles: string[]; // ['admin', 'lab', 'crm', 'school', 'gestion']
  recipientUsers?: string[]; // Specific emails or usernames representing tagged workers
  sender: string;
  createdAt: any;
  read: boolean;
}

export const subscribeToNotifications = (userRoles: string[], currentUserName: string, callback: (notifications: Notification[]) => void) => {
  const isRecipient = (notification: any) => {
    // Attempt to load current user identity from session storage
    let currentUser: any = null;
    try {
      const local = sessionStorage.getItem('cimasur_user');
      if (local) currentUser = JSON.parse(local);
    } catch (e) {
      console.error(e);
    }

    const senderLower = (notification.sender || '').toLowerCase();
    const currentUserNameLower = currentUserName.toLowerCase();
    const currentUserEmailLower = currentUser?.email ? currentUser.email.toLowerCase() : '';
    const currentUserDisplayNameLower = currentUser?.displayName ? currentUser.displayName.toLowerCase() : '';

    // Filter out notifications created by the same user
    if (
      senderLower === currentUserNameLower ||
      (currentUserEmailLower && senderLower === currentUserEmailLower) ||
      (currentUserDisplayNameLower && senderLower === currentUserDisplayNameLower)
    ) {
      return false;
    }

    // Check if user is explicitly mentioned (by username or email or select worker)
    if (notification.recipientUsers && notification.recipientUsers.length > 0) {
      const isMentioned = notification.recipientUsers.some((u: string) => {
        const lowerU = u.toLowerCase();
        return (
          lowerU === currentUserNameLower ||
          (currentUserEmailLower && lowerU === currentUserEmailLower) ||
          (currentUserDisplayNameLower && lowerU === currentUserDisplayNameLower)
        );
      });
      if (isMentioned) return true;
    }

    if (!notification.recipientRoles || notification.recipientRoles.length === 0) return true;
    
    const normalizedUserRoles = userRoles.map(r => r.toLowerCase());
    const normalizedRecipientRoles = notification.recipientRoles.map(r => r.toLowerCase());
    
    // Check if user is Admin. Administrators always receive all notifications
    // "ADMINISTRADOR CISTEMA: LE LLEGAN TODAS LAS NOTIFICACIONES DE LOS MODULOS"
    if (normalizedUserRoles.includes('admin')) {
      return true;
    }

    // "AL MÓDULO DE LABORATORIO SOLO DEBEN LLEGARLE ALERTAS CUANDO EN Seguimiento de Cotizaciones SE CAMBIE UN REGISTRO A APROBADO Y LA ALERTA DE STOCK DE INSUMOS BAJOS POR DÍA SEGÚN LA ALERTA QUE SE GENERÓ POR CADA UNO (NADA MÁS)"
    const isLab = normalizedUserRoles.some(role => role === 'lab' || role === 'viewer_lab');
    if (isLab) {
      const isApprovedQuote = notification.title === 'Cotización Aprobada';
      const isStockAlert = notification.title === 'Alerta de Stock Bajo';
      const isCommentOnMyModule = notification.title && 
        notification.title.startsWith('Nuevo Comentario') && 
        normalizedRecipientRoles.includes('lab');

      if (!isApprovedQuote && !isStockAlert && !isCommentOnMyModule) {
        return false;
      }
    }

    // Check if any of the user's roles matches the recipient role
    return normalizedRecipientRoles.some(rRole => 
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
