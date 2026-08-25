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
  FileText,
  BookOpen
} from 'lucide-react';
import { localAuth, localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDateTimeChile } from '../lib/utils';
import { RecordActions } from '../components/RecordActions';
import ManualOperativo from '../components/ManualOperativo';

export default function CPanelView() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadAuditLogs = async () => {
      const data = await localDB.getCollection('audit_logs');
      setRecords(data);
    };
    loadAuditLogs();
    const handleDbChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.collection || detail.collection === 'audit_logs') {
        loadAuditLogs();
      }
    };
    window.addEventListener('db-change', handleDbChange);
    return () => window.removeEventListener('db-change', handleDbChange);
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
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'manual'>('users');

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500 min-h-screen p-6 space-y-6">
       <div className="bg-slate-900 text-white p-8 relative overflow-hidden rounded-3xl shadow-xl">
          <div className="absolute top-0 right-0 p-16 opacity-10">
             <Settings className="w-56 h-56 rotate-12" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
             <div className="p-3 bg-slate-800 rounded-2xl shadow-lg border border-slate-700">
                <ShieldCheck className="w-8 h-8 text-sky-400" />
             </div>
             <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">CPANEL CONTROL</h3>
                <p className="text-sky-300 text-[9px] font-black uppercase tracking-[0.3em] opacity-90 mt-2">Configuración Central de Privilegios, Gobernanza y Manuales</p>
             </div>
          </div>
       </div>

       <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-3 gap-2 rounded-2xl">
          {[
            { id: 'users', label: 'Gestión de Accesos', icon: Users, color: 'text-sky-400' },
            { id: 'logs', label: 'Traza de Auditoría', icon: ShieldCheck, color: 'text-emerald-400' },
            { id: 'manual', label: 'Manual de Usuario y Soporte', icon: BookOpen, color: 'text-amber-400' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-2xl cursor-pointer shadow-sm",
                activeTab === tab.id ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          ))}
       </div>

       <div className="bg-white">
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'logs' && <AuditLogManager records={records} />}
          {activeTab === 'manual' && <ManualOperativo />}
       </div>
    </div>
  );
}

