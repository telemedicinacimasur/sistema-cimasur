import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, parseExcelDate, safe, formatDateForExcel } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, 
  UserPlus, 
  History, 
  Search,
  Save,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Filter,
  FileText,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { RecordActions } from '../components/RecordActions';

export default function CRMView() {
  const [activeTab, setActiveTab] = useState<'register' | 'list' | 'activities'>('register');
  const [records, setRecords] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    region: 'Todas',
    type: 'Todos'
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await localDB.getCollection('contacts');
      setRecords(data);
    };
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[#001736]">CRM Comercial</h2>
          <p className="text-slate-500 text-sm">Fidelización y seguimiento de la cartera corporativa.</p>
        </div>
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'register' ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Ficha Registro
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'list' ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Cartera de Clientes
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'activities' ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Registro de Actividades
          </button>
        </div>
      </div>

      {activeTab === 'register' && <CRMRegister />}
      {activeTab === 'list' && <CRMTable records={records} filters={filters} setFilters={setFilters} />}
      {activeTab === 'activities' && <CRMActivities />}
    </div>
  );
}

const REGIONES = [
  'Todas', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes'
];

const CATEGORIAS = ['Sin compra', 'Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];

function CRMRegister() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fechaIngreso: new Date().toISOString().split('T')[0],
    name: '',
    rut: '',
    phone: '',
    email: '',
    region: 'Metropolitana',
    type: 'Farmacia',
    categoria: 'Sin categoría',
    historialUnificado: '',
    responsable: '',
    intranet: 'No'
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, responsable: user.displayName }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await localDB.saveToCollection('contacts', form);
    await addAuditLog(user, `Registró Cliente ${form.name}`, 'CRM');
    alert('Cliente Guardado en CRM');
    setForm({ 
      fechaIngreso: new Date().toISOString().split('T')[0],
      name: '',
      rut: '',
      phone: '',
      email: '',
      region: 'Metropolitana',
      type: 'Farmacia',
      categoria: 'Sin categoría',
      historialUnificado: '',
      responsable: user.displayName,
      intranet: 'No'
    });
    window.dispatchEvent(new Event('db-change'));
  };

  const downloadExcelTemplate = () => {
    const headers = [
      ["Fecha Ingreso", "Nombre / Razón Social", "RUT / ID", "Teléfono", "Email", "Comuna", "Tipo de Cliente", "Categoría de Cliente", "Inscrito en Intranet"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
    XLSX.writeFile(wb, "plantilla_importacion_clientes.xlsx");
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
          const fechaIngreso = parseExcelDate(row["Fecha Ingreso"]);

          const newContact = {
            fechaIngreso: fechaIngreso,
            name: safe(row["Nombre / Razón Social"]),
            rut: safe(row["RUT / ID"]),
            phone: safe(row["Teléfono"]),
            email: safe(row["Email"]),
            region: safe(row["Comuna"]) || 'Metropolitana',
            type: safe(row["Tipo de Cliente"]) || 'Farmacia',
            categoria: safe(row["Categoría de Cliente"]) || 'Sin categoría',
            intranet: safe(row["Inscrito en Intranet"]) || 'No',
            historialUnificado: `Importado mediante Excel el ${new Date().toLocaleDateString('es-CL')}`,
            responsable: user.displayName || user.email || 'Sistema'
          };

          if (newContact.name && newContact.rut) {
            await localDB.saveToCollection('contacts', newContact);
            importedCount++;
          }
        }

        await addAuditLog(user, `Importó ${importedCount} clientes desde Excel`, 'CRM');
        alert(`Éxito: Se importaron ${importedCount} clientes correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Asegúrese de usar la plantilla correcta.");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
         <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Ficha de Registro de Cliente</span>
         <div className="flex gap-2">
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".xlsx, .xls"
             onChange={handleFileUpload}
           />
           <button 
             onClick={downloadExcelTemplate}
             className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
             title="Descargar Plantilla Excel"
           >
             <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla Excel
           </button>
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
           >
             <Upload className="w-3.5 h-3.5" /> Importar Datos
           </button>
         </div>
      </div>
      <form className="p-8 space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <CRMField label="Fecha Ingreso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngreso} onChange={e => setForm({...form, fechaIngreso: e.target.value})} /></CRMField>
           <CRMField label="Nombre / Razón Social"><input className="w-full border-b p-2 text-sm font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></CRMField>
           <CRMField label="RUT / ID"><input className="w-full border-b p-2 text-sm" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} required /></CRMField>
           <CRMField label="Teléfono"><input className="w-full border-b p-2 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></CRMField>
           
           <CRMField label="Email"><input type="email" className="w-full border-b p-2 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></CRMField>
           <CRMField label="Comuna"><input className="w-full border-b p-2 text-sm" value={form.region} onChange={e => setForm({...form, region: e.target.value})} /></CRMField>
           <CRMField label="Tipo de Cliente">
              <select className="w-full border-b p-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Farmacia</option><option>Centro Médico</option><option>Empresa</option><option>Independiente</option><option>Otros</option>
              </select>
           </CRMField>
           <CRMField label="Categoría de Cliente">
              <select className="w-full border-b p-2 text-sm font-black text-blue-600" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
           </CRMField>
           <CRMField label="Inscrito en Intranet">
              <select className="w-full border-b p-2 text-sm font-bold text-slate-700" value={form.intranet} onChange={e => setForm({...form, intranet: e.target.value})}>
                <option value="No">No</option>
                <option value="Si">Si</option>
              </select>
           </CRMField>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase text-blue-900 tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Historial Escrito Unificado (Core)
           </label>
           <p className="text-[10px] text-slate-400 mb-2 italic">Registre aquí beneficios usados, gestiones, avances y observaciones vitales del ciclo de vida.</p>
           <textarea 
             className="w-full h-48 p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm leading-relaxed"
             placeholder="Narrequí todo el proceso con el cliente..."
             value={form.historialUnificado}
             onChange={e => setForm({...form, historialUnificado: e.target.value})}
           ></textarea>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
           <button type="submit" className="bg-[#001736] text-white px-12 py-4 rounded-xl font-bold shadow-xl hover:translate-y-[-2px] transition-all flex items-center gap-2">
              <Save className="w-5 h-5" /> GUARDAR FICHA CRM
           </button>
        </div>
      </form>
    </div>
  );
}

function CRMTable({ records, filters, setFilters }: { records: any[], filters: any, setFilters: any }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [newHistory, setNewHistory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newIntranet, setNewIntranet] = useState('');
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('En proceso');

  const filtered = records.filter(r => {
    const name = safe(r.name).toLowerCase();
    const rut = safe(r.rut).toLowerCase();
    const search = filters.search.toLowerCase();
    const matchesSearch = name.includes(search) || rut.includes(search);
    const matchesRegion = filters.region === 'Todas' || safe(r.region) === filters.region;
    const matchesType = filters.type === 'Todos' || safe(r.type) === filters.type;
    return matchesSearch && matchesRegion && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`¿Está seguro que desea eliminar masivamente ${selectedIds.length} registros? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        console.log(`Debug: Deleting record ${id}`);
        await localDB.deleteFromCollection('contacts', id);
      }
      setSelectedIds([]);
      window.dispatchEvent(new Event('db-change'));
      alert(`Se han eliminado ${selectedIds.length} registros correctamente.`);
    } catch (err) {
      console.error('Error during bulk delete:', err);
      alert('Hubo un problema al eliminar algunos registros.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logHeader = `\n\n--- ${activityType} (${dateStr}) ---`;
    
    const updatedHistory = (selectedClient.historialUnificado || '') + logHeader + (newHistory ? `\n[Estado: ${currentStatus}] - ${newHistory}` : `\n[Actualización de datos: ${currentStatus}]`);
    
    await localDB.updateInCollection('contacts', selectedClient.id, { 
      name: selectedClient.name,
      rut: selectedClient.rut,
      phone: selectedClient.phone,
      email: selectedClient.email,
      categoria: newCategory || selectedClient.categoria,
      intranet: newIntranet || selectedClient.intranet || 'No',
      historialUnificado: updatedHistory
    });
    alert('Expediente actualizado correctamente');
    setSelectedClient(null);
    setNewHistory('');
    setNewCategory('');
    setNewIntranet('');
    window.dispatchEvent(new Event('db-change'));
  };

  const exportRecordToExcel = (record: any) => {
    const data = [
      ["Nombre / Razón Social", record.name || "---"],
      ["RUT / ID", record.rut || "---"],
      ["Email", record.email || "---"],
      ["Teléfono", record.phone || "---"],
      ["Comuna", record.region || "---"],
      ["Tipo", record.type || "---"],
      ["Categoría", record.categoria || "---"],
      ["Intranet", record.intranet || "No"],
      ["Fecha Ingreso", formatDateForExcel(record.fechaIngreso)],
      ["Historial", record.historialUnificado || "---"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expediente");
    XLSX.writeFile(wb, `expediente_${record.rut || record.id}.xlsx`);
  };

  if (selectedClient) {
    return (
      <div className="bg-slate-50 min-h-[600px] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500 border border-slate-200">
        <div className="bg-[#001736] p-6 text-white flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-white/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-400" />
             </div>
             <div>
               <h3 className="text-xl font-bold leading-tight">Expediente de Cliente</h3>
               <p className="text-xs uppercase tracking-widest font-black text-blue-300 opacity-80">{selectedClient.name}</p>
             </div>
           </div>
           <button onClick={() => setSelectedClient(null)} className="bg-red-900/40 border border-red-500/30 text-red-200 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-800 transition-all active:scale-95">Cerrar Expediente</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
           <div className="lg:col-span-8 p-6 lg:p-8 space-y-8">
              {/* Top Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">RUT</span>
                    <span className="text-sm font-bold text-[#001736]">{selectedClient.rut}</span>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Comuna</span>
                    <span className="text-sm font-bold text-[#001736]">{selectedClient.region}</span>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo Empresa</span>
                    <span className="text-sm font-bold text-[#001736]">{selectedClient.type}</span>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha Ingreso</span>
                    <span className="text-sm font-bold text-[#001736]">{formatDate(selectedClient.fechaIngreso)}</span>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                    <span className="block text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1">Inscrito Intranet</span>
                    <span className={cn(
                      "text-sm font-black italic",
                      (newIntranet || selectedClient.intranet) === 'Si' ? "text-emerald-600" : "text-red-500"
                    )}>{newIntranet || selectedClient.intranet || 'No'}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-tighter flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                       Historial detallado de actividades
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {(selectedClient.historialUnificado || '').split('---').length - 1} registros encontrados
                    </span>
                 </div>
                 <div className="bg-white border rounded-2xl p-8 shadow-inner min-h-[300px] flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    {selectedClient.historialUnificado ? (
                      <div className="w-full text-sm leading-relaxed text-slate-600 italic whitespace-pre-wrap font-medium">
                         {selectedClient.historialUnificado}
                      </div>
                    ) : (
                      <div className="text-center opacity-40">
                         <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                         <p className="text-sm font-medium">No se han registrado actividades para este expediente aún.</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Sidebar: Management */}
           <div className="lg:col-span-4 bg-white border-l border-slate-200 p-8 space-y-8">
              <div className="space-y-6">
                <div>
                   <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Nueva Gestión / Seguimiento
                   </h4>
                   <div className="h-px bg-slate-200 mb-8" />
                </div>

                <CRMField label="Tipo de Actividad">
                  <select 
                    className="w-full border-b bg-slate-50 border-slate-200 p-3 text-sm focus:bg-white transition-all outline-none" 
                    value={activityType}
                    onChange={e => setActivityType(e.target.value)}
                  >
                    <option>Nota de Seguimiento</option>
                    <option>Llamada Telefónica</option>
                    <option>Reunión Presencial</option>
                    <option>Campaña Email</option>
                    <option>Otro</option>
                  </select>
                </CRMField>

                <CRMField label="Detalle de la Actividad">
                  <textarea 
                    className="w-full h-40 p-4 border rounded-xl bg-slate-50 focus:bg-white text-sm transition-all outline-none resize-none" 
                    value={newHistory}
                    onChange={e => setNewHistory(e.target.value)}
                    placeholder="Escriba los pormenores de la gestión realizada..."
                  />
                </CRMField>

                <div className="grid grid-cols-2 gap-4">
                  <CRMField label="Categoría">
                    <select 
                      className="w-full border-b bg-slate-50 border-slate-200 p-3 text-sm font-bold text-blue-600 outline-none" 
                      value={newCategory || selectedClient.categoria}
                      onChange={e => setNewCategory(e.target.value)}
                    >
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </CRMField>
                  <CRMField label="Estado Actual">
                     <select 
                       className="w-full border-b bg-slate-50 border-slate-200 p-3 text-sm font-bold text-slate-700 outline-none"
                       value={currentStatus}
                       onChange={e => setCurrentStatus(e.target.value)}
                     >
                       <option>En proceso</option>
                       <option>Completado</option>
                       <option>Pendiente</option>
                       <option>Cancelado</option>
                     </select>
                  </CRMField>
                </div>

                <CRMField label="Inscrito en Intranet">
                    <select 
                      className="w-full border-b bg-slate-50 border-slate-200 p-3 text-sm font-black text-blue-800 outline-none" 
                      value={newIntranet || selectedClient.intranet || 'No'}
                      onChange={e => setNewIntranet(e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Si">Si</option>
                    </select>
                </CRMField>

                <button 
                  onClick={handleUpdate}
                  className="w-full bg-[#001736] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all active:scale-95 text-xs ring-4 ring-white"
                >
                   <Save className="w-5 h-5" /> Registrar en Expediente
                </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar por Nombre o RUT..." 
              className="pl-10 pr-4 py-2 border rounded-full text-xs w-full outline-none focus:ring-2 focus:ring-blue-100"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
         </div>
         <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="text-xs border rounded-full px-4 py-2 w-full outline-none"
              value={filters.region}
              onChange={e => setFilters({...filters, region: e.target.value})}
            >
               {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
         </div>
         <select 
           className="text-xs border rounded-full px-4 py-2 w-full outline-none"
           value={filters.type}
           onChange={e => setFilters({...filters, type: e.target.value})}
         >
            <option value="Todos">Todos los tipos</option>
            <option>Farmacia</option><option>Centro Médico</option><option>Empresa</option><option>Independiente</option><option>Otros</option>
         </select>
         <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                const data = filtered.map(r => [
                  r.name,
                  r.rut,
                  r.region,
                  r.categoria,
                  r.type,
                  r.phone || '---',
                  r.email || '---'
                ]);
                exportTableToPDF(
                  'Reporte: Cartera de Clientes (CRM Comercial)',
                  ['Nombre/Razón Social', 'RUT', 'Región', 'Categoría', 'Tipo', 'Teléfono', 'Email'],
                  data,
                  'cartera_clientes_crm'
                );
              }}
              className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-2 rounded-full font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-2"
              title="Exportar a PDF"
            >
              <Download className="w-4 h-4" /> Exportar Filtrados
            </button>
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="w-full bg-red-50 border border-red-200 text-red-700 py-2 rounded-full font-bold text-xs hover:bg-red-100 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
              </button>
            )}
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-xs">
              <thead>
                 <tr className="bg-slate-50 border-b text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="p-5">
                       <input 
                         type="checkbox" 
                         className="rounded"
                         checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                         onChange={toggleSelectAll}
                       />
                     </th>
                    <th className="p-5">Razón Social / Cliente</th>
                    <th className="p-5">Comuna</th>
                    <th className="p-5">Email</th>
                    <th className="p-5">Fecha Ingreso</th>
                    <th className="p-5">Categoría</th>
                    <th className="p-5">Tipo</th>
                    <th className="p-5 text-right px-8">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filtered.map(r => (
                   <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-5">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="p-5">
                         <div className="font-bold text-[#001736]">{r.name}</div>
                         <div className="text-[10px] text-slate-400 font-mono">{r.rut}</div>
                      </td>
                      <td className="p-5 text-slate-500 italic">{r.region}</td>
                      <td className="p-5 text-slate-600">{r.email || '---'}</td>
                      <td className="p-5 text-slate-600">{formatDate(r.fechaIngreso) || '---'}</td>
                      <td className="p-5">
                         <span className={cn(
                           "px-3 py-1 rounded-full font-black text-[9px] uppercase",
                           r.categoria === 'Platinum' ? "bg-purple-100 text-purple-700" :
                           r.categoria === 'Oro' ? "bg-amber-100 text-amber-700" :
                           "bg-slate-100 text-slate-700"
                         )}>{r.categoria}</span>
                      </td>
                      <td className="p-5 font-medium text-blue-900">{r.type}</td>
                      <td className="p-5 text-right">
                         <RecordActions 
                           onView={() => setSelectedClient(r)}
                           onDownload={() => {
                             const expediteData = [
                               { label: 'Razón Social / Nombre', value: r.name },
                               { label: 'RUT / ID', value: r.rut },
                               { label: 'Email', value: r.email },
                               { label: 'Teléfono', value: r.phone },
                               { label: 'Región / Comuna', value: r.region },
                               { label: 'Tipo', value: r.type },
                               { label: 'Categoría CRM', value: r.categoria },
                               { label: 'Inscrito en Intranet', value: r.intranet || 'No' },
                               { label: 'Fecha de Ingreso', value: formatDate(r.fechaIngreso) || 'N/A' },
                               { label: 'Historial Unificado', value: r.historialUnificado || 'Sin registros preexistentes.' }
                             ];
                             exportExpedienteToPDF(
                               `Expediente de Cliente: ${r.name}`,
                               expediteData,
                               `cliente_${r.rut || r.id}`
                             );
                           }}
                           onExcel={() => exportRecordToExcel(r)}
                           onEdit={() => setSelectedClient(r)}
                           onDelete={async () => {
                             try {
                               await localDB.deleteFromCollection('contacts', r.id);
                               window.dispatchEvent(new Event('db-change'));
                             } catch (err) {
                               console.error(err);
                               alert('Error al eliminar');
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

function CRMActivities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<any | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    campania: '',
    tipo: 'Campaña Comercial',
    observaciones: '',
    responsable: '',
    targetCategories: [] as string[]
  });

  const loadActivities = async () => {
    const data = await localDB.getCollection('crm_activities');
    setActivities(data);
  };

  useEffect(() => {
    loadActivities();
    if (user && !editingId) setForm(prev => ({ 
      ...prev, 
      responsable: user.displayName || user.email || '',
      targetCategories: []
    }));
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (editingId) {
      await localDB.updateInCollection('crm_activities', editingId, form);
      await addAuditLog(user, `Actualizó Actividad: ${form.campania}`, 'CRM');
      alert('Actividad Actualizada');
      setEditingId(null);
    } else {
      await localDB.saveToCollection('crm_activities', form);
      await addAuditLog(user, `Registró Actividad: ${form.campania}`, 'CRM');
      
      // Automatic update in customer records
      if (form.targetCategories.length > 0) {
        const contacts = await localDB.getCollection('contacts');
        const targetedContacts = contacts.filter(c => form.targetCategories.includes(c.categoria));
        
        for (const contact of targetedContacts) {
          const logHeader = `\n\n--- Automatización: ${form.campania} ---`;
          const updatedHistory = (contact.historialUnificado || '') + logHeader + `\n[${form.tipo}] - ${form.observaciones}`;
          await localDB.updateInCollection('contacts', contact.id, {
            historialUnificado: updatedHistory
          });
        }
        alert(`Actividad registrada y aplicada automáticamente a ${targetedContacts.length} clientes.`);
      } else {
        alert('Actividad Registrada');
      }
    }
    
    setForm({ 
      fecha: new Date().toISOString().split('T')[0],
      campania: '', 
      tipo: 'Campaña Comercial',
      observaciones: '',
      responsable: user?.displayName || user?.email || '',
      targetCategories: []
    });
    loadActivities();
    window.dispatchEvent(new Event('db-change'));
  };

  const filteredActivities = activities.filter(a => a.campania.toLowerCase().includes(filterSearch.toLowerCase()));

  const handleEdit = (act: any) => {
    setEditingId(act.id);
    setForm({
      fecha: act.fecha,
      campania: act.campania,
      tipo: act.tipo,
      observaciones: act.observaciones,
      responsable: act.responsable
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {detailView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#002b5b] p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" /> Detalle de Actividad
              </h3>
              <button onClick={() => setDetailView(null)} className="text-white/70 hover:text-white transition-colors">
                <Trash2 className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8 border-b pb-6">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Campaña / Actividad</span>
                  <span className="text-lg font-bold text-[#002b5b]">{detailView.campania}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha</span>
                  <span className="text-lg font-bold text-[#002b5b]">{formatDate(detailView.fecha)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold text-xs">{detailView.tipo}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Responsable</span>
                  <span className="text-[#002b5b] font-medium">{detailView.responsable}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Observaciones y Resultados</span>
                <div className="bg-slate-50 p-6 rounded-xl text-slate-700 italic leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {detailView.observaciones || "Sin observaciones registradas."}
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => setDetailView(null)}
                  className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2">
             <TrendingUp className="w-5 h-5" /> 
             {editingId ? 'Editando Actividad / Campaña' : 'Registro de Actividades / Campañas'}
           </span>
           {editingId && (
             <button 
               onClick={() => {
                 setEditingId(null);
                 setForm({
                   fecha: new Date().toISOString().split('T')[0],
                   campania: '',
                   tipo: 'Campaña Comercial',
                   observaciones: '',
                   responsable: user?.displayName || user?.email || ''
                 });
               }}
               className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded uppercase font-black transition-colors"
             >
               Cancelar Edición
             </button>
           )}
        </div>
        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CRMField label="Fecha">
              <input type="date" className="w-full border-b p-2" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required />
            </CRMField>
            <CRMField label="Nombre de Campaña / Actividad">
              <input 
                className="w-full border-b p-2 font-bold" 
                placeholder="Ej: AGENDA DE INDUCCIÓN" 
                value={form.campania} 
                onChange={e => setForm({...form, campania: e.target.value})} 
                required 
              />
            </CRMField>
            <CRMField label="Tipo de Actividad">
              <select className="w-full border-b p-2" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option>Campaña comercial/wsp</option>
                <option>Inducción</option>
                <option>Email Marketing</option>
                <option>Instagram y whatsapp</option>
                <option>otros (detallar cuál)</option>
              </select>
            </CRMField>
          </div>
          <CRMField label="Categorías Objetivo (Opcional)">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-50 p-3 rounded">
               {CATEGORIAS.map(cat => (
                 <label key={cat} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                   <input 
                     type="checkbox"
                     checked={form.targetCategories.includes(cat)}
                     onChange={(e) => {
                       if (e.target.checked) setForm({...form, targetCategories: [...form.targetCategories, cat]});
                       else setForm({...form, targetCategories: form.targetCategories.filter(c => c !== cat)});
                     }}
                   />
                   {cat}
                 </label>
               ))}
            </div>
          </CRMField>
          <CRMField label="Observaciones y Resultados">
            <textarea 
              className="w-full h-24 p-4 border rounded-xl bg-slate-50 focus:bg-white outline-none"
              placeholder="Detalle los objetivos y resultados de esta actividad..."
              value={form.observaciones}
              onChange={e => setForm({...form, observaciones: e.target.value})}
            />
          </CRMField>
          <div className="flex justify-end">
            <button type="submit" className="bg-[#001736] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> {editingId ? 'ACTUALIZAR CAMBIOS' : 'REGISTRAR ACTIVIDAD'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Historial de Actividades Recientes</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar..." 
              className="pl-8 pr-2 py-1 border rounded text-xs outline-none"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Fecha</th>
                <th className="p-4">Campaña / Actividad</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => (
                <tr key={act.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">{formatDate(act.fecha)}</td>
                  <td className="p-4 font-bold text-[#001736]">{act.campania}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{act.tipo}</span></td>
                  <td className="p-4 text-slate-500">{act.responsable}</td>
                  <td className="p-4 text-right">
                    <RecordActions 
                      onView={() => setDetailView(act)}
                      onEdit={() => handleEdit(act)}
                      onDelete={async () => {
                         try {
                           await localDB.deleteFromCollection('crm_activities', act.id);
                           loadActivities();
                         } catch (err) {
                           console.error(err);
                           alert('Error al eliminar');
                         }
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">No hay actividades registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CRMField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
