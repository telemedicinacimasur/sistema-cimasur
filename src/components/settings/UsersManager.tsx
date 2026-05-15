import React, { useState, useEffect } from 'react';
import { UserPlus, Save, UserX, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';

export function UsersManager() {
  const { user, refreshUser } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];
  const isAdmin = userRoles.includes('admin');
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    roles: ['viewer'] as string[],
    pass: ''
  });

  const [savingId, setSavingId] = useState<string | null>(null);

  const availableRoles = [
    { id: 'admin', label: 'Administrador Sistema', color: 'bg-red-100 text-red-700' },
    { id: 'manager', label: 'Gestor Administrativo', color: 'bg-sky-100 text-sky-700' },
    { id: 'lab', label: 'Laboratorio', color: 'bg-blue-100 text-blue-700' },
    { id: 'crm', label: 'CRM Comercial', color: 'bg-blue-100 text-blue-700' },
    { id: 'school', label: 'Escuela', color: 'bg-blue-100 text-blue-700' },
    { id: 'gestion', label: 'Gestión', color: 'bg-blue-100 text-blue-700' }
  ];

  const refreshUsers = async () => {
    const data = await localAuth.getAllUsers();
    setUsers(data);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
        setSavingId(editingUser.uid);
        const validRoles = editingUser.roles && Array.isArray(editingUser.roles) && editingUser.roles.length > 0
            ? editingUser.roles.filter((r: any) => r !== undefined && r !== null)
            : ['viewer'];
            
        if (validRoles.length === 0) validRoles.push('viewer');

        await localAuth.updateUser(editingUser.uid, {
            displayName: editingUser.displayName,
            role: validRoles[0],
            roles: validRoles,
            password: newPass || undefined 
        });

        if (user && user.uid === editingUser.uid) {
            await refreshUser();
        }

        setEditingUser(null);
        setNewPass('');
        await refreshUsers();
        alert('Usuario actualizado exitosamente');
    } catch(err) {
        alert('Hubo un error al actualizar el usuario');
    } finally {
        setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.pass) return;
    
    await localAuth.createUser({
      ...newUser,
      roles: newUser.roles.length > 0 ? newUser.roles : ['viewer']
    });
    setShowCreate(false);
    setNewUser({ email: '', pass: '', displayName: '', role: 'viewer', roles: ['viewer'] });
    await refreshUsers();
    alert('Usuario creado');
  };

  const toggleRole = (currentRoles: string[], roleId: string) => {
    if (currentRoles.includes(roleId)) {
      return currentRoles.filter(r => r !== roleId);
    } else {
      return [...currentRoles, roleId];
    }
  };

  const handleDelete = async (uid: string) => {
    if (uid === user?.uid) {
      alert('No puedes eliminarte a ti mismo mientras estás en sesión');
      return;
    }
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) return;
    if (confirm(`¿Está seguro de eliminar al usuario ${targetUser.email}? Esta acción no se puede deshacer.`)) {
      try {
        await localAuth.deleteUser(uid);
        await refreshUsers();
        alert('Usuario eliminado correctamente');
      } catch (err) {
        alert('Error al eliminar usuario');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 text-red-600 p-8 rounded-xl flex flex-col items-center justify-center text-center">
         <Shield className="w-12 h-12 mb-4 opacity-50" />
         <h3 className="text-lg font-bold">Acceso Denegado</h3>
         <p className="text-sm">Solo usuarios con rol Administrador pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#152035] rounded-xl border border-[#1E293B] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#001736] flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Cuentas y Accesos
            </h3>
            <p className="text-sm text-slate-500 mt-1">Gestiona los colaboradores y sus niveles de acceso al sistema.</p>
          </div>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-[#001736] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> {showCreate ? 'Cancelar' : 'Nuevo Usuario'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8 animate-in slide-in-from-top-4">
            <h4 className="font-bold text-blue-900 mb-4 text-sm uppercase tracking-wider">Crear Nuevo Usuario</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-700 tracking-wider mb-1">Nombre</label>
                <input required className="w-full border-blue-200 rounded p-2 text-sm" value={newUser.displayName} onChange={e => setNewUser({...newUser, displayName: e.target.value})} placeholder="Ej: Juan Pérez" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-700 tracking-wider mb-1">Email</label>
                <input required type="email" className="w-full border-blue-200 rounded p-2 text-sm" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value.toLowerCase()})} placeholder="juan@cimasur.cl" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-700 tracking-wider mb-1">Contraseña Incial</label>
                <input required minLength={6} type="password" className="w-full border-blue-200 rounded p-2 text-sm" value={newUser.pass} onChange={e => setNewUser({...newUser, pass: e.target.value})} />
              </div>
              <div className="col-span-full mt-4">
                <label className="block text-[10px] font-black uppercase text-blue-700 tracking-wider mb-3">Roles / Permisos Multi-Módulo</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                   {availableRoles.map(r => (
                     <label key={r.id} className={cn(
                       "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                       newUser.roles.includes(r.id) ? "border-blue-500 bg-blue-100 shadow-sm" : "border-[#1E293B] bg-[#152035] hover:bg-[#0D1527]"
                     )}>
                        <input 
                          type="checkbox" 
                          checked={newUser.roles.includes(r.id)} 
                          onChange={() => setNewUser({...newUser, roles: toggleRole(newUser.roles, r.id)})} 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-slate-700">{r.label}</span>
                     </label>
                   ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold text-sm hover:bg-blue-700 shadow-md">Crear Cuenta</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {users.map(u => {
            const isEditing = editingUser?.uid === u.uid;
            // Handle both legacy role string and new roles array
            const currentRolesArray = Array.isArray(u.roles) ? u.roles : [u.role];
            
            return (
              <div key={u.uid} className={cn(
                "border rounded-xl p-5 transition-all",
                isEditing ? "bg-[#152035] border-blue-300 shadow-lg ring-2 ring-blue-100" : "bg-[#0D1527] border-[#1E293B] hover:border-[#1E293B]"
              )}>
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                       <h5 className="font-bold text-[#001736]">Editando Usuario</h5>
                       <button type="button" onClick={() => { setEditingUser(null); setNewPass(''); }} className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase">Cancelar</button>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre</label>
                      <input className="w-full border rounded p-1.5 text-sm" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nueva Contraseña (Opcional)</label>
                      <input type="password" placeholder="Dejar en blanco para mantener" className="w-full border rounded p-1.5 text-sm" value={newPass} onChange={e => setNewPass(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 mt-4 text-center">Permisos Asignados</label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableRoles.map(r => (
                           <label key={r.id} className={cn(
                             "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                             (editingUser.roles || []).includes(r.id) ? "border-blue-500 bg-blue-50" : "border-[#1E293B] bg-[#152035]"
                           )}>
                              <input 
                                type="checkbox" 
                                checked={(editingUser.roles || []).includes(r.id)} 
                                onChange={() => setEditingUser({...editingUser, roles: toggleRole(editingUser.roles || [], r.id)})} 
                                className="w-3.5 h-3.5 rounded text-blue-600"
                              />
                              <span className="text-[11px] font-bold text-slate-700 leading-tight">{r.label}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                    <button disabled={savingId === editingUser.uid} type="submit" className="w-full bg-emerald-600 text-white rounded p-2 text-sm font-bold mt-2 shadow flex items-center justify-center gap-2">
                      {savingId === editingUser.uid ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                    </button>
                  </form>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-[#001736] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-500" />
                          {u.displayName || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                         <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                           {currentRolesArray.map((roleId: string) => {
                             const rObj = availableRoles.find(r => r.id === roleId);
                             if (!rObj) return null;
                             return (
                               <span key={roleId} className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", rObj.color)}>
                                 {rObj.label}
                               </span>
                             )
                           })}
                           {currentRolesArray.length === 0 && <span className="px-2 py-0.5 border border-[#1E293B] text-slate-400 rounded text-[9px] font-black uppercase">Sin roles</span>}
                         </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-4 border-t pt-3">
                      <button 
                        onClick={() => setEditingUser({ ...u, roles: Array.isArray(u.roles) ? u.roles : [u.role] })}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                      >
                        Editar Datos
                      </button>
                      
                      <button 
                         onClick={() => handleDelete(u.uid)}
                         className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors"
                      >
                         <UserX className="w-3.5 h-3.5" /> Bloquear / Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
