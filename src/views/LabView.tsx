import React, { useState, useEffect, useMemo } from 'react';
import { localDB, localAuth, addAuditLog } from '../lib/auth';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { 
  Beaker, 
  Microscope, 
  FlaskConical, 
  ArrowLeft, 
  Save, 
  Download, 
  Search,
  ClipboardList,
  ClipboardCheck,
  FilePlus,
  Table,
  Package,
  BookOpen,
  Settings,
  Droplets,
  Trash2,
  Edit,
  FileUp,
  PlusCircle,
  History,
  ExternalLink,
  FileText,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RecordActions } from '../components/RecordActions';
import { exportTableToPDF, exportExpedienteToPDF, viewExpedienteInNewTab } from '../lib/pdfUtils';

type LabFormType = 'registro' | 'ingreso' | 'gotas-puras' | 'elaboracion' | 'nosodes' | 'tinturas' | 'preparacion' | 'insumos' | 'vademecum' | 'mantenimiento' | 'stock' | 'tracking' | 'default';

export default function LabView() {
  const [activeForm, setActiveForm] = useState<LabFormType>('default');
  const [records, setRecords] = useState<any[]>([]);

  // Generic data fetching for the active form from localDB
  useEffect(() => {
    if (activeForm === 'default') return;

    const loadData = async () => {
      try {
        let collectionName = 'lab_records';
        if (activeForm === 'stock') collectionName = 'inventory';
        if (activeForm === 'tracking') collectionName = 'order_tracking';
        const data = await localDB.getCollection(collectionName);
        setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('LabView Load Error:', err);
        setRecords([]);
      }
    };

    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, [activeForm]);

  const handleBack = () => setActiveForm('default');

  if (activeForm === 'default') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#001736]">Módulo de Laboratorio</h2>
            <p className="text-slate-500 text-sm">Gestión técnica y operativa de insumos, fórmulas y protocolos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard 
            title="Evaluación Gotas Puras"
            desc="Control de calidad y pureza de extractos."
            icon={Beaker}
            onClick={() => setActiveForm('gotas-puras')}
          />
          <ModuleCard 
            title="Elaboración Gotas y Diluciones"
            desc="Protocolos de dinamización y mezcla."
            icon={FlaskConical}
            onClick={() => setActiveForm('elaboracion')}
          />
          <ModuleCard 
            title="Ingreso Nosodes"
            desc="Registro de cepas y acciones técnicas."
            icon={Microscope}
            onClick={() => setActiveForm('nosodes')}
          />
          <ModuleCard 
            title="Tinturas Madres"
            desc="Maceración e ingresos de materias primas."
            icon={Droplets}
            onClick={() => setActiveForm('tinturas')}
          />
          <ModuleCard 
            title="Preparación Gotas Puras"
            desc="Composición y formulación comparativa."
            icon={Table}
            onClick={() => setActiveForm('preparacion')}
          />
          <ModuleCard 
            title="Insumos"
            desc="Gestión de frascos, etiquetas y reactivos."
            icon={Package}
            onClick={() => setActiveForm('insumos')}
          />
          <ModuleCard 
            title="Vademécum"
            desc="Consulta de fórmulas y aplicaciones."
            icon={BookOpen}
            onClick={() => setActiveForm('vademecum')}
          />
          <ModuleCard 
            title="Mantención"
            desc="Registro de limpieza y calibración."
            icon={Settings}
            onClick={() => setActiveForm('mantenimiento')}
          />
          <ModuleCard 
            title="Stock de Insumo Diario"
            desc="Control de saldos por área de producción."
            icon={ClipboardList}
            onClick={() => setActiveForm('stock')}
            featured
          />
          <ModuleCard 
            title="Seguimiento de Pedidos"
            desc="Trazabilidad, Courier y Estados de Envío."
            icon={ClipboardCheck}
            onClick={() => setActiveForm('tracking')}
            featured
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={handleBack}
        className="flex items-center gap-2 text-[#001736] font-bold hover:text-blue-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm uppercase tracking-widest">Volver al Menú Principal de Laboratorio</span>
      </button>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeForm === 'gotas-puras' && <GotasPurasForm records={records} setRecords={setRecords} />}
        {activeForm === 'elaboracion' && <ElaboracionForm records={records} setRecords={setRecords} />}
        {activeForm === 'nosodes' && <NosodesForm records={records} setRecords={setRecords} />}
        {activeForm === 'tinturas' && <TinturasMadresForm records={records} setRecords={setRecords} />}
        {activeForm === 'preparacion' && <PreparacionForm records={records} setRecords={setRecords} />}
        {activeForm === 'insumos' && <InsumosForm records={records} setRecords={setRecords} />}
        {activeForm === 'vademecum' && <VademecumForm records={records} setRecords={setRecords} />}
        {activeForm === 'mantenimiento' && <MantenimientoForm records={records} setRecords={setRecords} />}
        {activeForm === 'stock' && <StockManager records={records} setRecords={setRecords} />}
        {activeForm === 'tracking' && <OrderTrackingForm records={records} setRecords={setRecords} />}
      </div>
    </div>
  );
}

function ModuleCard({ title, desc, icon: Icon, onClick, featured }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group",
        featured && "border-l-4 border-blue-500"
      )}
    >
      <div className={cn(
        "p-3 rounded-lg inline-block mb-4 transition-colors",
        featured ? "bg-[#002b5b] text-white" : "bg-slate-100 text-[#001736] group-hover:bg-[#00658d] group-hover:text-white"
      )}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
  );
}

function RegistroForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nroRegistro: '',
    tipo: 'Control',
    responsable: '',
    observaciones: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
      finalData = { ...finalData, ultimaModificacionPor: user.displayName };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
    } else {
      finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
      await localDB.saveToCollection('lab_records', { ...finalData, type: 'registro' });
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({ fecha: new Date().toISOString().split('T')[0], nroRegistro: '', tipo: 'Control', responsable: user.displayName, observaciones: '' });
    alert('Actividad registrada');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-[#002b5b] text-white px-6 py-4 flex justify-between items-center font-bold">
          <ClipboardCheck className="w-5 h-5" /> Ficha de Registro
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="N° Registro"><input className="w-full border-b p-2 text-sm" placeholder="REG-001" value={form.nroRegistro || ''} onChange={e => setForm({...form, nroRegistro: e.target.value})} required /></FormField>
          <FormField label="Tipo">
            <select className="w-full border-b p-2 text-sm" value={form.tipo || 'Control'} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option>Control</option><option>Proceso</option><option>Limpieza</option><option>Otros</option>
            </select>
          </FormField>
          <FormField label="Responsable">
            <input className="w-full border-b p-2 text-sm bg-slate-50" value={form.responsable || ''} readOnly />
          </FormField>
          <FormField label="Observaciones"><textarea className="w-full border p-2 text-sm h-20" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
          <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold shadow-lg hover:opacity-90">GUARDAR REGISTRO</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] uppercase font-black tracking-widest text-[#001736]">Historial de Registros</h3>
          <button className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Descargar PDF">
            <Download className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b">
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">N°</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Tipo</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Responsable</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Fecha</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'registro').map(r => (
                <tr key={r.id}>
                  <td className="p-4 font-bold">{r.nroRegistro}</td>
                  <td className="p-4">{r.tipo}</td>
                  <td className="p-4">
                      {r.creadoPor || r.responsable}
                      {r.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado: {r.ultimaModificacionPor}</span>}
                  </td>
                  <td className="p-4">{formatDate(r.fecha)}</td>
                  <td className="p-4 text-center">
                    <button onClick={async () => { 
                        setEditingId(r.id); 
                        setForm(r);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="text-blue-400 hover:text-blue-600 mr-2">
                        <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={async () => { if (true) { await localDB.deleteFromCollection('lab_records', r.id); const updated = await localDB.getCollection('lab_records'); setRecords(updated); } }} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
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

function IngresoForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nroIngreso: '',
    procedencia: '',
    detalle: '',
    observaciones: '',
    responsable: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
        finalData = { ...finalData, ultimaModificacionPor: user.displayName };
        await localDB.updateInCollection('lab_records', editingId, finalData);
        setEditingId(null);
    } else {
        finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
        await localDB.saveToCollection('lab_records', { ...finalData, type: 'ingreso' });
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({ fecha: new Date().toISOString().split('T')[0], nroIngreso: '', procedencia: '', detalle: '', observaciones: '', responsable: user.displayName });
    alert('Ingreso registrado');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-[#002b5b] text-white px-6 py-4 flex justify-between items-center font-bold">
          <FilePlus className="w-5 h-5" /> Ficha de Ingreso
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="N° Ingreso"><input className="w-full border-b p-2 text-sm" placeholder="ING-001" value={form.nroIngreso || ''} onChange={e => setForm({...form, nroIngreso: e.target.value})} required /></FormField>
          <FormField label="Procedencia / Cliente"><input className="w-full border-b p-2 text-sm" value={form.procedencia || ''} onChange={e => setForm({...form, procedencia: e.target.value})} required /></FormField>
          <FormField label="Detalle"><input className="w-full border-b p-2 text-sm" value={form.detalle || ''} onChange={e => setForm({...form, detalle: e.target.value})} required /></FormField>
          <FormField label="Responsable">
            <input className="w-full border-b p-2 text-sm bg-slate-50" value={form.responsable || ''} readOnly />
          </FormField>
          <FormField label="Observaciones"><textarea className="w-full border p-2 text-sm h-20" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
          <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold shadow-lg hover:opacity-90">REGISTRAR INGRESO</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] uppercase font-black tracking-widest text-[#001736]">Historial de Ingresos</h3>
          <button className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Descargar PDF">
            <Download className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b">
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">N°</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Procedencia</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Responsable</th>
                <th className="p-4 uppercase font-black text-slate-500 text-[10px]">Fecha</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'ingreso').map(r => (
                <tr key={r.id}>
                  <td className="p-4 font-bold">{r.nroIngreso}</td>
                  <td className="p-4 text-[#001736] font-medium">{r.procedencia}</td>
                  <td className="p-4">
                      {r.creadoPor || r.responsable}
                      {r.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado: {r.ultimaModificacionPor}</span>}
                  </td>
                  <td className="p-4">{formatDate(r.fecha)}</td>
                  <td className="p-4 text-center">
                    <RecordActions
                      onView={() => {
                        const data = [
                          { label: 'N° Ingreso', value: r.nroIngreso },
                          { label: 'Procedencia', value: r.procedencia },
                          { label: 'Detalle', value: r.detalle },
                          { label: 'Fecha', value: formatDate(r.fecha) },
                          { label: 'Observaciones', value: r.observaciones || '' }
                        ];
                        viewExpedienteInNewTab('Ficha: Ingreso de Insumos', data, `ingreso_${r.nroIngreso}`);
                      }}
                      onDownload={() => {
                        const data = [
                          { label: 'N° Ingreso', value: r.nroIngreso },
                          { label: 'Procedencia', value: r.procedencia },
                          { label: 'Detalle', value: r.detalle },
                          { label: 'Fecha', value: formatDate(r.fecha) },
                          { label: 'Observaciones', value: r.observaciones || '' }
                        ];
                        exportExpedienteToPDF('Ficha: Ingreso de Insumos', data, `ingreso_${r.nroIngreso}`);
                      }}
                      onEdit={() => {
                        setEditingId(r.id);
                        setForm(r);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onDelete={async () => { if (true) { await localDB.deleteFromCollection('lab_records', r.id); const updated = await localDB.getCollection('lab_records'); setRecords(updated); } }}
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

function GotasPurasForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    producto: '',
    estado: 'Medio',
    observaciones: '',
    responsable: '',
    creadoPor: '',
    ultimaModificacionPor: '',
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName || '', creadoPor: user.displayName || '' }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
      finalData = { ...finalData, ultimaModificacionPor: user.displayName, updatedAt: new Date().toISOString() };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
      await addAuditLog(user, `Editó Evaluación Gota Pura: ${finalData.producto}`, 'Laboratorio');
    } else {
      finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
      await localDB.saveToCollection('lab_records', { ...finalData, type: 'gotas-puras' });
      await addAuditLog(user, `Guardó Evaluación Gota Pura: ${finalData.producto}`, 'Laboratorio');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({ fecha: new Date().toISOString().split('T')[0], producto: '', estado: 'Medio', observaciones: '', responsable: user.displayName || '', creadoPor: user.displayName || '', ultimaModificacionPor: '', createdAt: '', updatedAt: '' });
    alert('Registro guardado exitosamente');
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-[#002b5b] text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <Beaker className="w-5 h-5" /> Evaluación Gotas Puras
          </h3>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField label="Fecha">
              <input 
                type="date" 
                className="w-full border-b border-slate-200 p-2 outline-none focus:border-blue-500 text-sm"
                value={form.fecha || ''}
                onChange={e => setForm({...form, fecha: e.target.value})}
                required
              />
            </FormField>
            <FormField label="Producto">
              <input 
                type="text" 
                placeholder="Nombre del componente"
                className="w-full border-b border-slate-200 p-2 outline-none focus:border-blue-500 text-sm font-medium"
                value={form.producto || ''}
                onChange={e => setForm({...form, producto: e.target.value})}
                required
              />
            </FormField>
            <FormField label="Estado">
              <select 
                className="w-full border-b border-slate-200 p-2 outline-none focus:border-blue-500 text-sm"
                value={form.estado || 'Medio'}
                onChange={e => setForm({...form, estado: e.target.value})}
              >
                <option value="Mínimo">Mínimo</option>
                <option value="Bajo">Bajo</option>
                <option value="Medio">Medio</option>
                <option value="Óptimo">Óptimo</option>
              </select>
            </FormField>
            <FormField label="Observaciones">
              <textarea 
                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500 h-24"
                value={form.observaciones || ''}
                onChange={e => setForm({...form, observaciones: e.target.value})}
              />
            </FormField>
          </div>
          <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold hover:opacity-90 flex justify-center items-center gap-2 mt-4 shadow-lg">
            <Save className="w-4 h-4" /> GUARDAR REGISTRO
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-[10px] font-black uppercase text-[#001736] tracking-widest">Historial Evaluación</h3>
          <button 
            onClick={() => {
              const data = records.filter(r => r.type === 'gotas-puras').map(r => [
                formatDate(r.fecha),
                r.producto,
                r.estado,
                r.observaciones
              ]);
              exportTableToPDF(
                'Reporte: Evaluación Gotas Puras',
                ['Fecha', 'Producto', 'Estado', 'Observaciones'],
                data,
                'evaluacion_gotas_puras'
              );
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-white transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Fecha</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Producto</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Estado</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Observaciones</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.filter(r => r.type === 'gotas-puras').length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">Sin registros previos</td></tr>
              ) : (
                records.filter(r => r.type === 'gotas-puras').map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium">{formatDate(record.fecha)}</td>
                    <td className="px-6 py-4 text-xs font-bold text-[#001736]">{record.producto}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded uppercase",
                        record.estado === 'Óptimo' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {record.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">{record.observaciones}</td>
                    <td className="px-6 py-4">
                      {record.creadoPor || record.responsable}
                      {record.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado: {record.ultimaModificacionPor}</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                       <button onClick={async () => { 
                          setEditingId(record.id); 
                          setForm(record);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="text-blue-400 hover:text-blue-600 mr-2">
                          <Edit className="w-3 h-3" />
                      </button>
                       <button onClick={async () => { if (true) { await localDB.deleteFromCollection('lab_records', record.id); const updated = await localDB.getCollection('lab_records'); setRecords(updated); } }} className="text-red-400 hover:text-red-600">
                         <Trash2 className="w-3 h-3" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ElaboracionForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Gota Pura',
    producto: '',
    elaborador: '',
    responsable: '',
    solucion: 'Vehículo Estándar',
    nroCimasur: '',
    cantidad: '',
    status: 'En Proceso',
    creadoPor: '',
    ultimaModificacionPor: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName || '', creadoPor: user.displayName || '' }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
      finalData = { ...finalData, ultimaModificacionPor: user.displayName };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
      await addAuditLog(user, `Editó Elaboración: ${finalData.producto}`, 'Laboratorio');
    } else {
      finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
      await localDB.saveToCollection('lab_records', { ...finalData, type: 'elaboracion' });
      await addAuditLog(user, `Guardó Elaboración: ${finalData.producto}`, 'Laboratorio');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'Gota Pura',
      producto: '',
      elaborador: '',
      responsable: user.displayName || '',
      solucion: 'Vehículo Estándar',
      nroCimasur: '',
      cantidad: '',
      status: 'En Proceso',
      creadoPor: user.displayName || '',
      ultimaModificacionPor: ''
    });
    alert('Registro guardado');
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex justify-between items-center">
          <span className="flex items-center gap-2"><FlaskConical className="w-5 h-5" /> Elaboración de Gotas y Diluciones</span>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" onSubmit={handleSubmit}>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="Tipo">
            <select className="w-full border-b p-2 text-sm" value={form.tipo || 'Gota Pura'} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option>Gota Pura</option><option>Dilución</option>
            </select>
          </FormField>
          <FormField label="Producto / Fórmula"><input className="w-full border-b p-2 text-sm font-bold" value={form.producto || ''} onChange={e => setForm({...form, producto: e.target.value})} required /></FormField>
          <FormField label="Elaborador"><input className="w-full border-b p-2 text-sm" value={form.elaborador || ''} onChange={e => setForm({...form, elaborador: e.target.value})} /></FormField>
          <FormField label="Responsable"><input className="w-full border-b p-2 text-sm" value={form.responsable || ''} onChange={e => setForm({...form, responsable: e.target.value})} /></FormField>
          
          <FormField label="Solución / Base"><input className="w-full border-b p-2 text-sm" value={form.solucion || ''} onChange={e => setForm({...form, solucion: e.target.value})} /></FormField>
          <FormField label="N° Cimasur"><input className="w-full border-b p-2 text-sm font-mono" value={form.nroCimasur || ''} onChange={e => setForm({...form, nroCimasur: e.target.value})} required /></FormField>
          <FormField label="Cantidad (ml/un)"><input className="w-full border-b p-2 text-sm" value={form.cantidad || ''} onChange={e => setForm({...form, cantidad: e.target.value})} /></FormField>
          <FormField label="Status">
            <select className="w-full border-b p-2 text-sm font-black text-blue-600" value={form.status || 'En Proceso'} onChange={e => setForm({...form, status: e.target.value})}>
              <option>En Proceso</option><option>Terminado</option><option>Control de Calidad</option><option>Entregado</option>
            </select>
          </FormField>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-bold shadow-lg flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> REGISTRAR
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kardex de Elaboración Diaria</h3>
          <Search className="w-3 h-3 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
                <th className="p-4">N° Cimasur</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.filter(r => r.type === 'elaboracion').map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4">{r.fecha}</td>
                  <td className="p-4 font-mono text-blue-700">{r.nroCimasur}</td>
                  <td className="p-4 font-bold">{r.producto}</td>
                  <td className="p-4 italic">
                      {r.creadoPor || r.responsable}
                      {r.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado: {r.ultimaModificacionPor}</span>}
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase text-[9px]">{r.status}</span>
                  </td>
                  <td className="p-4 text-center">
                    <RecordActions
                      onDownload={() => {
                        const recordData = [
                          { label: 'N° Cimasur', value: r.nroCimasur },
                          { label: 'Fecha', value: r.fecha },
                          { label: 'Producto', value: r.producto },
                          { label: 'Elaborador', value: r.elaborador },
                          { label: 'Responsable', value: r.creadoPor || r.responsable },
                          { label: 'Status', value: r.status },
                          { label: 'Observaciones', value: r.observaciones || '' }
                        ];
                        exportExpedienteToPDF('Expediente: Elaboración de Gotas', recordData, `expediente_${r.nroCimasur}`);
                      }}
                      onEdit={() => {
                        setEditingId(r.id);
                        setForm(r);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onDelete={async () => {
                        if (true) {
                          try {
                            const firebaseUser = localAuth.getCurrentUser();
                            if (firebaseUser) {
                                const userProfile = await localAuth.getUserById(firebaseUser.uid);
                                if (userProfile)
                                    await addAuditLog(userProfile, `Eliminó Elaboración: ${r.producto} (N° ${r.nroCimasur})`, 'Laboratorio');
                            }
                            await localDB.deleteFromCollection('lab_records', r.id);
                            const updated = await localDB.getCollection('lab_records');
                            setRecords(updated);
                            alert('Ficha Técnica eliminada correctamente');
                          } catch (err) {
                            alert('Error al intentar eliminar la ficha');
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

const initialFormState = {
    fechaFicha: new Date().toISOString().split('T')[0],
    fechaIngresoLab: new Date().toISOString().split('T')[0],
    nroMuestra: '',
    refrigerador: '',
    tipoMuestra: '',
    medico: '',
    paciente: '',
    estadoMuestra: 'Óptimo',
    producto: '',
    fechaInicio: '',
    fechaSalida: '',
    nroClasificacion: '',
    acciones: {
      peso: '',
      dilucion: '',
      maceracion: '',
      filtrado: '',
      termoregulado: '',
      luzUV: '',
      dilucionFinal: '',
      otros: ''
    },
    responsable: '',
    creadoPor: '',
    ultimaModificacionPor: ''
};

function NosodesForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialFormState);


  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName || '', creadoPor: user.displayName || '' }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
      finalData = { ...finalData, ultimaModificacionPor: user.displayName, updatedAt: new Date().toISOString() };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
      await addAuditLog(user, `Editó Nosode: ${finalData.paciente}`, 'Laboratorio');
    } else {
      finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
      await localDB.saveToCollection('lab_records', { ...finalData, type: 'nosodes' });
      await addAuditLog(user, `Guardó Nosode: ${finalData.paciente}`, 'Laboratorio');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      ...initialFormState,
      responsable: user.displayName || '',
      creadoPor: user.displayName || ''
    });
    alert(editingId ? 'Ficha Técnica de Nosode Actualizada' : 'Ficha Técnica de Nosode Guardada');
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex justify-between items-center">
          <span className="flex items-center gap-2"><Microscope className="w-5 h-5" /> Ficha Técnica Avanzada de Nosodes</span>
          <span className="text-[10px] font-normal uppercase tracking-widest">Protocolo de Bio-Seguridad</span>
        </div>
        <form className="p-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <FormField label="Fecha Ficha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaFicha || ''} onChange={e => setForm({...form, fechaFicha: e.target.value})} /></FormField>
            <FormField label="Ingreso Lab"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngresoLab || ''} onChange={e => setForm({...form, fechaIngresoLab: e.target.value})} /></FormField>
            <FormField label="N° Muestra"><input className="w-full border-b p-2 text-sm font-mono" value={form.nroMuestra || ''} onChange={e => setForm({...form, nroMuestra: e.target.value})} required /></FormField>
            <FormField label="Refrigerador"><input className="w-full border-b p-2 text-sm" value={form.refrigerador || ''} onChange={e => setForm({...form, refrigerador: e.target.value})} /></FormField>
            <FormField label="Tipo Muestra"><input className="w-full border-b p-2 text-sm" value={form.tipoMuestra || ''} onChange={e => setForm({...form, tipoMuestra: e.target.value})} /></FormField>
            <FormField label="Médico Solicitante"><input className="w-full border-b p-2 text-sm" value={form.medico || ''} onChange={e => setForm({...form, medico: e.target.value})} /></FormField>
            <FormField label="Paciente"><input className="w-full border-b p-2 text-sm font-bold" value={form.paciente || ''} onChange={e => setForm({...form, paciente: e.target.value})} /></FormField>
            <FormField label="Estado Muestra">
              <select className="w-full border-b p-2 text-sm" value={form.estadoMuestra || 'Óptimo'} onChange={e => setForm({...form, estadoMuestra: e.target.value})}>
                <option>Óptimo</option><option>Regular</option><option>Rechazado</option>
              </select>
            </FormField>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
             <h4 className="text-[10px] font-black uppercase text-[#002b5b] tracking-widest mb-6 border-b border-white pb-2 flex items-center gap-2">
               <Table className="w-4 h-4" /> Matriz de Acción Técnica
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField label="Peso muestra (gr)"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.peso || ''} onChange={e => setForm({...form, acciones: {...form.acciones, peso: e.target.value}})} /></FormField>
                <FormField label="Dilución realizada"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.dilucion || ''} onChange={e => setForm({...form, acciones: {...form.acciones, dilucion: e.target.value}})} /></FormField>
                <FormField label="Nº maceración/congelado"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.maceracion || ''} onChange={e => setForm({...form, acciones: {...form.acciones, maceracion: e.target.value}})} /></FormField>
                <FormField label="Tiempo de Filtrado"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.filtrado || ''} onChange={e => setForm({...form, acciones: {...form.acciones, filtrado: e.target.value}})} /></FormField>
                <FormField label="Tº Termoregulado"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.termoregulado || ''} onChange={e => setForm({...form, acciones: {...form.acciones, termoregulado: e.target.value}})} /></FormField>
                <FormField label="Tiempo Luz UV"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.luzUV || ''} onChange={e => setForm({...form, acciones: {...form.acciones, luzUV: e.target.value}})} /></FormField>
                <FormField label="Dilución Final"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-bold" value={form.acciones.dilucionFinal || ''} onChange={e => setForm({...form, acciones: {...form.acciones, dilucionFinal: e.target.value}})} /></FormField>
                <FormField label="Otros"><input className="w-full bg-white border border-slate-200 rounded p-2 text-sm" value={form.acciones.otros || ''} onChange={e => setForm({...form, acciones: {...form.acciones, otros: e.target.value}})} /></FormField>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <FormField label="Producto Solicitado"><input className="w-full border-b p-2 text-sm" value={form.producto || ''} onChange={e => setForm({...form, producto: e.target.value})} /></FormField>
            <FormField label="Inicio Proceso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaInicio || ''} onChange={e => setForm({...form, fechaInicio: e.target.value})} /></FormField>
            <FormField label="Salida Proceso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaSalida || ''} onChange={e => setForm({...form, fechaSalida: e.target.value})} /></FormField>
            <FormField label="N° Clasificación"><input className="w-full border-b p-2 text-sm font-mono" value={form.nroClasificacion || ''} onChange={e => setForm({...form, nroClasificacion: e.target.value})} /></FormField>
          </div>

          <div className="flex justify-between items-end">
            <FormField label="Responsable (Nombre y Firma)"><input className="w-64 border-b p-2 text-sm italic" value={form.responsable || ''} onChange={e => setForm({...form, responsable: e.target.value})} required /></FormField>
            <button type="submit" className="bg-[#0b2447] text-white px-10 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2 hover:opacity-95">
              <Save className="w-4 h-4" /> REGISTRAR FICHA TÉCNICA
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-[#002b5b]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#001736]">Historial de Nosodes</h3>
          <button 
            onClick={() => {
              const data = records.filter(r => r.type === 'nosodes').map(r => [
                formatDate(r.fechaFicha),
                r.nroMuestra,
                r.paciente,
                r.producto
              ]);
              exportTableToPDF(
                'Reporte: Historial de Nosodes',
                ['Fecha', 'N° Muestra', 'Paciente', 'Producto'],
                data,
                'historial_nosodes'
              );
            }}
            className="text-blue-600 hover:bg-blue-50 p-1 rounded" 
            title="Descargar PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
                <th className="p-4">N° Muestra</th>
                <th className="p-4">Paciente</th>
                <th className="p-4">Producto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'nosodes').map(r => (
                <tr key={r.id}>
                  <td className="p-4 font-medium">{formatDate(r.fechaFicha)}</td>
                  <td className="p-4 font-mono text-blue-700">{r.nroMuestra}</td>
                  <td className="p-4 font-bold">{r.paciente}</td>
                  <td className="p-4">{r.producto}</td>
                  <td className="p-4 text-center">
                    <RecordActions
                      onView={() => {
                        const nosodeData = [
                          { label: 'Fecha Ficha', value: r.fechaFicha },
                          { label: 'Ingreso Lab', value: r.fechaIngresoLab },
                          { label: 'N° Muestra', value: r.nroMuestra },
                          { label: 'Refrigerador', value: r.refrigerador },
                          { label: 'Tipo Muestra', value: r.tipoMuestra },
                          { label: 'Médico', value: r.medico },
                          { label: 'Paciente', value: r.paciente },
                          { label: 'Estado Muestra', value: r.estadoMuestra },
                          { label: 'Peso (gr)', value: r.acciones?.peso },
                          { label: 'Dilución realizada', value: r.acciones?.dilucion },
                          { label: 'Nº maceración/congelado', value: r.acciones?.maceracion },
                          { label: 'Tiempo Filtrado', value: r.acciones?.filtrado },
                          { label: 'Tº Termoregulado', value: r.acciones?.termoregulado },
                          { label: 'Tiempo Luz UV', value: r.acciones?.luzUV },
                          { label: 'Dilución Final', value: r.acciones?.dilucionFinal },
                          { label: 'Otros', value: r.acciones?.otros },
                          { label: 'Producto', value: r.producto },
                          { label: 'Inicio Proceso', value: r.fechaInicio },
                          { label: 'Salida Proceso', value: r.fechaSalida },
                          { label: 'N° Clasificación', value: r.nroClasificacion },
                          { label: 'Responsable', value: r.responsable }
                        ];
                        viewExpedienteInNewTab('Ficha Técnica de Nosode', nosodeData, `ficha_nosode_${r.nroMuestra}`);
                      }}
                      onDownload={() => {
                        const nosodeData = [
                          { label: 'Fecha Ficha', value: r.fechaFicha },
                          { label: 'Ingreso Lab', value: r.fechaIngresoLab },
                          { label: 'N° Muestra', value: r.nroMuestra },
                          { label: 'Refrigerador', value: r.refrigerador },
                          { label: 'Tipo Muestra', value: r.tipoMuestra },
                          { label: 'Médico', value: r.medico },
                          { label: 'Paciente', value: r.paciente },
                          { label: 'Estado Muestra', value: r.estadoMuestra },
                          { label: 'Peso (gr)', value: r.acciones?.peso },
                          { label: 'Dilución realizada', value: r.acciones?.dilucion },
                          { label: 'Nº maceración/congelado', value: r.acciones?.maceracion },
                          { label: 'Tiempo Filtrado', value: r.acciones?.filtrado },
                          { label: 'Tº Termoregulado', value: r.acciones?.termoregulado },
                          { label: 'Tiempo Luz UV', value: r.acciones?.luzUV },
                          { label: 'Dilución Final', value: r.acciones?.dilucionFinal },
                          { label: 'Otros', value: r.acciones?.otros },
                          { label: 'Producto', value: r.producto },
                          { label: 'Inicio Proceso', value: r.fechaInicio },
                          { label: 'Salida Proceso', value: r.fechaSalida },
                          { label: 'N° Clasificación', value: r.nroClasificacion },
                          { label: 'Responsable', value: r.responsable }
                        ];
                        exportExpedienteToPDF('Ficha Técnica de Nosode', nosodeData, `ficha_nosode_${r.nroMuestra}`);
                      }}
                      onEdit={() => {
                        setEditingId(r.id);
                        setForm(r);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onDelete={async () => {
                        if (true) {
                          try {
                            await localDB.deleteFromCollection('lab_records', r.id);
                            const updated = await localDB.getCollection('lab_records');
                            setRecords(updated);
                            alert('Ficha Técnica de Nosode eliminada exitosamente');
                          } catch (err) {
                            alert('Error al intentar eliminar la ficha');
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

function PreparacionForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [frascoSize, setFrascoSize] = useState<30 | 100>(30);
  const [form, setForm] = useState({
    producto: '',
    fecha: new Date().toISOString().split('T')[0],
    preparador: '',
    filas: Array(15).fill({ composicion: '', nroCimasur: '', dilucion: '', lambdas: '' }),
    formulaTotal: '',
    observaciones: '',
    responsable: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName }));
    }
  }, [user, editingId]);

  const updateFila = (idx: number, field: string, val: string) => {
    const newFilas = [...form.filas];
    newFilas[idx] = { ...newFilas[idx], [field]: val };
    setForm({ ...form, filas: newFilas });
  };

  const { sumaUL, sumaML, totalML } = useMemo(() => {
    let ul = 0;
    let ml = 0;
    form.filas.forEach(fila => {
      const val = fila.lambdas;
      if (val && val.toLowerCase().includes('ml')) {
        ml += parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
      } else {
        ul += parseFloat(val) || 0;
      }
    });
    const subtotal = (ul / 1000) + ml;
    return { sumaUL: ul, sumaML: ml, totalML: subtotal };
  }, [form.filas]);

  const diferencia = Math.max(0, frascoSize - totalML);
  const formulaDis = useMemo(() => {
    let part1 = `${sumaUL} UL = ${(sumaUL / 1000).toFixed(2)} ML`;
    if (sumaML > 0) {
      part1 += ` + ${sumaML.toFixed(2)} ML`;
    }
    return `${part1} = ${totalML.toFixed(2)} ML - ${frascoSize} ML = ${diferencia.toFixed(2)} ML (Vehículo OL 48)`;
  }, [sumaUL, sumaML, totalML, frascoSize, diferencia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    let finalData = { ...form, formulaTotal: formulaDis, type: 'preparacion' };

    if (editingId) {
      finalData = { 
        ...finalData, 
        ultimaModificacionPor: user.displayName,
        updatedAt: new Date().toISOString() 
      };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
      await addAuditLog(user, `Editó Preparación ${frascoSize}ml`, 'Laboratorio');
      alert('Ficha de Preparación Actualizada');
    } else {
      finalData = { 
        ...finalData, 
        creadoPor: user.displayName, 
        createdAt: new Date().toISOString() 
      };
      await localDB.saveToCollection('lab_records', finalData);
      await addAuditLog(user, `Guardó Preparación ${frascoSize}ml`, 'Laboratorio');
      alert('Ficha de Preparación guardada');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      producto: '', fecha: new Date().toISOString().split('T')[0], preparador: '',
      filas: Array(15).fill({ composicion: '', nroCimasur: '', dilucion: '', lambdas: '' }),
      formulaTotal: '', observaciones: '', responsable: user.displayName
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2"><FlaskConical className="w-5 h-5" /> Preparación de Gotas Puras (Formato 15 Filas)</span>
           <button 
             onClick={() => {
              const data = records.filter(r => r.type === 'preparacion').map(r => [
                formatDate(r.fecha),
                r.producto,
                r.preparador,
                r.totalLambdas
              ]);
              exportTableToPDF(
                'Reporte: Preparación de Gotas Puras',
                ['Fecha', 'Producto', 'Preparador', 'Total Lambdas'],
                data,
                'preparacion_gotas_puras'
              );
             }}
             className="text-white/70 hover:text-white" 
             title="PDF"
           >
             <Download className="w-4 h-4" />
           </button>
        </div>
        <form className="p-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
             <FormField label="Nombre Producto"><input className="w-full border-b p-2 text-sm font-black" value={form.producto || ''} onChange={e => setForm({...form, producto: e.target.value})} required /></FormField>
             <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
             <FormField label="Nombre Preparador"><input className="w-full border-b p-2 text-sm" value={form.preparador || ''} onChange={e => setForm({...form, preparador: e.target.value})} /></FormField>
             <FormField label="Frasco">
               <div className="flex gap-2">
                 <button type="button" onClick={() => setFrascoSize(30)} className={cn("px-4 py-2 border rounded text-xs font-bold", frascoSize === 30 ? "bg-[#002b5b] text-white" : "bg-white")}>30 mL</button>
                 <button type="button" onClick={() => setFrascoSize(100)} className={cn("px-4 py-2 border rounded text-xs font-bold", frascoSize === 100 ? "bg-[#002b5b] text-white" : "bg-white")}>100 mL</button>
               </div>
             </FormField>
          </div>

          <div className="border border-slate-100 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-xs">
               <thead className="bg-[#001736] text-white text-[10px] uppercase font-black">
                  <tr>
                     <th className="p-3 text-center border-r border-white/10 w-12">#</th>
                     <th className="p-3 text-left border-r border-white/10">Composición / Terapia</th>
                     <th className="p-3 text-center border-r border-white/10">N° Cimasur</th>
                     <th className="p-3 text-center border-r border-white/10">Dilución</th>
                     <th className="p-3 text-center">Lambdas</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {form.filas.map((fila, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-1 text-center font-bold text-slate-300 border-r border-slate-50">{idx + 1}</td>
                      <td className="p-1 border-r border-slate-50"><input className="w-full p-2 outline-none bg-transparent" value={fila.composicion || ''} onChange={e => updateFila(idx, 'composicion', e.target.value)} /></td>
                      <td className="p-1 border-r border-slate-50"><input className="w-full p-2 outline-none bg-transparent text-center font-mono" value={fila.nroCimasur || ''} onChange={e => updateFila(idx, 'nroCimasur', e.target.value)} /></td>
                      <td className="p-1 border-r border-slate-50"><input className="w-full p-2 outline-none bg-transparent text-center" value={fila.dilucion || ''} onChange={e => updateFila(idx, 'dilucion', e.target.value)} /></td>
                      <td className="p-1"><input className="w-full p-2 outline-none bg-transparent text-center font-bold" value={fila.lambdas || ''} onChange={e => updateFila(idx, 'lambdas', e.target.value)} /></td>
                    </tr>
                  ))}
               </tbody>
               <tfoot className="bg-slate-50 font-black text-[#001736]">
                  <tr>
                    <td colSpan={4} className="p-3 text-right uppercase tracking-widest text-[10px]">Suma Total Lambdas:</td>
                    <td className="p-3 text-center text-lg">{sumaUL} UL + {sumaML} ML</td>
                  </tr>
               </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
             <div className="space-y-4">
                <FormField label="Fórmula / Total (Automática)">
                  <p className="border-b p-2 text-xs font-black text-blue-700 bg-slate-50 min-h-[40px]">{formulaDis}</p>
                </FormField>
                <FormField label="Observaciones"><textarea className="w-full border p-3 text-xs h-20 bg-slate-50" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
             </div>
             <div className="space-y-6">
                <FormField label="Responsable Firma">
                  <input className="w-full border-b p-2 text-sm italic bg-slate-100" value={form.responsable || ''} readOnly />
                  <p className="text-[10px] text-green-700 mt-1">Documento firmado digitalmente por: {user?.displayName || '...'}</p>
                </FormField>
                <button type="submit" className="w-full bg-[#001736] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2">
                   <Save className="w-4 h-4" /> GUARDAR REGISTRO TÉCNICO COMPLETO
                </button>
             </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-[#002b5b]">
          <h3 className="text-[10px] font-black uppercase tracking-widest">Historial de Preparaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Preparador</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-center">Total Lambdas</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.filter(r => r.type === 'preparacion').map(r => (
                <tr key={r.id}>
                  <td className="p-4">{formatDate(r.fecha)}</td>
                  <td className="p-4 font-bold">{r.producto}</td>
                  <td className="p-4">{r.preparador}</td>
                  <td className="p-4 italic">
                    {r.creadoPor || r.responsable}
                    {r.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado por: {r.ultimaModificacionPor}</span>}
                  </td>
                  <td className="p-4 text-center font-black text-blue-600">{r.totalLambdas}</td>
                  <td className="p-4 text-center">
                      <RecordActions
                        onView={() => {
                           const prepData = [
                             { label: 'Producto', value: r.producto },
                             { label: 'Fecha', value: formatDate(r.fecha) },
                             { label: 'Preparador', value: r.preparador },
                             { label: 'Responsable', value: r.responsable },
                             { label: 'Total Lambdas', value: r.totalLambdas?.toString() }
                           ];
                           const tables = [{
                             title: 'Detalle de Preparación',
                             headers: ['#', 'Composición / Terapia', 'N° Cimasur', 'Dilución', 'Lambdas'],
                             rows: r.filas?.map((f: any, i: number) => [i + 1, f.composicion, f.nroCimasur, f.dilucion, f.lambdas]) || []
                           }];
                           viewExpedienteInNewTab('Expediente: Preparación Gotas Puras', prepData, `expediente_preparacion_${r.id}`, tables);
                        }}
                        onDownload={() => {
                           const prepData = [
                             { label: 'Producto', value: r.producto },
                             { label: 'Fecha', value: formatDate(r.fecha) },
                             { label: 'Preparador', value: r.preparador },
                             { label: 'Responsable', value: r.responsable },
                             { label: 'Total Lambdas', value: r.totalLambdas?.toString() }
                           ];
                           const tables = [{
                             title: 'Detalle de Preparación',
                             headers: ['#', 'Composición / Terapia', 'N° Cimasur', 'Dilución', 'Lambdas'],
                             rows: r.filas?.map((f: any, i: number) => [i + 1, f.composicion, f.nroCimasur, f.dilucion, f.lambdas]) || []
                           }];
                           exportExpedienteToPDF('Expediente: Preparación Gotas Puras', prepData, `expediente_preparacion_${r.id}`, tables);
                        }}
                        onEdit={() => {
                          setEditingId(r.id);
                          setForm(r);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onDelete={async () => {
                          if (true) {
                            try {
                              await localDB.deleteFromCollection('lab_records', r.id);
                              const updated = await localDB.getCollection('lab_records');
                              setRecords(updated);
                              alert('Ficha Técnica eliminada correctamente');
                            } catch (err) {
                              alert('Error al intentar eliminar la ficha');
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

function TinturasMadresForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    insumo: '',
    fecha: new Date().toISOString().split('T')[0],
    nroAsignado: '',
    elaborador: '',
    estado: 'Óptimo',
    proporcion: '',
    elaboracion: '',
    riesgos: '',
    etiqueta: '',
    firma: '',
    responsable: '',
    creadoPor: '',
    ultimaModificacionPor: ''
  });

  useEffect(() => {
    if (user && !editingId) {
      setForm(prev => ({ ...prev, responsable: user.displayName || '', creadoPor: user.displayName || '' }));
    }
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalData = { ...form };
    if (editingId) {
      finalData = { ...finalData, ultimaModificacionPor: user.displayName, updatedAt: new Date().toISOString() };
      await localDB.updateInCollection('lab_records', editingId, finalData);
      setEditingId(null);
      await addAuditLog(user, `Editó Tintura: ${finalData.insumo}`, 'Laboratorio');
    } else {
      finalData = { ...finalData, creadoPor: user.displayName, createdAt: new Date().toISOString() };
      await localDB.saveToCollection('lab_records', { ...finalData, type: 'tinturas' });
      await addAuditLog(user, `Guardó Tintura: ${finalData.insumo}`, 'Laboratorio');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      insumo: '', fecha: new Date().toISOString().split('T')[0], nroAsignado: '', elaborador: '', estado: 'Óptimo', proporcion: '', elaboracion: '', riesgos: '', etiqueta: '', firma: '',
      responsable: user.displayName || '', creadoPor: user.displayName || '', ultimaModificacionPor: ''
    });
    alert('Tintura Madre registrada');
  };


  const handleEdit = (record: any) => {
    setForm(record);
    setEditingId(record.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2"><Droplets className="w-5 h-5" /> Ficha Tipo Tinturas Madre {editingId ? '(Editando)' : ''}</span>
           <button 
             onClick={() => {
                const data = records.filter(r => r.type === 'tinturas').map(r => [
                  formatDate(r.fecha),
                  r.insumo,
                  r.nroAsignado,
                  r.elaborador,
                  r.estado
                ]);
                exportTableToPDF(
                  'Reporte: Tinturas Madre',
                  ['Fecha', 'Insumo', 'N° Asignado', 'Elaborador', 'Estado'],
                  data,
                  'tinturas_madre'
                );
             }}
             className="text-white/70 hover:text-white" 
             title="PDF"
           >
             <Download className="w-4 h-4" />
           </button>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
           <FormField label="Insumo"><input className="w-full border-b p-2 text-sm font-black" value={form.insumo || ''} onChange={e => setForm({...form, insumo: e.target.value})} required /></FormField>
           <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
           <FormField label="N° Asignado"><input className="w-full border-b p-2 text-sm font-mono" value={form.nroAsignado || ''} onChange={e => setForm({...form, nroAsignado: e.target.value})} required /></FormField>
           <FormField label="Elaborado por"><input className="w-full border-b p-2 text-sm" value={form.elaborador || ''} onChange={e => setForm({...form, elaborador: e.target.value})} /></FormField>
           
           <FormField label="Estado"><input className="w-full border-b p-2 text-sm" value={form.estado || ''} onChange={e => setForm({...form, estado: e.target.value})} /></FormField>
           <FormField label="Proporción"><input className="w-full border-b p-2 text-sm" value={form.proporcion || ''} onChange={e => setForm({...form, proporcion: e.target.value})} /></FormField>
           <FormField label="Detalle Elaboración"><input className="w-full border-b p-2 text-sm" value={form.elaboracion || ''} onChange={e => setForm({...form, elaboracion: e.target.value})} /></FormField>
           <FormField label="Riesgos/Precauciones"><input className="w-full border-b p-2 text-sm" value={form.riesgos || ''} onChange={e => setForm({...form, riesgos: e.target.value})} /></FormField>
           
           <FormField label="Información Etiqueta"><input className="w-full border-b p-2 text-sm" value={form.etiqueta || ''} onChange={e => setForm({...form, etiqueta: e.target.value})} /></FormField>
           <FormField label="Firma Responsable"><input className="w-full border-b p-2 text-sm italic" value={form.firma || ''} onChange={e => setForm({...form, firma: e.target.value})} required /></FormField>
           
           <div className="md:col-span-2 flex items-end gap-2">
              <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded-xl font-bold">{editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR TINTURA'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({insumo: '', fecha: new Date().toISOString().split('T')[0], nroAsignado: '', elaborador: '', estado: 'Óptimo', proporcion: '', elaboracion: '', riesgos: '', etiqueta: '', firma: ''}); }} className="w-1/3 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold">CANCELAR</button>}
           </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-[10px] font-black uppercase text-[#001736] tracking-widest">Historial Tinturas Madre</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Fecha</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Insumo</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">N° Asignado</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Elaborador</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'tinturas').map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium">{formatDate(r.fecha)}</td>
                  <td className="px-6 py-4 font-bold">{r.insumo}</td>
                  <td className="px-6 py-4 font-mono text-blue-700">{r.nroAsignado}</td>
                  <td className="px-6 py-4">{r.elaborador}</td>
                  <td className="px-6 py-4">
                     {r.creadoPor || r.elaborador}
                     {r.ultimaModificacionPor && <span className="block text-[9px] text-slate-400">Editado: {r.ultimaModificacionPor}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <RecordActions
                      onView={() => {
                          const tinturaData = [
                             { label: 'Insumo', value: r.insumo },
                             { label: 'Fecha', value: formatDate(r.fecha) },
                             { label: 'N° Asignado', value: r.nroAsignado },
                             { label: 'Elaborador', value: r.elaborador },
                             { label: 'Proporción', value: r.proporcion },
                             { label: 'Estado', value: r.estado }
                          ];
                          viewExpedienteInNewTab('Ficha: Tintura Madre', tinturaData, `ficha_tintura_${r.nroAsignado}`);
                      }}
                      onDownload={() => {
                          const tinturaData = [
                              { label: 'Insumo', value: r.insumo },
                              { label: 'Fecha', value: formatDate(r.fecha) },
                              { label: 'N° Asignado', value: r.nroAsignado },
                              { label: 'Elaborador', value: r.elaborador },
                              { label: 'Proporción', value: r.proporcion },
                              { label: 'Estado', value: r.estado }
                          ];
                          exportExpedienteToPDF('Ficha: Tintura Madre', tinturaData, `ficha_tintura_${r.nroAsignado}`);
                      }}
                      onEdit={() => handleEdit(r)}
                      onDelete={async () => {
                        if (true) {
                          try {
                            await localDB.deleteFromCollection('lab_records', r.id);
                            const updated = await localDB.getCollection('lab_records');
                            setRecords(updated);
                            alert('Tintura Madre eliminada correctamente');
                          } catch (err) {
                            alert('Error al intentar eliminar la ficha');
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

function InsumosForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [form, setForm] = useState({
    codigoCimasur: '',
    nombre: '',
    codigoEnvase: '',
    lote: '',
    proveedor: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    vencimiento: '',
    uso: '',
    ubicacion: '',
    cantidad: '',
    observaciones: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await localDB.updateInCollection('lab_records', editingId, form);
        setEditingId(null);
        alert('Información actualizada exitosamente');
      } else {
        await localDB.saveToCollection('lab_records', { ...form, type: 'insumos' });
        
        // Sincronizar automáticamente con el Stock (Inventario)
        try {
          const invCollection = await localDB.getCollection('inventory');
          const duplicate = invCollection.find(r => 
            (r.code && r.code.toLowerCase() === form.codigoCimasur.toLowerCase()) || 
            (r.item && r.item.toLowerCase() === form.nombre.toLowerCase())
          );
          
          if (duplicate) {
            const newQty = duplicate.qty + (parseInt(form.cantidad) || 0);
            await localDB.updateInCollection('inventory', duplicate.id, { qty: newQty });
          } else {
            await localDB.saveToCollection('inventory', {
              area: 'Insumos Varios',
              item: form.nombre,
              code: form.codigoCimasur,
              qty: parseInt(form.cantidad) || 0
            });
          }
        } catch (err) {
          console.error("Error syncing to stock:", err);
        }

        alert('Insumo / Materia Prima registrado exitosamente (Sincronizado con Inventario)');
      }
      const updated = await localDB.getCollection('lab_records');
      setRecords(updated);
      setForm({
        codigoCimasur: '',
        nombre: '',
        codigoEnvase: '',
        lote: '',
        proveedor: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        vencimiento: '',
        uso: '',
        ubicacion: '',
        cantidad: '',
        observaciones: ''
      });
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const handleEdit = (record: any) => {
    setForm(record);
    setEditingId(record.id);
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = (records || [])
    .filter(r => r.type === 'insumos')
    .filter(r => {
      const searchStr = `${r.nombre || ''} ${r.codigoCimasur || ''} ${r.lote || ''} ${r.proveedor || ''}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2 text-xs uppercase tracking-tighter"><Package className="w-5 h-5" /> Registro de Insumos / Materia Prima {editingId ? '(Editando)' : ''}</span>
           <div className="flex gap-2">
             <div className="relative">
               <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50" />
               <input 
                 type="text" 
                 placeholder="Filtrar historial..." 
                 className="bg-white/10 border-none rounded pl-7 pr-2 py-1 text-[10px] text-white placeholder:text-white/30 focus:bg-white/20 outline-none w-48"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
             </div>
             <button 
               onClick={() => {
                  const data = filteredHistory.map(r => [
                    formatDate(r.fechaIngreso),
                    r.nombre,
                    r.codigoCimasur,
                    r.lote,
                    r.proveedor
                  ]);
                  exportTableToPDF(
                    'Kardex: Insumos y Materia Prima',
                    ['Fecha Ingreso', 'Insumo', 'Código', 'Lote', 'Proveedor'],
                    data,
                    'kardex_insumos'
                  );
               }}
               className="text-white/70 hover:text-white" 
               title="PDF"
             >
               <Download className="w-4 h-4" />
             </button>
           </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6" onSubmit={handleSubmit}>
           <FormField label="Código CIMASUR"><input className="w-full border-b p-2 text-sm font-mono" value={form.codigoCimasur || ''} onChange={e => setForm({...form, codigoCimasur: e.target.value})} required /></FormField>
           <FormField label="Nombre Insumo"><input className="w-full border-b p-2 text-sm font-bold" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} required /></FormField>
           <FormField label="Código Envase"><input className="w-full border-b p-2 text-sm" value={form.codigoEnvase || ''} onChange={e => setForm({...form, codigoEnvase: e.target.value})} /></FormField>
           <FormField label="Lote"><input className="w-full border-b p-2 text-sm" value={form.lote || ''} onChange={e => setForm({...form, lote: e.target.value})} /></FormField>
           <FormField label="Proveedor"><input className="w-full border-b p-2 text-sm" value={form.proveedor || ''} onChange={e => setForm({...form, proveedor: e.target.value})} /></FormField>
           <FormField label="Fecha Ingreso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngreso || ''} onChange={e => setForm({...form, fechaIngreso: e.target.value})} /></FormField>
           <FormField label="Vencimiento"><input type="date" className="w-full border-b p-2 text-sm" value={form.vencimiento || ''} onChange={e => setForm({...form, vencimiento: e.target.value})} /></FormField>
           <FormField label="Uso Específico"><input className="w-full border-b p-2 text-sm" value={form.uso || ''} onChange={e => setForm({...form, uso: e.target.value})} /></FormField>
           <FormField label="Ubicación"><input className="w-full border-b p-2 text-sm" value={form.ubicacion || ''} onChange={e => setForm({...form, ubicacion: e.target.value})} /></FormField>
           <FormField label="Cantidad a Ingresar"><input type="number" className="w-full border-b p-2 text-sm font-bold text-blue-600" value={form.cantidad || ''} onChange={e => setForm({...form, cantidad: e.target.value})} required /></FormField>
           <div className="md:col-span-3">
              <FormField label="Observaciones"><textarea className="w-full border rounded p-3 text-xs h-20 bg-slate-50" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
           </div>
           <div className="md:col-span-3 flex justify-end gap-2">
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({...form, codigoCimasur: '', nombre: '', lote: '', observaciones: ''}); }} className="bg-slate-200 text-slate-700 px-10 py-3 rounded-xl font-bold">CANCELAR</button>}
              <button type="submit" className="bg-[#001736] text-white px-10 py-3 rounded-xl font-bold">{editingId ? 'GUARDAR CAMBIOS' : 'INGRESAR MATERIA PRIMA'}</button>
           </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-[10px] font-black uppercase text-[#001736] tracking-widest">Historial Insumos / Materia Prima</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Fecha Ingreso</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Nombre Insumo</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Código</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Lote</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Cantidad</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {filteredHistory.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="px-6 py-4 font-medium">{formatDate(r.fechaIngreso)}</td>
                  <td className="px-6 py-4 font-bold">{r.nombre}</td>
                  <td className="px-6 py-4 font-mono text-blue-700">{r.codigoCimasur}</td>
                  <td className="px-6 py-4">{r.lote}</td>
                  <td className="px-6 py-4 font-black">{r.cantidad || '0'}</td>
                  <td className="px-6 py-4">
                    <RecordActions
                      onEdit={() => handleEdit(r)}
                      onDelete={async () => { 
                        if (true) { 
                          try {
                            await localDB.deleteFromCollection('lab_records', r.id); 
                            const updated = await localDB.getCollection('lab_records'); 
                            setRecords(updated); 
                            alert('Eliminado');
                          } catch (err) {
                            alert('No se pudo eliminar');
                          }
                        } 
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 italic">No se encontraron resultados en el historial...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VademecumForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [form, setForm] = useState({
    fechaCotiz: new Date().toISOString().split('T')[0],
    producto: '',
    nombreAlternativo: '',
    proveedor: '',
    valor: '',
    prioridad: 'Media',
    fechaCompra: '',
    estado: 'Pendiente',
    dilucion: '',
    observaciones: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('lab_records', editingId, form);
      setEditingId(null);
    } else {
      await localDB.saveToCollection('lab_records', { ...form, type: 'vademecum' });
      alert('Item Vademécum guardado');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      fechaCotiz: new Date().toISOString().split('T')[0], producto: '', nombreAlternativo: '', proveedor: '', valor: '', prioridad: 'Media', fechaCompra: '', estado: 'Pendiente', dilucion: '', observaciones: ''
    });
  };

  const handleEdit = (record: any) => {
    setForm(record);
    setEditingId(record.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Compras Vademécum {editingId ? '(Editando)' : ''}</span>
           <button 
             onClick={() => {
                const data = records.filter(r => r.type === 'vademecum').map(r => [
                  formatDate(r.fechaCotiz),
                  r.producto,
                  r.proveedor,
                  r.estado,
                  r.valor
                ]);
                exportTableToPDF(
                  'Reporte: Vademécum de Compras',
                  ['Fecha', 'Producto', 'Proveedor', 'Estado', 'Valor'],
                  data,
                  'vademecum_compras'
                );
             }}
             className="text-white/70 hover:text-white" 
             title="PDF"
           >
             <Download className="w-4 h-4" />
           </button>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
           <FormField label="Fecha Cotiz"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaCotiz || ''} onChange={e => setForm({...form, fechaCotiz: e.target.value})} /></FormField>
           <FormField label="Producto"><input className="w-full border-b p-2 text-sm font-bold" value={form.producto || ''} onChange={e => setForm({...form, producto: e.target.value})} required /></FormField>
           <FormField label="Nombre Alternativo"><input className="w-full border-b p-2 text-sm" value={form.nombreAlternativo || ''} onChange={e => setForm({...form, nombreAlternativo: e.target.value})} /></FormField>
           <FormField label="Proveedor"><input className="w-full border-b p-2 text-sm" value={form.proveedor || ''} onChange={e => setForm({...form, proveedor: e.target.value})} /></FormField>
           <FormField label="Valor"><input className="w-full border-b p-2 text-sm" value={form.valor || ''} onChange={e => setForm({...form, valor: e.target.value})} /></FormField>
           
           <FormField label="Prioridad">
             <select className="w-full border-b p-2 text-sm" value={form.prioridad || 'Media'} onChange={e => setForm({...form, prioridad: e.target.value})}>
               <option>Baja</option><option>Media</option><option>Alta</option>
             </select>
           </FormField>
           <FormField label="Fecha Compra"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaCompra || ''} onChange={e => setForm({...form, fechaCompra: e.target.value})} /></FormField>
           <FormField label="Estado">
              <select className="w-full border-b p-2 text-sm" value={form.estado || 'Pendiente'} onChange={e => setForm({...form, estado: e.target.value})}>
                 <option>Pendiente</option><option>Comprado</option><option>En Preparación</option>
              </select>
           </FormField>
           <FormField label="Dilución a preparar"><input className="w-full border-b p-2 text-sm" value={form.dilucion || ''} onChange={e => setForm({...form, dilucion: e.target.value})} /></FormField>
           <div className="md:col-span-4">
              <FormField label="Observaciones"><textarea className="w-full border rounded p-3 text-xs h-20 bg-slate-50" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} /></FormField>
           </div>
           <div className="md:col-span-4 flex justify-end gap-2">
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({fechaCotiz: new Date().toISOString().split('T')[0], producto: '', nombreAlternativo: '', proveedor: '', valor: '', prioridad: 'Media', fechaCompra: '', estado: 'Pendiente', dilucion: '', observaciones: ''}); }} className="bg-slate-200 text-slate-700 px-10 py-3 rounded-xl font-bold">CANCELAR</button>}
              <button type="submit" className="bg-[#001736] text-white px-10 py-3 rounded-xl font-bold">{editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR EN VADEMÉCUM'}</button>
           </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-[10px] font-black uppercase text-[#001736] tracking-widest">Historial Vademécum</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Fecha</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Producto</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Proveedor</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500">Estado</th>
                <th className="px-6 py-3 text-[10px] uppercase font-black text-slate-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'vademecum').map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-medium">{formatDate(r.fechaCotiz)}</td>
                  <td className="px-6 py-4 font-bold">{r.producto}</td>
                  <td className="px-6 py-4">{r.proveedor}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded uppercase",
                      r.estado === 'Comprado' ? "bg-green-100 text-green-700" : 
                      r.estado === 'En Preparación' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RecordActions
                      onView={() => {
                        const data = [
                          { label: 'Producto', value: r.producto },
                          { label: 'Proveedor', value: r.proveedor },
                          { label: 'Valor', value: r.valor },
                          { label: 'Fecha Cotiz', value: formatDate(r.fechaCotiz) },
                          { label: 'Estado', value: r.estado }
                        ];
                        viewExpedienteInNewTab('Ficha: Vademécum', data, `vademecum_${r.id}`);
                      }}
                      onDownload={() => {
                         const data = [
                          { label: 'Producto', value: r.producto },
                          { label: 'Proveedor', value: r.proveedor },
                          { label: 'Valor', value: r.valor },
                          { label: 'Fecha Cotiz', value: formatDate(r.fechaCotiz) },
                          { label: 'Estado', value: r.estado }
                        ];
                        exportExpedienteToPDF('Ficha: Vademécum', data, `vademecum_${r.id}`);
                      }}
                      onEdit={() => handleEdit(r)}
                      onDelete={async () => {
                        if (true) {
                          try {
                            await localDB.deleteFromCollection('lab_records', r.id);
                            const updated = await localDB.getCollection('lab_records');
                            setRecords(updated);
                            alert('Vademécum eliminado correctamente');
                          } catch (err) {
                            alert('Error al eliminar');
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

function MantenimientoForm({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const [form, setForm] = useState({
    codigo: '',
    producto: '',
    fechaCompra: '',
    marca: '',
    modelo: '',
    valor: '',
    proveedor: '',
    responsable: '',
    estado: 'Bueno',
    area: 'L.A.B',
    comentarios: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLogsModal, setShowLogsModal] = useState<any | null>(null);
  const [logForm, setLogForm] = useState({ fecha: new Date().toISOString().split('T')[0], tecnico: '', detalle: '', proximaMantencion: '' });

  const areas = ['O.D.L', 'S.D.D', 'S.T.M', 'S.A.C', 'S.D.A', 'S.U.V', 'L.A.B', 'P.A.S'];
  const statusOptions = ['Bueno', 'Regular', 'Eliminado', 'Dado de baja', 'Reemplazado'];

  const handleSubmit = async () => {
    const currentRecords = await localDB.getCollection('lab_records');
    
    if (!form.codigo || !form.producto) {
      alert('Por favor ingrese código y producto.');
      return;
    }
    
    const logEntry = {
      fecha: new Date().toISOString().split('T')[0],
      tecnico: form.responsable || 'Sistema',
      detalle: editingId ? `Actualización de estado: ${form.estado}. ${form.comentarios}` : `Registro inicial: ${form.producto}. ${form.comentarios}`,
      proximaMantencion: ''
    };
    
    if (editingId) {
      const existingRecord = currentRecords.find(r => r.id === editingId);
      const updatedMantenciones = [...(existingRecord.mantenciones || []), logEntry];
      await localDB.updateInCollection('lab_records', editingId, { ...form, mantenciones: updatedMantenciones });
      alert('Equipo actualizado');
      setEditingId(null);
    } else {
      if (currentRecords.some(r => r.type === 'mantenimiento' && r.codigo === form.codigo)) {
        alert('El código de equipo ya existe. Por favor, ingrese uno único.');
        return;
      }
      await localDB.saveToCollection('lab_records', { ...form, mantenciones: [logEntry], type: 'mantenimiento' });
      alert('Equipo registrado');
    }
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setForm({
      codigo: '',
      producto: '',
      fechaCompra: '',
      marca: '',
      modelo: '',
      valor: '',
      proveedor: '',
      responsable: '',
      estado: 'Bueno',
      area: 'L.A.B',
      comentarios: ''
    });
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLogsModal) return;
    const newMantenciones = [...(showLogsModal.mantenciones || []), logForm];
    await localDB.updateInCollection('lab_records', showLogsModal.id, { mantenciones: newMantenciones });
    setShowLogsModal({ ...showLogsModal, mantenciones: newMantenciones });
    const updated = await localDB.getCollection('lab_records');
    setRecords(updated);
    setLogForm({ fecha: new Date().toISOString().split('T')[0], tecnico: '', detalle: '', proximaMantencion: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-[#001736]">Historial de Mantenciones: {showLogsModal.producto} ({showLogsModal.codigo})</h3>
              <button onClick={() => setShowLogsModal(null)} className="text-slate-400 hover:text-black font-bold">X</button>
            </div>
            
            <form onSubmit={handleAddLog} className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border">
              <FormField label="Fecha Mantención"><input type="date" className="w-full border-b p-2 text-sm bg-white" value={logForm.fecha} onChange={e => setLogForm({...logForm, fecha: e.target.value})} required /></FormField>
              <FormField label="Técnico / Responsable"><input className="w-full border-b p-2 text-sm bg-white" value={logForm.tecnico} onChange={e => setLogForm({...logForm, tecnico: e.target.value})} required /></FormField>
              <FormField label="Próxima Mantención (Opcional)"><input type="date" className="w-full border-b p-2 text-sm bg-white" value={logForm.proximaMantencion} onChange={e => setLogForm({...logForm, proximaMantencion: e.target.value})} /></FormField>
              <div className="col-span-2">
                <FormField label="Detalle de Trabajos Realizados"><textarea className="w-full border p-2 text-sm bg-white rounded h-16" value={logForm.detalle} onChange={e => setLogForm({...logForm, detalle: e.target.value})} required /></FormField>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" className="bg-[#001736] text-white px-6 py-2 rounded-lg font-bold text-sm">AÑADIR REGISTRO</button>
              </div>
            </form>

            <div className="max-h-60 overflow-y-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-[#002b5b] text-white sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Técnico</th>
                    <th className="p-2 text-left">Detalle</th>
                    <th className="p-2 text-left">Próxima</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(showLogsModal.mantenciones || []).map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-medium">{formatDate(m.fecha)}</td>
                      <td className="p-2">{m.tecnico}</td>
                      <td className="p-2">{m.detalle}</td>
                      <td className="p-2 text-slate-500">{m.proximaMantencion ? formatDate(m.proximaMantencion) : '---'}</td>
                    </tr>
                  ))}
                  {(!showLogsModal.mantenciones || showLogsModal.mantenciones.length === 0) && (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-500 italic">No hay mantenciones registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
          <span className="flex items-center gap-2"><Settings className="w-5 h-5" /> Mantención de Equipos</span>
          <button 
            onClick={() => {
              const data = records.filter(r => r.type === 'mantenimiento').map(r => [
                r.codigo,
                r.producto,
                r.area,
                r.responsable,
                r.estado
              ]);
              exportTableToPDF(
                'Reporte: Inventario de Equipos y Mantención',
                ['Código', 'Equipo', 'Área', 'Responsable', 'Estado'],
                data,
                'mantenimiento_equipos'
              );
            }}
            className="text-white/70 hover:text-white" 
            title="PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <FormField label="Código Equipo"><input className="w-full border-b p-2 text-sm font-mono" value={form.codigo || ''} onChange={e => setForm({...form, codigo: e.target.value})} /></FormField>
          <FormField label="Producto / Equipo"><input className="w-full border-b p-2 text-sm font-bold" value={form.producto || ''} onChange={e => setForm({...form, producto: e.target.value})} /></FormField>
          <FormField label="Área">
            <select className="w-full border-b p-2 text-sm" value={form.area || 'L.A.B'} onChange={e => setForm({...form, area: e.target.value})}>
               {areas.map(a => <option key={a}>{a}</option>)}
            </select>
          </FormField>
          <FormField label="Fecha Compra"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaCompra || ''} onChange={e => setForm({...form, fechaCompra: e.target.value})} /></FormField>
          <FormField label="Marca"><input className="w-full border-b p-2 text-sm" value={form.marca || ''} onChange={e => setForm({...form, marca: e.target.value})} /></FormField>
          <FormField label="Modelo"><input className="w-full border-b p-2 text-sm" value={form.modelo || ''} onChange={e => setForm({...form, modelo: e.target.value})} /></FormField>
          <FormField label="Valor"><input type="text" className="w-full border-b p-2 text-sm" value={form.valor || ''} onChange={e => setForm({...form, valor: e.target.value.replace(/[^0-9.,]/g, '')})} /></FormField>
          <FormField label="Proveedor"><input className="w-full border-b p-2 text-sm" value={form.proveedor || ''} onChange={e => setForm({...form, proveedor: e.target.value})} /></FormField>
          <FormField label="Responsable"><input className="w-full border-b p-2 text-sm" value={form.responsable || ''} onChange={e => setForm({...form, responsable: e.target.value})} /></FormField>
          <FormField label="Estado Actual">
             <select className="w-full border-b p-2 text-sm font-black text-blue-600" value={form.estado || 'Bueno'} onChange={e => setForm({...form, estado: e.target.value})}>
                {statusOptions.map(o => <option key={o}>{o}</option>)}
             </select>
          </FormField>
          <div className="md:col-span-4">
             <FormField label="Comentarios Técnicos"><textarea className="w-full border rounded p-3 text-xs h-20 bg-slate-50" value={form.comentarios || ''} onChange={e => setForm({...form, comentarios: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-4 flex justify-end">
             <button type="button" onClick={handleSubmit} className="bg-[#001736] text-white px-10 py-3 rounded-xl font-bold">REGISTRAR ESTADO EQUIPO Y ACCIÓN</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-[#002b5b]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#001736]">Historial Mantención</h3>
          <button className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Descargar PDF">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4 text-center">Código</th>
                <th className="p-4">Equipo</th>
                <th className="p-4">Área</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {records.filter(r => r.type === 'mantenimiento').map(r => (
                <tr key={r.id}>
                  <td className="p-4 font-mono text-blue-700 text-center">{r.codigo}</td>
                  <td className="p-4 font-bold">{r.producto}</td>
                  <td className="p-4">{r.area}</td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black text-[9px] uppercase">{r.estado}</span>
                  </td>
                  <td className="p-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        <button onClick={() => setShowLogsModal(r)} className="px-2 py-1 bg-[#001736] text-white text-[9px] uppercase font-bold rounded hover:bg-blue-800">
                          Mantenciones ({r.mantenciones?.length || 0})
                        </button>
                      </div>
                      <RecordActions
                        onView={() => {
                          const data = [
                            { label: 'Código', value: r.codigo },
                            { label: 'Equipo', value: r.producto },
                            { label: 'Área', value: r.area },
                            { label: 'Estado', value: r.estado },
                            { label: 'Responsable', value: r.responsable },
                            { label: 'Comentarios', value: r.comentarios || '' }
                          ];
                          viewExpedienteInNewTab('Ficha: Equipo', data, `equipo_${r.codigo}`);
                        }}
                        onDownload={() => {
                          const data = [
                            { label: 'Código', value: r.codigo },
                            { label: 'Equipo', value: r.producto },
                            { label: 'Área', value: r.area },
                            { label: 'Estado', value: r.estado },
                            { label: 'Responsable', value: r.responsable },
                            { label: 'Comentarios', value: r.comentarios || '' }
                          ];
                          const logsTable = {
                            title: 'Historial de Mantenciones',
                            headers: ['Fecha', 'Técnico', 'Detalle', 'Próxima'],
                            rows: (r.mantenciones || []).map((m: any) => [formatDate(m.fecha), m.tecnico, m.detalle, formatDate(m.proximaMantencion)])
                          };
                          exportExpedienteToPDF('Ficha: Equipo', data, `equipo_${r.codigo}`, [logsTable]);
                        }}
                        onEdit={() => {
                          setForm(r);
                          setEditingId(r.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onDelete={async () => {
                          if (true) {
                            try {
                              await localDB.deleteFromCollection('lab_records', r.id);
                              const updated = await localDB.getCollection('lab_records');
                              setRecords(updated);
                              alert('Equipo eliminado correctamente');
                            } catch(err) {
                              alert('No se pudo eliminar el equipo');
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

function StockManager({ records: _, setRecords: __ }: { records: any[], setRecords: (data: any[]) => void }) {
  const [inventoryRecords, setInventoryRecords] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('Etiquetas salina');
  const [consumptionQty, setConsumptionQty] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [form, setForm] = useState({
    area: 'Etiquetas salina',
    item: '',
    code: '',
    qty: 0,
  });

  const [followups, setFollowups] = useState<any[]>([]);
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [editingFollowupMotivo, setEditingFollowupMotivo] = useState<string>('');
  
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockItem, setEditingStockItem] = useState('');
  const [editingStockQty, setEditingStockQty] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const invData = await localDB.getCollection('inventory');
        setInventoryRecords(Array.isArray(invData) ? invData : []);
        
        const folData = await localDB.getCollection('stock_followups');
        setFollowups(Array.isArray(folData) ? folData : []);
      } catch (err) {
        console.error('StockManager Load Error:', err);
        setInventoryRecords([]);
        setFollowups([]);
      }
    };
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  const handleDeleteItem = async (id: string) => {
    if (true) {
      await localDB.deleteFromCollection('inventory', id);
      const updated = await localDB.getCollection('inventory');
      setInventoryRecords(updated);
    }
  };

  const handleEditItemSave = async (id: string) => {
    await localDB.updateInCollection('inventory', id, { item: editingStockItem, qty: editingStockQty });
    setEditingStockId(null);
    const updated = await localDB.getCollection('inventory');
    setInventoryRecords(updated);
  };

  const areas = [
    'Etiquetas salina', 
    'Etiquetas Etanol', 
    'Estuches', 
    'Frascos', 
    'Plantillas para descontar', 
    'Insumos Varios'
  ];

  const filteredRecords = inventoryRecords.filter(r => 
    r.area === selectedArea && 
    (r.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (r.code && r.code.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const existingItems = await localDB.getCollection('inventory');
    const duplicate = existingItems.find(r => r.area === form.area && (r.item.toLowerCase() === form.item.toLowerCase() || (form.code && r.code?.toLowerCase() === form.code.toLowerCase())));

    if (duplicate) {
      const newQty = duplicate.qty + form.qty;
      await localDB.updateInCollection('inventory', duplicate.id, { qty: newQty });
      alert(`Producto ya ingresado. Se ha sumado la cantidad.\n(Stock Anterior: ${duplicate.qty} -> Nuevo Stock: ${newQty})`);
    } else {
      await localDB.saveToCollection('inventory', { ...form });
      alert('Stock registrado en Kardex (Nuevo Insumo)');
    }
    
    setForm({ ...form, item: '', code: '', qty: 0 });
    const updated = await localDB.getCollection('inventory');
    setInventoryRecords(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataArray = evt.target?.result;
        const wb = XLSX.read(dataArray, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

        if (rawData.length === 0) {
          alert('El archivo parece estar vacío o no tiene el formato correcto.');
          return;
        }

        const existingItems = await localDB.getCollection('inventory');
        let importedCount = 0;
        let updateCount = 0;
        let skippedCount = 0;

        // Process sequentially
        for (const row of rawData) {
          // Normalize keys to support variations
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            const key = keys.find(k => {
              const normalizedK = k.toString().toUpperCase().trim();
              return possibleKeys.some(pk => normalizedK === pk || normalizedK.includes(pk));
            });
            return key ? row[key] : null;
          };

          const areaCell = getVal(['AREA', 'ZONA', 'UBICACION']) || selectedArea || 'General';
          const itemText = getVal(['NOMBRE INSUMO', 'ITEM', 'NOMBRE', 'PRODUCTO', 'INSUMO']);
          const codeVal = getVal(['CODIGO SKU', 'SKU', 'CODIGO', 'CODE']);
          const qtyVal = parseFloat(getVal(['CANTIDAD', 'STOCK', 'QTY', 'UNIDADES']) || '0');

          if (!itemText || itemText.toString().trim() === "") {
            skippedCount++;
            continue;
          }

          const newItem = {
            area: areaCell.toString().trim(),
            item: itemText.toString().trim(),
            code: codeVal ? codeVal.toString().trim() : `IMP-${Math.floor(Math.random() * 1000000)}`,
            qty: isNaN(qtyVal) ? 0 : qtyVal,
            updatedAt: new Date().toISOString()
          };

          // Un item es duplicado SOLO si coincide el Nombre y el Área
          const duplicateIndex = existingItems.findIndex(r => 
            r.area === newItem.area && 
            r.item.toLowerCase().trim() === newItem.item.toLowerCase().trim()
          );

          if (duplicateIndex >= 0) {
            const duplicate = existingItems[duplicateIndex];
            const newTotalQty = (parseFloat(duplicate.qty) || 0) + newItem.qty;
            await localDB.updateInCollection('inventory', duplicate.id, { 
              qty: newTotalQty,
              updatedAt: newItem.updatedAt
            });
            
            existingItems[duplicateIndex].qty = newTotalQty;
            updateCount++;
          } else {
            const savedItem = await localDB.saveToCollection('inventory', newItem);
            existingItems.push(savedItem);
            importedCount++;
          }
        }

        alert(`Importación Finalizada:\n- Leídas: ${rawData.length} filas\n- Nuevos items: ${importedCount}\n- Actualizados: ${updateCount}\n- Omitidos (sin nombre): ${skippedCount}`);
        const updated = await localDB.getCollection('inventory');
        setInventoryRecords(updated);
        // Clear input
        e.target.value = '';
      } catch (error) {
        console.error('Error parsing Excel:', error);
        alert('Error al procesar el archivo Excel. Verifique el formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeduct = async (record: any) => {
    const deductQty = consumptionQty[record.id] || 0;
    if (deductQty <= 0) {
      alert('Ingrese una cantidad válida para descontar');
      return;
    }
    if (deductQty > record.qty) {
      alert('No hay stock suficiente');
      return;
    }

    const newQty = record.qty - deductQty;
    await localDB.updateInCollection('inventory', record.id, { qty: newQty });
    
    await localDB.saveToCollection('stock_followups', {
      fecha: new Date().toISOString(),
      area: record.area,
      item: record.item,
      code: record.code,
      cantidadDescontada: deductQty,
      stockFinal: newQty,
      motivo: 'Consumo Diario Laboratorio'
    });

    alert(`Descontado: ${deductQty} unidades. Stock Final: ${newQty}`);
    setConsumptionQty({ ...consumptionQty, [record.id]: 0 });
    const updatedInv = await localDB.getCollection('inventory');
    setInventoryRecords(updatedInv);
    const updatedFollow = await localDB.getCollection('stock_followups');
    setFollowups(updatedFollow);
  };

  const handleDeleteFollowup = async (id: string) => {
    await localDB.deleteFromCollection('stock_followups', id);
    const updated = await localDB.getCollection('stock_followups');
    setFollowups(updated);
  };

  const handleEditFollowupSave = async (id: string) => {
    if (editingFollowupMotivo) {
      await localDB.updateInCollection('stock_followups', id, { motivo: editingFollowupMotivo });
      const updated = await localDB.getCollection('stock_followups');
      setFollowups(updated);
    }
    setEditingFollowupId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#002b5b] p-4 rounded-xl text-white shadow-lg">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest">Control por Área</h3>
             <button className="text-white/70 hover:text-white" title="PDF"><Download className="w-3.5 h-3.5" /></button>
           </div>
           <FormField label="Seleccionar Área Visualización">
              <select 
                className="w-full bg-white/10 border-none p-2 text-xs rounded outline-none"
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
              >
                {areas.map(a => <option key={a} value={a} className="text-[#002b5b]">{a}</option>)}
              </select>
           </FormField>
           
            <div className="mt-4 space-y-2">
              <label className="block text-[10px] uppercase font-bold text-blue-100/60 mb-1">Importar Planilla Excel (.xlsx)</label>
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="bg-white/20 hover:bg-white text-white hover:text-blue-900 h-full py-2 rounded text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 border border-dashed border-white/30">
                    <FileUp className="w-4 h-4" />
                    Subir Excel
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const data = [
                      { 'AREA': 'Etiquetas salina', 'NOMBRE INSUMO': 'Etiqueta Tipo A', 'CODIGO SKU': 'ET-A01', 'CANTIDAD': 150 },
                      { 'AREA': 'Etiquetas Etanol', 'NOMBRE INSUMO': 'Alcohol Isopropílico', 'CODIGO SKU': 'ALC-001', 'CANTIDAD': 10 }
                    ];
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Stock");
                    XLSX.writeFile(wb, "plantilla_importacion_stock.xlsx");
                  }}
                  className="bg-green-600/80 hover:bg-green-500 text-white p-2 rounded flex flex-col items-center justify-center"
                  title="Descargar Plantilla Excel"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-[8px] mt-1 font-bold">Plantilla</span>
                </button>
              </div>
              <p className="text-[8px] text-blue-100/40 italic">Las columnas deben ser: AREA, NOMBRE INSUMO, CODIGO SKU, CANTIDAD</p>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[10px] font-black text-[#002b5b] border-b border-slate-100 pb-3 mb-4 uppercase tracking-widest">Ingreso de Insumo</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField label="Área">
              <select className="w-full border-b border-slate-200 p-2 text-xs outline-none" value={form.area || 'Etiquetas salina'} onChange={e => setForm({...form, area: e.target.value})} required>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Nombre Insumo"><input className="w-full border-b p-2 text-xs" value={form.item || ''} onChange={e => setForm({...form, item: e.target.value})} required /></FormField>
            <FormField label="Código SKU"><input className="w-full border-b p-2 text-xs font-mono" value={form.code || ''} onChange={e => setForm({...form, code: e.target.value})} required /></FormField>
            <FormField label="Cant."><input type="number" className="w-full border-b p-2 text-xs font-bold" value={form.qty || 0} onChange={e => setForm({...form, qty: parseInt(e.target.value) || 0})} /></FormField>
            <button type="submit" className="w-full bg-[#001736] text-white py-3 rounded font-black text-[10px] uppercase shadow-lg">Registrar Entrada</button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <div className="bg-slate-50 p-4 border-b flex justify-between items-center text-[#002b5b]">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Matriz de Inventario - {selectedArea}</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const data = filteredRecords.map(r => [
                      r.item,
                      r.code,
                      r.qty,
                      r.area
                    ]);
                    exportTableToPDF(
                      `Inventario: ${selectedArea}`,
                      ['Insumo', 'Código', 'Stock', 'Área'],
                      data,
                      `inventario_${selectedArea.toLowerCase().replace(/\s+/g, '_')}`
                    );
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded text-blue-600"
                  title="Exportar Matrix PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400">
                  <div className="w-3 h-3 bg-red-100 rounded"></div> Crítico
                  <div className="w-3 h-3 bg-blue-100 rounded ml-2"></div> Óptimo
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filtrar insumos por nombre o SKU..." 
                    className="text-[10px] border border-slate-200 rounded-full pl-8 pr-4 py-1.5 outline-none w-64 bg-white focus:border-blue-400" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-xs">
                <thead className="bg-[#f8fafc] text-slate-500 text-[10px] uppercase font-black">
                   <tr className="text-left border-b">
                      <th className="p-4">Insumo / Código</th>
                      <th className="p-4 text-center">Stock Actual</th>
                      <th className="p-4 text-center">Consumo (Descuento)</th>
                      <th className="p-4 text-center">Gestión</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredRecords.map(record => (
                     <tr key={record.id} className="hover:bg-blue-50/20 transition-colors">
                       <td className="p-4">
                          {editingStockId === record.id ? (
                            <input type="text" className="w-full border rounded px-2 py-1 text-xs" value={editingStockItem || ''} onChange={e => setEditingStockItem(e.target.value)} />
                          ) : (
                            <>
                              <div className="font-bold text-slate-800">{record.item}</div>
                              <div className="text-[9px] font-mono text-slate-400">{record.code}</div>
                            </>
                          )}
                       </td>
                       <td className="p-4 text-center">
                          {editingStockId === record.id ? (
                            <input type="number" className="w-16 border rounded text-center py-1 font-bold block mx-auto" value={editingStockQty || 0} onChange={e => setEditingStockQty(parseInt(e.target.value) || 0)} />
                          ) : (
                            <span className={cn(
                              "font-black text-sm",
                              record.qty <= 5 ? "text-red-500" : "text-blue-900"
                            )}>{record.qty}</span>
                          )}
                       </td>
                       <td className="p-4 text-center">
                          <input 
                            type="number" 
                            className="w-16 border rounded text-center py-1 font-bold text-blue-600"
                            placeholder="0"
                            value={consumptionQty[record.id] || ''}
                            onChange={e => setConsumptionQty({...consumptionQty, [record.id]: parseInt(e.target.value) || 0})}
                          />
                       </td>
                       <td className="p-4 text-center">
                          <div className="flex flex-col gap-2 items-center">
                            <button 
                              onClick={() => handleDeduct(record)}
                              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm w-full"
                            >
                              Descontar
                            </button>
                            <div className="flex gap-2">
                              {editingStockId === record.id ? (
                                <button onClick={() => handleEditItemSave(record.id)} className="text-green-500 hover:text-green-700 bg-green-50 px-2 py-1 rounded w-full flex justify-center"><Download className="w-3.5 h-3.5" /></button>
                              ) : (
                                <button onClick={() => { setEditingStockId(record.id); setEditingStockItem(record.item); setEditingStockQty(record.qty); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded w-full flex justify-center"><Edit className="w-3.5 h-3.5" /></button>
                              )}
                              <button onClick={() => handleDeleteItem(record.id)} className="text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded w-full flex justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                       </td>
                     </tr>
                   ))}
                   {filteredRecords.length === 0 && (
                     <tr>
                        <td colSpan={4} className="p-10 text-center text-slate-400 italic">No hay insumos registrados para esta área...</td>
                     </tr>
                   )}
                </tbody>
             </table>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mt-6">
           <div className="bg-slate-50 p-4 border-b flex justify-between items-center text-[#002b5b]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#001736]">Seguimiento de Movimientos (Salidas)</h3>
              <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1" title="PDF">
                <Download className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Descargar Historial</span>
              </button>
           </div>
           <div className="overflow-x-auto max-h-64 scrollbar-thin">
              <table className="w-full text-[10px]">
                 <thead className="bg-[#f8fafc] text-slate-500 uppercase font-black">
                    <tr className="text-left border-b">
                       <th className="p-3">Fecha</th>
                       <th className="p-3">Item</th>
                       <th className="p-3 text-center">Cant.</th>
                       <th className="p-3 text-center">Stock Final</th>
                       <th className="p-3">Motivo</th>
                       <th className="p-3 text-center">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {followups.slice().reverse().map((f: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 italic">
                        <td className="p-3">{formatDate(f.fecha)}</td>
                        <td className="p-3 font-bold text-[#002b5b]">{f.item}</td>
                        <td className="p-3 text-center text-red-600 font-bold">-{f.cantidadDescontada}</td>
                        <td className="p-3 text-center font-black">{f.stockFinal}</td>
                        <td className="p-3 text-slate-400">
                          {editingFollowupId === f.id ? (
                            <input 
                              type="text" 
                              className="w-full border border-blue-200 rounded px-2 py-1 outline-none text-[10px]" 
                              value={editingFollowupMotivo} 
                              onChange={(e) => setEditingFollowupMotivo(e.target.value)} 
                              autoFocus
                            />
                          ) : (
                            f.motivo
                          )}
                        </td>
                        <td className="p-3 flex justify-center gap-2">
                           {editingFollowupId === f.id ? (
                             <button onClick={() => handleEditFollowupSave(f.id)} className="text-green-500 hover:text-green-700 bg-green-50 px-2 py-1 rounded" title="Guardar">Guardar</button>
                           ) : (
                             <button onClick={() => { setEditingFollowupId(f.id); setEditingFollowupMotivo(f.motivo || ''); }} className="text-blue-500 hover:text-blue-700" title="Editar Motivo"><Edit className="w-3.5 h-3.5" /></button>
                           )}
                           <button onClick={() => handleDeleteFollowup(f.id)} className="text-red-400 hover:text-red-600" title="Eliminar Movimiento"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {followups.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No hay movimientos registrados.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}

function OrderTrackingForm({ records: _, setRecords: __ }: { records: any[], setRecords: (data: any[]) => void }) {
  const [trackingRecords, setTrackingRecords] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSituacion, setFilterSituacion] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState<any | null>(null);
  
  const safe = (val: any) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return '[Objeto]'; }
    }
    return String(val);
  };

  const [form, setForm] = useState({
    nroCotiz: '',
    ot: '',
    cliente: '',
    fechaCotiz: new Date().toISOString().split('T')[0],
    fechaEnvio: '',
    fechaCierre: '',
    fechaRecepcion: '',
    courier: 'Retiro en Oficina',
    detalleSeguimiento: '',
    situacion: 'PENDIENTE'
  });

  useEffect(() => {
    const loadTrackingData = async () => {
      try {
        const data = await localDB.getCollection('order_tracking');
        setTrackingRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Initial Load Error:', err);
        setTrackingRecords([]);
      }
    };
    loadTrackingData();
    window.addEventListener('db-change', loadTrackingData);
    return () => window.removeEventListener('db-change', loadTrackingData);
  }, []);

  const couriers = ['Blue express', 'Correos Chile', 'Starken', 'Chilexpress', 'Retiro en Oficina', 'Mercado Libre'];
  const situaciones = ['PENDIENTE', 'EN TRÁNSITO', 'OK', 'NULA', 'DEVOLUCIÓN', 'SIN RETIRO', 'RECHAZADO'];

  const handleExportPDF = (r: any) => {
    const data = [
      { label: 'N° Cotización / Pedido', value: r.nroCotiz || '---' },
      { label: 'Orden de Transporte (OT)', value: r.ot || '---' },
      { label: 'Cliente', value: r.cliente || '---' },
      { label: 'Courier', value: r.courier || 'Retiro en Oficina' },
      { label: 'Situación Actual', value: r.situacion || 'PENDIENTE' },
      { label: 'FECHA COTIZACIÓN', value: formatDate(r.fechaCotiz) },
      { label: 'FECHA ENVÍO', value: formatDate(r.fechaEnvio) },
      { label: 'FECHA CIERRE', value: formatDate(r.fechaCierre) },
      { label: 'FECHA RECEPCIÓN', value: formatDate(r.fechaRecepcion) },
      { label: 'Detalle de Seguimiento', value: r.detalleSeguimiento || '---' }
    ];

    const logsTable = {
      title: 'Historia Unificada de Movimientos y Seguimiento',
      headers: ['Fecha', 'Usuario', 'Acción / Hito'],
      rows: (Array.isArray(r.logs) ? r.logs : []).map((log: any) => [safe(log.date), safe(log.user), safe(log.action)])
    };

    exportExpedienteToPDF(
      `Ficha de Seguimiento Logístico: ${r.nroCotiz}`,
      data,
      `seguimiento_${r.nroCotiz}`,
      [logsTable]
    );
  };

  const trackTrackingClick = async (r: any) => {
    const user = localAuth.getCurrentUser();
    const userName = user?.displayName || user?.email || 'Sistema';
    const timestamp = new Date().toLocaleString('es-CL');
    const link = getTrackingLink(r.courier, r.ot);
    
    if (link) {
      const newLogs = [...(Array.isArray(r.logs) ? r.logs : [])];
      newLogs.push({ date: timestamp, user: userName, action: `Clic en enlace de seguimiento (${safe(r.courier)})` });
      await localDB.updateInCollection('order_tracking', r.id, { logs: newLogs });
      const updated = await localDB.getCollection('order_tracking');
      setTrackingRecords(updated);
    }
  };

  const getTrackingLink = (courier: string, ot: string) => {
    if (!ot) return null;
    const cleanOT = ot.trim();
    switch (courier) {
      case 'Blue express': return `https://www.blue.cl/seguimiento?n_seguimiento=${cleanOT}`;
      case 'Correos Chile': return `https://www.correos.cl/seguimiento-en-linea?tracking_number=${cleanOT}`;
      case 'Starken': return `https://www.starken.cl/seguimiento?codigo=${cleanOT}`;
      case 'Chilexpress': return `https://www.chilexpress.cl/seguimiento?ot=${cleanOT}`;
      default: return null;
    }
  };

  const resetForm = () => {
    setForm({
      nroCotiz: '',
      ot: '',
      cliente: '',
      fechaCotiz: new Date().toISOString().split('T')[0],
      fechaEnvio: '',
      fechaCierre: '',
      fechaRecepcion: '',
      courier: 'Retiro en Oficina',
      detalleSeguimiento: '',
      situacion: 'PENDIENTE'
    });
    setEditingId(null);
  };

  const handleSyncFromQuotes = async () => {
    try {
      const quotes = await localDB.getCollection('quotes');
      const currentRecords = await localDB.getCollection('order_tracking');
      
      const approvedQuotes = quotes.filter(q => 
        q.estado && safe(q.estado).trim().toLowerCase() === 'aprobada'
      );
      
      let addedCount = 0;
      for (const quote of approvedQuotes) {
        const quoteNro = safe(quote.nroCotiz).trim();
        const exists = currentRecords.find(r => 
          safe(r.nroCotiz).trim() === quoteNro
        );
        
        if (!exists) {
          await localDB.saveToCollection('order_tracking', {
            nroCotiz: safe(quote.nroCotiz),
            ot: '',
            cliente: safe(quote.cliente),
            fechaCotiz: safe(quote.fechaElab) || new Date().toISOString().split('T')[0],
            fechaEnvio: '',
            fechaCierre: '',
            fechaRecepcion: '',
            courier: 'Retiro en Oficina',
            detalleSeguimiento: '',
            situacion: 'PENDIENTE',
            logs: [{ 
              date: new Date().toLocaleString('es-CL'), 
              user: 'Sistema (Sync)', 
              action: 'Pedido sincronizado desde Administración' 
            }]
          });
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        alert(`Éxito: Se sincronizaron ${addedCount} nuevos pedidos.`);
        const updated = await localDB.getCollection('order_tracking');
        setTrackingRecords(updated);
      } else {
        alert('Información: No hay nuevas cotizaciones aprobadas para sincronizar.');
      }
    } catch (err) {
      console.error('Sync Error:', err);
      alert('Error técnico al sincronizar. Revise la consola.');
    }
  };

  const handleEdit = (r: any) => {
    try {
      if (!r) throw new Error('Registro inválido para edición');
      setEditingId(r.id);
      setForm({
        nroCotiz: safe(r.nroCotiz),
        ot: safe(r.ot),
        cliente: safe(r.cliente),
        fechaCotiz: safe(r.fechaCotiz),
        fechaEnvio: safe(r.fechaEnvio),
        fechaCierre: safe(r.fechaCierre),
        fechaRecepcion: safe(r.fechaRecepcion),
        courier: safe(r.courier) || 'Retiro en Oficina',
        detalleSeguimiento: safe(r.detalleSeguimiento),
        situacion: safe(r.situacion) || 'PENDIENTE'
      });
    } catch (err) {
      console.error('Edit Error:', err);
      alert('Error al intentar abrir el editor. Los datos podrían estar corruptos.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = localAuth.getCurrentUser();
      const userName = user?.displayName || user?.email || 'Sistema';
      const timestamp = new Date().toLocaleString('es-CL');

      if (editingId) {
        const existing = trackingRecords.find(r => r.id === editingId);
        if (!existing) {
          alert('El registro ya no existe o fue eliminado por otro usuario.');
          return;
        }
        const newLogs = [...(Array.isArray(existing.logs) ? existing.logs : [])];
        
        // Registrar cambios importantes
        if (safe(existing.situacion) !== safe(form.situacion)) {
          newLogs.push({ date: timestamp, user: userName, action: `Estado: ${safe(existing.situacion)} -> ${safe(form.situacion)}` });
        }
        if (safe(existing.ot) !== safe(form.ot)) {
          newLogs.push({ date: timestamp, user: userName, action: `OT Actualizada: ${safe(form.ot) || 'QUITADA'}` });
        }
        if (safe(existing.fechaEnvio) !== safe(form.fechaEnvio)) {
          newLogs.push({ date: timestamp, user: userName, action: `F. Envío: ${safe(form.fechaEnvio) || 'BORRADA'}` });
        }
        
        const safeDetalle = (form.detalleSeguimiento || '').toString();
        const existingDetalle = (existing.detalleSeguimiento || '').toString();
        if (existingDetalle !== safeDetalle) {
          newLogs.push({ date: timestamp, user: userName, action: `Nota mod.: ${safeDetalle.substring(0, 30)}...` });
        }

        await localDB.updateInCollection('order_tracking', editingId, { ...form, logs: newLogs });
        
        if (filterSituacion !== 'TODOS' && form.situacion !== filterSituacion) {
          alert(`Atención: El registro ahora tiene estado "${form.situacion}" y podría no ser visible con el filtro actual ("${filterSituacion}").`);
        }
      } else {
        const initialLogs = [{ date: timestamp, user: userName, action: 'Ingreso inicial a seguimiento' }];
        await localDB.saveToCollection('order_tracking', { ...form, logs: initialLogs });
      }
      
      const updated = await localDB.getCollection('order_tracking');
      setTrackingRecords(updated);
      resetForm();
    } catch (err) {
      console.error('Submit Error:', err);
      alert('Error al guardar el registro. Revise su conexión o los campos ingresados.');
    }
  };

  const filteredRecords = (Array.isArray(trackingRecords) ? trackingRecords : []).filter(r => {
    const situacion = safe(r.situacion);
    const matchesSituacion = filterSituacion === 'TODOS' || situacion === filterSituacion;
    const searchString = `${safe(r.nroCotiz)} ${safe(r.cliente)} ${safe(r.ot)}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    return matchesSituacion && matchesSearch;
  });

  const handleDelete = async (id: string) => {
    try {
      if (!id) return;
      await localDB.deleteFromCollection('order_tracking', id);
      const updated = await localDB.getCollection('order_tracking');
      setTrackingRecords(updated);
      alert('Registro eliminado correctamente');
    } catch (err) {
      console.error('Delete Error:', err);
      alert('Error técnico al intentar eliminar el registro.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full translate-y-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#002b5b] p-4 text-white font-bold flex justify-between items-center">
              <div className="flex items-center gap-2"><FileText className="w-5 h-5" /> Detalle Completo de Seguimiento: {safe(showDetail.nroCotiz)}</div>
              <button onClick={() => setShowDetail(null)} className="text-white hover:bg-white/10 p-1 rounded transition-colors">✕</button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Información Básica</h5>
                  <p className="text-sm"><strong>Pedido:</strong> {safe(showDetail.nroCotiz)}</p>
                  <p className="text-sm"><strong>Cliente:</strong> {safe(showDetail.cliente)}</p>
                  <p className="text-sm"><strong>Situación:</strong> 
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block",
                      safe(showDetail.situacion) === 'OK' ? "bg-green-100 text-green-700" :
                      safe(showDetail.situacion) === 'PENDIENTE' ? "bg-amber-100 text-amber-700" :
                      safe(showDetail.situacion) === 'EN TRÁNSITO' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    )}>
                      {safe(showDetail.situacion)}
                    </span>
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logística</h5>
                  <p className="text-sm"><strong>Courier:</strong> {safe(showDetail.courier)}</p>
                  <p className="text-sm"><strong>OT:</strong> {safe(showDetail.ot) || 'PENDIENTE'}</p>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 border rounded text-xs text-slate-600 italic">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 not-italic">Observaciones</h5>
                  {safe(showDetail.detalleSeguimiento) || 'Sin observaciones adicionales registradas.'}
                </div>
              </div>

              <div className="border-t pt-4">
                <h5 className="text-[10px] font-black text-[#002b5b] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" /> Historial de Movimientos y Seguimiento (Incluye todas las fechas)
                </h5>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 group">
                  <div className="flex justify-between items-center mb-3">
                    <h6 className="text-[10px] font-black text-blue-900 uppercase">Resumen de Fechas del Ciclo</h6>
                    <Clock className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50">
                      <span className="text-slate-400 block pb-1 border-b border-slate-50 mb-1 uppercase font-bold text-[8px]">Cotiz.</span>
                      <span className="font-black text-blue-900">{formatDate(showDetail.fechaCotiz)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50">
                      <span className="text-slate-400 block pb-1 border-b border-slate-50 mb-1 uppercase font-bold text-[8px]">Envío</span>
                      <span className="font-black text-blue-900">{formatDate(showDetail.fechaEnvio)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50">
                      <span className="text-slate-400 block pb-1 border-b border-slate-50 mb-1 uppercase font-bold text-[8px]">Cierre</span>
                      <span className="font-black text-blue-900">{formatDate(showDetail.fechaCierre)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50">
                      <span className="text-slate-400 block pb-1 border-b border-slate-50 mb-1 uppercase font-bold text-[8px]">Recep.</span>
                      <span className="font-black text-blue-900">{formatDate(showDetail.fechaRecepcion)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {(Array.isArray(showDetail.logs) ? showDetail.logs : []).slice().reverse().map((log: any, i: number) => (
                    <div key={i} className="text-[10px] bg-white border border-slate-100 border-l-4 border-blue-500 p-3 rounded shadow-sm hover:border-blue-200 transition-all">
                      <div className="flex justify-between font-black text-blue-900 mb-1 uppercase tracking-tighter">
                        <span>{safe(log.date)}</span>
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded text-[8px]">{safe(log.user)}</span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">{safe(log.action)}</p>
                    </div>
                  ))}
                  {(!Array.isArray(showDetail.logs) || showDetail.logs.length === 0) && (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 italic">No hay registros de movimientos aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between gap-3">
              <button 
                onClick={() => handleExportPDF(showDetail)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar PDF Completo
              </button>
              <button 
                onClick={() => setShowDetail(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" /> Seguimiento Logístico de Pedidos
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => exportTableToPDF(
                `Reporte de Seguimiento Logístico - ${filterSituacion}`,
                ['Pedido', 'OT', 'Cliente', 'F. Cotiz', 'F. Envío', 'Courier', 'Situación'],
                filteredRecords.map(r => [r.nroCotiz, r.ot || '---', r.cliente, formatDate(r.fechaCotiz), formatDate(r.fechaEnvio), r.courier, r.situacion]),
                `seguimiento_general_${filterSituacion.toLowerCase()}`
              )}
              className="text-[10px] bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors"
              title="Exportar registros visibles a PDF"
            >
              <Download className="w-3.5 h-3.5" /> PDF General
            </button>
            <button 
              onClick={handleSyncFromQuotes} 
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors"
              title="Importar cotizaciones aprobadas desde administración"
            >
              <FileUp className="w-3.5 h-3.5" /> Sincronizar Cotizaciones
            </button>
            {editingId && (
              <button onClick={resetForm} className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm grow max-w-sm">
             <Search className="w-4 h-4 text-slate-400" />
             <input 
              type="text" 
              placeholder="Buscar por pedido, cliente u OT..." 
              className="outline-none text-xs w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase">Filtrar Situación:</span>
            <select 
              className="bg-white border rounded px-2 py-1.5 text-xs font-bold outline-none"
              value={filterSituacion}
              onChange={e => setFilterSituacion(e.target.value)}
            >
              <option value="TODOS">TODOS LOS REGISTROS</option>
              {situaciones.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
        <form className="p-6 bg-slate-50 border-b border-slate-200" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4 mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingId ? 'Editar Registro' : 'Registrar Nuevo Envío'}</h4>
            </div>
            
            <FormField label="Pedido / N° Cotiz."><input required className="w-full border-b border-slate-300 p-2 text-sm font-bold bg-white" value={safe(form.nroCotiz)} onChange={e => setForm({...form, nroCotiz: e.target.value})} placeholder="Ej: 2024-001" /></FormField>
            <FormField label="Orden de Transporte (OT)"><input className="w-full border-b border-slate-300 p-2 text-sm font-bold bg-white" value={safe(form.ot)} onChange={e => setForm({...form, ot: e.target.value})} placeholder="Ej: 12345678" /></FormField>
            <FormField label="Nombre Cliente"><input required className="w-full border-b border-slate-300 p-2 text-sm font-bold bg-white uppercase" value={safe(form.cliente)} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="CLIENTE S.A." /></FormField>
            <FormField label="Fecha Cotización"><input type="date" className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.fechaCotiz)} onChange={e => setForm({...form, fechaCotiz: e.target.value})} /></FormField>
            
            <FormField label="Fecha Envío"><input type="date" className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.fechaEnvio)} onChange={e => setForm({...form, fechaEnvio: e.target.value})} /></FormField>
            <FormField label="Fecha Cierre"><input type="date" className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.fechaCierre)} onChange={e => setForm({...form, fechaCierre: e.target.value})} /></FormField>
            <FormField label="Fecha Recepción"><input type="date" className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.fechaRecepcion)} onChange={e => setForm({...form, fechaRecepcion: e.target.value})} /></FormField>
            
            <FormField label="Courier">
              <select className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.courier) || 'Retiro en Oficina'} onChange={e => setForm({...form, courier: e.target.value})}>
                {couriers.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Detalle de Seguimiento"><input className="w-full border-b border-slate-300 p-2 text-sm bg-white" value={safe(form.detalleSeguimiento)} onChange={e => setForm({...form, detalleSeguimiento: e.target.value})} placeholder="Ej: Entregado en conserjería..." /></FormField>
            </div>
            
            <FormField label="Reclamo / Situación">
              <select className="w-full border-b border-slate-300 p-2 text-sm font-black bg-white" value={safe(form.situacion) || 'PENDIENTE'} onChange={e => setForm({...form, situacion: e.target.value})}>
                {situaciones.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>

            <div className="md:col-span-1 flex items-end">
              <button type="submit" className={cn(
                "w-full text-white px-4 py-2.5 rounded font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all",
                editingId ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"
              )}>
                {editingId ? <><Save className="w-3.5 h-3.5" /> Actualizar</> : <><PlusCircle className="w-3.5 h-3.5" /> Registrar</>}
              </button>
            </div>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-[9px] table-fixed">
            <thead>
              <tr className="bg-slate-100 text-left border-b font-black text-slate-600 uppercase tracking-tighter">
                <th className="p-2 w-20">Pedido</th>
                <th className="p-2 w-28 text-center">OT / Enlace</th>
                <th className="p-2 w-32">Cliente</th>
                <th className="p-2 w-16 text-center">Cotiz.</th>
                <th className="p-2 w-16 text-center">Envío</th>
                <th className="p-2 w-32">Detalle / Notas</th>
                <th className="p-2 w-20 text-center">Courier</th>
                <th className="p-2 w-16 text-center">Situación</th>
                <th className="p-2 w-16 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(r => (
                <tr key={r.id || Math.random().toString()} className="hover:bg-blue-50/30 transition-colors">
                   <td className="p-2 font-bold text-blue-900 truncate">{safe(r.nroCotiz)}</td>
                   <td className="p-2 font-mono text-slate-500 truncate flex items-center justify-center gap-1">
                      {r.ot ? (
                        <>
                          {safe(r.ot)}
                          {getTrackingLink(safe(r.courier), safe(r.ot)) && (
                            <a 
                              href={getTrackingLink(safe(r.courier), safe(r.ot))!} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={() => trackTrackingClick(r)}
                              className="text-blue-500 hover:text-blue-700 bg-blue-50 p-0.5 rounded transition-colors"
                              title="Seguir Pedido"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </>
                      ) : '---'}
                   </td>
                   <td className="p-2 font-medium uppercase truncate" title={safe(r.cliente)}>{safe(r.cliente)}</td>
                   <td className="p-2 text-center text-slate-400">{formatDate(r.fechaCotiz)}</td>
                   <td className="p-2 text-center font-bold text-emerald-600">{r.fechaEnvio ? formatDate(r.fechaEnvio) : '---'}</td>
                   <td className="p-2 text-slate-500 italic truncate" title={safe(r.detalleSeguimiento)}>{safe(r.detalleSeguimiento) || '---'}</td>
                   <td className="p-2 text-center font-bold">{safe(r.courier)}</td>
                   <td className="p-2 text-center">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase inline-block w-full",
                      safe(r.situacion) === 'OK' ? "bg-green-100 text-green-700" :
                      safe(r.situacion) === 'PENDIENTE' ? "bg-amber-100 text-amber-700" :
                      safe(r.situacion) === 'EN TRÁNSITO' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    )}>
                      {safe(r.situacion)}
                    </span>
                   </td>
                   <td className="p-2 text-center">
                     <RecordActions 
                       onView={() => setShowDetail(r)}
                       onDownload={() => handleExportPDF(r)}
                       onEdit={() => handleEdit(r)}
                       onDelete={() => handleDelete(r.id)}
                     />
                   </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400 italic">No se encontraron registros de seguimiento...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-label-caps">{label}</label>
      {children}
    </div>
  );
}