const SUB_MODULES: Record<string, { id: string; label: string }[]> = {
  crm: [
    { id: 'clientes', label: '👥 Clientes' },
    { id: 'campanas', label: '📧 Campañas' },
    { id: 'club', label: '👑 Club Comercial' },
    { id: 'campanas-internas', label: '📈 Registro de Campañas Internas' }
  ],
  gestion: [
    { id: 'register', label: 'Ingreso de Cliente' },
    { id: 'list', label: 'Gestión de Clientes' }
  ],
  school: [
    { id: 'register', label: 'Motor Comercial Lead' },
    { id: 'students', label: 'Administración Alumnos' },
    { id: 'tracking', label: 'Tracking 360' },
    { id: 'activities', label: 'Registro Actividades' },
    { id: 'commercial', label: 'Motor Escuela' }
  ],
  lab: [
    { id: 'tracking', label: '1. Seguimiento de Pedidos' },
    { id: 'stock', label: '2. Stock de Insumo Diario' },
    { id: 'elaboracion', label: '3. Elaboración Gotas y Diluciones' },
    { id: 'magistrales', label: '4. Formulación Magistral' },
    { id: 'gotas-puras', label: '5. Evaluación Gotas Puras' },
    { id: 'nosodes', label: '6. Ingreso Nosodes' },
    { id: 'tinturas', label: '7. Ficha Tinturas Madres' },
    { id: 'preparacion', label: '8. Preparación Gotas Puras' },
    { id: 'insumos', label: '9. Registro de Insumos laboratorio T.M. y otros' },
    { id: 'vademecum', label: '10. Vademécum' },
    { id: 'mantenimiento', label: '11. Mantención' },
    { id: 'conejero', label: '12. Fichas Especializadas / Dr. Conejero' }
  ],
  manager: [
    { id: 'menu', label: 'Dashboard Principal' },
    { id: 'quotes', label: 'Cotizaciones Generales' },
    { id: 'sales', label: 'Centro de Ventas CRM' },
    { id: 'sales_gestion', label: 'Centro Ventas Gestión' },
    { id: 'sales_tienda_ml', label: 'Ventas Tienda y Mercado Libre' },
    { id: 'dte', label: 'DTE y Documentos' },
    { id: 'pet_payments', label: 'Pagos Veterinarios' },
    { id: 'school_payments', label: 'Pagos Escuela' },
    { id: 'codigos_y_diluciones', label: 'Códigos y Diluciones' },
    { id: 'resumen_ventas', label: 'Resumen de Ventas' },
    { id: 'presupuesto_flujo', label: 'Presupuesto y Flujo' },
    { id: 'inventory', label: 'Inventario Master' },
    { id: 'consignacion', label: 'Ventas en Consignación' }
  ]
};

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
    allowedSubmodules: {} as Record<string, string[]>,
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
          allowedSubmodules: editingUser.allowedSubmodules || {},
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
    setNewUser({ email: '', displayName: '', role: 'viewer', roles: ['viewer'], permissions: {}, allowedSubmodules: {}, pass: '' });
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
      <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-2xl overflow-hidden text-white">
        <div className="bg-slate-900 text-white p-6 font-bold flex items-center justify-between border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-sky-400" /> PANEL DE CONTROL DE ACCESOS (CPANEL)
          </div>
          <button 
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 uppercase cursor-pointer"
          >
            {showCreate ? 'CANCELAR' : '+ NUEVO USUARIO'}
          </button>
        </div>
        
        {showCreate && (
          <form className="p-6 bg-[#111A2E] border-b border-[#1E293B] grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300 text-white" onSubmit={handleCreate}>
            <div className="md:col-span-4">
              <h4 className="text-xs font-black text-white mb-2 uppercase tracking-[0.2em]">Registrar Nuevo Acceso</h4>
            </div>
            <FormField label="Correo Electrónico">
              <input 
                type="email"
                required
                className="w-full border border-[#1E293B] bg-[#152035] rounded-xl p-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
              />
            </FormField>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border border-[#1E293B] bg-[#152035] rounded-xl p-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                value={newUser.displayName} 
                onChange={e => setNewUser({...newUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Contraseña Inicial">
              <input 
                type="text"
                required
                className="w-full border border-[#1E293B] bg-[#152035] rounded-xl p-2 text-sm font-mono text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                value={newUser.pass} 
                onChange={e => setNewUser({...newUser, pass: e.target.value})} 
              />
            </FormField>
            <div className="md:col-span-4 mt-2">
               <label className="text-xs font-black uppercase text-slate-300 tracking-widest block mb-2">Accesos / Roles</label>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableRoles.map(r => (
                    <div key={r.id} className="bg-[#152035] p-3 rounded-xl border border-[#1E293B] shadow-sm">
                      <label className="flex items-center gap-2 cursor-pointer group mb-2">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-[#1E293B] bg-[#111A2E] text-sky-600 focus:ring-sky-500"
                          checked={newUser.roles.includes(r.id)}
                          onChange={() => setNewUser({...newUser, roles: toggleRole(newUser.roles, r.id)})}
                        />
                        <span className="text-xs font-black text-white group-hover:text-sky-400 transition-colors uppercase tracking-tight">{r.label}</span>
                      </label>
                      {newUser.roles.includes(r.id) && r.id !== 'admin' && (
                        <div className="flex flex-col gap-2 pl-6 pt-2 border-t border-[#1E293B] mt-2">
                           <div className="flex flex-wrap items-center gap-4">
                             <label className="flex items-center gap-1.5 cursor-pointer" title="Solo puede ver y descargar. No puede ingresar ni borrar.">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-sky-500"
                                 checked={newUser.permissions?.[r.id]?.readonly ?? false}
                                 onChange={(e) => {
                                   const perms = { ...newUser.permissions };
                                   const isReadonly = e.target.checked;
                                   perms[r.id] = { 
                                      ...(perms[r.id] || { edit: true, delete: true }), 
                                      readonly: isReadonly,
                                      ...(isReadonly ? { edit: false, delete: false } : { edit: true, delete: true })
                                   };
                                   setNewUser({ ...newUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-black text-sky-400 uppercase">SOLO LECTOR</span>
                             </label>
                             <label className="flex items-center gap-1.5 cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-amber-500"
                                 checked={newUser.permissions?.[r.id]?.edit ?? true}
                                 disabled={newUser.permissions?.[r.id]?.readonly}
                                 onChange={(e) => {
                                   const perms = { ...newUser.permissions };
                                   perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), edit: e.target.checked };
                                   setNewUser({ ...newUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-bold text-slate-300 uppercase">EDITAR</span>
                             </label>
                             <label className="flex items-center gap-1.5 cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-red-500"
                                 checked={newUser.permissions?.[r.id]?.delete ?? true}
                                 disabled={newUser.permissions?.[r.id]?.readonly}
                                 onChange={(e) => {
                                   const perms = { ...newUser.permissions };
                                   perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), delete: e.target.checked };
                                   setNewUser({ ...newUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-bold text-slate-300 uppercase">BORRAR</span>
                             </label>
                           </div>

                          {SUB_MODULES[r.id] && (
                            <div className="mt-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest border-b border-[#1E293B] pb-1">Sub-módulos</span>
                              <div className="flex flex-col gap-1.5 mt-2">
                                {SUB_MODULES[r.id].map(sub => {
                                  const currentAllowed = newUser.allowedSubmodules?.[r.id];
                                  const isChecked = !currentAllowed || currentAllowed.includes(sub.id);
                                  return (
                                    <label key={sub.id} className="flex items-center gap-2 cursor-pointer mt-1">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-sky-600"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const allowed = { ...(newUser.allowedSubmodules || {}) };
                                          let currentList = allowed[r.id] || SUB_MODULES[r.id].map(s => s.id);
                                          
                                          if (e.target.checked) {
                                            if (!currentList.includes(sub.id)) currentList.push(sub.id);
                                          } else {
                                            currentList = currentList.filter(id => id !== sub.id);
                                          }
                                          
                                          allowed[r.id] = currentList;
                                          setNewUser({ ...newUser, allowedSubmodules: allowed });
                                        }}
                                      />
                                      <span className="text-[11px] font-bold text-slate-300 uppercase truncate leading-tight" title={sub.label}>{sub.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
            <div className="md:col-span-4 flex justify-end mt-4">
              <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md transition-all active:scale-95 cursor-pointer">CREAR ACCESO</button>
            </div>
          </form>
        )}

        {editingUser && (
          <form className="p-6 bg-[#111A2E] border-b border-[#1E293B] grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300 text-white" onSubmit={handleUpdate}>
            <div className="md:col-span-3 flex justify-between items-center mb-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Editando Acceso: <span className="text-sky-400">{editingUser.email}</span></h4>
              <button type="button" onClick={() => setEditingUser(null)} className="text-[10px] font-black text-slate-400 hover:text-red-400 uppercase cursor-pointer">Cerrar edición</button>
            </div>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border border-[#1E293B] bg-[#152035] rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                value={editingUser.displayName} 
                onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Modificar Contraseña">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Vacío para mantener"
                  className="w-full border border-[#1E293B] bg-[#152035] rounded-xl p-3 text-sm font-mono text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                  value={newPass} 
                  onChange={e => setNewPass(e.target.value)} 
                />
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </FormField>
            <div className="md:col-span-1">
               <div className="flex justify-between items-center mb-3">
                 <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest block">Atribuciones</label>
                 <button 
                   type="button" 
                   onClick={() => setEditingUser({...editingUser, roles: availableRoles.map(ar => ar.id)})}
                   className="text-[9px] font-black text-sky-400 hover:underline uppercase cursor-pointer"
                 >
                   Acceso Total
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableRoles.map(r => (
                    <div key={r.id} className="space-y-2 p-2 rounded-xl bg-[#152035] border border-[#1E293B] shadow-sm">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-sky-600 focus:ring-sky-500"
                          checked={(editingUser.roles || [editingUser.role]).includes(r.id)}
                          onChange={() => {
                            const current = editingUser.roles || [editingUser.role];
                            const newRoles = toggleRole(current, r.id);
                            setEditingUser({...editingUser, roles: newRoles});
                          }}
                        />
                        <span className="text-[12px] font-black text-white group-hover:text-sky-400 transition-colors uppercase tracking-widest">{r.label}</span>
                      </label>
                      {(editingUser.roles || [editingUser.role]).includes(r.id) && r.id !== 'admin' && (
                        <div className="flex flex-col gap-2 pl-6 pt-2 border-t border-[#1E293B] mt-2">
                           <div className="flex flex-wrap items-center gap-4">
                             <label className="flex items-center gap-1.5 cursor-pointer" title="Solo puede ver y descargar. No puede ingresar ni borrar.">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-sky-500"
                                 checked={editingUser.permissions?.[r.id]?.readonly ?? false}
                                 onChange={(e) => {
                                   const perms = { ...editingUser.permissions };
                                   const isReadonly = e.target.checked;
                                   perms[r.id] = { 
                                      ...(perms[r.id] || { edit: true, delete: true }), 
                                      readonly: isReadonly,
                                      ...(isReadonly ? { edit: false, delete: false } : { edit: true, delete: true })
                                   };
                                   setEditingUser({ ...editingUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-black text-sky-400 uppercase">SOLO LECTOR</span>
                             </label>
                             <label className="flex items-center gap-1.5 cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-amber-500"
                                 checked={editingUser.permissions?.[r.id]?.edit ?? true}
                                 disabled={editingUser.permissions?.[r.id]?.readonly}
                                 onChange={(e) => {
                                   const perms = { ...editingUser.permissions };
                                   perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), edit: e.target.checked };
                                   setEditingUser({ ...editingUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-bold text-slate-300 uppercase">EDITAR</span>
                             </label>
                             <label className="flex items-center gap-1.5 cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-red-500"
                                 checked={editingUser.permissions?.[r.id]?.delete ?? true}
                                 disabled={editingUser.permissions?.[r.id]?.readonly}
                                 onChange={(e) => {
                                   const perms = { ...editingUser.permissions };
                                   perms[r.id] = { ...(perms[r.id] || { edit: true, delete: true }), delete: e.target.checked };
                                   setEditingUser({ ...editingUser, permissions: perms });
                                 }}
                               />
                               <span className="text-[10px] font-bold text-slate-300 uppercase">BORRAR</span>
                             </label>
                           </div>
                          
                          {SUB_MODULES[r.id] && (
                            <div className="mt-2">
                              <span className="text-[11px] font-black text-slate-400 uppercase block mb-2 tracking-widest border-b border-[#1E293B] pb-1">Sub-módulos Permitidos</span>
                              {SUB_MODULES[r.id].map(sub => {
                                const currentAllowed = editingUser.allowedSubmodules?.[r.id];
                                const isChecked = !currentAllowed || currentAllowed.includes(sub.id);
                                return (
                                  <label key={sub.id} className="flex items-center gap-2 cursor-pointer mt-1.5">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 rounded border-[#1E293B] bg-[#111A2E] text-sky-600"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const allowed = { ...(editingUser.allowedSubmodules || {}) };
                                        let currentList = allowed[r.id] || SUB_MODULES[r.id].map(s => s.id);
                                        
                                        if (e.target.checked) {
                                          if (!currentList.includes(sub.id)) currentList.push(sub.id);
                                        } else {
                                          currentList = currentList.filter(id => id !== sub.id);
                                        }
                                        
                                        allowed[r.id] = currentList;
                                        setEditingUser({ ...editingUser, allowedSubmodules: allowed });
                                      }}
                                    />
                                    <span className="text-[11px] font-bold text-slate-300 uppercase truncate leading-tight" title={sub.label}>{sub.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
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
                className="px-10 bg-slate-900 text-white hover:bg-slate-800 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-[#1E293B]"
              >
                {savingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-sky-400" />}
                {savingId ? 'PROCESANDO...' : 'ACTUALIZAR SISTEMA'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto bg-[#152035]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#111A2E] text-left border-b border-[#1E293B] font-black text-slate-300 uppercase tracking-widest">
                <th className="p-5">Usuario / Identificación</th>
                <th className="p-5">Nombre Profesional</th>
                <th className="p-5 text-center">Privilegios Concedidos</th>
                <th className="p-5 text-center">Clave Activa</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {users.map(u => (
                <tr key={u.email} className="group hover:bg-[#111A2E] transition-colors border-l-4 border-[#1E293B] hover:border-sky-500">
                  <td className="p-5 font-black text-white italic">{u.email}</td>
                  <td className="p-5 font-bold text-slate-200 tracking-tight">{u.displayName}</td>
                  <td className="p-5 text-center">
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px] mx-auto">
                      {(u.roles || [u.role || 'viewer']).map((roleId: string) => {
                        const roleObj = availableRoles.find(ar => ar.id === roleId);
                        return (
                          <span key={roleId} className={cn(
                            "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm transition-transform hover:scale-105",
                            roleId === 'admin' ? "bg-red-950/80 text-red-300 border-red-800" : "bg-sky-950/80 text-sky-300 border-sky-800"
                          )}>
                            {roleObj?.label || roleId}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="font-mono text-slate-300 group-hover:text-amber-300 transition-colors text-[10px] font-bold bg-[#111A2E] group-hover:bg-amber-950/80 px-3 py-1 rounded-full border border-[#1E293B] group-hover:border-amber-800">{u.pass}</span>
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
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4 items-start shadow-sm group transition-all hover:bg-amber-100/50">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md group-hover:rotate-12 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-900 leading-relaxed italic">
            <p className="font-black mb-1 uppercase tracking-widest text-[10px] text-amber-700 italic">Seguridad Jerárquica Global</p>
            Solo el perfil <strong>Administrador</strong> puede ver esta sección de alto nivel. Desde aquí puedes crear accesos específicos 
            para cada departamento e inyectar permisos de edición o borrado granular según el módulo asignado.
          </div>
        </div>
        <div className="bg-sky-50 border border-sky-200 p-6 rounded-3xl flex gap-4 items-start shadow-sm group transition-all hover:bg-sky-100/50">
          <div className="p-3 bg-sky-600 text-white rounded-2xl shadow-md group-hover:rotate-12 transition-transform">
            <Key className="w-5 h-5" />
          </div>
          <div className="text-xs text-sky-900 leading-relaxed italic">
            <p className="font-black mb-1 uppercase tracking-widest text-[10px] text-sky-700 italic">Restablecimiento de Credenciales</p>
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
    <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in duration-700 text-white">
      <div className="bg-slate-900 text-white p-6 font-black flex items-center justify-between border-b border-[#1E293B]">
        <div className="flex items-center gap-3 italic tracking-tighter">
          <FileText className="w-6 h-6 text-sky-400" /> REGISTRO DE AUDITORÍA GLOBAL (INSIGHTS)
        </div>
        <div className="text-[9px] font-black text-sky-300 uppercase tracking-widest px-4 py-1.5 bg-slate-800 rounded-full border border-slate-700 animate-pulse">Monitor en Tiempo Real Activo</div>
      </div>
      <div className="overflow-x-auto bg-[#152035]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#111A2E] text-left border-b border-[#1E293B] font-black text-slate-300 uppercase tracking-[0.2em]">
              <th className="p-6">Timestamp (CHILE)</th>
              <th className="p-6">Entidad / Usuario</th>
              <th className="p-6 text-center">Referencia de Acceso</th>
              <th className="p-6">Módulo Afectado</th>
              <th className="p-6">Acción Ejecutada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100).map((r, i) => (
              <tr key={r.id || r.timestamp || i} className="group hover:bg-[#111A2E] transition-all italic border-l-4 border-[#1E293B] hover:border-sky-500">
                <td className="p-6 text-slate-200 font-bold">{formatDateTimeChile(r.timestamp)}</td>
                <td className="p-6">
                   <div className="flex flex-col">
                      <span className="font-black text-white uppercase tracking-tighter">{r.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-tight">{r.email}</span>
                   </div>
                </td>
                <td className="p-6 text-center">
                   <span className="px-3 py-1 bg-[#111A2E] text-slate-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#1E293B]">AUTH_TOKEN_VALID</span>
                </td>
                <td className="p-6">
                   <span className="font-black text-sky-400 uppercase tracking-widest text-[10px] bg-sky-950/80 px-3 py-1 rounded-2xl border border-sky-800">{r.module}</span>
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
