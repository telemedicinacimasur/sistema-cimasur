import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import { localDB } from '../lib/auth';

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
      // Assuming users are stored in a 'users' collection
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
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" /> Mi Perfil
          </h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nombre para mostrar</label>
            <input 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email</label>
            <input 
              value={user?.email}
              disabled
              className="w-full border rounded-lg p-2 text-sm bg-slate-100 text-slate-500"
            />
          </div>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="w-full bg-blue-600 text-white rounded-lg p-2 font-bold mt-4"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
