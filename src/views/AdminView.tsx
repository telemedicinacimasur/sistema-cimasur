import React, { useState, useEffect } from 'react';
import { localDB, localAuth } from '../lib/auth';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { 
  exportTableToPDF, 
  exportRecordToPDF, 
  viewExpedienteInNewTab, 
  exportExpedienteToPDF 
} from '../lib/pdfUtils';
import { RecordActions } from '../components/RecordActions';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Download, 
  Search,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Briefcase,
  Trash2,
  Edit,
  Users,
  Shield,
  Key
} from 'lucide-react';

type AdminTab = 'menu' | 'quotes' | 'sales' | 'dte' | 'users' | 'logs';

export default function AdminView() {
  const [view, setView] = useState<AdminTab>('menu');
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      let col = 'quotes';
      if (view === 'sales') col = 'sales';
      if (view === 'dte') col = 'dte_records';
      if (view === 'logs') col = 'audit_logs'; 
      const data = await localDB.getCollection(col);
      setRecords(data);
    };
    if (view !== 'menu') {
      loadData();
      window.addEventListener('db-change', loadData);
    }
    return () => window.removeEventListener('db-change', loadData);
  }, [view]);

  if (view === 'menu') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-[#001736]">Módulo de Administración</h2>
          <p className="text-slate-500 text-sm">Gestión del ciclo financiero, presupuestario y documental interno.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModuleCard 
            title="Seguimiento de Cotizaciones"
            desc="Control de presupuestos, vendedores y estados de aprobación."
            icon={TrendingUp}
            onClick={() => setView('quotes')}
          />
          <ModuleCard 
            title="Detalle de Ventas"
            desc="Registro diario de facturas y boletas emitidas por cliente."
            icon={ShoppingCart}
            onClick={() => setView('sales')}
          />
          <ModuleCard 
            title="Detalle de DTE"
            desc="Control administrativo de documentos tributarios electrónicos."
            icon={Receipt}
            onClick={() => setView('dte')}
          />
          <ModuleCard 
            title="Gestión de Usuarios"
            desc="Control de accesos, restablecimiento de contraseñas y roles."
            icon={Users}
            onClick={() => setView('users')}
          />
          <ModuleCard 
            title="Registro de Auditoría"
            desc="Historial de acciones registradas en el sistema (Solo Admin)."
            icon={FileText}
            onClick={() => setView('logs')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => setView('menu')}
        className="flex items-center gap-2 text-[#001736] font-bold hover:text-blue-600 transition-colors mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm uppercase tracking-widest">Volver al Menú de Administración</span>
      </button>

      {view === 'quotes' && <QuoteManager records={records} setRecords={setRecords} />}
      {view === 'sales' && <SalesManager records={records} setRecords={setRecords} />}
      {view === 'dte' && <DTEManager records={records} setRecords={setRecords} />}
      {view === 'users' && <UsersManager />}
      {view === 'logs' && <AuditLogManager records={records} />}
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    pass: ''
  });

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
    
    await localAuth.updateUser(editingUser.email, { 
      role: editingUser.role,
      displayName: editingUser.displayName,
      ...(newPass ? { pass: newPass } : {})
    });
    
    alert('Usuario actualizado correctamente');
    setEditingUser(null);
    setNewPass('');
    refreshUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.pass) return;
    
    await localAuth.createUser({
      ...newUser,
      uid: `user-${Date.now()}`,
      photoURL: ''
    });
    
    alert('Usuario creado correctamente');
    setNewUser({ email: '', displayName: '', role: 'viewer', pass: '' });
    setShowCreate(false);
    refreshUsers();
  };

  const handleDelete = async (email: string) => {
    if (email === 'admin@cimasur.cl') {
      alert('No puedes eliminar al administrador principal');
      return;
    }
    if (true) {
      await localAuth.deleteUser(email);
      refreshUsers();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#001736] p-4 text-white font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" /> PANEL DE CONTROL DE ACCESOS (CPANEL)
          </div>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-500 hover:bg-blue-400 text-xs px-3 py-1 rounded transition-colors"
          >
            {showCreate ? 'CANCELAR' : '+ NUEVO USUARIO'}
          </button>
        </div>
        
        {showCreate && (
          <form className="p-6 bg-blue-50 border-b border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleCreate}>
            <div className="md:col-span-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-widest">Registrar Nuevo Acceso</h4>
            </div>
            <FormField label="Correo Electrónico">
              <input 
                type="email"
                required
                className="w-full border-b border-blue-200 bg-transparent p-2 text-sm" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
              />
            </FormField>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border-b border-blue-200 bg-transparent p-2 text-sm" 
                value={newUser.displayName} 
                onChange={e => setNewUser({...newUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Rol de Sistema">
              <select 
                className="w-full border-b border-blue-200 bg-transparent p-2 text-sm" 
                value={newUser.role} 
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="admin">Administrador</option>
                <option value="lab">Laboratorio</option>
                <option value="crm">CRM</option>
                <option value="school">Escuela</option>
                <option value="viewer">Solo Lectura</option>
              </select>
            </FormField>
            <FormField label="Contraseña Inicial">
              <input 
                type="text"
                required
                className="w-full border-b border-blue-200 bg-transparent p-2 text-sm font-mono" 
                value={newUser.pass} 
                onChange={e => setNewUser({...newUser, pass: e.target.value})} 
              />
            </FormField>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded font-bold hover:bg-blue-700 uppercase text-xs tracking-widest">CREAR ACCESO</button>
            </div>
          </form>
        )}

        {editingUser && (
          <form className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleUpdate}>
            <div className="md:col-span-4">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Editando Usuario: {editingUser.email}</h4>
            </div>
            <FormField label="Nombre Completo">
              <input 
                className="w-full border-b p-2 text-sm" 
                value={editingUser.displayName} 
                onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} 
              />
            </FormField>
            <FormField label="Rol de Sistema">
              <select 
                className="w-full border-b p-2 text-sm" 
                value={editingUser.role} 
                onChange={e => setEditingUser({...editingUser, role: e.target.value})}
              >
                <option value="admin">Administrador</option>
                <option value="lab">Laboratorio</option>
                <option value="crm">CRM</option>
                <option value="school">Escuela</option>
                <option value="viewer">Solo Lectura</option>
              </select>
            </FormField>
            <FormField label="Modificar Contraseña">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Vacío para mantener"
                  className="w-full border-b p-2 text-sm font-mono" 
                  value={newPass} 
                  onChange={e => setNewPass(e.target.value)} 
                />
                <Key className="absolute right-2 top-2 w-4 h-4 text-slate-300" />
              </div>
            </FormField>
            <div className="flex items-end gap-2 text-xs">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 uppercase tracking-tighter">GUARDAR</button>
              <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-bold uppercase tracking-tighter">CERRAR</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Usuario / Email</th>
                <th className="p-4">Nombre</th>
                <th className="p-4 text-center">Rol</th>
                <th className="p-4 text-center">Clave Actual</th>
                <th className="p-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-blue-900 italic">{u.email}</td>
                  <td className="p-4 font-medium">{u.displayName}</td>
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-slate-400">
                    {u.pass}
                  </td>
                  <td className="p-4 text-center">
                    <RecordActions 
                      onEdit={() => {
                        setEditingUser(u);
                        setNewPass('');
                        setShowCreate(false);
                      }}
                      onDelete={() => handleDelete(u.email)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-start">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed italic">
            <p className="font-bold mb-1 uppercase tracking-widest text-[10px]">Seguridad Jerárquica:</p>
            Solo el perfil <strong>Administrador</strong> puede ver esta sección. Desde aquí puedes crear accesos específicos 
            para cada departamento (Lab, CRM, Escuela) y asignarles contraseñas únicas.
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start">
          <Key className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed italic">
            <p className="font-bold mb-1 uppercase tracking-widest text-[10px]">Restablecimiento Global:</p>
            Si un usuario olvida su clave, búscalo en la tabla y usa el botón "EDITAR" para asignar una nueva 
            contraseña manualmente. El cambio es instantáneo.
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogManager({ records }: { records: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#001736] p-4 text-white font-bold flex items-center gap-2">
        <FileText className="w-5 h-5" /> Registro de Auditoría Global
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-left border-b font-black text-slate-500 uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Usuario</th>
              <th className="p-4">Email</th>
              <th className="p-4">Módulo</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(r => (
              <tr key={r.id || r.timestamp} className="hover:bg-slate-50 transition-colors italic">
                <td className="p-4">{formatDate(r.timestamp)}</td>
                <td className="p-4 font-bold">{r.displayName}</td>
                <td className="p-4 text-slate-500">{r.email}</td>
                <td className="p-4 font-black text-[#001736]">{r.module}</td>
                <td className="p-4">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleCard({ title, desc, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all text-left group"
    >
      <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
        <Icon className="w-7 h-7 text-[#001736] group-hover:text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-[#001736] mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </button>
  );
}

function FormField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{label}</label>
      {children}
    </div>
  );
}

function QuoteManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    nroCotiz: '',
    fechaElab: new Date().toISOString().split('T')[0],
    cliente: '',
    vendedor: 'CIMASUR',
    estado: 'Pendiente',
    fechaAprob: '',
    invUnits: 0,
    todoUnits: 0,
    observaciones: ''
  });

  const sellers = ['CIMASUR', 'Gestión', 'Telemedicina', 'Tienda', 'Mercado Libre', 'Genérico', 'Consignación'];
  const statuses = ['Pendiente', 'Aprobada', 'Anulada'];

  const undTotal = (Number(form.estado) === Number('Aprobada') || form.estado === 'Aprobada') ? (Number(form.invUnits || 0) + Number(form.todoUnits || 0)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('quotes', editingId, { ...form, undTotal });
      setEditingId(null);
      alert('Cotización actualizada exitosamente');
    } else {
      await localDB.saveToCollection('quotes', { ...form, undTotal });
      alert('Cotización guardada exitosamente');
    }
    setForm({
      anio: new Date().getFullYear().toString(),
      mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
      nroCotiz: '',
      fechaElab: new Date().toISOString().split('T')[0],
      cliente: '',
      vendedor: 'CIMASUR',
      estado: 'Pendiente',
      fechaAprob: '',
      invUnits: 0,
      todoUnits: 0,
      observaciones: ''
    });
    const updated = await localDB.getCollection('quotes');
    setRecords(updated);
  };

  const handleDelete = async (id: string) => {
    if (true) {
      try {
        await localDB.deleteFromCollection('quotes', id);
        // El db-change disparará la recarga en el useEffect padre, pero forzamos aquí para feedback inmediato
        const updated = await localDB.getCollection('quotes');
        setRecords(updated);
        alert('Cotización eliminada correctamente');
      } catch (err) {
        console.error(err);
        alert('Error al intentar eliminar la cotización');
      }
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const record = records.find(r => r.id === id);
      if (!record) return;
      const newTotal = newStatus === 'Aprobada' ? (Number(record.invUnits || 0) + Number(record.todoUnits || 0)) : 0;
      await localDB.updateInCollection('quotes', id, { ...record, estado: newStatus, undTotal: newTotal });
      const updated = await localDB.getCollection('quotes');
      setRecords(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Seguimiento de Cotizaciones
        </div>
        <form className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
          <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
          <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
          <FormField label="N° Cotiz"><input className="w-full border-b p-2 text-sm font-bold" value={form.nroCotiz || ''} onChange={e => setForm({...form, nroCotiz: e.target.value})} required /></FormField>
          <FormField label="Fecha Elab"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaElab || ''} onChange={e => setForm({...form, fechaElab: e.target.value})} /></FormField>
          
          <FormField label="Cliente"><input className="w-full border-b p-2 text-sm" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} required /></FormField>
          <FormField label="Vendedor">
            <select className="w-full border-b p-2 text-sm" value={form.vendedor || 'CIMASUR'} onChange={e => setForm({...form, vendedor: e.target.value})}>
              {sellers.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Estado">
            <select className="w-full border-b p-2 text-sm font-bold" value={form.estado || 'Pendiente'} onChange={e => setForm({...form, estado: e.target.value})}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Fecha Aprob"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaAprob || ''} onChange={e => setForm({...form, fechaAprob: e.target.value})} /></FormField>
          <FormField label="Observaciones"><input className="w-full border-b p-2 text-sm" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
          <FormField label="Und Inventario"><input type="number" className="w-full border-b p-2 text-sm" value={form.invUnits ?? 0} onChange={e => setForm({...form, invUnits: parseInt(e.target.value) || 0})} /></FormField>
          <FormField label="Und a hacer"><input type="number" className="w-full border-b p-2 text-sm" value={form.todoUnits ?? 0} onChange={e => setForm({...form, todoUnits: parseInt(e.target.value) || 0})} /></FormField>
          <FormField label="UND Total">
            <div className="w-full p-2 text-sm font-black text-blue-700 bg-blue-50 rounded border-b border-blue-200">
              {undTotal}
            </div>
          </FormField>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold shadow-lg hover:opacity-90 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> GUARDAR COTIZACIÓN
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Histórico de Cotizaciones</h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const data = records.map(r => [
                  `${r.anio || ''}/${r.mes || ''}`,
                  r.nroCotiz || '',
                  r.cliente || '',
                  r.vendedor || '',
                  r.estado || '',
                  r.undTotal || 0,
                  r.observaciones || ''
                ]);
                exportTableToPDF('Reporte: Cotizaciones', ['Año/Mes', 'N° Cotiz', 'Cliente', 'Vend', 'Estado', 'UND', 'Obs'], data, 'reporte_cotizaciones', 'l');
              }}
              className="text-blue-600 hover:text-blue-800" 
              title="PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input placeholder="Buscar por cliente o N°..." className="pl-8 pr-4 py-1 text-xs border rounded-full w-64 outline-none focus:border-blue-400" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4 text-center">Año/Mes</th>
                <th className="p-4">N° Cotiz</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4 text-center">Estado (Editable)</th>
                <th className="p-4 text-center">UND Total</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors italic">
                  <td className="p-4 text-center text-slate-400">{r.anio || ''} / {r.mes || ''}</td>
                  <td className="p-4 font-bold text-[#001736]">{r.nroCotiz || ''}</td>
                  <td className="p-4 font-medium">{r.cliente || ''}</td>
                  <td className="p-4">{r.vendedor || ''}</td>
                  <td className="p-4 text-center">
                    <select 
                      className={cn(
                        "px-2 py-0.5 rounded-full uppercase text-[9px] font-black border-none outline-none cursor-pointer",
                        r.estado === 'Aprobada' ? "bg-green-50 text-green-700" : 
                        r.estado === 'Anulada' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      )}
                      value={r.estado || 'Pendiente'}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-center font-black text-blue-700">{r.undTotal || 0}</td>
                 <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                    <RecordActions
                      onView={() => {
                        const data = [
                          { label: 'N° Cotiz', value: r.nroCotiz || '' },
                          { label: 'Fecha Elab', value: formatDate(r.fechaElab) },
                          { label: 'Cliente', value: r.cliente || '' },
                          { label: 'Vendedor', value: r.vendedor || '' },
                          { label: 'Estado', value: r.estado || '' },
                          { label: 'UND Total', value: (r.undTotal || 0).toString() },
                          { label: 'Observaciones', value: r.observaciones || '' }
                        ];
                        viewExpedienteInNewTab('Ficha: Cotización', data, `cotizacion_${r.nroCotiz}`);
                      }}
                      onDownload={() => {
                        const data = [
                          { label: 'N° Cotiz', value: r.nroCotiz || '' },
                          { label: 'Fecha Elab', value: formatDate(r.fechaElab) },
                          { label: 'Cliente', value: r.cliente || '' },
                          { label: 'Vendedor', value: r.vendedor || '' },
                          { label: 'Estado', value: r.estado || '' },
                          { label: 'UND Total', value: (r.undTotal || 0).toString() },
                          { label: 'Observaciones', value: r.observaciones || '' }
                        ];
                        exportExpedienteToPDF('Ficha: Cotización', data, `cotizacion_${r.nroCotiz}`);
                      }}
                      onEdit={() => {
                        setEditingId(r.id);
                        setForm({
                          anio: r.anio || '',
                          mes: r.mes || '',
                          nroCotiz: r.nroCotiz || '',
                          fechaElab: r.fechaElab || '',
                          cliente: r.cliente || '',
                          vendedor: r.vendedor || 'CIMASUR',
                          estado: r.estado || 'Pendiente',
                          fechaAprob: r.fechaAprob || '',
                          invUnits: r.invUnits || 0,
                          todoUnits: r.todoUnits || 0,
                          observaciones: r.observaciones || ''
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onDelete={() => handleDelete(r.id)}
                    />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50/50 font-black">
              <tr>
                <td colSpan={5} className="p-4 text-right uppercase text-slate-500 text-[9px] tracking-widest">Suma Total Unidades Vendidas:</td>
                <td className="p-4 text-center text-blue-700 text-sm">
                  {records.reduce((sum, r) => sum + (Number(r.undTotal) || 0), 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    fecha: new Date().toISOString().split('T')[0],
    documento: '',
    cliente: '',
    nroFrascos: 0
  });

  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const filteredRecords = records.filter(r => 
    (dateFilter ? r.fecha === dateFilter : true) &&
    (customerFilter ? r.cliente?.toLowerCase().includes(customerFilter.toLowerCase()) : true)
  );

  const totalFrascos = filteredRecords.reduce((sum, r) => sum + (Number(r.nroFrascos) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('sales', editingId, form);
      setEditingId(null);
      alert('Venta actualizada');
    } else {
      await localDB.saveToCollection('sales', form);
      alert('Venta registrada');
    }
    setForm({
      anio: new Date().getFullYear().toString(),
      mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
      fecha: new Date().toISOString().split('T')[0],
      documento: '',
      cliente: '',
      nroFrascos: 0
    });
    const updated = await localDB.getCollection('sales');
    setRecords(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
          <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Registro de Ventas</span>
          <button 
            onClick={() => {
              const data = records.map(r => [formatDate(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0]);
              exportTableToPDF('Reporte: Ventas', ['Fecha', 'Documento', 'Cliente', 'Frascos'], data, 'reporte_ventas');
            }}
            className="text-white/70 hover:text-white"
            title="PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
            <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
          </div>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="Fact / Boleta"><input className="w-full border-b p-2 text-sm" value={form.documento || ''} onChange={e => setForm({...form, documento: e.target.value})} required /></FormField>
          <FormField label="Cliente"><input className="w-full border-b p-2 text-sm" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} required /></FormField>
          <FormField label="N° Frascos"><input type="number" className="w-full border-b p-2 text-sm" value={form.nroFrascos ?? 0} onChange={e => setForm({...form, nroFrascos: parseInt(e.target.value) || 0})} /></FormField>
          <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold mt-2 hover:bg-opacity-90">GUARDAR VENTA</button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Detalle de Ventas Registradas</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Filtro:</span>
              <input 
                type="date" 
                className="text-xs border rounded p-1" 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
              <input 
                placeholder="Cliente..."
                className="text-xs border rounded p-1 w-24" 
                onChange={e => setCustomerFilter(e.target.value)}
              />
            <button 
              onClick={() => {
                const data = filteredRecords.map(r => [formatDate(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0]);
                exportTableToPDF('Reporte: Ventas', ['Fecha', 'Documento', 'Cliente', 'Frascos'], data, 'reporte_ventas');
              }}
              className="text-white bg-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700" 
            >
              PDF (Filtrado)
            </button>
            <button 
              onClick={() => {
                const data = records.map(r => [formatDate(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0]);
                exportTableToPDF('Reporte: Ventas', ['Fecha', 'Documento', 'Cliente', 'Frascos'], data, 'reporte_ventas_todo');
              }}
              className="text-slate-600 bg-slate-200 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-slate-300" 
            >
               PDF (Todo)
            </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Documento</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-center">N° Fcos</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td className="p-4">{formatDate(r.fecha)}</td>
                    <td className="p-4 font-bold text-[#001736]">{r.documento}</td>
                    <td className="p-4">{r.cliente}</td>
                    <td className="p-4 text-center font-black">{r.nroFrascos}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RecordActions
                          onEdit={() => {
                            setEditingId(r.id);
                            setForm(r);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onDelete={async () => {
                            if (true) {
                              try {
                                await localDB.deleteFromCollection('sales', r.id);
                                const updated = await localDB.getCollection('sales');
                                setRecords(updated);
                                alert('Venta eliminada correctamente');
                              } catch (err) {
                                alert('Error al eliminar la venta');
                              }
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50/50 font-black">
                <tr>
                  <td colSpan={4} className="p-4 text-right uppercase text-slate-500 text-[9px] tracking-widest">Total Frascos en Selección:</td>
                  <td className="p-4 text-center text-blue-700 text-sm">{totalFrascos}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DTEManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    nroDto: '',
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    rut: '',
    direccion: '',
    ciudad: '',
    email: '',
    montoNeto: 0
  });

  const iva = (Number(form.montoNeto) || 0) * 0.19;
  const total = (Number(form.montoNeto) || 0) + iva;

  const filteredRecords = dateFilter
    ? records.filter(r => r.fecha === dateFilter)
    : records;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('dte_records', editingId, { ...form, iva, total });
      setEditingId(null);
      alert('DTE Actualizado');
    } else {
      await localDB.saveToCollection('dte_records', { ...form, iva, total });
      alert('DTE Registrado Admin');
    }
    setForm({...form, nroDto: '', nombre: '', rut: '', montoNeto: 0});
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      anio: r.anio || '',
      mes: r.mes || '',
      nroDto: r.nroDto || '',
      fecha: r.fecha || '',
      nombre: r.nombre || '',
      rut: r.rut || '',
      direccion: r.direccion || '',
      ciudad: r.ciudad || '',
      email: r.email || '',
      montoNeto: r.montoNeto || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0b2447] p-4 text-white font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-5 h-5" /> {editingId ? 'Editando Registro DTE' : 'Registro Administrativo de DTE'}
          </span>
          <div className="flex items-center gap-2">
            <button className="text-white/70 hover:text-white p-1" title="Descargar PDF">
              <Download className="w-4 h-4" />
            </button>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Uso Interno - No SII</span>
          </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
          <div className="md:col-span-1 space-y-4">
             <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
             <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
             <FormField label="N° Documento"><input className="w-full border-b p-2 text-sm font-bold" value={form.nroDto || ''} onChange={e => setForm({...form, nroDto: e.target.value})} required /></FormField>
             <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-2 space-y-4">
             <FormField label="Nombre / Razón Social"><input className="w-full border-b p-2 text-sm font-bold" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} required /></FormField>
             <div className="grid grid-cols-2 gap-4">
                <FormField label="RUT"><input className="w-full border-b p-2 text-sm" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} onBlur={(e) => {
                  const rut = e.target.value;
                  const found = records.find(r => r.rut === rut);
                  if (found) {
                    setForm(prev => ({
                      ...prev,
                      nombre: found.nombre || prev.nombre,
                      email: found.email || prev.email,
                      direccion: found.direccion || prev.direccion,
                      ciudad: found.ciudad || prev.ciudad,
                    }));
                  }
                }} required /></FormField>
                <FormField label="Email"><input type="email" className="w-full border-b p-2 text-sm" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></FormField>
             </div>
             <FormField label="Dirección"><input className="w-full border-b p-2 text-sm" value={form.direccion || ''} onChange={e => setForm({...form, direccion: e.target.value})} /></FormField>
             <FormField label="Ciudad"><input className="w-full border-b p-2 text-sm" value={form.ciudad || ''} onChange={e => setForm({...form, ciudad: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-1 space-y-6">
             <FormField label="Monto Neto ($)">
               <input type="number" className="w-full border-b border-blue-200 p-4 text-xl font-black bg-blue-50/50 rounded-t outline-none focus:bg-blue-50" value={form.montoNeto ?? 0} onChange={e => setForm({...form, montoNeto: parseInt(e.target.value) || 0})} />
             </FormField>
             <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                   <span>IVA (19%)</span>
                   <span>{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-[#001736]">
                   <span>TOTAL B/F</span>
                   <span>{formatCurrency(total)}</span>
                </div>
             </div>
             <button type="submit" className={cn(
               "w-full py-4 rounded-xl font-black shadow-xl hover:translate-y-[-2px] transition-all",
               editingId ? "bg-amber-600 text-white" : "bg-[#001736] text-white"
             )}>
               {editingId ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR DTE'}
             </button>
             {editingId && (
               <button type="button" onClick={() => setEditingId(null)} className="w-full text-slate-400 text-[10px] font-bold uppercase mt-2">Cancelar Edición</button>
             )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center font-black text-[10px] text-slate-400 uppercase tracking-widest">
          <span>Consulta de Registros DTE</span>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="text-[10px] border rounded p-1" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
            <button className="text-[#001736] flex items-center gap-1"><Search className="w-3 h-3" /> BUSCAR DETALLE</button>
            <button 
               onClick={() => {
                 const data = filteredRecords.map(r => [r.nroDto, r.nombre, r.rut, formatCurrency(r.montoNeto), formatCurrency(r.total)]);
                 exportTableToPDF('Reporte: DTE', ['N° Dcto', 'Nombre', 'RUT', 'Neto', 'Total'], data, 'reporte_dte', 'l');
               }}
               className="text-blue-600 flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> PDF (Filtrado)
            </button>
            <button 
               onClick={() => {
                 const data = records.map(r => [r.nroDto, r.nombre, r.rut, formatCurrency(r.montoNeto), formatCurrency(r.total)]);
                 exportTableToPDF('Reporte: DTE', ['N° Dcto', 'Nombre', 'RUT', 'Neto', 'Total'], data, 'reporte_dte_todo', 'l');
               }}
               className="text-slate-600 flex items-center gap-1 ml-2"
            >
              <Download className="w-3 h-3" /> PDF (Todo)
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">N° Dcto</th>
                <th className="p-4">Razón Social</th>
                <th className="p-4">RUT</th>
                <th className="p-4 text-right">Neto</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-[#001736]">{r.nroDto}</td>
                  <td className="p-4">{r.nombre}</td>
                  <td className="p-4 font-mono text-slate-400">{r.rut}</td>
                  <td className="p-4 text-right">{formatCurrency(r.montoNeto)}</td>
                  <td className="p-4 text-right font-black text-blue-900">{formatCurrency(r.total)}</td>
                    <td className="p-4 text-center">
                      <RecordActions
                        onView={() => {
                          const dteData = [
                            { label: 'N° Documento', value: r.nroDto },
                            { label: 'Fecha', value: formatDate(r.fecha) },
                            { label: 'Cliente', value: r.nombre },
                            { label: 'RUT', value: r.rut },
                            { label: 'Total', value: formatCurrency(r.total) }
                          ];
                          viewExpedienteInNewTab('Ficha: DTE', dteData, `dte_${r.nroDto}`);
                        }}
                        onEdit={() => handleEdit(r)}
                        onDelete={async () => {
                          if (true) {
                            try {
                              await localDB.deleteFromCollection('dte_records', r.id);
                              const updated = await localDB.getCollection('dte_records');
                              setRecords(updated);
                              alert('DTE eliminado exitosamente');
                            } catch (err) {
                              alert('No se pudo eliminar el DTE');
                            }
                          }
                        }}
                      />
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

