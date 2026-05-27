import React, { useState, useEffect } from 'react';
import { X, Bell, Check, User, ShieldAlert, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { localDB } from '../lib/auth';
import { formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { subscribeToNotifications, Notification, markNotificationAsRead } from '../lib/notifications';
import { useNavigate } from 'react-router-dom';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted?: boolean;
  toggleMute?: () => void;
}

export const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ isOpen, onClose, isMuted, toggleMute }) => {
  const [showRead, setShowRead] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const filteredNotifications = notifications.filter(n => showRead || !n.read);

  useEffect(() => {
    if (user) {
      const userRoles = user.roles || [user.role || 'viewer'];
      const unsubscribe = subscribeToNotifications(userRoles, user.displayName || user.email || 'Sistema', (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
  };

  const getModuleLabel = (roles: string[]) => {
    if (!roles || roles.length === 0) return 'Sistema General';
    const labels: Record<string, string> = {
      admin: 'Administración',
      manager: 'Gestor Administrativo',
      lab: 'Laboratorio',
      crm: 'CRM Comercial',
      school: 'Escuela',
      gestion: 'Gestión'
    };
    return roles.map(r => labels[r] || r).join(', ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-end p-4">
      <div className="bg-[#152035] rounded-2xl w-full max-w-sm shadow-2xl p-6 mt-16 animate-in slide-in-from-right border border-[#1E3A5F]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#38BDF8]" /> Notificaciones
            {toggleMute && (
              <button onClick={toggleMute} className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-all" title={isMuted ? "Activar Sonido" : "Silenciar Notificaciones"}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRead(!showRead)} className={cn("text-[10px] uppercase font-black px-3 py-1.5 rounded-full transition-colors", showRead ? "bg-[#38BDF8] text-[#111A2E]" : "bg-[#1E3A5F] text-slate-300 hover:bg-[#111A2E]")}>
              {showRead ? 'Ocultar leídas' : 'Ver todas'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        {selectedNotif ? (
          <div className="animate-in slide-in-from-right-8 fade-in">
             <button onClick={() => setSelectedNotif(null)} className="text-[#38BDF8] text-xs font-bold uppercase mb-4 hover:underline">&larr; Volver a lista</button>
             <div className="bg-[#111A2E] p-5 rounded-2xl border border-[#1E3A5F] space-y-4">
                <div>
                   <h3 className="text-lg font-black text-white">{selectedNotif.title}</h3>
                   <span className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(selectedNotif.createdAt)}</span>
                </div>
                <div className="bg-[#152035] p-4 rounded-xl text-sm justify-center flex flex-col text-slate-300 leading-relaxed border border-[#1E293B]">
                  {selectedNotif.message}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                   <div className="bg-[#152035] p-3 rounded-xl border border-[#1E3A5F]">
                      <span className="text-[9px] uppercase font-black text-slate-500 block mb-1">Emitido por</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                         <User className="w-3.5 h-3.5" />
                         <span className="truncate">{selectedNotif.sender || 'Sistema'}</span>
                      </div>
                   </div>
                   <div className="bg-[#152035] p-3 rounded-xl border border-[#1E3A5F] cursor-pointer hover:border-[#38BDF8] transition-colors" onClick={() => {
                      const roles = selectedNotif.recipientRoles || [];
                      let route = '/';
                      if (roles.includes('lab')) route = '/lab';
                      else if (roles.includes('crm')) route = '/crm';
                      else if (roles.includes('admin') || roles.includes('manager')) route = '/admin';
                      else if (roles.includes('school')) route = '/school';
                      else if (roles.includes('gestion')) route = '/gestion';
                      navigate(route);
                      onClose();
                   }} title="Ir al módulo">
                      <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 flex items-center justify-between">Módulo Destino <ExternalLink className="w-3 h-3 text-[#38BDF8]" /></span>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#38BDF8]">
                         <ShieldAlert className="w-3.5 h-3.5" />
                         <span className="truncate">{getModuleLabel(selectedNotif.recipientRoles)}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E3A5F] pr-2 -mr-2">
            {filteredNotifications.length === 0 && <p className="text-sm text-slate-500 text-center py-8 italic">No tienes notificaciones pendientes.</p>}
            {filteredNotifications.map((n: any) => (
              <div 
                 key={n.id} 
                 onClick={() => setSelectedNotif(n)}
                 className={cn("p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all group", n.read ? "bg-[#111A2E]/50 border-[#1E293B] opacity-70" : "bg-[#111A2E] border-[#38BDF8]/40 hover:border-[#38BDF8]")}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={cn("font-bold text-sm", n.read ? "text-slate-400" : "text-white group-hover:text-[#38BDF8] transition-colors")}>{n.title}</h4>
                  {!n.read && (
                      <button onClick={(e) => markAsRead(n.id, e)} className="text-[#38BDF8] hover:text-white bg-[#152035] hover:bg-[#38BDF8] px-2 py-1.5 rounded-lg z-10 flex items-center gap-1.5 transition-colors border border-[#1E3A5F] hover:border-[#38BDF8]" title="Marcar como leída">
                          <Check className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block">Leída</span>
                      </button>
                  )}
                </div>
                <p className="text-xs text-slate-300 mb-3 line-clamp-2">{n.message}</p>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-[#38BDF8] truncate max-w-[120px]">{n.sender || 'Sistema'}</span>
                  <span className="text-slate-500">{formatDate(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
