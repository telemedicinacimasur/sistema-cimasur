import React, { useState, useEffect } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF } from '../lib/pdfUtils';
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
  Download
} from 'lucide-react';
import { RecordActions } from '../components/RecordActions';

export default function CRMView() {
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
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
        </div>
      </div>

      {activeTab === 'register' ? <CRMRegister /> : <CRMTable records={records} filters={filters} setFilters={setFilters} />}
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
    responsable: ''
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
    setForm({ ...form, name: '', rut: '', historialUnificado: '' });
  };

  const handleImport = () => {
    const csvContent = "Nombre,RUT,Email,Teléfono,Región,Tipo,Categoría\n" +
                       "Ejemplo Cliente,12345678-9,ejemplo@correo.cl,912345678,Metropolitana,Empresa,Premium";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_importacion_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
         <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Ficha de Registro de Cliente</span>
         <button 
           onClick={handleImport}
           className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors uppercase font-black"
         >
           Importar Clientes
         </button>
      </div>
      <form className="p-8 space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <CRMField label="Fecha Ingreso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngreso} onChange={e => setForm({...form, fechaIngreso: e.target.value})} /></CRMField>
           <CRMField label="Nombre / Razón Social"><input className="w-full border-b p-2 text-sm font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></CRMField>
           <CRMField label="RUT / ID"><input className="w-full border-b p-2 text-sm" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} required /></CRMField>
           <CRMField label="Teléfono"><input className="w-full border-b p-2 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></CRMField>
           
           <CRMField label="Email"><input type="email" className="w-full border-b p-2 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></CRMField>
           <CRMField label="Región de Chile">
              <select className="w-full border-b p-2 text-sm" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                {REGIONES.filter(r => r !== 'Todas').map(r => <option key={r}>{r}</option>)}
              </select>
           </CRMField>
           <CRMField label="Tipo de Cliente">
              <select className="w-full border-b p-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Farmacia</option><option>Centro Médico</option><option>Independiente</option><option>Otros</option>
              </select>
           </CRMField>
           <CRMField label="Categoría de Cliente">
              <select className="w-full border-b p-2 text-sm font-black text-blue-600" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
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
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [newHistory, setNewHistory] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const filtered = records.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(filters.search.toLowerCase()) || r.rut.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRegion = filters.region === 'Todas' || r.region === filters.region;
    const matchesType = filters.type === 'Todos' || r.type === filters.type;
    return matchesSearch && matchesRegion && matchesType;
  });

  const handleUpdate = async () => {
    if (!selectedClient) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logHeader = `\n\n--- Actualización del ${dateStr} ---`;
    const catLog = newCategory && newCategory !== selectedClient.categoria 
      ? `\n[SISTEMA] Actualizado a ${newCategory} fecha ${dateStr}` 
      : '';
    
    const updatedHistory = selectedClient.historialUnificado + logHeader + catLog + (newHistory ? `\n${newHistory}` : '');
    
    await localDB.updateInCollection('contacts', selectedClient.id, { 
      historialUnificado: updatedHistory,
      categoria: newCategory || selectedClient.categoria
    });
    alert('Expediente actualizado');
    setSelectedClient(null);
    setNewHistory('');
    setNewCategory('');
  };

  if (selectedClient) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-500">
        <div className="bg-[#001736] p-4 text-white flex justify-between items-center">
           <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Expediente: {selectedClient.name}</h3>
           <button onClick={() => setSelectedClient(null)} className="text-xs uppercase font-black opacity-70 hover:opacity-100">Cerrar</button>
        </div>
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                 <div><span className="font-black text-slate-400 block uppercase">RUT</span> {selectedClient.rut}</div>
                 <div><span className="font-black text-slate-400 block uppercase">Región</span> {selectedClient.region}</div>
                 <div><span className="font-black text-slate-400 block uppercase">Tipo</span> {selectedClient.type}</div>
                 <div><span className="font-black text-slate-400 block uppercase">Ingreso</span> {selectedClient.fechaIngreso || 'N/A'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                 <h4 className="text-[10px] font-black text-blue-900 mb-2 uppercase">Historial Acumulado</h4>
                 <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-600 bg-white p-4 border rounded italic">
                    {selectedClient.historialUnificado || 'Sin registros previos.'}
                 </div>
              </div>
           </div>
           <div className="space-y-4">
              <CRMField label="Nueva Gestión / Nota de Seguimiento">
                 <textarea 
                   className="w-full h-32 p-3 border rounded text-sm bg-slate-50 focus:bg-white" 
                   value={newHistory}
                   onChange={e => setNewHistory(e.target.value)}
                   placeholder="Escriba aquí los nuevos avances..."
                 />
              </CRMField>
              <CRMField label="Actualizar Categoría">
                 <select 
                   className="w-full border p-2 text-sm font-black" 
                   value={newCategory || selectedClient.categoria}
                   onChange={e => setNewCategory(e.target.value)}
                 >
                   {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                 </select>
              </CRMField>
              <button 
                onClick={handleUpdate}
                className="w-full bg-[#001736] text-white py-3 rounded-xl font-bold mt-4 shadow-lg"
              >
                 ACTUALIZAR EXPEDIENTE
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <option>Farmacia</option><option>Centro Médico</option><option>Independiente</option><option>Otros</option>
         </select>
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
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-xs">
              <thead>
                 <tr className="bg-slate-50 border-b text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="p-5">Razón Social / Cliente</th>
                    <th className="p-5">Región</th>
                    <th className="p-5">Categoría</th>
                    <th className="p-5">Tipo</th>
                    <th className="p-5 text-right px-8">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filtered.map(r => (
                   <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-5">
                         <div className="font-bold text-[#001736]">{r.name}</div>
                         <div className="text-[10px] text-slate-400 font-mono">{r.rut}</div>
                      </td>
                      <td className="p-5 text-slate-500 italic">{r.region}</td>
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
                               { label: 'Región de Chile', value: r.region },
                               { label: 'Tipo', value: r.type },
                               { label: 'Categoría CRM', value: r.categoria },
                               { label: 'Fecha de Ingreso', value: r.fechaIngreso || 'N/A' },
                               { label: 'Historial Unificado', value: r.historialUnificado || 'Sin registros preexistentes.' }
                             ];
                             exportExpedienteToPDF(
                               `Expediente de Cliente: ${r.name}`,
                               expediteData,
                               `cliente_${r.rut || r.id}`
                             );
                           }}
                           onDelete={async () => {
                             if (true) {
                               try {
                                 await localDB.deleteFromCollection('contacts', r.id);
                                 // Relying on db-change event listener for state update
                               } catch (err) {
                                 console.error(err);
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

