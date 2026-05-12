import React, { useState, useEffect } from 'react';
import { X, Bell, Check } from 'lucide-react';
import { localDB } from '../lib/auth';
import { formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { subscribeToNotifications, Notification, markNotificationAsRead } from '../lib/notifications';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ isOpen, onClose }) => {
  const [showRead, setShowRead] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  
  const filteredNotifications = notifications.filter(n => showRead || !n.read);

  useEffect(() => {
    if (user) {
      const userRoles = user.roles || [user.role || 'viewer'];
      const unsubscribe = subscribeToNotifications(userRoles, (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-end p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 mt-16 animate-in slide-in-from-right">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" /> Notificaciones
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRead(!showRead)} className={cn("text-xs px-2 py-1 rounded", showRead ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600")}>
              {showRead ? 'Ocultar leídas' : 'Ver todas'}
            </button>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {filteredNotifications.length === 0 && <p className="text-sm text-slate-500 text-center">No hay notificaciones.</p>}
          {filteredNotifications.map((n: any) => (
            <div key={n.id} className={cn("p-4 rounded-lg border", n.read ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100")}>
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-sm text-slate-800">{n.title}</h4>
                {!n.read && (
                    <button onClick={() => markAsRead(n.id)} className="text-blue-600 hover:text-blue-800">
                        <Check className="w-4 h-4" />
                    </button>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-2">{n.message}</p>
              <div className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
