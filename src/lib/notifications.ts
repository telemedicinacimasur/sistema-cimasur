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
  senderEmail?: string; // Direct email of the action sender
  pizarraNoteId?: string; // ID of the note on the Pizarra for direct navigation
  createdAt: any;
  read: boolean;
}

export const subscribeToNotifications = (userRoles: string[], currentUserName: string, currentUserEmail: string, callback: (notifications: Notification[]) => void) => {
  const isRecipient = (notification: any) => {
    // Attempt to load current user identity from session storage
    let currentUser: any = null;
    try {
      const local = sessionStorage.getItem('cimasur_user');
      if (local) currentUser = JSON.parse(local);
    } catch (e) {
      console.error(e);
    }

    const senderLower = (notification.sender || '').toLowerCase().trim();
    const senderEmailLower = (notification.senderEmail || '').toLowerCase().trim();
    const currentUserNameLower = currentUserName.toLowerCase().trim();
    const currentUserEmailLower = (currentUserEmail || currentUser?.email || '').toLowerCase().trim();
    const currentUserDisplayNameLower = currentUser?.displayName ? currentUser.displayName.toLowerCase().trim() : '';

    // Gather all possible identifiers for the current user
    const userEmails = [
      currentUserEmailLower,
      (currentUser?.email || '').toLowerCase().trim(),
    ].filter(Boolean);

    const userNames = [
      currentUserNameLower,
      (currentUser?.displayName || '').toLowerCase().trim(),
    ].filter(Boolean);

    // 1. If sender or senderEmail is one of our emails or names, filter out
    if (
      userEmails.some(email => senderLower === email || senderEmailLower === email) ||
      userNames.some(name => senderLower === name || senderEmailLower === name)
    ) {
      return false;
    }

    // 2. If message contains our identifier performing an action, filter out
    if (notification.message) {
      const msgLower = notification.message.toLowerCase().trim();

      // Check if message starts with any of our user identifiers
      const startsWithUser = [
        ...userEmails,
        ...userNames
      ].some(id => msgLower.startsWith(id.toLowerCase()));

      if (startsWithUser) {
        return false;
      }

      // Check if message references the user as the actor/author of action
      const referencesUserAsActor = [
        ...userEmails,
        ...userNames
      ].some(id => 
        msgLower.includes(`por ${id.toLowerCase()}`) ||
        msgLower.includes(`creada por ${id.toLowerCase()}`) ||
        msgLower.includes(`modificada por ${id.toLowerCase()}`) ||
        msgLower.includes(`comentada por ${id.toLowerCase()}`) ||
        msgLower.includes(`por: ${id.toLowerCase()}`)
      );

      if (referencesUserAsActor) {
        return false;
      }
    }

    // Check if it is a Pizarra or Comment or Reply notification (should reach involved users and admins/lab)
    const isPizarraOrComment = 
      (notification.title && (
        notification.title.toLowerCase().includes('pizarra') || 
        notification.title.toLowerCase().includes('comentario') || 
        notification.title.toLowerCase().includes('comentarios') || 
        notification.title.toLowerCase().includes('respuesta') ||
        notification.title.toLowerCase().includes('nota') ||
        notification.title.toLowerCase().includes('notas')
      )) || 
      (notification.message && (
        notification.message.toLowerCase().includes('pizarra') || 
        notification.message.toLowerCase().includes('comentó') || 
        notification.message.toLowerCase().includes('comento') || 
        notification.message.toLowerCase().includes('respondió') ||
        notification.message.toLowerCase().includes('respondio') ||
        notification.message.toLowerCase().includes('nota') ||
        notification.message.toLowerCase().includes('notas') ||
        notification.message.toLowerCase().includes('comentario') ||
        notification.message.toLowerCase().includes('comentarios')
      ));

    if (isPizarraOrComment) {
      // If there are targeted/specific users assigned to this note/comment, filter nicely
      if (notification.recipientUsers && notification.recipientUsers.length > 0) {
        const isMentioned = notification.recipientUsers.some((u: string) => {
          const lowerU = u.toLowerCase().trim();
          return (
            lowerU === currentUserNameLower ||
            (currentUserEmailLower && lowerU === currentUserEmailLower) ||
            (currentUserDisplayNameLower && lowerU === currentUserDisplayNameLower)
          );
        });

        const normalizedUserRoles = userRoles.map(r => r.toLowerCase());
        const isLabOrAdmin = normalizedUserRoles.some(r => r === 'admin' || r === 'lab');

        // Only deliver to explicitly assigned users OR anyone with admin/lab role
        return isMentioned || isLabOrAdmin;
      }
      
      // If global (no specific recipientUsers specified), anyone matching roles in recipientRoles receives it
      const normalizedUserRoles = userRoles.map(r => r.toLowerCase());
      if (normalizedUserRoles.includes('admin') || normalizedUserRoles.includes('lab')) {
        return true;
      }
      if (notification.recipientRoles && notification.recipientRoles.length > 0) {
        const normalizedRecipientRoles = notification.recipientRoles.map((r: string) => r.toLowerCase());
        return normalizedRecipientRoles.some((rRole: string) => 
          normalizedUserRoles.some(uRole => uRole === rRole || uRole === `viewer_${rRole}`)
        );
      }
      return true;
    }

    // Check if user is explicitly mentioned (by username or email or select worker)
    let isMentionedOrExclusive = false;
    let hasExclusiveUsers = false;

    if (notification.recipientUsers && notification.recipientUsers.length > 0) {
      hasExclusiveUsers = true;
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

    const normalizedUserRoles = userRoles.map(r => r.toLowerCase());
    
    // Check if user is Admin. Administrators always receive all notifications
    // "ADMINISTRADOR CISTEMA: LE LLEGAN TODAS LAS NOTIFICACIONES DE LOS MODULOS"
    if (normalizedUserRoles.includes('admin')) {
      return true;
    }

    // If it was targeted to specific users, and we are not one of them, and we are not an admin...
    // then if there are NO recipient roles specified, we should NOT get this notification.
    if (hasExclusiveUsers && (!notification.recipientRoles || notification.recipientRoles.length === 0)) {
       return false; 
    }

    if (!notification.recipientRoles || notification.recipientRoles.length === 0) return true;
    
    const normalizedRecipientRoles = notification.recipientRoles.map((r: string) => r.toLowerCase());

    // Check if any of the user's roles matches the recipient role
    const isRoleRecipient = normalizedRecipientRoles.some((rRole: string) => 
             normalizedUserRoles.some(uRole => uRole === rRole || uRole === `viewer_${rRole}`)
           );

    // "AL MÓDULO DE LABORATORIO LE LLEGARAN LAS NOTIFICACIONES DE TODOS LOS USUARIOS DE INGRESO A ESE MODULO"
    // "... Y EL INGRESO DE SEGUIMIENTO DE COTIZACIONES APROBADAS POR ADMINISTRACION YA QUE ESTAN SINCRONIZADAS"
    const isLab = normalizedUserRoles.some(role => role === 'lab' || role === 'viewer_lab');
    if (isLab) {
      const isApprovedQuote = notification.title === 'Cotización Aprobada';
      const isStockAlert = notification.title === 'Alerta de Stock Bajo';
      
      // If it's explicitly for laboratory, or it is a special synchronized alert
      if (isApprovedQuote || isStockAlert || isRoleRecipient) {
        return true;
      }
    }

    return isRoleRecipient;
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
    try {
      const data = await localDB.getCollection('notifications');
      const sorted = [...data].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      const filtered = sorted.filter(isRecipient);
      callback(filtered);
    } catch (e) {
      console.warn("Polling notifications temporarily failed", e);
    }
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
  let currentUserEmail = '';
  try {
    const local = sessionStorage.getItem('cimasur_user');
    if (local) {
      const u = JSON.parse(local);
      currentUserEmail = u.email || '';
    }
  } catch (e) {
    console.error('Error parsing local user in addNotification:', e);
  }

  const payload: any = {
    ...notification,
    senderEmail: notification.senderEmail || currentUserEmail || (notification.sender && notification.sender.includes('@') ? notification.sender : ''),
  };

  if (isFirebaseReady && db) {
    await addDoc(collection(db, 'notifications'), {
        ...payload,
        read: false,
        createdAt: serverTimestamp()
    });
  } else {
    await localDB.saveToCollection('notifications', {
        ...payload,
        read: false,
        createdAt: new Date().toISOString()
    });
  }
  window.dispatchEvent(new Event('db-change'));
};

export const deleteNotification = async (id: string) => {
  if (isFirebaseReady && db) {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'notifications', id));
  } else {
    await localDB.deleteFromCollection('notifications', id);
  }
  window.dispatchEvent(new Event('db-change'));
};
