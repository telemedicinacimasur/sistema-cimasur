import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, safe, formatDateForExcel } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { 
  Activity, 
  UserPlus, 
  History, 
  Search,
  Save,
  UserCheck,
  Filter,
  FileText,
  Trash2,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Users,
  Gift,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Pencil,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { RecordActions } from '../components/RecordActions';

const exportTableToExcel = (title: string, headers: string[], data: any[][], fileName: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  const safeTitle = title.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, safeTitle);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

import { addNotification } from '../lib/notifications';

function parseExcelDate(serial: any) {
  if (!serial) return null;
  if (typeof serial === 'string') return serial;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

export default function GestionView() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [records, setRecords] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedExpedienteId, setSelectedExpedienteId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    categoria: 'Todas',
    estado: 'Todos'
  });

  const loadData = async () => {
    const gestionData = await localDB.getCollection('gestion_records');
    const activityData = await localDB.getCollection('gestion_activities');
    // Sort records by fechaIngreso descending
    setRecords([...gestionData].sort((a: any, b: any) => (b.fechaIngreso || '').localeCompare(a.fechaIngreso || '')));
    setActivities(activityData);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  const selectedExpediente = records.find(r => r.id === selectedExpedienteId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[#001736]">Módulo de Gestión</h2>
          <p className="text-slate-500 text-sm">Control y seguimiento especializado de clientes estratégicos.</p>
        </div>
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'register' ? "border-b-2 border-[#001736] text-[#001736]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Ingreso de Cliente
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'list' ? "border-b-2 border-[#001736] text-[#001736]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Gestión de Clientes
          </button>
        </div>
      </div>

      {activeTab === 'register' && (
        <GestionRegister 
          initialData={editingRecord} 
          onCancel={() => {
            setEditingRecord(null);
            setActiveTab('list');
          }}
        />
      )}
      {activeTab === 'list' && (
        <GestionList 
          records={records} 
          activities={activities} 
          filters={filters} 
          setFilters={setFilters} 
          onOpenExpediente={setSelectedExpedienteId}
          onEdit={(r) => {
            setEditingRecord(r);
            setActiveTab('register');
          }}
        />
      )}

      {selectedExpediente && (
        <GestionExpedienteModal 
          client={selectedExpediente} 
          onClose={() => setSelectedExpedienteId(null)} 
        />
      )}
    </div>
  );
}

function GestionExpedienteModal({ client, onClose }: { client: any, onClose: () => void }) {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState(client.categoria || 'Sin categoría');
  const [newState, setNewState] = useState(client.estado || 'En proceso');
  const [newActivityType, setNewActivityType] = useState('Seguimiento');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  const loadActivities = async () => {
    const all = await localDB.getCollection('gestion_activities');
    const filtered = all.filter(a => a.clienteRut === client.rut || a.clienteId === client.id);
    setActivities(filtered.sort((a, b) => b.fecha.localeCompare(a.fecha)));
  };

  useEffect(() => {
    loadActivities();
  }, [client.id, client.rut]);

  const handleAddActivity = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const newActivity = {
        fecha: today,
        clienteId: client.id,
        clienteRut: client.rut,
        clienteNombre: client.nombre || client.cliente,
        actividad: newActivityType,
        detalle: newNote || '(Sin detalle adicional)',
        responsable: user.displayName || user.email || 'Consultora'
      };

      await localDB.saveToCollection('gestion_activities', newActivity);
      
      await addNotification({
        title: 'Nueva Actividad en Gestión',
        message: `${user.displayName || user.email} registró: ${newActivityType} para ${client.nombre || client.cliente}`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
      
      // Update client category and state
      await localDB.updateInCollection('gestion_records', client.id, {
        categoria: newCategory,
        estado: newState
      });

      await addAuditLog(
        user, 
        `Nueva actividad (${newActivityType}) para ${client.nombre || client.cliente}: ${newNote.substring(0, 50)}...`, 
        'Gestión'
      );

      setNewNote('');
      loadActivities();
      window.dispatchEvent(new Event('db-change'));
    } catch (err) {
      console.error(err);
      alert('Error al registrar actividad');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id: string, detail: string) => {
    if (!confirm('¿Seguro que desea eliminar esta actividad del registro?')) return;
    if (!user) return;
    await localDB.deleteFromCollection('gestion_activities', id);
    await addAuditLog(user, `Eliminó actividad: ${detail.substring(0, 30)}...`, 'Gestión');
    loadActivities();
    window.dispatchEvent(new Event('db-change'));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-7xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-[#001736] p-6 text-white flex justify-between items-center shrink-0 border-b border-white/10 shadow-lg">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-blue-500/20 rounded-xl">
               <FileText className="w-6 h-6 text-blue-400" />
             </div>
             <div>
               <h3 className="font-bold text-xl tracking-tight">Expediente de Cliente</h3>
               <p className="text-blue-300/60 text-[10px] font-black uppercase tracking-[0.2em]">{client.nombre || client.cliente}</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all"
          >
            Cerrar Expediente
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Workspace (Left) - Detailed & Larger */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               {[
                 { label: 'RUT', val: client.rut },
                 { label: 'Comuna', val: client.comuna || 'Metropolitana' },
                 { label: 'Tipo Empresa', val: client.tipoEmpresa || 'Otros' },
                 { label: 'Fecha Ingreso', val: formatDate(client.fechaIngreso) }
               ].map((item, i) => (
                 <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{item.label}</div>
                    <div className="text-slate-700 font-bold text-sm truncate">{item.val}</div>
                 </div>
               ))}
            </div>

            {/* Activities History List - LARGE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase text-blue-900 tracking-[0.2em] flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Historial Detallado de Actividades
                </h4>
                <div className="text-[10px] text-slate-400 font-bold">{activities.length} registros encontrados</div>
              </div>
              
              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                          {formatDate(act.fecha)}
                        </div>
                        <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                          {act.actividad}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold italic">
                           <Users className="w-3 h-3" />
                           {act.responsable}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteActivity(act.id, act.detalle)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar este regitro"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-slate-100">
                      {act.detalle}
                    </p>
                  </div>
                ))}

                {activities.length === 0 && (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <History className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-xs italic tracking-wide">No se han registrado actividades para este expediente aún.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Sidebar (Right) */}
          <div className="w-full lg:w-96 border-l border-slate-200 p-8 space-y-8 bg-white shrink-0 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 tracking-widest border-b pb-4">
                 <Save className="w-4 h-4 text-blue-600" />
                 Nueva Gestión / Seguimiento
              </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Actividad</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      value={newActivityType}
                      onChange={e => setNewActivityType(e.target.value)}
                    >
                      <option value="Seguimiento">Nota de Seguimiento</option>
                      <option value="Actualización de categoría">Actualización de Categoría</option>
                      <option value="Capacitación">Capacitación</option>
                      <option value="Envío de regalos">Envío de Regalos</option>
                      <option value="Tipos de regalos">Tipos de Regalos</option>
                      <option value="Interesado en Charlas">Interesado en Charlas</option>
                      <option value="Visita Técnica">Visita Técnica</option>
                      <option value="Cierre de Venta">Cierre de Venta</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de la Actividad</label>
                    <textarea 
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                      placeholder="Escriba los pormenores de la gestión realizada..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                      >
                        {CATEGORIAS_GP.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={newState}
                        onChange={e => setNewState(e.target.value)}
                      >
                        {ESTADOS.filter(est => est !== 'Todos').map(est => <option key={est} value={est}>{est}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleAddActivity}
                    disabled={loading}
                    className="w-full bg-[#001736] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:translate-y-[-2px] hover:shadow-blue-900/20 active:translate-y-0 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Registrar en Expediente
                      </>
                    )}
                  </button>
                </div>
              </div>

            {/* Initial Observations Alert */}
            {client.observaciones && (
               <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                 <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Observaciones Iniciales</div>
                 <p className="text-[11px] text-amber-800 italic leading-relaxed">{client.observaciones}</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ESTADOS = ['Todos', 'En proceso', 'Sin compra', 'Con compra', 'Finalizado', 'Pausado', 'Sin interés', 'Cliente'];
const CATEGORIAS_GP = ['Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];
const TIPOS_EMPRESA = ['Clinica', 'Farmacia', 'Petshop', 'Hospital', 'Independiente', 'Otros'];

function GestionRegister({ initialData, onCancel }: { initialData?: any, onCancel?: () => void }) {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fechaIngreso: new Date().toISOString().split('T')[0],
    nombre: '',
    rut: '',
    tipoEmpresa: 'Otros',
    direccion: '',
    comuna: '',
    region: 'Metropolitana',
    celular: '',
    email: '',
    especialidadCliente: '',
    medioContacto: 'Whatsapp',
    medioContactoDetalle: '',
    categoria: 'Sin categoría',
    estado: 'En proceso',
    observaciones: ''
  });

  const [duplicateToCRM, setDuplicateToCRM] = useState(!initialData?.id);

  useEffect(() => {
    if (initialData) {
      setForm({
        fechaIngreso: initialData.fechaIngreso || new Date().toISOString().split('T')[0],
        nombre: initialData.nombre || initialData.cliente || '',
        rut: initialData.rut || '',
        tipoEmpresa: initialData.tipoEmpresa || 'Otros',
        direccion: initialData.direccion || '',
        comuna: initialData.comuna || '',
        region: initialData.region || 'Metropolitana',
        celular: initialData.celular || '',
        email: initialData.email || '',
        especialidadCliente: initialData.especialidadCliente || '',
        medioContacto: initialData.medioContacto || 'Whatsapp',
        medioContactoDetalle: initialData.medioContactoDetalle || '',
        categoria: initialData.categoria || 'Sin categoría',
        estado: initialData.estado || 'En proceso',
        observaciones: initialData.observaciones || ''
      });
      setDuplicateToCRM(false);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const recordToSave = {
      ...form,
      consultora: initialData?.consultora || user.displayName || user.email || 'Consultora CIMASUR'
    };

    if (initialData?.id) {
      await localDB.updateInCollection('gestion_records', initialData.id, recordToSave);
      await addAuditLog(user, `Editó Cliente en Gestión: ${form.nombre}`, 'Gestión');
      alert('Cliente Actualizado Correctamente');
      if (onCancel) onCancel();
    } else {
      await localDB.saveToCollection('gestion_records', recordToSave);

      if (duplicateToCRM) {
        await localDB.saveToCollection('crm_clients', {
          date: recordToSave.fechaIngreso,
          name: recordToSave.nombre,
          company: recordToSave.tipoEmpresa || 'Clínica',
          phone: recordToSave.celular,
          email: recordToSave.email,
          service: recordToSave.especialidadCliente || 'Gestión Integral',
          status: 'Prospecto',
          probability: 50,
          value: 0,
          rut: recordToSave.rut,
          category: recordToSave.categoria,
          nextContact: '',
          notes: 'Cliente importado desde Módulo de Gestión. ' + (recordToSave.observaciones || '')
        });
        await addAuditLog(user, `Duplicó Cliente a CRM Comercial: ${form.nombre}`, 'CRM Comercial');
      }
      
      await addNotification({
        title: 'Nuevo Cliente en Gestión',
        message: `${user.displayName || user.email} añadió a ${form.nombre} (${form.rut})`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
      await addAuditLog(user, `Añadió Cliente a Gestión: ${form.nombre}`, 'Gestión');
      alert('Cliente Guardado Correctamente');
      setForm({
        fechaIngreso: new Date().toISOString().split('T')[0],
        nombre: '',
        rut: '',
        tipoEmpresa: 'Otros',
        direccion: '',
        comuna: '',
        region: 'Metropolitana',
        celular: '',
        email: '',
        especialidadCliente: '',
        medioContacto: 'Whatsapp',
        medioContactoDetalle: '',
        categoria: 'Sin categoría',
        estado: 'En proceso',
        observaciones: ''
      });
    }
    window.dispatchEvent(new Event('db-change'));
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        for (const row of data as any[]) {
          const newRecord = {
            fechaIngreso: parseExcelDate(row["Fecha Ingreso"]) || new Date().toISOString().split('T')[0],
            nombre: safe(row["Nombre"]) || safe(row["Cliente"]),
            rut: safe(row["Rut"]) || safe(row["RUT"]),
            tipoEmpresa: safe(row["Tipo Empresa"]) || 'Otros',
            direccion: safe(row["Dirección"]) || "",
            comuna: safe(row["Comuna"]) || "",
            region: safe(row["Region"]) || "Metropolitana",
            celular: safe(row["Celular"]) || "",
            email: safe(row["E-mail"]) || "",
            especialidadCliente: safe(row["Especialidad Cliente"]) || "",
            medioContacto: safe(row["Medio Contacto"]) || "Whatsapp",
            medioContactoDetalle: safe(row["Detalle Medio"]) || "",
            consultora: safe(row["Consultora"]) || (user?.displayName || "Consultora CIMASUR"),
            categoria: safe(row["Categoria"]) || "Sin categoría",
            estado: safe(row["Estado"]) || "En proceso",
            observaciones: safe(row["Observaciones"]) || ""
          };
          if (newRecord.nombre && newRecord.rut) {
            await localDB.saveToCollection('gestion_records', newRecord);
            count++;
          }
        }
        if (user) await addAuditLog(user, `Importó ${count} clientes a Gestión desde Excel`, 'Gestión');
        alert(`Se importaron ${count} clientes correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo Excel.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#001736] p-4 text-white font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Registro de Nuevo Cliente en Gestión
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Importar Excel
          </button>
          <button 
            onClick={() => {
              const headers = [["Fecha Ingreso", "Nombre", "Rut", "Tipo Empresa", "Dirección", "Comuna", "Region", "Celular", "E-mail", "Especialidad Cliente", "Medio Contacto", "Detalle Medio", "Categoria", "Estado", "Observaciones"]];
              const ws = XLSX.utils.aoa_to_sheet(headers);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
              XLSX.writeFile(wb, "plantilla_importacion_gestion.xlsx");
            }}
            className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Plantilla
          </button>
        </div>
      </div>
      <form className="p-8 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GestionField label="Fecha de Registro">
            <input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngreso} onChange={e => setForm({...form, fechaIngreso: e.target.value})} required />
          </GestionField>
          <GestionField label="Nombre / Razón Social">
            <input className="w-full border-b p-2 text-sm font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre completo" required />
          </GestionField>
          <GestionField label="RUT">
            <input className="w-full border-b p-2 text-sm" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} placeholder="RUT" required />
          </GestionField>
          <GestionField label="Tipo Empresa">
             <select className="w-full border-b p-2 text-sm" value={form.tipoEmpresa} onChange={e => setForm({...form, tipoEmpresa: e.target.value})}>
                {TIPOS_EMPRESA.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </GestionField>

          <GestionField label="Dirección">
            <input className="w-full border-b p-2 text-sm" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Ej: Calle falsa 123" />
          </GestionField>
          <GestionField label="Comuna">
            <input className="w-full border-b p-2 text-sm" value={form.comuna} onChange={e => setForm({...form, comuna: e.target.value})} />
          </GestionField>
          <GestionField label="Región">
            <input className="w-full border-b p-2 text-sm" value={form.region} onChange={e => setForm({...form, region: e.target.value})} />
          </GestionField>
          <GestionField label="Celular">
            <input className="w-full border-b p-2 text-sm" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} placeholder="+569..." />
          </GestionField>

          <GestionField label="E-mail">
            <input type="email" className="w-full border-b p-2 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </GestionField>
          <GestionField label="Especialidad Cliente">
            <input className="w-full border-b p-2 text-sm" value={form.especialidadCliente} onChange={e => setForm({...form, especialidadCliente: e.target.value})} placeholder="Ej: Traumatología" />
          </GestionField>
          <GestionField label="Medio de Contacto">
             <select className="w-full border-b p-2 text-sm font-bold text-blue-600" value={form.medioContacto} onChange={e => setForm({...form, medioContacto: e.target.value})}>
                <option value="Google Form">Google Form</option>
                <option value="RSS">RSS</option>
                <option value="Pagina web">Página Web</option>
                <option value="Whatsapp">WhatsApp</option>
                <option value="Otros">Otros (detallar)</option>
             </select>
          </GestionField>
          {form.medioContacto === 'Otros' && (
            <GestionField label="Detalle Medio">
              <input className="w-full border-b p-2 text-sm bg-blue-50" placeholder="¿Cuál medio?" value={form.medioContactoDetalle} onChange={e => setForm({...form, medioContactoDetalle: e.target.value})}/>
            </GestionField>
          )}
          <GestionField label="Categoría">
             <select className="w-full border-b p-2 text-sm" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                {CATEGORIAS_GP.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </GestionField>
          <GestionField label="Estado">
             <select className="w-full border-b p-2 text-sm font-bold text-blue-600" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                {ESTADOS.filter(e => e !== 'Todos').map(e => <option key={e} value={e}>{e}</option>)}
             </select>
          </GestionField>
        </div>
        <GestionField label="Observaciones">
           <textarea 
             className="w-full h-32 p-4 border rounded-xl bg-slate-50 outline-none focus:bg-white" 
             value={form.observaciones}
             onChange={e => setForm({...form, observaciones: e.target.value})}
             placeholder="Primeras notas sobre el cliente..."
           />
        </GestionField>
        
        {!initialData && (
          <div className="flex items-center gap-2 p-4 bg-[#f0f4f8] rounded-xl border border-blue-100">
            <input 
              type="checkbox" 
              id="duplicateCRM" 
              checked={duplicateToCRM}
              onChange={e => setDuplicateToCRM(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded bg-white border-blue-300 focus:ring-blue-500"
            />
            <label htmlFor="duplicateCRM" className="text-sm font-bold text-slate-700 select-none">
              Duplicar automáticamente este registro en <span className="text-blue-600">CRM Comercial</span>
            </label>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t gap-4">
           {initialData && (
             <button 
               type="button"
               onClick={onCancel}
               className="bg-slate-200 text-slate-700 px-10 py-3 rounded-xl font-bold hover:bg-slate-300 transition-all"
             >
               CANCELAR
             </button>
           )}
           <button type="submit" className="bg-[#001736] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
             <Save className="w-5 h-5" /> {initialData ? 'ACTUALIZAR' : 'GUARDAR'} EN GESTIÓN
           </button>
        </div>
      </form>
    </div>
  );
}

function GestionList({ 
  records, 
  activities, 
  filters, 
  setFilters, 
  onOpenExpediente,
  onEdit
}: { 
  records: any[], 
  activities: any[], 
  filters: any, 
  setFilters: any,
  onOpenExpediente: (id: string) => void,
  onEdit: (record: any) => void
}) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = records.filter(r => {
    const searchMatch = (r.nombre || r.cliente || '').toLowerCase().includes(filters.search.toLowerCase()) || 
                      (r.rut || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                      (r.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                      (r.celular || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                      (r.comuna || '').toLowerCase().includes(filters.search.toLowerCase());
    const catMatch = filters.categoria === 'Todas' || r.categoria === filters.categoria;
    const estMatch = filters.estado === 'Todos' || r.estado === filters.estado;
    return searchMatch && catMatch && estMatch;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!id) {
       alert("Error: No se pudo encontrar el identificador del registro para eliminar.");
       return;
    }
    
    // We remove the confirm here because we will move to RecordActions which has its own modal,
    // OR we keep it if we don't migrate to RecordActions immediately.
    // Given the user said it "doesn't work", I'll keep it for now but make it more robust.
    if (!user) {
      alert("Error: Debes estar autenticado para realizar esta acción.");
      return;
    }
    
    try {
      await localDB.deleteFromCollection('gestion_records', id);
      await addAuditLog(user, `Eliminó Cliente de Gestión: ${name}`, 'Gestión');
      window.dispatchEvent(new Event('db-change'));
      // Adding a local alert to confirm success
      alert(`Cliente ${name} eliminado correctamente.`);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error al eliminar el registro en la base de datos.");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
         <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
               placeholder="Buscar Nombre, RUT, Correo, Comuna..." 
               className="pl-10 pr-4 py-2 border rounded-full text-xs w-full outline-none focus:ring-2 focus:ring-blue-100"
               value={filters.search}
               onChange={e => setFilters({...filters, search: e.target.value})}
            />
         </div>
         <select className="text-xs border rounded-full px-4 py-2 outline-none" value={filters.categoria} onChange={e => setFilters({...filters, categoria: e.target.value})}>
           <option value="Todas">Todas las Categorías</option>
           {CATEGORIAS_GP.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <select className="text-xs border rounded-full px-4 py-2 outline-none" value={filters.estado} onChange={e => setFilters({...filters, estado: e.target.value})}>
           {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
         </select>
         <div className="flex gap-2 justify-end">
            <button 
              onClick={() => {
                 const headers = ["Fecha Ingreso", "Nombre", "Rut", "Tipo Empresa", "Dirección", "Comuna", "Region", "Celular", "E-mail", "Especialidad", "Medio", "Detalle Medio", "Consultora", "Categoría", "Estado"];
                 const data = filtered.map(r => [
                   formatDate(r.fechaIngreso), 
                   r.nombre || r.cliente, 
                   r.rut, 
                   r.tipoEmpresa || '---',
                   r.direccion || '---',
                   r.comuna || '---',
                   r.region || '---',
                   r.celular || '---',
                   r.email || '---',
                   r.especialidadCliente || '---',
                   r.medioContacto || '---',
                   r.medioContactoDetalle || '---',
                   r.consultora || '---',
                   r.categoria || '---',
                   r.estado || '---'
                 ]);
                 exportTableToExcel('Clientes Gestión Completo', headers, data, 'listado_gestion_todo');
              }}
              className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 text-[10px] font-bold"
              title="Exportar Todo a Excel"
            >
               <FileSpreadsheet className="w-5 h-5" /> EXPORTAR TODO
            </button>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-xs">
              <thead>
                 <tr className="bg-[#001736] text-white border-b text-left text-[10px] font-black uppercase tracking-widest">
                    <th className="p-4 bg-[#001736]">F. Registro</th>
                    <th className="p-4 bg-[#001736]">Cliente / Info Contacto</th>
                    <th className="p-4 border-l border-white/10 bg-[#001736]">Ubicación / Tipo</th>
                    <th className="p-4 border-l border-white/10 bg-[#001736]">Gestión / Categoría</th>
                    <th className="p-4 text-right bg-[#001736]">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filtered.map(r => (
                   <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 align-top">
                         <div className="text-slate-500 font-mono font-bold whitespace-nowrap">{formatDate(r.fechaIngreso)}</div>
                         <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-tight">Vía: {r.medioContacto || '---'}</div>
                      </td>
                      <td className="p-4 align-top">
                         <div className="font-bold text-[#001736] text-sm uppercase">{r.nombre || r.cliente}</div>
                         <div className="text-[10px] text-slate-400 font-mono mb-2">{r.rut}</div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500">
                               <Phone className="w-3 h-3" /> {r.celular || '---'}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                               <Mail className="w-3 h-3" /> {r.email || '---'}
                            </div>
                         </div>
                      </td>
                      <td className="p-4 border-l align-top">
                         <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 uppercase tracking-tighter">
                            <MapPin className="w-3 h-3 text-red-400" /> {r.comuna || '---'}
                         </div>
                         <div className="text-[10px] text-slate-400 mb-2">{r.region || '---'}</div>
                         <div className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded inline-block text-[9px] font-bold uppercase">
                            {r.tipoEmpresa || 'Otros'}
                         </div>
                      </td>
                      <td className="p-4 border-l align-top">
                         <div className="mb-2">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm border",
                             r.categoria === 'Platinum' ? "bg-purple-50 text-purple-700 border-purple-200" :
                             r.categoria === 'Oro' ? "bg-amber-50 text-amber-700 border-amber-200" :
                             r.categoria === 'Plata' ? "bg-slate-50 text-slate-700 border-slate-300" :
                             "bg-slate-50 text-slate-500 border-slate-200"
                           )}>{r.categoria || 'Sin categoría'}</span>
                         </div>
                         <div className="mb-2">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm border",
                             r.estado === 'Finalizado' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                             r.estado === 'En proceso' ? "bg-blue-50 text-blue-700 border-blue-200" :
                             r.estado === 'Sin compra' ? "bg-red-50 text-red-700 border-red-200" :
                             r.estado === 'Con compra' ? "bg-blue-50 text-blue-800 border-blue-300" :
                             "bg-slate-50 text-slate-500 border-slate-200"
                           )}>{r.estado || 'En proceso'}</span>
                         </div>
                         <div className="text-[9px] text-slate-400 italic">Resp: {r.consultora}</div>
                      </td>
                      <td className="p-4 text-right align-top">
                         <div className="flex justify-end gap-2 text-white">
                            <button 
                              onClick={() => onOpenExpediente(r.id)}
                              className="bg-[#001736] p-2 rounded-lg hover:bg-blue-900 transition-all shadow-sm"
                              title="Gestionar Expediente"
                            >
                               <History className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                const data = [
                                  { label: 'Nombre', value: r.nombre || r.cliente },
                                  { label: 'RUT', value: r.rut },
                                  { label: 'Tipo Empresa', value: r.tipoEmpresa || 'Otros' },
                                  { label: 'Dirección', value: `${r.direccion || ''} ${r.comuna || ''} ${r.region || ''}` },
                                  { label: 'Celular', value: r.celular || '---' },
                                  { label: 'Email', value: r.email || '---' },
                                  { label: 'Medio', value: `${r.medioContacto || '---'} ${r.medioContactoDetalle ? '('+r.medioContactoDetalle+')' : ''}` },
                                  { label: 'Especialidad', value: r.especialidadCliente || '---' },
                                  { label: 'Consultora', value: r.consultora },
                                  { label: 'Categoría', value: r.categoria },
                                  { label: 'Estado', value: r.estado },
                                  { label: 'Fecha Ingreso', value: formatDate(r.fechaIngreso) },
                                  { label: 'Observaciones', value: r.observaciones || 'Sin registros.' }
                                ];
                                const clientActivities = activities.filter(a => a.clienteRut === r.rut || (r.id && a.clienteId === r.id));
                                const tables = clientActivities.length > 0 ? [
                                  {
                                    title: 'Historial de Actividades',
                                    headers: ['Fecha', 'Actividad', 'Responsable', 'Detalle'],
                                    rows: clientActivities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(a => [
                                      formatDate(a.fecha),
                                      a.actividad,
                                      a.responsable,
                                      a.detalle || '---'
                                    ])
                                  }
                                ] : [];
                                
                                import('../lib/pdfUtils').then(pdf => {
                                  pdf.viewExpedienteInNewTab(`Expediente Gestión: ${r.nombre || r.cliente}`, data, `gestion_${r.rut}`, tables);
                                });
                              }}
                              className="bg-blue-500 p-2 rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                              title="Ver Expediente (Pestaña)"
                            >
                               <ExternalLink className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onEdit(r)}
                              className="bg-emerald-500 p-2 rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                              title="Editar Información"
                            >
                               <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(r.id, r.nombre || r.cliente);
                              }}
                              className="bg-red-500 p-2 rounded-lg hover:bg-red-600 transition-all shadow-sm"
                              title="Eliminar de Gestión"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                   </tr>
                 ))}
                 {filtered.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-10 text-center text-slate-400 italic">No hay registros de gestión para mostrar.</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

function GestionField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{label}</label>
      {children}
    </div>
  );
}
