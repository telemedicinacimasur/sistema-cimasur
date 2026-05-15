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
import { UsersManager } from '../components/settings/UsersManager';
import { AuditLogManager } from '../components/settings/AuditLogManager';

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
  DollarSign,
  RefreshCw,
  GraduationCap,
  Eye,
  Target,
  EyeOff,
  Settings,
  Lock,
  ShieldCheck,
  LayoutGrid,
  AlertCircle,
  FlaskConical,
  Activity,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

import { addNotification } from '../lib/notifications';

import CimasurInventoryManager from './admin/CimasurInventoryManager';

type AdminTab = 'menu' | 'quotes' | 'sales' | 'sales_gestion' | 'dte' | 'pet_payments' | 'school_payments' | 'codigos_y_diluciones';

export default function AdminView() {
  const { user } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<AdminTab>((location.state as any)?.view || 'menu');
  const [records, setRecords] = useState<any[]>([]);

  // Effect to sync view with location state for external deep links
  useEffect(() => {
    if (location.state && (location.state as any).view) {
      setView((location.state as any).view);
    }
  }, [location.state]);

  useEffect(() => {
    const loadData = async () => {
      let col = 'quotes';
      if (view === 'sales') col = 'sales';
      if (view === 'sales_gestion') col = 'sales_gestion';
      if (view === 'dte') col = 'dte_records';
      if (view === 'pet_payments') col = 'pet_payments';
      if (view === 'school_payments') col = 'school_payments';
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
        <div className="flex justify-between items-center bg-[#152035] p-8 rounded-3xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#152035] rounded-full translate-x-16 -translate-y-16 opacity-50" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Módulo de Administración</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest opacity-60">Gestión del ciclo financiero, presupuestario y documental interno.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModuleCard 
            title="Seguimiento de Cotizaciones"
            desc="Control de presupuestos, vendedores y estados de aprobación."
            icon={TrendingUp}
            onClick={() => setView('quotes')}
            color="indigo"
          />
          <ModuleCard 
            title="Detalle de Ventas"
            desc="Registro diario de facturas y boletas emitidas por cliente."
            icon={ShoppingCart}
            onClick={() => setView('sales')}
            color="emerald"
          />
          <ModuleCard 
            title="Detalle de Ventas GESTIÓN"
            desc="Registro diario de ventas con detalle de productos y cotización."
            icon={ShoppingCart}
            onClick={() => setView('sales_gestion')}
            color="amber"
          />
          <ModuleCard 
            title="Detalle de DTE"
            desc="Control administrativo de documentos tributarios electrónicos."
            icon={Receipt}
            onClick={() => setView('dte')}
            color="rose"
          />
          <ModuleCard 
            title="Control de Pagos Veterinarios"
            desc="Registro de pagos tutor, mail, fono y honorarios veterinarios."
            icon={DollarSign}
            onClick={() => setView('pet_payments')}
            color="indigo"
          />
          <ModuleCard 
            title="Saldos Escuela Cimasur"
            desc="Control de pagos de alumnos, meta anual y gastos académicos."
            icon={GraduationCap}
            onClick={() => setView('school_payments')}
            color="emerald"
          />
          <ModuleCard 
            title="Gestión de Códigos y Diluciones"
            desc="Submódulo maestro para administración de Excel, correlativos y catálogos."
            icon={Database}
            onClick={() => setView('codigos_y_diluciones')}
            color="orange"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative font-bold">
      <button 
        onClick={() => setView('menu')}
        className="flex items-center gap-2 text-slate-400 hover:text-[#38BDF8] transition-colors mb-2 group w-fit"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm uppercase tracking-widest">Volver al Menú de Administración</span>
      </button>

      {view === 'codigos_y_diluciones' && <CimasurInventoryManager />}
      {view === 'quotes' && <QuoteManager records={records} setRecords={setRecords} />}
      {view === 'sales' && <SalesManager records={records} setRecords={setRecords} />}
      {view === 'sales_gestion' && <SalesGestionManager records={records} setRecords={setRecords} />}
      {view === 'dte' && <DTEManager records={records} setRecords={setRecords} />}
      {view === 'pet_payments' && <PetPaymentsManager records={records} setRecords={setRecords} />}
      {view === 'school_payments' && <SchoolPaymentsManager records={records} setRecords={setRecords} />}
      
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
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
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
    const rDate = new Date(r.fecha);
    const mMatch = filterMonth ? (rDate.getMonth() + 1).toString() === filterMonth : true;
    const yMatch = filterYear ? rDate.getFullYear().toString() === filterYear : true;
    const matchesSearch = !searchTutor || r.tutor?.toLowerCase().includes(searchTutor.toLowerCase());
    const date = r.fecha;
    const matchesStart = !dateStart || date >= dateStart;
    const matchesEnd = !dateEnd || date <= dateEnd;
    return mMatch && yMatch && matchesSearch && matchesStart && matchesEnd;
  }).sort((a,b) => {
    const d = (b.fecha || '').localeCompare(a.fecha || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
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
      await addNotification({
        title: 'Nuevo Pago Veterinario',
        message: `${user.displayName || user.email} registró pago de tutor ${form.tutor} por ${formatCurrency(form.pagoVeterinario)}`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
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
      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> {editingId ? 'Editando Pago Veterinario' : 'Control de Pagos Veterinarios'}
          </span>
          <div className="text-[10px] bg-[#152035]/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">
            Administración Financiera
          </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
             <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} required /></FormField>
             <FormField label="Tutor (Nombre Completo)">
               <input 
                className="w-full border-b p-2 text-sm font-bold uppercase" 
                value={form.tutor || ''} 
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
             <FormField label="Mail"><input type="email" className="w-full border-b p-2 text-sm" value={form.mail || ''} onChange={e => setForm({...form, mail: e.target.value})} /></FormField>
             <FormField label="Fono"><input className="w-full border-b p-2 text-sm" value={form.fono || ''} onChange={e => setForm({...form, fono: e.target.value})} /></FormField>
             <FormField label="Nombre MV"><input className="w-full border-b p-2 text-sm uppercase" value={form.nombreMV || ''} onChange={e => setForm({...form, nombreMV: e.target.value})} /></FormField>
          </div>
          
          <div className="md:col-span-3 grid grid-cols-3 gap-4">
            <FormField label="Pago Consulta ($)"><input type="number" className="w-full border-b p-4 text-lg font-bold bg-[#152035]/50 rounded" value={form.pagoConsulta ?? 0} onChange={e => setForm({...form, pagoConsulta: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Pago Veterinario ($)"><input type="number" className="w-full border-b p-4 text-lg font-bold bg-[#152035]/50 rounded border-blue-200" value={form.pagoVeterinario ?? 0} onChange={e => setForm({...form, pagoVeterinario: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Fecha de Pago"><input type="date" className="w-full border-b p-4 text-lg font-bold bg-[#152035]/50 rounded" value={form.fechaPago || ''} onChange={e => setForm({...form, fechaPago: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-1 flex flex-col justify-end gap-3">
             <button type="submit" className={cn(
               "w-full py-4 rounded-2xl font-black shadow-xl hover:translate-y-[-2px] transition-all",
               editingId ? "bg-amber-600 text-white" : "bg-[#1E3A5F]  hover:bg-[#1D3557] border-[#1E293B] "
             )}>
               {editingId ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR PAGO'}
             </button>
             {editingId && (
               <button type="button" onClick={() => setEditingId(null)} className="w-full text-slate-400 text-[10px] font-bold uppercase">Cancelar Edición</button>
             )}
          </div>
        </form>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  border-b flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap items-center gap-6 text-white grow">
             <div className="flex items-center gap-3 bg-[#1E293B]/80 px-4 py-2 rounded-2xl border border-white/20 shadow-inner group">
                <Search className="w-4 h-4 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscador rápido..." 
                  className="bg-[#152035] border-none outline-none text-[10px] w-32 placeholder:text-white/20"
                  value={searchTutor}
                  onChange={e => setSearchTutor(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-3 bg-[#1E293B]/80 px-4 py-1.5 rounded-2xl border border-white/20">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">Suma Honorarios</span>
                   <span className="text-[13px] font-black">{filteredRecords.reduce((sum, r) => sum + (Number(r.pagoVeterinario) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
                </div>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-white">
            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Mes / Año</span>
               <div className="flex items-center gap-1">
                  <select 
                    className="text-[10px] border p-1 rounded font-bold outline-none" 
                    value={filterMonth} 
                    onChange={e => setFilterMonth(e.target.value)}
                  >
                    <option value="">Mes...</option>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={(i+1).toString()}>{new Date(2024, i).toLocaleString('es', {month: 'long'})}</option>
                    ))}
                  </select>
                  <select 
                    className="text-[10px] border p-1 rounded font-bold outline-none" 
                    value={filterYear} 
                    onChange={e => setFilterYear(e.target.value)}
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Rango Exacto (Desde / Hasta)</span>
               <div className="flex items-center gap-1">
                 <input type="date" className="text-[10px] border p-1 rounded" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                 <span className="text-slate-300">-</span>
                 <input type="date" className="text-[10px] border p-1 rounded" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
               </div>
            </div>

            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Búsqueda rápida</span>
               <div className="relative">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                 <input 
                   placeholder="Tutor..." 
                   className="pl-7 pr-3 py-1.5 text-[10px] border rounded-full w-44 outline-none focus:border-[#38BDF8] transition-all font-bold" 
                   value={searchTutor}
                   onChange={e => setSearchTutor(e.target.value)}
                 />
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#152035] p-2 rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
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
                className="bg-emerald-50 text-emerald-600 p-2 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"
                title="Descargar Plantilla Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-50 text-amber-600 p-2 rounded-2xl hover:bg-amber-600 hover:text-white transition-all"
                title="Importar desde Excel"
              >
                <Upload className="w-4 h-4" />
              </button>
              <div className="w-px h-8 bg-[#111A2E] mx-1" />
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
                className="bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 text-white p-2 rounded-2xl hover:bg-[#38BDF8]/30 shadow-lg shadow-blue-100"
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
                className="bg-emerald-600 text-white p-2 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100"
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
              <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] text-left border-b font-black  uppercase">
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Tutor</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Nombre MV</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Mail / Fono</th>
                <th className="p-4 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Consulta</th>
                <th className="p-4 text-right text-blue-900 bg-[#1E293B]/50">Pago Vet</th>
                <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha Pago</th>
                <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-[#152035] transition-colors">
                  <td className="p-4 font-mono text-slate-400">{formatDate(r.fecha)}</td>
                  <td className="p-4 font-bold text-white uppercase">{r.tutor}</td>
                  <td className="p-4 text-slate-400 uppercase">{r.nombreMV}</td>
                  <td className="p-4 italic text-slate-400">
                    <span className="block">{r.mail}</span>
                    <span className="text-[10px]">{r.fono}</span>
                  </td>
                  <td className="p-4 text-right">{formatCurrency(r.pagoConsulta || r.pago1 || 0)}</td>
                  <td className="p-4 text-right font-black bg-[#1E293B]/80 text-blue-900 border-x border-[#1E293B]">{formatCurrency(r.pagoVeterinario || r.pago2 || 0)}</td>
                  <td className="p-4 text-center font-mono opacity-60 italic">{formatDate(r.fechaPago || r.pagoVeterinario)}</td>
                  <td className="p-4 text-center">
                    <RecordActions 
                      module="admin"
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

function ModuleCard({ title, desc, icon: Icon, onClick, color = 'blue' }: any) {
  const colorMap: any = {
    indigo: 'from-indigo-600 to-indigo-700 shadow-indigo-100 text-indigo-600',
    emerald: 'from-emerald-600 to-emerald-700 shadow-emerald-100 text-emerald-600',
    rose: 'from-rose-600 to-rose-700 shadow-rose-100 text-rose-600',
    amber: 'from-amber-600 to-amber-700 shadow-amber-100 text-amber-600',
    blue: 'from-blue-600 to-blue-700 shadow-blue-100 text-[#38BDF8]',
    purple: 'from-purple-600 to-purple-700 shadow-purple-100 text-purple-600',
    teal: 'from-teal-600 to-teal-700 shadow-teal-100 text-teal-600',
    orange: 'from-orange-600 to-orange-700 shadow-orange-100 text-orange-600',
    slate: 'from-slate-600 to-slate-700 shadow-slate-100 text-slate-300'
  };

  const selectedColor = colorMap[color] || colorMap.blue;
  const bgColor = selectedColor.split(' ')[0];
  const textColor = selectedColor.split(' ')[selectedColor.split(' ').length - 1];

  return (
    <div 
      onClick={onClick}
      className="group relative bg-[#152035] rounded-[2rem] p-8 border border-[#1E293B] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgColor} opacity-0 group-hover:opacity-5 transition-all duration-700 rounded-bl-[5rem]`} />
      
      <div className="relative z-10">
        <div className={`w-16 h-16 bg-gradient-to-br ${bgColor} rounded-2xl flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-tight group-hover:text-[#38BDF8] transition-colors">{title}</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 opacity-60 leading-relaxed">{desc}</p>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-6">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${textColor}`}>Explorar Módulo</span>
        <div className="w-8 h-8 bg-[#152035] rounded-full flex items-center justify-center group-hover:bg-[#152035] transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-[#38BDF8] rotate-180" />
        </div>
      </div>
    </div>
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

function QuoteManager({ records, setRecords }: { records: any[], setRecords: (val: any[]) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const downloadExcelTemplate = () => {
    const headers = [
      ["Año", "Mes", "N° Cotiz", "Fecha Elab", "Cliente", "Vendedor", "Estado", "Fecha Aprob", "Und a hacer", "UND Total", "UND Inventario", "Observaciones"]
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

          const todoVal = parseInt(safe(row["Und a hacer"])) || parseInt(safe(row["UND Inventario"])) || 0;
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
            todoUnits: todoVal,
            undTotal: totalVal,
            invUnits: Math.max(0, totalVal - todoVal),
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
      invUnits: Math.max(0, val - (prev.todoUnits || 0))
    }));
  };

  const handleTodoChange = (val: number) => {
    setForm(prev => ({ 
      ...prev, 
      todoUnits: val,
      invUnits: Math.max(0, (prev.undTotal || 0) - val)
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
      return (Number(b.nroCotiz) || 0) - (Number(a.nroCotiz) || 0);
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
      await addNotification({
        title: 'Nueva Cotización Registrada',
        message: `${user.displayName || user.email} ingresó la cotización N° ${form.nroCotiz} para ${form.cliente}`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
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
      
      if (newStatus === 'Aprobada') {
        await addNotification({
          title: 'Cotización Aprobada',
          message: `La cotización N° ${record.nroCotiz} para ${record.cliente} ha sido aprobada.`,
          recipientRoles: ['admin', 'admin_lab', 'lab'],
          sender: user?.displayName || user?.email || 'Sistema'
        });
      }

      await addAuditLog(user, `Cambió estado Cotización N° ${record.nroCotiz} a ${newStatus}`, 'Administración');
      const updated = await localDB.getCollection('quotes');
      setRecords(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
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
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors font-black shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/30 px-3 py-1.5 rounded flex items-center gap-1.5 uppercase transition-colors font-black shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
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
          <FormField label="Fecha Aprob"><input type="date" className="w-full border-b p-2 text-sm font-bold" value={form.fechaAprob || ''} onChange={e => setForm({...form, fechaAprob: e.target.value})} /></FormField>
          
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6">
            <FormField label="UND Total (Pedido)"><input type="number" className="w-full border-b p-3 text-lg font-black text-[#38BDF8] bg-[#152035] rounded-t" value={form.undTotal || 0} onChange={e => handleTotalChange(parseInt(e.target.value) || 0)} /></FormField>
            <FormField label="Und a hacer"><input type="number" className="w-full border-b p-3 text-lg font-bold text-amber-700 bg-amber-50 rounded-t" value={form.todoUnits || 0} onChange={e => handleTodoChange(parseInt(e.target.value) || 0)} /></FormField>
            <FormField label="UND Inventario (Auto)"><input type="number" className="w-full border-b p-3 text-lg font-bold text-slate-400 bg-[#152035] rounded-t" value={form.invUnits || 0} readOnly /></FormField>
            <div className="flex items-end">
                <button type="submit" className="w-full bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  py-4 rounded-2xl font-black shadow-xl hover:bg-[#152035] flex items-center justify-center gap-2 uppercase tracking-widest transition-all active:scale-95 text-xs">
                  <Save className="w-5 h-5 text-emerald-400" /> GUARDAR COTIZACIÓN
                </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b flex flex-wrap gap-4 items-center justify-between ">
          <div className="flex items-center gap-4">
             <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Histórico de Cotizaciones</h3>
             <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3 py-1 rounded-full border border-white/20">
                <span className="text-[9px] font-black uppercase text-emerald-400">Total Aprobadas:</span>
                <span className="text-[11px] font-black">{filteredRecords.filter(r => r.estado === 'Aprobada').reduce((s, r) => s + (Number(r.undTotal) || 0), 0)} UNDs</span>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suma en Pantalla:</span>
                <span className="text-sm font-black text-white">{filteredRecords.filter(r => r.estado === 'Aprobada').reduce((s, r) => s + (Number(r.undTotal) || 0), 0)} UNDs</span>
             </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Filtros:</span>
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

            <div className="flex items-center gap-2 border-l pl-3 border-[#1E293B]">
              <button 
                onClick={() => {
                  const data = filteredRecords.map(r => [
                    `${r.anio || ''}/${r.mes || ''}`,
                    r.nroCotiz || '',
                    r.cliente || '',
                    r.vendedor || '',
                    r.estado || '',
                    r.undTotal || 0,
                  ]);
                  exportTableToPDF('Reporte: Cotizaciones', ['Año/Mes', 'N° Cotiz', 'Cliente', 'Vend', 'Estado', 'UND'], data, 'reporte_cotizaciones', 'l');
                }}
                className="bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors hover:bg-[#38BDF8]/30 flex items-center gap-1" 
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
              <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] text-left border-b font-black  uppercase">
                <th className="p-4 text-center bg-indigo-900 border-r border-[#1E293B]/50">Año/Mes</th>
                <th className="p-4 bg-blue-900 border-r border-[#1E293B]/50 tracking-tighter">N° Cotiz</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Cliente</th>
                <th className="p-4 bg-[#152035] border-r border-[#1E293B]/50">Vendedor</th>
                <th className="p-4 text-center bg-amber-700 border-r border-[#1E293B]/50">Estado (Editable)</th>
                <th className="p-4 text-center bg-emerald-800 border-r border-[#1E293B]/50">UND Total</th>
                <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-[#152035] transition-colors italic">
                  <td className="p-4 text-center text-slate-400">{r.anio || ''} / {r.mes || ''}</td>
                  <td className="p-4 font-bold text-white">{r.nroCotiz || ''}</td>
                  <td className="p-4 font-black">{r.cliente || ''}</td>
                  <td className="p-4 font-bold">{r.vendedor || ''}</td>
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
                  <td className="p-4 text-center font-black text-[#38BDF8] italic">
                    <div className="flex flex-col items-center">
                      <span>{r.undTotal || 0}</span>
                      <span className="text-[8px] text-slate-400 font-normal">Inv: {r.invUnits || 0} / Pro: {r.todoUnits || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                    <RecordActions
                      module="admin"
                      onView={() => {
                        const data = [
                          { label: 'N° Cotiz', value: r.nroCotiz || '' },
                          { label: 'Fecha Elab', value: formatDate(r.fechaElab) },
                          { label: 'Cliente', value: r.cliente || '' },
                          { label: 'Vendedor', value: r.vendedor || '' },
                          { label: 'Estado', value: r.estado || '' },
                          { label: 'UND Total', value: (r.undTotal || 0).toString() },
                          { label: 'Inv / Producir', value: `${r.invUnits || 0} / ${r.todoUnits || 0}` }
                        ];
                        viewExpedienteInNewTab('Ficha: Pedido', data, `cotizacion_${r.nroCotiz}`);
                      }}
                      onDownload={() => {
                        const data = [
                          { label: 'N° Cotiz', value: r.nroCotiz || '' },
                          { label: 'Fecha Elab', value: formatDate(r.fechaElab) },
                          { label: 'Cliente', value: r.cliente || '' },
                          { label: 'Vendedor', value: r.vendedor || '' },
                          { label: 'Estado', value: r.estado || '' },
                          { label: 'UND Total', value: (r.undTotal || 0).toString() },
                          { label: 'Inv / Producir', value: `${r.invUnits || 0} / ${r.todoUnits || 0}` }
                        ];
                        exportExpedienteToPDF('Ficha: Pedido', data, `cotizacion_${r.nroCotiz}`);
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
                          undTotal: r.undTotal || 0
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
            <tfoot className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  font-black text-sm uppercase italic">
              <tr>
                <td colSpan={5} className="p-4 text-right tracking-widest">Suma Total de Cotizaciones Aprobadas:</td>
                <td className="p-4 text-center text-emerald-400 text-lg underline decoration-2 underline-offset-4">
                  {filteredRecords.filter(r => r.estado === 'Aprobada').reduce((s, r) => s + (Number(r.undTotal) || 0), 0)} UNDs
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
  }).sort((a,b) => {
    const d = (b.fecha || '').localeCompare(a.fecha || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
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
      await addNotification({
        title: 'Nueva Venta GESTIÓN',
        message: `${user.displayName || user.email} registró venta Gestión: ${form.documento} (${form.cliente})`,
        recipientRoles: ['admin', 'gestion'],
        sender: user.displayName || user.email || 'Sistema'
      });
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
      <div className="lg:col-span-4 bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden h-fit">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
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
              className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/30 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
          </div>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
          </div>
          <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          <FormField label="Fact / Boleta"><input className="w-full border-b p-2 text-sm" value={form.documento || ''} onChange={e => setForm({...form, documento: e.target.value})} required /></FormField>
          <FormField label="Cliente"><input className="w-full border-b p-2 text-sm" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} required /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="N° Frascos"><input type="number" className="w-full border-b p-2 text-sm" value={form.nroFrascos || 0} onChange={e => setForm({...form, nroFrascos: parseInt(e.target.value) || 0})} /></FormField>
            <FormField label="Valor Cotización ($)"><input type="number" className="w-full border-b p-2 text-sm" value={form.valorCotizacion || 0} onChange={e => setForm({...form, valorCotizacion: parseInt(e.target.value) || 0})} /></FormField>
          </div>
          <FormField label="Detalle de Productos Solicitados">
            <textarea 
              className="w-full border p-2 text-xs rounded h-24 outline-none focus:ring-1 focus:ring-blue-200" 
              value={form.detalleProductos || ''} 
              onChange={e => setForm({...form, detalleProductos: e.target.value})}
              placeholder="Ej: 2x Omega 3, 1x Multivitamínico..."
            />
          </FormField>
          <button type="submit" className="w-full bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  py-3 rounded font-bold mt-2 hover:bg-opacity-90">GUARDAR VENTA GESTIÓN</button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b flex justify-between items-center ">
            <div className="flex items-center gap-4">
               <h3 className="font-black text-[10px] uppercase text-white tracking-widest">Detalle de Ventas GESTIÓN</h3>
               <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[9px] font-black uppercase text-emerald-400">Total Frascos:</span>
                  <span className="text-[11px] font-black">{totalFrascos}</span>
                  <span className="text-[9px] font-black uppercase text-emerald-400 ml-2">Total Cotiz:</span>
                  <span className="text-[11px] font-black">{totalCotizacion.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
               </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
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
                className="text-white bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-[#38BDF8]/30 flex items-center gap-1" 
                title="Descargar PDF"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button 
                onClick={() => setShowProductSummary(!showProductSummary)}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all",
                  showProductSummary ? "bg-amber-500 text-white" : "bg-slate-700 text-white hover:bg-[#152035]"
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
               <div className="bg-[#152035] p-0 rounded-2xl border border-amber-200 shadow-inner max-h-80 overflow-y-auto">
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
                           <td className="p-2 font-bold text-slate-200">{item.name}</td>
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
              <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] text-left border-b font-black  uppercase">
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha</th>
                  <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Documento</th>
                  <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Cliente</th>
                  <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fcos</th>
                  <th className="p-4 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Valor Cotiz</th>
                  <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 italic">
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td className="p-4">{formatDate(r.fecha)}</td>
                    <td className="p-4 font-bold text-white">{r.documento}</td>
                    <td className="p-4">{r.cliente}</td>
                    <td className="p-4 text-center font-black">{r.nroFrascos}</td>
                    <td className="p-4 text-right font-black text-[#38BDF8]">{formatCurrency(r.valorCotizacion || 0)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RecordActions
                          module="admin"
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
  }).sort((a,b) => {
    const d = (b.fecha || '').localeCompare(a.fecha || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
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
      await addNotification({
        title: 'Nueva Venta Registrada',
        message: `${user.displayName || user.email} registró venta: ${form.documento} (${form.cliente})`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
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
      <div className="lg:col-span-4 bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden h-fit">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
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
              className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/30 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
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
          <FormField label="N° Frascos"><input type="number" className="w-full border-b p-2 text-sm" value={form.nroFrascos || 0} onChange={e => setForm({...form, nroFrascos: parseInt(e.target.value) || 0})} /></FormField>
          <button type="submit" className="w-full bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  py-3 rounded font-bold mt-2 hover:bg-opacity-90">GUARDAR VENTA</button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b flex justify-between items-center ">
            <div className="flex items-center gap-4">
               <h3 className="font-black text-[10px] uppercase text-white tracking-widest">Detalle de Ventas</h3>
               <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[9px] font-black uppercase text-blue-400">Total Fcos:</span>
                  <span className="text-[11px] font-black">{totalFrascos} UNDS</span>
               </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-300" 
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
              className="text-white bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-[#38BDF8]/30 flex items-center gap-1" 
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
              <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] text-left border-b font-black  uppercase">
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha</th>
                  <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Documento</th>
                  <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Cliente</th>
                  <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">N° Fcos</th>
                  <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 italic">
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td className="p-4">{formatDate(r.fecha)}</td>
                    <td className="p-4 font-bold text-white">{r.documento}</td>
                    <td className="p-4">{r.cliente}</td>
                    <td className="p-4 text-center font-black">{r.nroFrascos}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RecordActions
                          module="admin"
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolPaymentsManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState(new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()));
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [meta, setMeta] = useState(5000000);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  
  // Individual visibility states for metrics
  const [showMeta, setShowMeta] = useState(false);
  const [showAcumulado, setShowAcumulado] = useState(false);
  const [showGastos, setShowGastos] = useState(false);
  const [showFaltante, setShowFaltante] = useState(false);

  const downloadExcelTemplate = () => {
    const headers = [
      ["Tipo", "Nombre Alumno / Profesor / Gasto", "RUT", "Email", "Teléfono", "Fecha", "Monto Total Pagado", "Monto Recibido", "N° Factura", "Fecha Factura", "Observaciones"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos Escuela");
    XLSX.writeFile(wb, "plantilla_importacion_pagos.xlsx");
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
        const data = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });

        let importedCount = 0;
        for (const row of data as any[]) {
          if (!row["Tipo"]) continue;
          
          await localDB.saveToCollection('school_payments', {
            tipo: row["Tipo"] || 'Ingreso Alumno',
            nombreAlumno: row["Nombre Alumno / Profesor / Gasto"] || '',
            rut: row["RUT"] || '',
            email: row["Email"] || '',
            telefono: row["Teléfono"] || '',
            fechaPago: row["Fecha"] || new Date().toISOString().split('T')[0],
            montoTotalPagado: typeof row["Monto Total Pagado"] === 'string' ? parseInt(row["Monto Total Pagado"].replace(/\D/g, '')) : (row["Monto Total Pagado"] || 0),
            montoTotalRecibido: typeof row["Monto Recibido"] === 'string' ? parseInt(row["Monto Recibido"].replace(/\D/g, '')) : (row["Monto Recibido"] || 0),
            nroFactura: row["N° Factura"] || '',
            fechaFactura: row["Fecha Factura"] || '',
            observaciones: row["Observaciones"] || ''
          });
          importedCount++;
        }
        alert(`Se han importado ${importedCount} registros exitosamente.`);
        const updated = await localDB.getCollection('school_payments');
        setRecords(updated);
      } catch (error) {
        alert("Error al importar el archivo. Asegúrese de usar la plantilla correcta.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportFiltered = (format: 'pdf'|'excel') => {
    if (format === 'pdf') {
       const exportData = filteredRecords.map(r => [
          r.tipo, r.nombreAlumno || r.rut, formatDate(r.fechaPago), formatCurrency(r.montoTotalRecibido), r.nroFactura || '---'
       ]);
       exportTableToPDF('Saldos Escuela - Filtro', ['Tipo', 'Nombre/RUT', 'Fecha', 'Monto Recibido', 'N° Factura'], exportData, 'saldos_escuela');
    } else {
       const exportData = filteredRecords.map(r => ({
          Tipo: r.tipo, Nombre: r.nombreAlumno, RUT: r.rut, Fecha: formatDate(r.fechaPago), MontoRecibido: r.montoTotalRecibido, Factura: r.nroFactura, Obs: r.observaciones
       }));
       const ws = XLSX.utils.json_to_sheet(exportData);
       const wb = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(wb, ws, "Saldos");
       XLSX.writeFile(wb, "saldos_escuela_export.xlsx");
    }
  };

  const [form, setForm] = useState({
    tipo: 'Ingreso Alumno', // 'Ingreso Alumno' | 'Pago Profesor' | 'Gasto Mensual'
    nombreAlumno: '',
    rut: '',
    direccion: '',
    email: '',
    telefono: '',
    fechaPago: new Date().toISOString().split('T')[0],
    montoTotalPagado: 0,
    montoTotalRecibido: 0,
    nroFactura: '',
    fechaFactura: '',
    observaciones: ''
  });

  const filteredRecords = records.filter(r => {
    if (searchTerm) {
       const term = searchTerm.toLowerCase();
       const matchesSearch = (r.nombreAlumno || '').toLowerCase().includes(term) || (r.rut || '').toLowerCase().includes(term) || (r.observaciones || '').toLowerCase().includes(term) || (r.tipo || '').toLowerCase().includes(term);
       if (!matchesSearch) return false;
    }
    if (!r.fechaPago) return false;
    
    // Date range filter
    if (dateFrom && r.fechaPago < dateFrom) return false;
    if (dateTo && r.fechaPago > dateTo) return false;

    // Month/Year filter only if range is not set
    if (!dateFrom && !dateTo) {
      const rDate = new Date(r.fechaPago + 'T00:00:00');
      if (!isNaN(rDate.getTime())) {
        const rMonth = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(rDate);
        const rYear = rDate.getFullYear().toString();
        if (rMonth.toLowerCase() !== monthFilter.toLowerCase() || rYear !== yearFilter) return false;
      }
    }
    
    return true;
  }).sort((a,b) => {
    const d = (b.fechaPago || '').localeCompare(a.fechaPago || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('school_payments', editingId, form);
      await addAuditLog(user!, `Actualizó registro de Escuela: ${form.nombreAlumno || form.tipo}`, 'Administración');
      setEditingId(null);
    } else {
      await localDB.saveToCollection('school_payments', form);
      await addAuditLog(user!, `Registró ${form.tipo}: ${form.nombreAlumno || form.tipo}`, 'Administración');
    }
    setForm({
      tipo: 'Ingreso Alumno',
      nombreAlumno: '',
      rut: '',
      email: '',
      telefono: '',
      fechaPago: new Date().toISOString().split('T')[0],
      montoTotalPagado: 0,
      montoTotalRecibido: 0,
      nroFactura: '',
      fechaFactura: '',
      observaciones: ''
    });
    const updated = await localDB.getCollection('school_payments');
    setRecords(updated);
  };

  const handleDelete = async (id: string) => {
    try {
      await localDB.deleteFromCollection('school_payments', id);
      const updated = await localDB.getCollection('school_payments');
      setRecords(updated);
      alert('Registro eliminado');
    } catch (err) {
      alert('No se pudo eliminar');
    }
  };

  const totalIngresos = filteredRecords.filter(r => r.tipo === 'Ingreso Alumno').reduce((sum, r) => sum + (Number(r.montoTotalRecibido) || 0), 0);
  const totalPagosProfesores = filteredRecords.filter(r => r.tipo === 'Pago Profesor').reduce((sum, r) => sum + (Number(r.montoTotalRecibido) || 0), 0);
  const totalGastosMensuales = filteredRecords.filter(r => r.tipo === 'Gasto Mensual').reduce((sum, r) => sum + (Number(r.montoTotalRecibido) || 0), 0);
  const totalNeto = totalIngresos - totalPagosProfesores - totalGastosMensuales;
  const faltante = meta - totalNeto;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dashboard de Métricas Escuela */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6 rounded-[2rem] border border-[#1E293B] shadow-xl overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#1E293B]/30 rounded-full blur-2xl group-hover:bg-[#1E293B]/80 transition-all" />
            <div className="relative z-10 flex flex-col justify-between h-full">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#152035]/20 rounded-2xl text-blue-400">
                     <Target className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditingMeta(!isEditingMeta)} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors">Ajustar Meta</button>
                    <button onClick={() => setShowMeta(!showMeta)} className="text-white/50 hover:text-white transition-colors">
                       {showMeta ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Meta Anual Establecida</p>
                  {isEditingMeta ? (
                    <input 
                      type="number" 
                      className="text-2xl font-black bg-[#152035] border-b border-indigo-500 outline-none w-full text-white mt-1" 
                      value={meta} 
                      onChange={e => setMeta(Number(e.target.value))}
                      onBlur={() => setIsEditingMeta(false)}
                      autoFocus
                    />
                  ) : (
                    <p className={`text-2xl font-black text-white mt-1 leading-none italic ${!showMeta ? 'blur-sm select-none opacity-50' : ''}`}>
                      {showMeta ? formatCurrency(meta) : '$ *.*.*'}
                    </p>
                  )}
               </div>
            </div>
         </div>

         <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#1E293B]/80 rounded-full blur-2xl group-hover:bg-[#152035]/20 transition-all" />
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#152035]/20 w-max rounded-2xl text-white">
                     <TrendingUp className="w-5 h-5" />
                  </div>
                  <button onClick={() => setShowAcumulado(!showAcumulado)} className="text-white/50 hover:text-white transition-colors">
                     {showAcumulado ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
               <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Ingresos Netos Reales</p>
               <p className={`text-2xl font-black text-white mt-1 leading-none italic ${!showAcumulado ? 'blur-sm select-none opacity-50' : ''}`}>
                 {showAcumulado ? formatCurrency(totalNeto) : '$ *.*.*'}
               </p>
               <div className={`mt-3 flex items-center gap-2 ${!showAcumulado ? 'blur-sm opacity-50' : ''}`}>
                  <div className="h-1.5 flex-1 bg-[#152035]/20 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-300" style={{ width: `${Math.min(100, (totalNeto/meta)*100)}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-emerald-100 italic">{Math.round((totalNeto/meta)*100)}%</span>
               </div>
            </div>
         </div>

         <div className="bg-orange-500 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#1E293B]/80 rounded-full blur-2xl group-hover:bg-[#152035]/20 transition-all" />
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#152035]/20 w-max rounded-2xl text-white">
                     <DollarSign className="w-5 h-5" />
                  </div>
                  <button onClick={() => setShowGastos(!showGastos)} className="text-white/50 hover:text-white transition-colors">
                     {showGastos ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
               <p className="text-[10px] font-black uppercase text-orange-50 tracking-widest">Gastos / Inversión</p>
               <p className={`text-2xl font-black text-white mt-1 leading-none italic ${!showGastos ? 'blur-sm select-none opacity-50' : ''}`}>
                 {showGastos ? formatCurrency(totalPagosProfesores + totalGastosMensuales) : '$ *.*.*'}
               </p>
            </div>
         </div>

         <div className="bg-[#152035] p-6 rounded-[2rem] border border-[#1E293B] shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#111A2E] w-max rounded-2xl text-slate-400 group-hover:bg-[#111A2E] group-hover:text-indigo-500 transition-all">
                     <AlertCircle className="w-5 h-5" />
                  </div>
                  <button onClick={() => setShowFaltante(!showFaltante)} className="text-slate-400 hover:text-white transition-colors">
                     {showFaltante ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Diferencia para Meta</p>
               <p className={`text-2xl font-black text-white mt-1 leading-none italic ${!showFaltante ? 'blur-sm select-none opacity-50' : ''}`}>
                 {showFaltante ? (faltante > 0 ? formatCurrency(faltante) : 'META CUMPLIDA! ✨') : '$ *.*.*'}
               </p>
            </div>
         </div>
      </div>

      {/* Search & Date Filters Row */}
      <div className="bg-[#152035] p-6 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Búsqueda General</label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full pl-10 pr-4 py-2 bg-[#152035] border border-[#1E293B] rounded-2xl text-sm focus:bg-[#152035] transition-all outline-none" placeholder="Nombre, RUT, Glosa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center block">Desde</label>
             <input type="date" className="p-2 border border-[#1E293B] rounded-2xl text-sm outline-none bg-[#152035] focus:bg-[#152035]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center block">Hasta</label>
             <input type="date" className="p-2 border border-[#1E293B] rounded-2xl text-sm outline-none bg-[#152035] focus:bg-[#152035]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Mes</label>
             <select className="p-2 border border-[#1E293B] rounded-2xl text-sm outline-none bg-[#152035]" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                {['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Año</label>
             <input type="number" className="p-2 border border-[#1E293B] rounded-2xl text-sm outline-none w-20 bg-[#152035]" value={yearFilter} onChange={e => setYearFilter(e.target.value)} />
          </div>
          <div className="flex gap-2">
             <div className="flex items-center bg-[#111A2E] rounded-2xl p-1">
                <button onClick={() => exportFiltered('excel')} className="p-2 text-emerald-600 hover:bg-[#152035] rounded-2xl transition-all" title="Excel"><FileSpreadsheet className="w-5 h-5"/></button>
                <button onClick={() => exportFiltered('pdf')} className="p-2 text-rose-600 hover:bg-[#152035] rounded-2xl transition-all" title="PDF"><Download className="w-5 h-5"/></button>
                <label className="p-2 text-[#38BDF8] hover:bg-[#152035] rounded-2xl transition-all cursor-pointer" title="Importar Excel">
                   <Upload className="w-5 h-5" />
                   <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                </label>
             </div>
          </div>
      </div>

      <div className="space-y-4">
        {/* Registro de Pagos Alumnos */}
        <div className="bg-[#152035] rounded-3xl border shadow-lg overflow-hidden border-blue-100 group">
          <div 
            className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  font-black flex justify-between items-center cursor-pointer hover:bg-[#152035] transition-colors" 
            onClick={() => setForm({...form, tipo: form.tipo === 'Ingreso Alumno' ? '' : 'Ingreso Alumno'})}
          >
            <div className="flex items-center gap-4">
               <div className="p-2 bg-[#152035]/20 rounded-2xl">
                  <GraduationCap className="w-6 h-6" />
               </div>
               <div className="flex items-center gap-3">
                  <span className="tracking-tight italic">Registro de Pagos Escuela (Ingresos)</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadExcelTemplate(); }}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg active:scale-95"
                    title="Exportar Plantilla Excel para Ingresos"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-3xl tracking-tighter">{form.tipo === 'Ingreso Alumno' ? formatCurrency(totalIngresos) : '••••••••'}</span>
               {form.tipo === 'Ingreso Alumno' ? <EyeOff className="w-6 h-6 opacity-40" /> : <Eye className="w-6 h-6 opacity-40 text-blue-400" />}
            </div>
          </div>
          
          {form.tipo === 'Ingreso Alumno' && (
            <div className="p-6">
              <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nombre Alumno</label>
                  <input className="w-full border-b p-2 font-bold" value={form.nombreAlumno || ''} onChange={e => setForm({...form, nombreAlumno: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">RUT</label>
                  <input className="w-full border-b p-2" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dirección</label>
                  <input className="w-full border-b p-2" value={form.direccion || ''} onChange={e => setForm({...form, direccion: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mail</label>
                  <input type="email" className="w-full border-b p-2" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Teléfono</label>
                  <input className="w-full border-b p-2" value={form.telefono || ''} onChange={e => setForm({...form, telefono: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fecha Pago</label>
                  <input type="date" className="w-full border-b p-2" value={form.fechaPago || ''} onChange={e => setForm({...form, fechaPago: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de la Venta</label>
                  <input type="number" className="w-full border-b p-2" value={form.montoTotalPagado ?? 0} onChange={e => setForm({...form, montoTotalPagado: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Recibido en Cuenta</label>
                  <input type="number" className="w-full border-b p-2 font-black text-emerald-700 bg-emerald-50 rounded" value={form.montoTotalRecibido ?? 0} onChange={e => setForm({...form, montoTotalRecibido: Number(e.target.value)})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">N° Factura</label>
                  <input className="w-full border-b p-2" value={form.nroFactura || ''} onChange={e => setForm({...form, nroFactura: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fecha Factura</label>
                  <input type="date" className="w-full border-b p-2" value={form.fechaFactura || ''} onChange={e => setForm({...form, fechaFactura: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Observaciones</label>
                  <input className="w-full border-b p-2 italic" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} />
                </div>
                <div className="md:col-span-4 flex justify-end mt-2">
                  <button type="submit" className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  px-8 py-3 rounded-2xl font-bold shadow-md hover:bg-[#152035] transition-all">
                    {editingId ? 'ACTUALIZAR INGRESO' : 'REGISTRAR INGRESO'}
                  </button>
                </div>
              </form>

              <div className="mt-8">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  text-[10px] font-black uppercase tracking-widest text-left border-b border-[#1E293B]">
                      <td colSpan={2} className="p-2 text-right italic">Sumas en Selección:</td>
                      <td className="p-2 text-right">{formatCurrency(filteredRecords.filter(r => r.tipo === 'Ingreso Alumno').reduce((sum, r) => sum + (Number(r.montoTotalPagado) || 0), 0))}</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">{formatCurrency(totalIngresos)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b text-[10px] font-black  uppercase tracking-widest text-left">
                      <th className="p-3 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha</th>
                      <th className="p-3 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Alumno</th>
                      <th className="p-3 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Monto Total</th>
                      <th className="p-3 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Recibido (Neto)</th>
                      <th className="p-3 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 italic">
                    {filteredRecords.filter(r => r.tipo === 'Ingreso Alumno').map(r => (
                      <tr key={r.id} className="hover:bg-[#152035] transition-colors">
                        <td className="p-3">{formatDate(r.fechaPago)}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{r.nombreAlumno}</div>
                          <div className="text-[9px] text-slate-400">{r.rut} {r.email}</div>
                          <div className="text-[9px] font-normal">{r.observaciones}</div>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(r.montoTotalPagado)}</td>
                        <td className="p-3 text-right font-black text-emerald-600">+{formatCurrency(r.montoTotalRecibido)}</td>
                        <td className="p-3 text-center">
                          <RecordActions module="admin" onEdit={() => { setEditingId(r.id); setForm({...r}); }} onDelete={() => handleDelete(r.id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.filter(r => r.tipo === 'Ingreso Alumno').length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay ingresos registrados.</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  font-black">
                    <tr>
                      <td colSpan={2} className="p-4 text-right uppercase text-[9px] tracking-widest italic tracking-widest">Totales Finales Histórico:</td>
                      <td className="p-4 text-right">{formatCurrency(filteredRecords.filter(r => r.tipo === 'Ingreso Alumno').reduce((sum, r) => sum + (Number(r.montoTotalPagado) || 0), 0))}</td>
                      <td className="p-4 text-right text-emerald-400 text-sm">{formatCurrency(totalIngresos)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Expediente: Pago a Profesores */}
        <div className="bg-[#152035] rounded-3xl border shadow-lg overflow-hidden border-orange-100 group">
          <div 
            className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  font-black flex justify-between items-center cursor-pointer hover:bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]/90 transition-all shadow-md group" 
            onClick={() => setForm({...form, tipo: form.tipo === 'Pago Profesor' ? '' : 'Pago Profesor'})}
          >
            <div className="flex items-center gap-4">
               <div className="p-2 bg-[#152035]/20 rounded-2xl">
                  <Briefcase className="w-6 h-6" />
               </div>
               <span className="tracking-tight italic">Expediente: Pago a Profesores (Gastos)</span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-3xl tracking-tighter text-orange-100">{form.tipo === 'Pago Profesor' ? formatCurrency(totalPagosProfesores) : '••••••••'}</span>
               {form.tipo === 'Pago Profesor' ? <EyeOff className="w-6 h-6 opacity-40" /> : <Eye className="w-6 h-6 opacity-40 text-orange-200" />}
            </div>
          </div>
          
          {form.tipo === 'Pago Profesor' && (
            <div className="p-4">
              <form className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-orange-50/50 p-4 rounded-2xl border border-orange-100" onSubmit={handleSubmit}>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-orange-600/70 tracking-wider">Profesor (A quien)</label>
                  <input className="w-full border border-orange-200 rounded p-1.5 focus:border-orange-500 outline-none text-xs font-medium" value={form.nombreAlumno || ''} onChange={e => setForm({...form, nombreAlumno: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-orange-600/70 tracking-wider">Fecha</label>
                  <input type="date" className="w-full border border-orange-200 rounded p-1.5 focus:border-orange-500 outline-none text-xs" value={form.fechaPago || ''} onChange={e => setForm({...form, fechaPago: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-orange-600 tracking-wider">Monto</label>
                  <input type="number" className="w-full border border-orange-200 rounded p-1.5 font-bold text-orange-700 bg-[#152035] outline-none text-xs" value={form.montoTotalRecibido ?? 0} onChange={e => setForm({...form, montoTotalRecibido: Number(e.target.value)})} required/>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[9px] font-black uppercase text-orange-600/70 tracking-wider">Detalle del Pago</label>
                  <input className="w-full border border-orange-200 rounded p-1.5 italic focus:border-orange-500 outline-none text-xs" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} required />
                </div>
                <div className="flex items-end justify-end mt-1">
                  <button type="submit" className="bg-orange-600 text-white px-4 py-1.5 rounded-2xl text-xs font-bold hover:bg-orange-700 transition-all w-full md:w-auto h-8">
                    {editingId ? 'ACTUALIZAR' : 'REGISTRAR'}
                  </button>
                </div>
              </form>

              <div className="mt-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  text-[10px] font-black uppercase tracking-widest text-left border-b border-[#1E293B] italic">
                      <td colSpan={3} className="p-2 text-right">Suma Pagos Periodo:</td>
                      <td className="p-2 text-right font-bold text-orange-100 italic">-{formatCurrency(totalPagosProfesores)}</td>
                      <td></td>
                    </tr>
                    <tr className="text-[10px] font-black text-orange-400 uppercase tracking-widest text-left">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Profesor (A quien)</th>
                      <th className="p-3">Detalle</th>
                      <th className="p-3 text-right">Monto</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50 italic">
                    {filteredRecords.filter(r => r.tipo === 'Pago Profesor').map(r => (
                      <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="p-3">{formatDate(r.fechaPago)}</td>
                        <td className="p-3 font-bold text-orange-950">{r.nombreAlumno}</td>
                        <td className="p-3 text-slate-400">{r.observaciones}</td>
                        <td className="p-3 text-right font-black text-orange-600">-{formatCurrency(r.montoTotalRecibido)}</td>
                        <td className="p-3 text-center">
                          <RecordActions module="admin" onEdit={() => { setEditingId(r.id); setForm({...r}); }} onDelete={() => handleDelete(r.id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.filter(r => r.tipo === 'Pago Profesor').length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-orange-300">No hay pagos a profesores registrados.</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-orange-600 text-white font-black">
                    <tr>
                      <td colSpan={3} className="p-4 text-right uppercase text-[9px] tracking-widest italic tracking-widest">Suma Histórica Pagos:</td>
                      <td className="p-4 text-right text-sm italic">-{formatCurrency(totalPagosProfesores)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Expediente: Otros Gastos */}
        <div className="bg-[#152035] rounded-3xl border shadow-lg overflow-hidden border-rose-100 group">
          <div 
            className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  font-black flex justify-between items-center cursor-pointer hover:bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]/90 transition-all shadow-md group" 
            onClick={() => setForm({...form, tipo: form.tipo === 'Gasto Mensual' ? '' : 'Gasto Mensual'})}
          >
            <div className="flex items-center gap-4">
               <div className="p-2 bg-[#152035]/20 rounded-2xl">
                  <Receipt className="w-6 h-6" />
               </div>
               <span className="tracking-tight italic">Expediente: Otros Gastos Mensuales</span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-3xl tracking-tighter text-rose-100">{form.tipo === 'Gasto Mensual' ? formatCurrency(totalGastosMensuales) : '••••••••'}</span>
               {form.tipo === 'Gasto Mensual' ? <EyeOff className="w-6 h-6 opacity-40" /> : <Eye className="w-6 h-6 opacity-40 text-rose-200" />}
            </div>
          </div>
          
          {form.tipo === 'Gasto Mensual' && (
            <div className="p-4">
              <form className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100" onSubmit={handleSubmit}>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-rose-600/70 tracking-wider">Gasto / Proveedor</label>
                  <input className="w-full border border-rose-200 rounded p-1.5 focus:border-rose-500 outline-none text-xs font-medium" value={form.nombreAlumno || ''} onChange={e => setForm({...form, nombreAlumno: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-rose-600/70 tracking-wider">Fecha</label>
                  <input type="date" className="w-full border border-rose-200 rounded p-1.5 focus:border-rose-500 outline-none text-xs" value={form.fechaPago || ''} onChange={e => setForm({...form, fechaPago: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Monto</label>
                  <input type="number" className="w-full border border-rose-200 rounded p-1.5 font-bold text-rose-700 bg-[#152035] outline-none text-xs" value={form.montoTotalRecibido ?? 0} onChange={e => setForm({...form, montoTotalRecibido: Number(e.target.value)})} required/>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[9px] font-black uppercase text-rose-600/70 tracking-wider">Observaciones</label>
                  <input className="w-full border border-rose-200 rounded p-1.5 italic focus:border-rose-500 outline-none text-xs" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} required />
                </div>
                <div className="flex items-end justify-end mt-1">
                  <button type="submit" className="bg-rose-600 text-white px-4 py-1.5 rounded-2xl text-xs font-bold hover:bg-rose-700 transition-all w-full md:w-auto h-8">
                    {editingId ? 'ACTUALIZAR' : 'REGISTRAR'}
                  </button>
                </div>
              </form>

              <div className="mt-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest text-left border-b border-[#1E293B] italic">
                      <td colSpan={3} className="p-2 text-right">Suma Gastos Periodo:</td>
                      <td className="p-2 text-right font-bold text-rose-100 italic">-{formatCurrency(totalGastosMensuales)}</td>
                      <td></td>
                    </tr>
                    <tr className="text-[10px] font-black text-rose-400 uppercase tracking-widest text-left">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Gasto / Proveedor</th>
                      <th className="p-3">Detalle</th>
                      <th className="p-3 text-right">Monto</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50 italic">
                    {filteredRecords.filter(r => r.tipo === 'Gasto Mensual').map(r => (
                      <tr key={r.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="p-3">{formatDate(r.fechaPago)}</td>
                        <td className="p-3 font-bold text-rose-950">{r.nombreAlumno}</td>
                        <td className="p-3 text-slate-400">{r.observaciones}</td>
                        <td className="p-3 text-right font-black text-rose-600">-{formatCurrency(r.montoTotalRecibido)}</td>
                        <td className="p-3 text-center">
                          <RecordActions module="admin" onEdit={() => { setEditingId(r.id); setForm({...r}); }} onDelete={() => handleDelete(r.id)} />
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.filter(r => r.tipo === 'Gasto Mensual').length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-rose-300">No hay gastos registrados.</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-rose-600 text-white font-black text-sm">
                    <tr>
                      <td colSpan={3} className="p-4 text-right uppercase text-[9px] tracking-widest italic tracking-widest">Suma Histórica Gastos:</td>
                      <td className="p-4 text-right italic">-{formatCurrency(totalGastosMensuales)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
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
  }).sort((a,b) => {
    const d = (b.fecha || '').localeCompare(a.fecha || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const totalNeto = filteredRecords.reduce((acc, curr) => acc + (Number(curr.montoNeto) || 0), 0);
  const totalIva = filteredRecords.reduce((acc, curr) => acc + (Number(curr.iva) || 0), 0);
  const totalGeneral = filteredRecords.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('dte_records', editingId, { ...form, iva, total });
      await addAuditLog(user, `Actualizó DTE N° ${form.nroDto}`, 'Administración');
      setEditingId(null);
      alert('DTE Actualizado');
    } else {
      await localDB.saveToCollection('dte_records', { ...form, iva, total });
      await addNotification({
        title: 'Nuevo DTE Registrado',
        message: `${user.displayName || user.email} registró DTE N° ${form.nroDto} para ${form.nombre}`,
        recipientRoles: ['admin'],
        sender: user.displayName || user.email || 'Sistema'
      });
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
      formatCurrency(r.total || 0)
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
      r.total || 0
    ]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
             <span className="flex items-center gap-2">
               <Receipt className="w-5 h-5" /> {editingId ? 'Editando Registro DTE' : 'Registro Administrativo de DTE'}
             </span>
             <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3 py-1 rounded-full border border-white/20">
                <span className="text-[9px] font-black uppercase text-blue-400">Total DTE:</span>
                <span className="text-[11px] font-black">{filteredRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
             </div>
          </div>
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
              className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/30 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <span className="text-[10px] bg-[#152035]/20 px-2 py-0.5 rounded ml-2">Uso Interno - No SII</span>
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
               <input type="number" className="w-full border-b border-blue-200 p-4 text-xl font-black bg-[#152035]/50 rounded-t outline-none focus:bg-[#152035]" value={form.montoNeto || ''} onChange={e => setForm({...form, montoNeto: parseInt(e.target.value) || 0})} />
             </FormField>
             <div className="space-y-2 border-t border-[#1E293B] pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                   <span>IVA (19%)</span>
                   <span>{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-white">
                   <span>TOTAL B/F</span>
                   <span>{formatCurrency(total)}</span>
                </div>
             </div>
             <button type="submit" className={cn(
               "w-full py-4 rounded-2xl font-black shadow-xl hover:translate-y-[-2px] transition-all",
               editingId ? "bg-amber-600 text-white" : "bg-[#1E3A5F]  hover:bg-[#1D3557] border-[#1E293B] "
             )}>
               {editingId ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR DTE'}
             </button>
             {editingId && (
               <button type="button" onClick={() => setEditingId(null)} className="w-full text-slate-400 text-[10px] font-bold uppercase mt-2">Cancelar Edición</button>
             )}
          </div>
        </form>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b flex flex-wrap justify-between items-center font-black text-[10px]  uppercase tracking-widest gap-4">
          <div className="flex items-center gap-4">
             <span>Consulta de Registros DTE</span>
             <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3 py-1 rounded-full border border-white/20">
                <span className="text-[9px] font-black uppercase text-emerald-400">Total Neto:</span>
                <span className="text-[11px] font-black">{filteredRecords.reduce((sum, r) => sum + (Number(r.montoNeto) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
             </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-normal normal-case">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-300" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-300" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-300 font-normal" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            <button 
               onClick={() => {
                 exportTableToPDF('Reporte: DTE', ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto', 'IVA', 'Total'], getExportData(), 'reporte_dte', 'l');
               }}
               className="text-white bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-[#38BDF8]/30 flex items-center gap-1"
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
          <table className="w-full text-xs font-medium">
            <thead>
              <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] text-left border-b font-black  uppercase">
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">N° Dcto</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Razón Social</th>
                <th className="p-4 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">RUT</th>
                <th className="p-4 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Neto</th>
                <th className="p-4 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Total</th>
                <th className="p-4 text-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 italic">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-[#152035] transition-colors">
                  <td className="p-4 text-slate-400">{formatDate(r.fecha)}</td>
                  <td className="p-4 font-bold text-white">{r.nroDto}</td>
                  <td className="p-4">{r.nombre}</td>
                  <td className="p-4 font-mono text-slate-400">{r.rut}</td>
                  <td className="p-4 text-right">{formatCurrency(r.montoNeto)}</td>
                  <td className={cn(
                    "p-4 text-right font-black",
                    String(r.nroDto || '').toUpperCase().startsWith('NCE') ? "text-red-600" : (String(r.nroDto || '').toUpperCase().startsWith('GDE') ? "text-slate-400" : "text-blue-900")
                  )}>
                    {formatCurrency(r.total)}
                  </td>
                  <td className="p-4 text-center">
                    <RecordActions
                      module="admin"
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
                        try {
                          await localDB.deleteFromCollection('dte_records', r.id);
                          const updated = await localDB.getCollection('dte_records');
                          setRecords(updated);
                          alert('DTE eliminado exitosamente');
                        } catch (err) {
                          alert('No se pudo eliminar el DTE');
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 italic">No hay documentos registrados para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CPanelManager({ records }: { records: any[] }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'modules'>('users');

  return (
    <div className="bg-[#152035] rounded-[2.5rem] border border-[#1E293B] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 mt-4 min-h-[600px]">
       <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-10  relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10">
             <Settings className="w-56 h-56 rotate-12" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
             <div className="p-4 bg-[#152035] rounded-2xl shadow-lg">
                <ShieldCheck className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">CPANEL CONTROL</h3>
                <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-2">Configuración Central de Privilegios y Gobernanza de Datos</p>
             </div>
          </div>
       </div>

       <div className="flex border-b border-[#1E293B] bg-[#152035]/50 p-2 gap-2">
          {[
            { id: 'users', label: 'Gestión de Accesos', icon: Users, color: 'text-[#38BDF8]' },
            { id: 'logs', label: 'Traza de Auditoría', icon: ShieldCheck, color: 'text-emerald-600' },
            { id: 'modules', label: 'Módulos & API', icon: LayoutGrid, color: 'text-amber-600' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-8 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-2xl",
                activeTab === tab.id ? "bg-[#152035] shadow-md text-[#38BDF8]" : "text-slate-400 hover:text-slate-300 hover:bg-[#111A2E]/50"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          ))}
       </div>

       <div className="p-10">
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'logs' && <AuditLogManager records={records} />}
          {activeTab === 'modules' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between">
                      <div>
                         <div className="w-12 h-12 bg-[#111A2E] text-[#38BDF8] rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
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

                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between">
                      <div>
                         <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
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

                   <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] flex flex-col justify-between">
                      <div>
                         <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
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

                   <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-white flex flex-col justify-between">
                      <div>
                         <div className="w-12 h-12 bg-[#152035] text-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-slate-700">
                            <Lock className="w-6 h-6" />
                         </div>
                         <h4 className="text-lg font-black uppercase tracking-tight italic">API Integración</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 italic">Servicios externos de courier y pasarelas de pago. Próximamente integración con Redelcom/Transbank.</p>
                      </div>
                      <div className="mt-6">
                         <span className="text-[10px] font-black uppercase text-slate-400 px-3 py-1 bg-[#152035] rounded-full">Beta v5.0</span>
                      </div>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}

