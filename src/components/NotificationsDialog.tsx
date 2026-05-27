import React, { useState, useEffect } from 'react';
import { X, Bell, Check, User, ShieldAlert, Volume2, VolumeX, ExternalLink, CheckCheck, Trash2 } from 'lucide-react';
import { localDB } from '../lib/auth';
import { formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { subscribeToNotifications, Notification, markNotificationAsRead, deleteNotification } from '../lib/notifications';
import { useNavigate } from 'react-router-dom';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted?: boolean;
  toggleMute?: () => void;
}

export const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ isOpen, onClose, isMuted, toggleMute }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'read'>('pending');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const parseNotificationTime = (val: any) => {
    if (!val) return 0;
    if (val.seconds) return val.seconds * 1000;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  };

  const pendingCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifications
    .filter(n => activeTab === 'read' ? n.read : !n.read)
    .sort((a, b) => parseNotificationTime(b.createdAt) - parseNotificationTime(a.createdAt));

  useEffect(() => {
    if (user) {
      const userRoles = user.roles || [user.role || 'viewer'];
      const unsubscribe = subscribeToNotifications(userRoles, user.displayName || user.email || 'Sistema', user.email || '', (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      if (n.id) {
        await markNotificationAsRead(n.id);
      }
    }
  };

  const handleSelectNotif = async (n: Notification) => {
    setSelectedNotif(n);
    if (!n.read && n.id) {
      await markNotificationAsRead(n.id);
    }
  };

  const handleNavigateToTargetForNotif = (notif: Notification) => {
    const titleLower = (notif.title || '').toLowerCase();
    const msgLower = (notif.message || '').toLowerCase();
    const roles = notif.recipientRoles || [];

    let route = '/';
    
    if (titleLower.includes('pizarra') || msgLower.includes('pizarra')) {
      route = '/pizarra';
    } else if (roles.includes('lab') || titleLower.includes('evaluación gota') || titleLower.includes('laboratorio')) {
      route = '/laboratorio';
    } else if (roles.includes('crm') || titleLower.includes('crm') || titleLower.includes('cotización')) {
      route = '/crm';
    } else if (roles.includes('school') || titleLower.includes('escuela') || titleLower.includes('alumno')) {
      route = '/escuela';
    } else if (roles.includes('gestion') || titleLower.includes('gestion') || titleLower.includes('gestión')) {
      route = '/gestion';
    } else if (roles.includes('admin') || roles.includes('manager') || titleLower.includes('administracion') || titleLower.includes('administración')) {
      route = '/administracion';
    }

    navigate(route);
    onClose();
  };

  const getModuleLabel = (notif: Notification) => {
    const titleLower = (notif.title || '').toLowerCase();
    const msgLower = (notif.message || '').toLowerCase();

    if (titleLower.includes('pizarra') || msgLower.includes('pizarra')) {
      return 'Pizarra de Notas';
    }

    const roles = notif.recipientRoles || [];
    if (roles.includes('lab') || titleLower.includes('evaluación gota') || titleLower.includes('laboratorio')) {
      return 'Laboratorio';
    }
    if (roles.includes('crm') || titleLower.includes('crm') || titleLower.includes('cotización')) {
      return 'CRM Comercial';
    }
    if (roles.includes('school') || titleLower.includes('escuela') || titleLower.includes('alumno')) {
      return 'Escuela CIMASUR';
    }
    if (roles.includes('gestion') || titleLower.includes('gestion') || titleLower.includes('gestión')) {
      return 'Gestión';
    }
    if (roles.includes('admin') || roles.includes('manager') || titleLower.includes('administracion') || titleLower.includes('administración')) {
      return 'Administración';
    }

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
      <div className="bg-[#152035] rounded-x2l rounded-2xl w-full max-w-sm shadow-2xl p-6 mt-16 animate-in slide-in-from-right border border-[#1E3A5F]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#38BDF8]" /> Notificaciones
            {toggleMute && (
              <button onClick={toggleMute} className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-all" title={isMuted ? "Activar Sonido" : "Silenciar Notificaciones"}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Selection Header and Quick Select Button */}
        {!selectedNotif && (
          <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-3 mb-4">
            <div className="flex gap-2.5">
              <button 
                onClick={() => setActiveTab('pending')} 
                className={cn(
                  "text-[10px] uppercase font-black px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5", 
                  activeTab === 'pending' 
                    ? "bg-[#38BDF8] text-[#111A2E] shadow" 
                    : "bg-[#1E3A5F] text-slate-300 hover:bg-[#111A2E]"
                )}
              >
                No leídas
                {pendingCount > 0 && (
                  <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('read')} 
                className={cn(
                  "text-[10px] uppercase font-black px-3.5 py-2 rounded-full transition-all", 
                  activeTab === 'read' 
                    ? "bg-[#38BDF8] text-[#111A2E] shadow" 
                    : "bg-[#1E3A5F] text-slate-300 hover:bg-[#111A2E]"
                )}
              >
                Leídas
              </button>
            </div>

            {activeTab === 'pending' && pendingCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead} 
                className="text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10 px-2.5 py-1.5 rounded-xl"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todo
              </button>
            )}
          </div>
        )}
        
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
                   <div className="bg-[#152035] p-3 rounded-xl border border-[#1E3A5F] cursor-pointer hover:border-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors" onClick={() => handleNavigateToTargetForNotif(selectedNotif)} title="Ir al módulo">
                      <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 flex items-center justify-between">Módulo Destino <ExternalLink className="w-3 h-3 text-[#38BDF8]" /></span>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#38BDF8]">
                         <ShieldAlert className="w-3.5 h-3.5" />
                         <span className="truncate">{getModuleLabel(selectedNotif)}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E3A5F] pr-2 -mr-2">
            {filteredNotifications.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8 italic">
                {activeTab === 'pending' ? 'No tienes notificaciones pendientes.' : 'No tienes notificaciones leídas.'}
              </p>
            )}
            {filteredNotifications.map((n: any) => (
              <div 
                 key={n.id} 
                 onClick={() => handleSelectNotif(n)}
                 className={cn("p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all group", n.read ? "bg-[#111A2E]/50 border-[#1E293B] opacity-70" : "bg-[#111A2E] border-[#38BDF8]/40 hover:border-[#38BDF8]")}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h4 className={cn("font-bold text-sm flex-1", n.read ? "text-slate-400" : "text-white group-hover:text-[#38BDF8] transition-colors")}>{n.title}</h4>
                  <div className="flex items-center gap-1.5">
                    {!n.read && (
                        <button onClick={(e) => markAsRead(n.id, e)} className="text-[#38BDF8] hover:text-white bg-[#152035] hover:bg-[#38BDF8] px-2 py-1.5 rounded-lg z-10 flex items-center gap-1 transition-colors border border-[#1E3A5F] hover:border-[#38BDF8]" title="Marcar como leída">
                            <Check className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:inline-block">Leída</span>
                        </button>
                    )}
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (n.id) {
                          await deleteNotification(n.id);
                        }
                      }} 
                      className="text-red-400 hover:text-white bg-[#152035] hover:bg-red-500 p-1.5 rounded-lg z-10 transition-colors border border-red-500/20 hover:border-red-500" 
                      title="Eliminar notificación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
