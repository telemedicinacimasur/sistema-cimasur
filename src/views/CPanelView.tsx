import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Shield, 
  Key, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  Settings, 
  LayoutGrid, 
  FlaskConical, 
  GraduationCap, 
  TrendingUp, 
  Lock,
  FileText
} from 'lucide-react';
import { localAuth, localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDateTimeChile } from '../lib/utils';
import { RecordActions } from '../components/RecordActions';

export default function CPanelView() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadAuditLogs = async () => {
      const data = await localDB.getCollection('audit_logs');
      setRecords(data);
    };
    loadAuditLogs();
    window.addEventListener('db-change', loadAuditLogs);
    return () => window.removeEventListener('db-change', loadAuditLogs);
  }, []);

  return <CPanelManager records={records} />;
}

function FormField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{label}</label>
      {children}
    </div>
  );
}

function CPanelManager({ records }: { records: any[] }) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'modules'>('users');

  return (
    <div className="bg-[#152035] rounded-[1.5rem] border border-[#1E293B] shadow-xl overflow-hidden animate-in zoom-in-95 duration-500 min-h-screen">
       <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-8  relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10">
             <Settings className="w-56 h-56 rotate-12" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
             <div className="p-3 bg-[#152035] rounded-2xl shadow-lg">
                <ShieldCheck className="w-8 h-8" />
             </div>
             <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">CPANEL CONTROL</h3>
                <p className="text-blue-300 text-[9px] font-black uppercase tracking-[0.3em] opacity-80 mt-2">Configuración Central de Privilegios y Gobernanza de Datos</p>
             </div>
          </div>
       </div>

       <div className="flex border-b border-[#1E293B] bg-[#152035]/50 p-2 gap-2">
          {[
            { id: 'users', label: 'Gestión de Accesos', icon: Users, color: 'text-[#38BDF8]' },
            { id: 'logs', label: 'Traza de Auditoría', icon: ShieldCheck, color: 'text-emerald-600' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-2xl",
                activeTab === tab.id ? "bg-[#152035] shadow-md text-[#38BDF8]" : "text-slate-400 hover:text-slate-300 hover:bg-[#111A2E]/50"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          ))}
       </div>

       <div className="p-6">
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'logs' && <AuditLogManager records={records} />}
          {activeTab === 'modules' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between group hover:shadow-lg transition-all">
                      <div>
                         <div className="w-12 h-12 bg-[#111A2E] text-[#38BDF8] rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform">
                            <FlaskConical className="w-6 h-6" />
                         </div>
                         <h4 className="text-lg font-black text-white uppercase tracking-tight italic">Módulo Laboratorio</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">Control de producción homeopática, inventario de cepas y despacho logístico.</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-50 rounded-full">Activo</span>
                         <button className="text-[#38BDF8] font-black text-[10px] uppercase hover:underline">Configurar</button>
                      </div>
                   </div>

                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between group hover:shadow-lg transition-all">
                      <div>
                         <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform">
                            <GraduationCap className="w-6 h-6" />
                         </div>
                         <h4 className="text-lg font-black text-white uppercase tracking-tight italic">Módulo Escuela</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">Gestión de alumnos, diplomados, motor de pagos y analíticas de retención.</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-50 rounded-full">Activo</span>
                         <button className="text-[#38BDF8] font-black text-[10px] uppercase hover:underline">Configurar</button>
                      </div>
                   </div>

                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between group hover:shadow-lg transition-all">
                      <div>
                         <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                         </div>
                         <h4 className="text-lg font-black text-white uppercase tracking-tight italic">Módulo CRM</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">Automatización de ventas, campañas masivas y seguimiento de prospectos (Leads).</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-50 rounded-full">Activo</span>
                         <button className="text-[#38BDF8] font-black text-[10px] uppercase hover:underline">Configurar</button>
                      </div>
                   </div>

                   <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                         <Lock className="w-32 h-32" />
                      </div>
                      <div className="relative z-10">
                         <div className="w-12 h-12 bg-[#152035] text-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-slate-700">
                            <Lock className="w-6 h-6" />
                         </div>
                         <h4 className="text-lg font-black uppercase tracking-tight italic">API Integración</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 italic">Servicios externos de courier y pasarelas de pago. Próximamente integración con Redelcom/Transbank.</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between relative z-10">
                         <span className="text-[10px] font-black uppercase text-slate-400 px-3 py-1 bg-[#152035] rounded-full">Beta v5.0</span>
                         <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-[#152035]/50 rounded-full animate-pulse" />
                            <div className="w-1.5 h-1.5 bg-[#152035]/50 rounded-full animate-pulse delay-75" />
                            <div className="w-1.5 h-1.5 bg-[#152035]/50 rounded-full animate-pulse delay-150" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}

function UsersManager() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    roles: ['viewer'] as string[],
    permissions: {} as Record<string, { edit: boolean; delete: boolean }>,
    pass: ''
  });

  const [savingId, setSavingId] = useState<string | null>(null);

  const availableRoles = [
    { id: 'admin', label: 'Administrador Sistema', color: 'bg-red-100 text-red-700' },
    { id: 'manager', label: 'Gestor Administrativo', color: 'bg-sky-100 text-sky-700' },
    { id: 'lab', label: 'Laboratorio', color: 'bg-[#111A2E] text-[#38BDF8]' },
    { id: 'crm', label: 'CRM Comercial', color: 'bg-[#111A2E] text-[#38BDF8]' },
    { id: 'school', label: 'Escuela', color: 'bg-[#111A2E] text-[#38BDF8]' },
    { id: 'gestion', label: 'Gestión', color: 'bg-[#111A2E] text-[#38BDF8]' }
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
          role: validRoles[0],
          roles: validRoles,
          permissions: editingUser.permissions || {},
          displayName: editingUser.displayName,
          ...(newPass ? { pass: newPass } : {})
        });
        
        if (user?.uid === editingUser.uid) {
            await refreshUser();
        }
        
        alert('Usuario actualizado correctamente');
        setEditingUser(null);
        setNewPass('');
        await refreshUsers();
    } catch (error) {
        console.error("Error updating user:", error);
        alert('Error al guardar cambios: ' + error);
    } finally {
        setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.pass) return;
    
    await localAuth.createUser({
      ...newUser,
      role: newUser.roles.length > 0 ? newUser.roles[0] : 'viewer',
      uid: `user-${Date.now()}`,
      photoURL: ''
    });
    
    alert('Usuario creado correctamente');
    setNewUser({ email: '', displayName: '', role: 'viewer', roles: ['viewer'], pass: '' });
    setShowCreate(false);
    refreshUsers();
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
    if (targetUser?.email === 'admin@cimasur.cl') {
      alert('No puedes eliminar al administrador principal');
      return;
    }
    await localAuth.deleteUser(uid);
    refreshUsers();
    alert('Usuario eliminado');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" /> PANEL DE CONTROL DE ACCESOS (CPANEL)
          </div>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-[#152035] hover:bg-blue-400 text-[10px] font-black tracking-widest px-4 py-2 rounded-2xl transition-all shadow-lg active:scale-95 uppercase"
          >
            {showCreate ? 'CANCELAR' : '+ NUEVO USUARIO'}
          </button>
        </div>
        
        {showCreate && (
          <form className="p-6 bg-[#152035]/50 border-b border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300" onSubmit={handleCreate}>
            <div className="md:col-span-4">
              <h4 className="text-xs font-black text-blue-900 mb-2 uppercase tracking-[0.2em]">Registrar Nuevo Acceso</h4>
            </div>
            <FormField label="Correo Electrónico">
              <input 
                type="email"
                required
                className="w-full border border-blue-200 bg-[#152035] rounded-2xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
              />
            </FormField>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border border-blue-200 bg-[#152035] rounded-2xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={newUser.displayName} 
                onChange={e => setNewUser({...newUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Contraseña Inicial">
              <input 
                type="text"
                required
                className="w-full border border-blue-200 bg-[#152035] rounded-2xl p-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={newUser.pass} 
                onChange={e => setNewUser({...newUser, pass: e.target.value})} 
              />
            </FormField>
            <div className="md:col-span-1">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Accesos / Roles</label>
               <div className="grid grid-cols-1 gap-2 bg-[#152035]/50 p-2 rounded-2xl border border-blue-100">
                  {availableRoles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 rounded border-blue-200 text-[#38BDF8] focus:ring-blue-500"
                        checked={newUser.roles.includes(r.id)}
                        onChange={() => setNewUser({...newUser, roles: toggleRole(newUser.roles, r.id)})}
                      />
                      <span className="text-[9px] font-black text-blue-900 group-hover:text-[#38BDF8] transition-colors uppercase tracking-tight">{r.label}</span>
                    </label>
                  ))}
               </div>
            </div>
            <div className="md:col-span-4 flex justify-end mt-4">
              <button type="submit" className="bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 text-white px-10 py-3 rounded-2xl font-black hover:bg-[#38BDF8]/30 uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">CREAR ACCESO</button>
            </div>
          </form>
        )}

        {editingUser && (
          <form className="p-6 bg-[#152035] border-b border-[#1E293B] grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300" onSubmit={handleUpdate}>
            <div className="md:col-span-3 flex justify-between items-center mb-2">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest italic">Editando Acceso: <span className="text-[#38BDF8]">{editingUser.email}</span></h4>
              <button type="button" onClick={() => setEditingUser(null)} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase">Cerrar edición</button>
            </div>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border border-[#1E293B] bg-[#152035] rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={editingUser.displayName} 
                onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Modificar Contraseña">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Vacío para mantener"
                  className="w-full border border-[#1E293B] bg-[#152035] rounded-2xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  value={newPass} 
                  onChange={e => setNewPass(e.target.value)} 
                />
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </FormField>
            <div className="md:col-span-1">
               <div className="flex justify-between items-center mb-3">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Atribuciones</label>
                 <button 
                   type="button" 
                   onClick={() => setEditingUser({...editingUser, roles: availableRoles.map(ar => ar.id)})}
                   className="text-[9px] font-black text-[#38BDF8] hover:underline uppercase"
                 >
                   Acceso Total
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableRoles.map(r => (
                    <div key={r.id} className="space-y-2 p-2 rounded-2xl bg-[#152035] border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#1E293B] text-[#38BDF8] focus:ring-blue-500"
                          checked={(editingUser.roles || [editingUser.role]).includes(r.id)}
                          onChange={() => {
                            const current = editingUser.roles || [editingUser.role];
                            const newRoles = toggleRole(current, r.id);
                            setEditingUser({...editingUser, roles: newRoles});
                          }}
                        />
                        <span className="text-[10px] font-black text-slate-200 group-hover:text-[#38BDF8] transition-colors uppercase tracking-widest">{r.label}</span>
                      </label>
                      {(editingUser.roles || [editingUser.role]).includes(r.id) && r.id !== 'admin' && (
                        <div className="flex items-center gap-4 pl-6 pt-1 border-t border-[#1E293B]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 rounded border-[#1E293B] text-amber-500"
                              checked={editingUser.permissions?.[r.id]?.edit ?? true}
                              onChange={(e) => {
                                const perms = { ...editingUser.permissions };
                                perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), edit: e.target.checked };
                                setEditingUser({ ...editingUser, permissions: perms });
                              }}
                            />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">EDITAR</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 rounded border-[#1E293B] text-red-500"
                              checked={editingUser.permissions?.[r.id]?.delete ?? true}
                              onChange={(e) => {
                                const perms = { ...editingUser.permissions };
                                perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), delete: e.target.checked };
                                setEditingUser({ ...editingUser, permissions: perms });
                              }}
                            />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">BORRAR</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
            <div className="md:col-span-3 flex items-center justify-end gap-3 mt-4 pt-6 border-t border-[#1E293B]">
              <button 
                type="submit" 
                disabled={!!savingId}
                className="px-10 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  py-4 rounded-2xl font-black hover:bg-[#152035] uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {savingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-blue-400" />}
                {savingId ? 'PROCESANDO...' : 'ACTUALIZAR SISTEMA'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#152035] text-left border-b font-black text-slate-400 uppercase tracking-widest">
                <th className="p-5">Usuario / Identificación</th>
                <th className="p-5">Nombre Profesional</th>
                <th className="p-5 text-center">Privilegios Concedidos</th>
                <th className="p-5 text-center">Clave Activa</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map(u => (
                <tr key={u.email} className="group hover:bg-[#152035]/50 transition-colors">
                  <td className="p-5 font-black text-white italic opacity-70 group-hover:opacity-100">{u.email}</td>
                  <td className="p-5 font-bold text-slate-300 tracking-tight">{u.displayName}</td>
                  <td className="p-5 text-center">
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px] mx-auto">
                      {(u.roles || [u.role || 'viewer']).map((roleId: string) => {
                        const roleObj = availableRoles.find(ar => ar.id === roleId);
                        return (
                          <span key={roleId} className={cn(
                            "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-transform hover:scale-105",
                            roleObj?.color || "bg-[#152035] text-slate-400 border-[#1E293B]"
                          )}>
                            {roleObj?.label || roleId}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="font-mono text-slate-300 group-hover:text-amber-600 transition-colors text-[10px] font-bold bg-[#152035] group-hover:bg-amber-50 px-3 py-1 rounded-full border border-[#1E293B] group-hover:border-amber-200">{u.pass}</span>
                  </td>
                  <td className="p-5 text-center">
                    <RecordActions 
                      module="admin"
                      onEdit={() => {
                        setEditingUser({
                          ...u,
                          roles: Array.isArray(u.roles) 
                            ? u.roles 
                            : (u.roles && typeof u.roles === 'object' ? Object.values(u.roles) : (u.role ? [u.role] : ['viewer']))
                        });
                        setNewPass('');
                        setShowCreate(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onDelete={() => handleDelete(u.uid)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-100/30 border border-amber-200 p-6 rounded-3xl flex gap-4 items-start shadow-[0_4px_20px_rgba(0,0,0,0.4)] shadow-amber-50 group transition-all hover:bg-amber-100/50">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg group-hover:rotate-12 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-900/80 leading-relaxed italic">
            <p className="font-black mb-1 uppercase tracking-widest text-[10px] text-amber-600 italic">Seguridad Jerárquica Global</p>
            Solo el perfil <strong>Administrador</strong> puede ver esta sección de alto nivel. Desde aquí puedes crear accesos específicos 
            para cada departamento e inyectar permisos de edición o borrado granular según el módulo asignado.
          </div>
        </div>
        <div className="bg-[#111A2E]/30 border border-blue-200 p-6 rounded-3xl flex gap-4 items-start shadow-[0_4px_20px_rgba(0,0,0,0.4)] shadow-blue-50 group transition-all hover:bg-[#111A2E]/50">
          <div className="p-3 bg-[#152035] text-white rounded-2xl shadow-lg group-hover:rotate-12 transition-transform">
            <Key className="w-5 h-5" />
          </div>
          <div className="text-xs text-blue-900/80 leading-relaxed italic">
            <p className="font-black mb-1 uppercase tracking-widest text-[10px] text-[#38BDF8] italic">Restablecimiento de Credenciales</p>
            Si un colaborador olvida su clave o requiere un reseteo de seguridad, búscalo en la tabla y usa el botón "EDITAR" para inyectar una nueva 
            contraseña manualmente. La infraestructura actualiza el hash de forma instantánea.
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogManager({ records }: { records: any[] }) {
  return (
    <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-xl overflow-hidden animate-in fade-in duration-700">
      <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  font-black flex items-center justify-between">
        <div className="flex items-center gap-3 italic tracking-tighter">
          <FileText className="w-6 h-6 text-blue-400" /> REGISTRO DE AUDITORÍA GLOBAL (INSIGHTS)
        </div>
        <div className="text-[9px] font-black text-blue-300 uppercase tracking-widest px-4 py-1.5 bg-[#152035]/20 rounded-full border border-blue-500/30 animate-pulse">Monitor en Tiempo Real Activo</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#152035] text-left border-b font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-6">Timestamp (CHILE)</th>
              <th className="p-6">Entidad / Usuario</th>
              <th className="p-6 text-center">Referencia de Acceso</th>
              <th className="p-6">Módulo Afectado</th>
              <th className="p-6">Acción Ejecutada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((r, i) => (
              <tr key={r.id || r.timestamp || i} className="group hover:bg-[#0D1527]/80 transition-all italic border-l-4 border-[#1E293B] hover:border-blue-600">
                <td className="p-6 text-white font-bold opacity-60 group-hover:opacity-100">{formatDateTimeChile(r.timestamp)}</td>
                <td className="p-6">
                   <div className="flex flex-col">
                      <span className="font-black text-white uppercase tracking-tighter">{r.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-tight">{r.email}</span>
                   </div>
                </td>
                <td className="p-6 text-center">
                   <span className="px-3 py-1 bg-[#111A2E] text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#1E293B]">AUTH_TOKEN_VALID</span>
                </td>
                <td className="p-6">
                   <span className="font-black text-[#38BDF8] uppercase tracking-widest text-[10px] bg-[#152035] px-3 py-1 rounded-2xl border border-blue-100">{r.module}</span>
                </td>
                <td className="p-6 text-slate-300 font-medium group-hover:text-white transition-colors italic">
                   {r.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
