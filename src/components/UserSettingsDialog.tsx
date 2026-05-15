import React, { useState } from 'react';
import { X, User, Users, Shield, Settings } from 'lucide-react';
import { localDB } from '../lib/auth';
import { cn } from '../lib/utils';
import { UsersManager } from './settings/UsersManager';
import { AuditLogManager } from './settings/AuditLogManager';

interface UserSettingsDialogProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const UserSettingsDialog: React.FC<UserSettingsDialogProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await localDB.updateInCollection('users', user.id, { displayName });
      alert('Nombre actualizado. Por favor reinicie la sesión para ver los cambios.');
      onUpdate();
      onClose();
    } catch (err) {
      alert('Error guardando cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#152035] rounded-2xl w-full shadow-2xl overflow-hidden transition-all max-w-sm">
        <div className="bg-[#001736] p-4 flex justify-between items-center text-white">
          <h2 className="font-bold text-lg flex items-center gap-2 uppercase tracking-tighter italic">
            <User className="w-5 h-5 text-blue-400" /> Mi Perfil
          </h2>
          <button onClick={onClose} className="text-white hover:text-red-400"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-slate-50 flex items-center justify-center text-blue-600 font-black text-3xl shadow-inner mb-2 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase()
              )}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustes de Cuenta</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 ml-1">Nombre para mostrar</label>
              <input 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full border-2 border-[#1E293B] rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                placeholder="Tu nombre real..."
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 ml-1">Email Institucional</label>
              <input 
                value={user?.email}
                disabled
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-[#0D1527] text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            onClick={handleSave}
            className="w-full bg-[#001736] text-white rounded-2xl p-4 font-black text-xs uppercase tracking-[0.2em] mt-4 shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Sincronizando...' : 'Actualizar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
};
