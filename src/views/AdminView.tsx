import React, { useState, useEffect, useRef } from 'react';
import { localDB, localAuth } from '../lib/auth';
import { cn, formatDate, formatDateTimeChile, formatCurrency, safe, parseExcelDate, formatDateForExcel } from '../lib/utils';
import { 
  exportTableToPDF, 
  exportRecordToPDF, 
  viewExpedienteInNewTab, 
  exportExpedienteToPDF 
} from '../lib/pdfUtils';
import { RecordActions } from '../components/RecordActions';

export const exportTableToExcel = (title: string, headers: string[], data: any[][], fileName: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  const safeTitle = title.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, safeTitle);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Download, 
  Search,
  ListChecks,
  ClipboardList,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Briefcase,
  Trash2,
  Edit,
  Users,
  Shield,
  Key,
  Upload,
  PlusCircle,
  FileUp,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

type AdminTab = 'menu' | 'quotes' | 'sales' | 'sales_gestion' | 'dte' | 'pet_payments' | 'users' | 'logs';

export default function AdminView() {
  const [view, setView] = useState<AdminTab>('menu');
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      let col = 'quotes';
      if (view === 'sales') col = 'sales';
      if (view === 'sales_gestion') col = 'sales_gestion';
      if (view === 'dte') col = 'dte_records';
      if (view === 'pet_payments') col = 'pet_payments';
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
            title="Detalle de Ventas GESTIÓN"
            desc="Registro diario de ventas con detalle de productos y cotización."
            icon={ShoppingCart}
            onClick={() => setView('sales_gestion')}
          />
          <ModuleCard 
            title="Detalle de DTE"
            desc="Control administrativo de documentos tributarios electrónicos."
            icon={Receipt}
            onClick={() => setView('dte')}
          />
          <ModuleCard 
            title="Control de Pagos Veterinarios"
            desc="Registro de pagos tutor, mail, fono y honorarios veterinarios."
            icon={DollarSign}
            onClick={() => setView('pet_payments')}
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
      {view === 'sales_gestion' && <SalesGestionManager records={records} setRecords={setRecords} />}
      {view === 'dte' && <DTEManager records={records} setRecords={setRecords} />}
      {view === 'pet_payments' && <PetPaymentsManager records={records} setRecords={setRecords} />}
      {view === 'users' && <UsersManager />}
      {view === 'logs' && <AuditLogManager records={records} />}
    </div>
  );
}

