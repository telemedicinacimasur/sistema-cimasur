import { localDB } from './auth';
import { dbInstance as db, isFirebaseReady } from './firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';

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

export const subscribeToNotifications = (
  userRoles: string[], 
  currentUserName: string, 
  currentUserEmail: string, 
  callback: (notifications: Notification[]) => void,
  usuarioActualIdParam?: string
) => {
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
    const usuarioActualId = usuarioActualIdParam || currentUserEmail || currentUserName;

    const q = query(
      collection(db, 'notifications'),
      where('usuarioId', '==', usuarioActualId),
      where('leida', '==', false),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          read: d.read ?? d.leida ?? false,
          leida: d.leida ?? d.read ?? false,
        } as unknown as Notification;
      });
      const filtered = data.filter(isRecipient);
      callback(filtered);
    }, (err) => {
      console.warn("Firestore onSnapshot index error, falling back to basic notifications query:", err);
      const fallbackQ = query(
        collection(db, 'notifications'),
        limit(50)
      );
      return onSnapshot(fallbackQ, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        const filtered = data.filter(isRecipient);
        callback(filtered);
      });
    });
  }
  
  // Local mode fallback
  const handleLocalChange = async (e?: Event) => {
    if (e) {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.collection && detail.collection !== 'notifications') return;
    }
    if (isFirebaseReady && db) return; // Snapshot handles it
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

  const onDbChange = (e?: Event) => {
    const detail = (e as CustomEvent)?.detail;
    if (!detail?.collection || detail.collection === 'notifications') {
      handleLocalChange();
    }
  };

  handleLocalChange();
  window.addEventListener('db-change', onDbChange);
  
  // Polling for local mode
  let isPolling = false;
  const poll = async () => {
    if (isPolling) return;
    try {
      isPolling = true;
      await handleLocalChange();
    } finally {
      isPolling = false;
    }
  };
  
  const pollInterval = setInterval(poll, 15000); // Less aggressive polling (15s instead of 5s)
  
  return () => {
    window.removeEventListener('db-change', handleLocalChange);
    clearInterval(pollInterval);
  };
};

export const markNotificationAsRead = async (id: string) => {
  if (isFirebaseReady && db) {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'notifications', id), { read: true, leida: true });
  } else {
    await localDB.updateInCollection('notifications', id, { read: true, leida: true });
  }
  window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'notifications' } }));
};

export const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  // Filter out any administration submodules notifications requested by the user
  const titleLower = (notification.title || '').trim().toLowerCase();
  const messageLower = (notification.message || '').toLowerCase();
  
  const isBlockedAdminNotification = 
    titleLower.startsWith('nueva venta') ||
    titleLower === 'nuevo dte registrado' ||
    titleLower === 'nuevo pago veterinario' ||
    titleLower === 'nuevo alumno matriculado' ||
    titleLower.includes('resumen de ventas') ||
    titleLower.includes('saldos escuela') ||
    titleLower.includes('códigos y diluciones') ||
    titleLower.includes('codigos y diluciones') ||
    titleLower.includes('presupuesto y flujo') ||
    messageLower.includes('school_payments') ||
    messageLower.includes('saldos escuela');

  if (isBlockedAdminNotification) {
    console.log("Blocking notification from blocked admin submodule:", notification.title);
    return;
  }

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
    usuarioId: (notification as any).usuarioId || (notification.recipientUsers && notification.recipientUsers[0]) || notification.senderEmail || currentUserEmail || '',
    senderEmail: notification.senderEmail || currentUserEmail || (notification.sender && notification.sender.includes('@') ? notification.sender : ''),
  };

  if (isFirebaseReady && db) {
    await addDoc(collection(db, 'notifications'), {
        ...payload,
        read: false,
        leida: false,
        createdAt: serverTimestamp()
    });
  } else {
    await localDB.saveToCollection('notifications', {
        ...payload,
        read: false,
        leida: false,
        createdAt: new Date().toISOString()
    });
  }
  window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'notifications' } }));
};

export const deleteNotification = async (id: string) => {
  if (isFirebaseReady && db) {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'notifications', id));
  } else {
    await localDB.deleteFromCollection('notifications', id);
  }
  window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'notifications' } }));
};

export const migrateLegacyNotifications = async () => {
  if (!isFirebaseReady || !db) return;
  const { query, collection, getDocs, writeBatch } = await import('firebase/firestore');
  
  const q = query(collection(db, 'notifications'));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.usuarioId === undefined || data.leida === undefined) {
      batch.update(docSnap.ref, {
        usuarioId: data.usuarioId || (data.recipientUsers && data.recipientUsers[0]) || data.senderEmail || '',
        leida: data.leida ?? data.read ?? false
      });
      batchCount++;
      if (batchCount >= 450) { // Firestore batch limit
        await batch.commit();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log(`Migración de notificaciones completada: ${batchCount} documentos actualizados.`);
};

