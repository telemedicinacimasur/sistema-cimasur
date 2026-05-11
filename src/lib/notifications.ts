import { localDB } from './auth';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  recipientRoles: string[]; // ['Administrador', 'Laboratorio', 'CRM', 'Escuela', 'Gestión']
  sender: string;
  createdAt: string;
  read: boolean;
}

export const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  await localDB.saveToCollection('notifications', {
    ...notification,
    read: false,
    createdAt: new Date().toISOString()
  });
  window.dispatchEvent(new Event('db-change'));
};