function UsersManager() {
  const { user } = useAuth();
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

  const availableRoles = [
    { id: 'admin', label: 'Administrador' },
    { id: 'lab', label: 'Laboratorio' },
    { id: 'crm', label: 'CRM' },
    { id: 'school', label: 'Escuela' },
    { id: 'gestion', label: 'Gestión' },
    { id: 'viewer_lab', label: 'Lector Laboratorio' },
    { id: 'viewer_crm', label: 'Lector CRM' },
    { id: 'viewer_school', label: 'Lector Escuela' },
    { id: 'viewer_gestion', label: 'Lector Gestión' }
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
        const validRoles = editingUser.roles && Array.isArray(editingUser.roles) && editingUser.roles.length > 0 
            ? editingUser.roles 
            : ['viewer'];

        await localAuth.updateUser(editingUser.uid, { 
          role: validRoles[0],
          roles: validRoles,
          displayName: editingUser.displayName,
          ...(newPass ? { pass: newPass } : {})
        });
        
        alert('Usuario actualizado correctamente');
        setEditingUser(null);
        setNewPass('');
        refreshUsers();
    } catch (error) {
        console.error("Error updating user:", error);
        alert('Error al guardar cambios: ' + error);
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
    if (window.confirm(`¿Está seguro que desea eliminar definitivamente al usuario ${targetUser?.displayName || targetUser?.email}?`)) {
      await localAuth.deleteUser(uid);
      refreshUsers();
      alert('Usuario eliminado');
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
            <FormField label="Contraseña Inicial">
              <input 
                type="text"
                required
                className="w-full border-b border-blue-200 bg-transparent p-2 text-sm font-mono" 
                value={newUser.pass} 
                onChange={e => setNewUser({...newUser, pass: e.target.value})} 
              />
            </FormField>
            <div className="md:col-span-1">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Accesos / Roles</label>
               <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                        checked={newUser.roles.includes(r.id)}
                        onChange={() => setNewUser({...newUser, roles: toggleRole(newUser.roles, r.id)})}
                      />
                      <span className="text-[10px] font-bold text-blue-900 group-hover:text-blue-600 transition-colors uppercase">{r.label}</span>
                    </label>
                  ))}
               </div>
            </div>
            <div className="md:col-span-4 flex justify-end mt-4">
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
            <div className="md:col-span-2">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Modificar Accesos</label>
                 <button 
                   type="button" 
                   onClick={() => setEditingUser({...editingUser, roles: availableRoles.filter(ar => ar.id !== 'viewer').map(ar => ar.id)})}
                   className="text-[9px] font-black text-blue-600 hover:underline"
                 >
                   Marcar Todos (Full Access)
                 </button>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {availableRoles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={(editingUser.roles || [editingUser.role]).includes(r.id)}
                        onChange={() => {
                          const current = editingUser.roles || [editingUser.role];
                          setEditingUser({...editingUser, roles: toggleRole(current, r.id)});
                        }}
                      />
                      <span className="text-[10px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors uppercase">{r.label}</span>
                    </label>
                  ))}
               </div>
            </div>
            <div className="md:col-span-4 flex items-center justify-end gap-2 text-xs mt-4">
              <button type="button" onClick={() => setEditingUser(null)} className="px-6 bg-slate-200 text-slate-700 py-2 rounded font-bold uppercase tracking-tighter hover:bg-slate-300">CERRAR</button>
              <button type="submit" className="px-10 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 uppercase tracking-tighter shadow-lg">GUARDAR CAMBIOS</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Usuario / Email</th>
                <th className="p-4">Nombre</th>
                <th className="p-4 text-center">Permisos (Roles)</th>
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
                    <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto">
                      {(u.roles || [u.role]).map((r: string) => (
                        <span key={r} className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight",
                          r === 'admin' ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-100"
                        )}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-slate-400">
                    {u.pass}
                  </td>
                  <td className="p-4 text-center">
                    <RecordActions 
                      onEdit={() => {
                        setEditingUser({
                          ...u,
                          roles: u.roles && u.roles.length > 0 ? u.roles : (u.role ? [u.role] : ['viewer'])
                        });
                        setNewPass('');
                        setShowCreate(false);
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
                <td className="p-4">{formatDateTimeChile(r.timestamp)}</td>
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

function PetPaymentsManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchTutor, setSearchTutor] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  const downloadExcelTemplate = () => {
    const headers = [
      ["Fecha", "Tutor", "Mail", "Fono", "Nombre MV", "Pago Consulta", "Pago Veterinario", "Fecha Pago"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos Veterinarios");
    XLSX.writeFile(wb, "plantilla_importacion_pagos_vet.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const row of data) {
          const tutor = safe(row["Tutor"]);
          if (!tutor) continue;

          const newRecord = {
            fecha: parseExcelDate(row["Fecha"]),
            tutor: tutor.toUpperCase(),
            mail: safe(row["Mail"]) || "",
            fono: safe(row["Fono"]) || "",
            nombreMV: safe(row["Nombre MV"]) || "",
            pagoConsulta: parseInt(safe(row["Pago Consulta"])) || 0,
            pagoVeterinario: parseInt(safe(row["Pago Veterinario"])) || 0,
            fechaPago: parseExcelDate(row["Fecha Pago"])
          };
          
          await localDB.saveToCollection('pet_payments', newRecord);
          importedCount++;
        }

        await addAuditLog(user, `Importó ${importedCount} pagos vet desde Excel`, 'Administración');
        alert(`Éxito: Se importaron ${importedCount} registros correctamente.`);
        const updated = await localDB.getCollection('pet_payments');
        setRecords(updated);
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Verifique el formato.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tutor: '',
    mail: '',
    fono: '',
    nombreMV: '',
    pagoConsulta: 0,
    pagoVeterinario: 0,
    fechaPago: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadStudents = async () => {
      const data = await localDB.getCollection('students');
      const leads = await localDB.getCollection('school_leads');
      setStudents([...data, ...leads]);
    };
    loadStudents();
  }, []);

  const handleTutorLookup = (name: string) => {
    setForm(prev => ({ ...prev, tutor: name }));
    const found = students.find(s => s.name?.toLowerCase() === name.toLowerCase() || s.nombre?.toLowerCase() === name.toLowerCase());
    if (found) {
      setForm(prev => ({
        ...prev,
        mail: found.email || found.mail || '',
        fono: found.phone || found.fono || found.telefono || ''
      }));
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = !searchTutor || r.tutor?.toLowerCase().includes(searchTutor.toLowerCase());
    const date = r.fecha;
    const matchesStart = !dateStart || date >= dateStart;
    const matchesEnd = !dateEnd || date <= dateEnd;
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalVet = filteredRecords.reduce((sum, r) => sum + (Number(r.pagoVeterinario) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (editingId) {
      await localDB.updateInCollection('pet_payments', editingId, form);
      await addAuditLog(user, `Actualizó Pago Vet de ${form.tutor}`, 'Administración');
      setEditingId(null);
      alert('Registro de pago actualizado');
    } else {
      await localDB.saveToCollection('pet_payments', form);
      await addAuditLog(user, `Registró Pago Vet de ${form.tutor}`, 'Administración');
      alert('Pago registrado correctamente');
    }
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      tutor: '',
      mail: '',
      fono: '',
      nombreMV: '',
      pagoConsulta: 0,
      pagoVeterinario: 0,
      fechaPago: new Date().toISOString().split('T')[0]
    });
    const updated = await localDB.getCollection('pet_payments');
    setRecords(updated);
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      fecha: r.fecha || '',
      tutor: r.tutor || '',
      mail: r.mail || '',
      fono: r.fono || '',
      nombreMV: r.nombreMV || '',
      pagoConsulta: r.pagoConsulta || r.pago1 || 0,
      pagoVeterinario: r.pagoVeterinario || r.pago2 || 0,
      fechaPago: r.fechaPago || r.pagoVeterinario || new Date().toISOString().split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (true) {
      await localDB.deleteFromCollection('pet_payments', id);
      const updated = await localDB.getCollection('pet_payments');
      setRecords(updated);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0b2447] p-4 text-white font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> {editingId ? 'Editando Pago Veterinario' : 'Control de Pagos Veterinarios'}
          </span>
          <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">
            Administración Financiera
          </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
             <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required /></FormField>
             <FormField label="Tutor (Nombre Completo)">
               <input 
                className="w-full border-b p-2 text-sm font-bold uppercase" 
                value={form.tutor} 
                onChange={e => setForm({...form, tutor: e.target.value})} 
                onBlur={e => handleTutorLookup(e.target.value)}
                list="tutors-list"
                required 
               />
               <datalist id="tutors-list">
                 {students.map((s, i) => <option key={i} value={s.name || s.nombre} />)}
               </datalist>
             </FormField>
          </div>
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
             <FormField label="Mail"><input type="email" className="w-full border-b p-2 text-sm" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} /></FormField>
             <FormField label="Fono"><input className="w-full border-b p-2 text-sm" value={form.fono} onChange={e => setForm({...form, fono: e.target.value})} /></FormField>
             <FormField label="Nombre MV"><input className="w-full border-b p-2 text-sm uppercase" value={form.nombreMV} onChange={e => setForm({...form, nombreMV: e.target.value})} /></FormField>
          </div>
          
          <div className="md:col-span-3 grid grid-cols-3 gap-4">
            <FormField label="Pago Consulta ($)"><input type="number" className="w-full border-b p-4 text-lg font-bold bg-slate-50/50 rounded" value={form.pagoConsulta} onChange={e => setForm({...form, pagoConsulta: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Pago Veterinario ($)"><input type="number" className="w-full border-b p-4 text-lg font-bold bg-slate-50/50 rounded border-blue-200" value={form.pagoVeterinario} onChange={e => setForm({...form, pagoVeterinario: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Fecha de Pago"><input type="date" className="w-full border-b p-4 text-lg font-bold bg-slate-50/50 rounded" value={form.fechaPago} onChange={e => setForm({...form, fechaPago: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-1 flex flex-col justify-end gap-3">
             <button type="submit" className={cn(
               "w-full py-4 rounded-xl font-black shadow-xl hover:translate-y-[-2px] transition-all",
               editingId ? "bg-amber-600 text-white" : "bg-[#001736] text-white"
             )}>
               {editingId ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR PAGO'}
             </button>
             {editingId && (
               <button type="button" onClick={() => setEditingId(null)} className="w-full text-slate-400 text-[10px] font-bold uppercase">Cancelar Edición</button>
             )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros de Búsqueda y Rango</span>
            <div className="flex items-center gap-2">
              <input type="date" className="text-[10px] border p-1 rounded" value={dateStart} onChange={e => setDateStart(e.target.value)} />
              <span className="text-slate-300">al</span>
              <input type="date" className="text-[10px] border p-1 rounded" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                placeholder="Tutor..." 
                className="pl-7 pr-3 py-1 text-[10px] border rounded-full w-40 outline-none" 
                value={searchTutor}
                onChange={e => setSearchTutor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[8px] font-black text-slate-400 uppercase">Total Veterinaria</span>
              <span className="text-sm font-black text-blue-900 tracking-tighter">{formatCurrency(totalVet)}</span>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileUpload} 
            />
            <div className="flex gap-1">
              <button 
                onClick={downloadExcelTemplate}
                className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 shadow-sm transition-colors"
                title="Descargar Plantilla Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-600 text-white p-2 rounded hover:bg-amber-700 shadow-sm transition-colors"
                title="Importar desde Excel"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  const data = filteredRecords.map(r => [
                    formatDate(r.fecha), 
                    r.tutor, 
                    formatCurrency(r.pagoConsulta || r.pago1 || 0), 
                    formatCurrency(r.pagoVeterinario || r.pago2 || 0), 
                    formatDate(r.fechaPago || r.pagoVeterinario)
                  ]);
                  exportTableToPDF('Reporte Pagos Veterinarios', ['Fecha', 'Tutor', 'Consulta', 'Veterinario', 'Fecha Pago'], data, 'reporte_pagos_vet', 'l');
                }}
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 shadow-sm"
                title="Descargar PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  const headers = ['Fecha', 'Tutor', 'Mail', 'Fono', 'Nombre MV', 'Consulta', 'Veterinario', 'Fecha Pago'];
                  const data = filteredRecords.map(r => [
                    formatDate(r.fecha), 
                    r.tutor, 
                    r.mail || '',
                    r.fono || '',
                    r.nombreMV || '',
                    r.pagoConsulta || r.pago1 || 0, 
                    r.pagoVeterinario || r.pago2 || 0, 
                    formatDate(r.fechaPago || r.pagoVeterinario)
                  ]);
                  exportTableToExcel('Reporte Pagos Veterinarios', headers, data, 'reporte_pagos_vet');
                }}
                className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 shadow-sm"
                title="Exportar a Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
                <th className="p-4">Tutor</th>
                <th className="p-4">Nombre MV</th>
                <th className="p-4">Mail / Fono</th>
                <th className="p-4 text-right">Consulta</th>
                <th className="p-4 text-right text-blue-900 bg-blue-50/30">Pago Vet</th>
                <th className="p-4 text-center">Fecha Pago</th>
                <th className="p-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.sort((a,b) => b.fecha.localeCompare(a.fecha)).map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-400">{formatDate(r.fecha)}</td>
                  <td className="p-4 font-bold text-[#001736] uppercase">{r.tutor}</td>
                  <td className="p-4 text-slate-500 uppercase">{r.nombreMV}</td>
                  <td className="p-4 italic text-slate-500">
                    <span className="block">{r.mail}</span>
                    <span className="text-[10px]">{r.fono}</span>
                  </td>
                  <td className="p-4 text-right">{formatCurrency(r.pagoConsulta || r.pago1 || 0)}</td>
                  <td className="p-4 text-right font-black bg-blue-50/10 text-blue-900 border-x border-slate-50">{formatCurrency(r.pagoVeterinario || r.pago2 || 0)}</td>
                  <td className="p-4 text-center font-mono opacity-60 italic">{formatDate(r.fechaPago || r.pagoVeterinario)}</td>
                  <td className="p-4 text-center">
                    <RecordActions 
                      onEdit={() => handleEdit(r)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 italic">No hay registros para este criterio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const downloadExcelTemplate = () => {
    const headers = [
      ["Año", "Mes", "N° Cotiz", "Fecha Elab", "Cliente", "Vendedor", "Estado", "Fecha Aprob", "UND Inventario", "UND Total", "Observaciones"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");
    XLSX.writeFile(wb, "plantilla_importacion_cotizaciones.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        console.log("AdminView - Total rows imported from XLSX:", data.length);
        let importedCount = 0;
        const currentRecords = await localDB.getCollection('quotes');

        for (const [index, row] of data.entries()) {
          console.log(`AdminView - Processing row ${index}:`, row);
          const nroCotiz = safe(row["N° Cotiz"]).trim();
          if (!nroCotiz) {
            console.log(`AdminView - Skipping row ${index} because N° Cotiz is empty.`);
            continue;
          }

          // Check if already exists
          if (currentRecords.some(r => safe(r.nroCotiz).trim() === nroCotiz)) {
             console.log(`AdminView - Skipping row ${index} because N° Cotiz ${nroCotiz} already exists.`);
             continue;
          }

          const invVal = parseInt(safe(row["UND Inventario"])) || 0;
          const totalVal = parseInt(safe(row["UND Total"])) || 0;

          const newQuote = {
            anio: safe(row["Año"]) || new Date().getFullYear().toString(),
            mes: safe(row["Mes"]) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            nroCotiz: nroCotiz,
            fechaElab: parseExcelDate(row["Fecha Elab"]),
            cliente: safe(row["Cliente"]),
            vendedor: safe(row["Vendedor"]) || 'CIMASUR',
            estado: safe(row["Estado"]) || 'Pendiente',
            fechaAprob: parseExcelDate(row["Fecha Aprob"]) || "",
            invUnits: invVal,
            undTotal: totalVal,
            todoUnits: Math.max(0, totalVal - invVal),
            observaciones: safe(row["Observaciones"])
          };

          await localDB.saveToCollection('quotes', newQuote);
          importedCount++;
        }

        await addAuditLog(user, `Importó ${importedCount} cotizaciones desde Excel`, 'Administración');
        alert(`Éxito: Se importaron ${importedCount} cotizaciones correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Asegúrese de usar la plantilla correcta.");
      }
    };
    reader.readAsBinaryString(file);
  };
  
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
    undTotal: 0,
    observaciones: ''
  });

  const sellers = ['CIMASUR', 'Gestión', 'Telemedicina', 'Tienda', 'Mercado Libre', 'Genérico', 'Consignación'];
  const statuses = ['Pendiente', 'Aprobada', 'Anulada'];

  // Calculate todoUnits if undTotal and invUnits change, or vice versa
  // If the user wants: Total 20, Inv 15 -> ToDo 5.
  // We'll treat undTotal as the "Total Requested"
  
  const handleTotalChange = (val: number) => {
    setForm(prev => ({ 
      ...prev, 
      undTotal: val,
      todoUnits: Math.max(0, val - (prev.invUnits || 0))
    }));
  };

  const handleInvChange = (val: number) => {
    setForm(prev => ({ 
      ...prev, 
      invUnits: val,
      todoUnits: Math.max(0, (prev.undTotal || 0) - val)
    }));
  };

  const filteredRecords = records
    .filter(r => {
      const matchesSearch = !searchFilter || 
        r.cliente?.toLowerCase().includes(searchFilter.toLowerCase()) || 
        r.nroCotiz?.toString().includes(searchFilter);
      const matchesDate = !dateFilter || r.fechaElab === dateFilter;
      const matchesStatus = statusFilter === 'Todos' || r.estado === statusFilter;
      return matchesSearch && matchesDate && matchesStatus;
    })
    .sort((a, b) => {
      const numA = parseInt(a.nroCotiz) || 0;
      const numB = parseInt(b.nroCotiz) || 0;
      return numA - numB;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('quotes', editingId, form);
      await addAuditLog(user, `Actualizó Cotización N° ${form.nroCotiz}`, 'Administración');
      setEditingId(null);
      alert('Cotización actualizada exitosamente');
    } else {
      await localDB.saveToCollection('quotes', form);
      await addAuditLog(user, `Registró Cotización N° ${form.nroCotiz}`, 'Administración');
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
      undTotal: 0,
      observaciones: ''
    });
    const updated = await localDB.getCollection('quotes');
    setRecords(updated);
  };

  const handleDelete = async (id: string) => {
    if (true) {
      try {
        const quote = records.find(r => r.id === id);
        await localDB.deleteFromCollection('quotes', id);
        if (quote) await addAuditLog(user, `Eliminó Cotización N° ${quote.nroCotiz}`, 'Administración');
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
      await addAuditLog(user, `Cambió estado Cotización N° ${record.nroCotiz} a ${newStatus}`, 'Administración');
      const updated = await localDB.getCollection('quotes');
      setRecords(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Seguimiento de Cotizaciones
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={downloadExcelTemplate}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors font-black shadow-sm"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors font-black shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
          </div>
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
          <FormField label="UND Total (Pedido)"><input type="number" className="w-full border-b p-2 text-sm font-black text-blue-700 bg-blue-50" value={form.undTotal ?? 0} onChange={e => handleTotalChange(parseInt(e.target.value) || 0)} /></FormField>
          <FormField label="Und Inventario"><input type="number" className="w-full border-b p-2 text-sm" value={form.invUnits ?? 0} onChange={e => handleInvChange(parseInt(e.target.value) || 0)} /></FormField>
          <FormField label="Und a hacer">
            <div className="w-full p-2 text-sm font-bold text-amber-700 bg-amber-50 rounded border-b border-amber-200">
              {form.todoUnits}
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
        <div className="p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-center justify-between">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Histórico de Cotizaciones</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Filtros:</span>
              <input 
                type="date" 
                className="text-[10px] border rounded p-1 outline-none" 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
              <select 
                className="text-[10px] border rounded p-1 outline-none font-bold"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                placeholder="Buscar por cliente o N°..." 
                className="pl-8 pr-4 py-1 text-xs border rounded-full w-48 lg:w-64 outline-none focus:border-blue-400" 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
              <button 
                onClick={() => {
                  const data = filteredRecords.map(r => [
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
                className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors hover:bg-blue-700 flex items-center gap-1" 
                title="Descargar PDF Filtrado"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
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
              {filteredRecords.map(r => (
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
                  <td className="p-4 text-center font-black text-blue-700 italic">
                    <div className="flex flex-col items-center">
                      <span>{r.undTotal || 0}</span>
                      <span className="text-[8px] text-slate-400 font-normal">Inv: {r.invUnits || 0} / Pro: {r.todoUnits || 0}</span>
                    </div>
                  </td>
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
                          { label: 'Inv / Producir', value: `${r.invUnits || 0} / ${r.todoUnits || 0}` },
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
                          { label: 'Inv / Producir', value: `${r.invUnits || 0} / ${r.todoUnits || 0}` },
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
                          undTotal: r.undTotal || 0,
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
                  {filteredRecords.reduce((sum, r) => sum + (Number(r.undTotal) || 0), 0)}
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

function SalesGestionManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    fecha: new Date().toISOString().split('T')[0],
    documento: '',
    cliente: '',
    nroFrascos: 0,
    detalleProductos: '',
    valorCotizacion: 0
  });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [showProductSummary, setShowProductSummary] = useState(false);

  const downloadExcelTemplate = () => {
    const headers = [
      ["Año", "Mes", "Fecha", "Documento", "Cliente", "Frascos", "Detalle Productos", "Valor Cotización"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas Gestión");
    XLSX.writeFile(wb, "plantilla_importacion_ventas_gestion.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        const currentRecords = await localDB.getCollection('sales_gestion');

        for (const row of data) {
          const doc = safe(row["Documento"]);
          if (!doc) continue;

          // Check if already exists
          if (currentRecords.some(r => safe(r.documento) === doc)) continue;

          const newSale = {
            anio: safe(row["Año"]) || new Date().getFullYear().toString(),
            mes: safe(row["Mes"]) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            fecha: parseExcelDate(row["Fecha"]),
            documento: doc,
            cliente: safe(row["Cliente"]),
            nroFrascos: parseInt(safe(row["Frascos"])) || 0,
            detalleProductos: safe(row["Detalle Productos"]) || '',
            valorCotizacion: parseInt(safe(row["Valor Cotización"])) || 0
          };

          await localDB.saveToCollection('sales_gestion', newSale);
          importedCount++;
        }

        await addAuditLog(user, `Importó ${importedCount} ventas gestión desde Excel`, 'Administración');
        alert(`Éxito: Se importaron ${importedCount} ventas gestión correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Asegúrese de usar la plantilla correcta.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredRecords = records.filter(r => {
    let match = true;
    if (dateFrom && r.fecha < dateFrom) match = false;
    if (dateTo && r.fecha > dateTo) match = false;
    if (filterMonth !== 'Todos' && r.mes !== filterMonth) match = false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = `${r.documento || ''} ${r.cliente || ''} ${r.nroFrascos || ''} ${r.detalleProductos || ''}`.toLowerCase();
      if (!text.includes(s)) match = false;
    }
    return match;
  });

  const getConsolidatedProducts = () => {
    const counts: Record<string, number> = {};
    
    filteredRecords.forEach(r => {
      if (!r.detalleProductos) return;
      
      // Split by commas or newlines
      const items = r.detalleProductos.split(/[,\n]/);
      
      items.forEach((item: string) => {
        const trimmed = item.trim();
        if (!trimmed) return;
        
        // Try to match patterns like "2x Omega 3" or "2 Omega 3"
        const match = trimmed.match(/^(\d+)\s*[xX*]?\s*(.+)$/);
        
        let qty = 1;
        let name = trimmed;
        
        if (match) {
          qty = parseInt(match[1]) || 1;
          name = match[2].trim();
        }
        
        const lowerName = name.toUpperCase();
        counts[lowerName] = (counts[lowerName] || 0) + qty;
      });
    });
    
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const consolidated = getConsolidatedProducts();

  const totalFrascos = filteredRecords.reduce((sum, r) => sum + (Number(r.nroFrascos) || 0), 0);
  const totalCotizacion = filteredRecords.reduce((sum, r) => sum + (Number(r.valorCotizacion) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('sales_gestion', editingId, form);
      await addAuditLog(user, `Actualizó Venta Gestión Doc: ${form.documento}`, 'Administración');
      setEditingId(null);
      alert('Venta Gestión actualizada');
    } else {
      await localDB.saveToCollection('sales_gestion', form);
      await addAuditLog(user, `Registró Venta Gestión Doc: ${form.documento}`, 'Administración');
      alert('Venta Gestión registrada');
    }
    setForm({
      anio: new Date().getFullYear().toString(),
      mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
      fecha: new Date().toISOString().split('T')[0],
      documento: '',
      cliente: '',
      nroFrascos: 0,
      detalleProductos: '',
      valorCotizacion: 0
    });
    const updated = await localDB.getCollection('sales_gestion');
    setRecords(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
          <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Registro de Ventas GESTIÓN</span>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={downloadExcelTemplate}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
          </div>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
            <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
          </div>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="Fact / Boleta"><input className="w-full border-b p-2 text-sm" value={form.documento || ''} onChange={e => setForm({...form, documento: e.target.value})} required /></FormField>
          <FormField label="Cliente"><input className="w-full border-b p-2 text-sm" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} required /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="N° Frascos"><input type="number" className="w-full border-b p-2 text-sm" value={form.nroFrascos ?? 0} onChange={e => setForm({...form, nroFrascos: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Valor Cotización ($)"><input type="number" className="w-full border-b p-2 text-sm" value={form.valorCotizacion ?? 0} onChange={e => setForm({...form, valorCotizacion: parseInt(e.target.value) || 0})} /></FormField>
          </div>
          <FormField label="Detalle de Productos Solicitados">
            <textarea 
              className="w-full border p-2 text-xs rounded h-24 outline-none focus:ring-1 focus:ring-blue-200" 
              value={form.detalleProductos} 
              onChange={e => setForm({...form, detalleProductos: e.target.value})}
              placeholder="Ej: 2x Omega 3, 1x Multivitamínico..."
            />
          </FormField>
          <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold mt-2 hover:bg-opacity-90">GUARDAR VENTA GESTIÓN</button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Detalle de Ventas GESTIÓN Registradas</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Mes:</span>
                <select 
                  className="text-xs border rounded p-1 w-28 text-slate-600"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                  const data = filteredRecords.map(r => [formatDate(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0, formatCurrency(r.valorCotizacion || 0)]);
                  data.push(['', '', 'TOTAL', totalFrascos, formatCurrency(totalCotizacion)]);
                  exportTableToPDF('Reporte: Ventas Gestión', ['Fecha', 'Documento', 'Cliente', 'Frascos', 'Valor Cotiz'], data, 'reporte_ventas_gestion');
                }}
                className="text-white bg-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1" 
                title="Descargar PDF"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button 
                onClick={() => setShowProductSummary(!showProductSummary)}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all",
                  showProductSummary ? "bg-amber-500 text-white" : "bg-slate-700 text-white hover:bg-slate-800"
                )}
                title="Ver resumen de productos"
              >
                <ClipboardList className="w-3.5 h-3.5" /> {showProductSummary ? 'OCULTAR RESUMEN' : 'RESUMEN PRODUCTOS'}
              </button>
            </div>
          </div>

          {showProductSummary && (
            <div className="p-4 bg-amber-50 border-b border-amber-100 animate-in slide-in-from-top duration-300">
               <h4 className="text-[10px] font-black text-amber-800 uppercase mb-3 flex items-center gap-2">
                 <ListChecks className="w-4 h-4" /> Resumen Consolidado de Productos ({filterMonth})
               </h4>
               <div className="bg-white p-0 rounded-lg border border-amber-200 shadow-inner max-h-80 overflow-y-auto">
                 {consolidated.length > 0 ? (
                   <table className="w-full text-xs">
                     <thead className="bg-amber-100/50 sticky top-0">
                       <tr className="text-[9px] font-black text-amber-900 uppercase text-left border-b border-amber-200">
                         <th className="p-2">Producto</th>
                         <th className="p-2 text-center w-20">Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-amber-100">
                       {consolidated.map((item, i) => (
                         <tr key={i} className="hover:bg-amber-50/50 transition-colors">
                           <td className="p-2 font-bold text-slate-700">{item.name}</td>
                           <td className="p-2 text-center">
                             <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full font-black text-[10px]">
                               {item.qty}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 ) : (
                   <p className="text-xs text-slate-400 italic text-center py-8">No hay detalles de productos para consolidar en esta selección.</p>
                 )}
               </div>
               <div className="mt-3 text-[9px] text-amber-700 flex justify-between font-bold uppercase">
                  <span>Mostrando {consolidated.length} productos únicos</span>
                  <button 
                    onClick={() => {
                      const text = consolidated.map(item => `${item.qty}x ${item.name}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Resumen consolidado copiado');
                    }}
                    className="flex items-center gap-1 hover:text-amber-900"
                  >
                    <ClipboardList className="w-3 h-3" /> Copiar Resumen
                  </button>
               </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Documento</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-center">Fcos</th>
                  <th className="p-4 text-right">Valor Cotiz</th>
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
                    <td className="p-4 text-right font-black text-blue-700">{formatCurrency(r.valorCotizacion || 0)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RecordActions
                          onView={() => {
                            const data = [
                              { label: 'Documento', value: r.documento || '' },
                              { label: 'Fecha', value: formatDate(r.fecha) },
                              { label: 'Cliente', value: r.cliente || '' },
                              { label: 'N° Frascos', value: (r.nroFrascos || 0).toString() },
                              { label: 'Valor Cotización', value: formatCurrency(r.valorCotizacion || 0) },
                              { label: 'Detalle Productos', value: r.detalleProductos || 'Sin detalles.' }
                            ];
                            viewExpedienteInNewTab(`Expediente Venta GESTIÓN: ${r.cliente}`, data, `venta_gestion_${r.documento}`);
                          }}
                          onDownload={() => {
                            const data = [
                              { label: 'Documento', value: r.documento || '' },
                              { label: 'Fecha', value: formatDate(r.fecha) },
                              { label: 'Cliente', value: r.cliente || '' },
                              { label: 'N° Frascos', value: (r.nroFrascos || 0).toString() },
                              { label: 'Valor Cotización', value: formatCurrency(r.valorCotizacion || 0) },
                              { label: 'Detalle Productos', value: r.detalleProductos || 'Sin detalles.' }
                            ];
                            exportExpedienteToPDF(`Expediente Venta GESTIÓN: ${r.cliente}`, data, `venta_gestion_${r.documento}`);
                          }}
                          onEdit={() => {
                            setEditingId(r.id);
                            setForm(r);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onDelete={async () => {
                            try {
                              await localDB.deleteFromCollection('sales_gestion', r.id);
                              const updated = await localDB.getCollection('sales_gestion');
                              setRecords(updated);
                              alert('Venta Gestión eliminada');
                            } catch (err) {
                              alert('Error al eliminar');
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
                  <td colSpan={3} className="p-4 text-right uppercase text-slate-500 text-[9px] tracking-widest">Totales en Selección:</td>
                  <td className="p-4 text-center text-blue-700 text-sm">{totalFrascos}</td>
                  <td className="p-4 text-right text-blue-700 text-sm">{formatCurrency(totalCotizacion)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    fecha: new Date().toISOString().split('T')[0],
    documento: '',
    cliente: '',
    nroFrascos: 0
  });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const downloadExcelTemplate = () => {
    const headers = [
      ["Año", "Mes", "Fecha", "Documento", "Cliente", "Frascos"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "plantilla_importacion_ventas.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        const currentRecords = await localDB.getCollection('sales');

        for (const row of data) {
          const doc = safe(row["Documento"]);
          if (!doc) continue;

          // Check if already exists
          if (currentRecords.some(r => safe(r.documento) === doc)) continue;

          const newSale = {
            anio: safe(row["Año"]) || new Date().getFullYear().toString(),
            mes: safe(row["Mes"]) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            fecha: parseExcelDate(row["Fecha"]),
            documento: doc,
            cliente: safe(row["Cliente"]),
            nroFrascos: parseInt(safe(row["Frascos"])) || 0
          };

          await localDB.saveToCollection('sales', newSale);
          importedCount++;
        }

        await addAuditLog(user, `Importó ${importedCount} ventas desde Excel`, 'Administración');
        alert(`Éxito: Se importaron ${importedCount} ventas correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Asegúrese de usar la plantilla correcta.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredRecords = records.filter(r => {
    let match = true;
    if (dateFrom && r.fecha < dateFrom) match = false;
    if (dateTo && r.fecha > dateTo) match = false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = `${r.documento || ''} ${r.cliente || ''} ${r.nroFrascos || ''}`.toLowerCase();
      if (!text.includes(s)) match = false;
    }
    return match;
  });

  const totalFrascos = filteredRecords.reduce((sum, r) => sum + (Number(r.nroFrascos) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('sales', editingId, form);
      await addAuditLog(user, `Actualizó Venta Doc: ${form.documento}`, 'Administración');
      setEditingId(null);
      alert('Venta actualizada');
    } else {
      await localDB.saveToCollection('sales', form);
      await addAuditLog(user, `Registró Venta Doc: ${form.documento}`, 'Administración');
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
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={downloadExcelTemplate}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
          </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            <button 
              onClick={() => {
                const data = filteredRecords.map(r => [formatDate(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0]);
                data.push(['', '', 'TOTAL', totalFrascos]);
                exportTableToPDF('Reporte: Ventas', ['Fecha', 'Documento', 'Cliente', 'Frascos'], data, 'reporte_ventas');
              }}
              className="text-white bg-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1" 
              title="Descargar PDF"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button 
              onClick={() => {
                const data = filteredRecords.map(r => [formatDateForExcel(r.fecha), r.documento || '', r.cliente || '', r.nroFrascos || 0]);
                data.push(['', '', 'TOTAL', totalFrascos]);
                exportTableToExcel('Reporte: Ventas', ['Fecha', 'Documento', 'Cliente', 'Frascos'], data, 'reporte_ventas');
              }}
              className="text-white bg-emerald-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-emerald-700 flex flex-row items-center gap-1" 
              title="Descargar Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5"/> Excel
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
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const iva = (Number(form.montoNeto) || 0) * 0.19;
  const total = (Number(form.montoNeto) || 0) + iva;

  const filteredRecords = records.filter(r => {
    let match = true;
    if (dateFrom && r.fecha < dateFrom) match = false;
    if (dateTo && r.fecha > dateTo) match = false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = String(r.nroDto || '') + ' ' + String(r.nombre || '') + ' ' + String(r.rut || '');
      if (!text.toLowerCase().includes(s)) match = false;
    }
    return match;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('dte_records', editingId, { ...form, iva, total });
      await addAuditLog(user, `Actualizó DTE N° ${form.nroDto}`, 'Administración');
      setEditingId(null);
      alert('DTE Actualizado');
    } else {
      await localDB.saveToCollection('dte_records', { ...form, iva, total });
      await addAuditLog(user, `Registró DTE N° ${form.nroDto}`, 'Administración');
      alert('DTE Registrado Admin');
    }
    setForm({...form, nroDto: '', nombre: '', rut: '', montoNeto: 0});
    const updated = await localDB.getCollection('dte_records');
    setRecords(updated);
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

  const downloadExcelTemplate = () => {
    const headers = ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `DTE`);
    XLSX.writeFile(wb, 'plantilla_importacion_dte.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        const currentRecords = await localDB.getCollection('dte_records');

        for (const row of data) {
          const doc = safe(row['N° Dcto'] || row['nroDto'] || row['N° Documento']);
          if (!doc) continue;
          if (currentRecords.some(r => safe(r.nroDto) === doc)) continue;

          const neto = parseFloat(safe(row['Neto'] || row['montoNeto']).replace(/[^0-9.-]+/g, '')) || 0;
          const rIva = neto * 0.19;
          const rTotal = neto + rIva;

          const newDte = {
            anio: safe(row['Año']) || new Date().getFullYear().toString(),
            mes: safe(row['Mes']) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            fecha: parseExcelDate(row['Fecha']),
            nroDto: doc,
            nombre: safe(row['Razón Social'] || row['Nombre']),
            rut: safe(row['RUT']),
            direccion: safe(row['Dirección']),
            ciudad: safe(row['Ciudad']),
            email: safe(row['Email']),
            montoNeto: neto,
            iva: rIva,
            total: rTotal
          };

          await localDB.saveToCollection('dte_records', newDte);
          importedCount++;
        }

        if (importedCount > 0) {
          const updated = await localDB.getCollection('dte_records');
          setRecords(updated);
          await addAuditLog(user, `Importó ${importedCount} registros DTE`, 'Administración');
          alert(`Importación completada. ${importedCount} registros nuevos añadidos.`);
        } else {
          alert('No se encontraron registros nuevos para importar (o faltaba el N° de Documento).');
        }
      } catch (err) {
        console.error(err);
        alert('Error al procesar el archivo Excel.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getExportData = () => {
    return filteredRecords.map(r => [
      r.anio || '',
      r.mes || '',
      formatDate(r.fecha) || '',
      r.nroDto || '',
      r.nombre || '',
      r.rut || '',
      r.direccion || '',
      r.ciudad || '',
      r.email || '',
      formatCurrency(r.montoNeto || 0),
      formatCurrency((r.montoNeto || 0) * 0.19),
      formatCurrency((r.montoNeto || 0) * 1.19)
    ]);
  };
  
  const getExcelExportData = () => {
    return filteredRecords.map(r => [
      r.anio || '',
      r.mes || '',
      formatDateForExcel(r.fecha) || '',
      r.nroDto || '',
      r.nombre || '',
      r.rut || '',
      r.direccion || '',
      r.ciudad || '',
      r.email || '',
      r.montoNeto || 0,
      (r.montoNeto || 0) * 0.19,
      (r.montoNeto || 0) * 1.19
    ]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0b2447] p-4 text-white font-bold flex flex-wrap gap-4 items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-5 h-5" /> {editingId ? 'Editando Registro DTE' : 'Registro Administrativo de DTE'}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={downloadExcelTemplate}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded ml-2">Uso Interno - No SII</span>
          </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
          <div className="md:col-span-1 space-y-4">
             <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
             <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
             <FormField label="N° Documento"><input className="w-full border-b p-2 text-sm font-bold" value={form.nroDto || ''} onChange={e => {
               const val = e.target.value;
               if (val.toUpperCase() === 'BOLETA') {
                 setForm({
                   ...form,
                   nroDto: val,
                   nombre: 'GENERICO',
                   rut: '76.087.016-1',
                   direccion: 'GENERICO',
                   ciudad: 'GENERICO',
                   email: 'ADMIN@CIMASUR.CL'
                 });
               } else {
                 setForm({...form, nroDto: val});
               }
             }} required /></FormField>
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
               <input type="number" className="w-full border-b border-blue-200 p-4 text-xl font-black bg-blue-50/50 rounded-t outline-none focus:bg-blue-50" value={form.montoNeto || ''} onChange={e => setForm({...form, montoNeto: parseInt(e.target.value) || 0})} />
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
        <div className="p-4 bg-slate-50 border-b flex flex-wrap justify-between items-center font-black text-[10px] text-slate-400 uppercase tracking-widest gap-4">
          <span>Consulta de Registros DTE</span>
          <div className="flex items-center gap-2 flex-wrap text-normal normal-case">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-600" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-600" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-600 font-normal" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            <button 
               onClick={() => {
                 exportTableToPDF('Reporte: DTE', ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto', 'IVA', 'Total'], getExportData(), 'reporte_dte', 'l');
               }}
               className="text-white bg-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1"
               title="Descargar PDF"
            >
              <Download className="w-3 h-3" /> PDF
            </button>
            <button 
               onClick={() => {
                 exportTableToExcel('Reporte: DTE', ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto', 'IVA', 'Total'], getExcelExportData(), 'reporte_dte');
               }}
               className="text-white bg-emerald-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-emerald-700 flex flex-row items-center gap-1"
               title="Descargar Excel"
            >
              <FileSpreadsheet className="w-3 h-3" /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
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
                  <td className="p-4 text-slate-500">{formatDate(r.fecha)}</td>
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

