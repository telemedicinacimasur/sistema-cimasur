import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, safe, parseExcelDate, formatCurrency } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF, viewExpedienteInNewTab } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';

const exportTableToExcel = (title: string, headers: string[], data: any[][], fileName: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  const safeTitle = title.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, safeTitle);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

import { 
  GraduationCap, 
  UserPlus, 
  BadgeCheck, 
  LineChart,
  Search,
  Save,
  Clock,
  History,
  BookOpen,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Mail,
  Smartphone,
  Trash2,
  Download,
  Edit,
  Upload,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';

import { RecordActions } from '../components/RecordActions';
import { Expediente } from '../components/Expediente';

import { addNotification } from '../lib/notifications';
import { syncStudentsToSchoolPayments } from '../lib/syncUtils';
import { CampaignsMotor } from '../components/school/CampaignsMotor';

interface EstadoAcademicoInputProps {
  studentId: string;
  initialValue: string;
}

const EstadoAcademicoInput = ({ studentId, initialValue }: EstadoAcademicoInputProps) => {
  const [val, setVal] = useState(initialValue || 'En proceso');

  useEffect(() => {
    setVal(initialValue || 'En proceso');
  }, [initialValue]);

  const handleSave = async (selectedVal: string) => {
    await localDB.updateInCollection('students', studentId, { estadoAcademico: selectedVal });
    window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
  };

  const normalizedVal = (val || '').toLowerCase();
  const isPendiente = normalizedVal.includes('pendiente');
  const isTerminado = normalizedVal.includes('terminada') || normalizedVal.includes('terminado') || normalizedVal.includes('modulo terminado') || normalizedVal.includes('módulo terminado') || normalizedVal.includes('acceso terminado');
  const isEnProceso = !isPendiente && !isTerminado;

  let selectVal = "En proceso";
  if (isPendiente) selectVal = "Pendiente";
  else if (isTerminado) selectVal = "Terminado";

  return (
    <select 
      value={selectVal}
      onChange={(e) => {
        const newVal = e.target.value;
        setVal(newVal);
        handleSave(newVal);
      }}
      className={cn(
        "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border bg-[#152033] text-center w-28 outline-none cursor-pointer transition-colors",
        isPendiente ? "text-amber-400 border-amber-500/20 bg-amber-950/20" :
        isTerminado ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20" :
        "text-sky-400 border-sky-500/20 bg-sky-950/20"
      )}
    >
      <option value="Pendiente" className="bg-[#152033] text-amber-400">🟡 Pendiente</option>
      <option value="En proceso" className="bg-[#152033] text-sky-400">🔵 En proceso</option>
      <option value="Terminado" className="bg-[#152033] text-emerald-400">💚 Terminado</option>
    </select>
  );
};

export default function SchoolView() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const permissions = user?.permissions?.['school'];
  const isReadonly = permissions?.readonly === true || user?.role === 'viewer' || (user?.roles?.includes('viewer') && !user?.roles?.includes('admin') && !user?.roles?.includes('manager'));
  const canEdit = user?.roles?.includes('admin') || (permissions ? (permissions.edit !== false && !isReadonly) : !isReadonly);
  const canDelete = user?.roles?.includes('admin') || (permissions ? (permissions.delete !== false && !isReadonly) : !isReadonly);

  const [activeView, setActiveView] = useState<'register' | 'students' | 'tracking' | 'activities' | 'commercial'>('register');
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const colName = activeView === 'students' ? 'students' : 'school_leads';
      if (activeView === 'students') {
        await syncStudentsToSchoolPayments();
      }
      const result = await localDB.getCollection(colName);
      setData(result);
    };
    loadData();
    const handleDbChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.collection || ['students', 'school_leads', 'school_activities', 'school_payments'].includes(detail.collection)) {
        loadData();
      }
    };
    window.addEventListener('db-change', handleDbChange);
    return () => window.removeEventListener('db-change', handleDbChange);
  }, [activeView]);

  return (
    <div className="space-y-8">
      {!canEdit && (
        <style>{`
          form, form input, form textarea, form select, input[required], select[required], textarea[required], button[type="submit"] { pointer-events: none !important; opacity: 0.5 !important; }
          form::after { content: '🛡️ MODO LECTOR ACTIVO - INGRESO BLOQUEADO'; position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: #0F172A; color: #38BDF8; font-weight: 900; font-size: 10px; padding: 6px 16px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: 0.1em; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        `}</style>
      )}
      {!canDelete && (
        <style>{`
          button[title*="eliminar" i], button[title*="borrar" i], button.text-red-500, button.text-red-400 { display: none !important; }
        `}</style>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-sky-400 tracking-tight">Centro Académico CIMASUR</h2>
          <p className="text-sky-400 text-sm">Ecosistema integrado de captación, formación y seguimiento.</p>
        </div>
        <div className="flex bg-[#111A2E] p-1 rounded-2xl border border-[#1E293B]">
           {(!user?.allowedSubmodules?.school || user.allowedSubmodules.school.includes('register')) && <TabButton active={activeView === 'register'} onClick={() => setActiveView('register')} icon={UserPlus}>Captación</TabButton>}
           {(!user?.allowedSubmodules?.school || user.allowedSubmodules.school.includes('students')) && <TabButton active={activeView === 'students'} onClick={() => setActiveView('students')} icon={GraduationCap}>Alumnos</TabButton>}
           {(!user?.allowedSubmodules?.school || user.allowedSubmodules.school.includes('tracking')) && <TabButton active={activeView === 'tracking'} onClick={() => setActiveView('tracking')} icon={LineChart}>Vista 360°</TabButton>}
           {(!user?.allowedSubmodules?.school || user.allowedSubmodules.school.includes('commercial')) && <TabButton active={activeView === 'commercial'} onClick={() => setActiveView('commercial')} icon={Lightbulb}>Motor Escuela</TabButton>}
           {(!user?.allowedSubmodules?.school || user.allowedSubmodules.school.includes('activities')) && <TabButton active={activeView === 'activities'} onClick={() => setActiveView('activities')} icon={History}>Actividades</TabButton>}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeView === 'register' && <ContactRegister records={data} />}
        {activeView === 'students' && <StudentManager records={data} />}
        {activeView === 'tracking' && <TrackingView />}
        {activeView === 'commercial' && <CampaignsMotor />}
        {activeView === 'activities' && <SchoolActivities />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-[#152035] text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "text-slate-400 hover:text-slate-300"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function ContactRegister({ records }: { records: any[] }) {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    name: '',
    rut: '',
    email: '',
    phone: '',
    region: 'Sin información',
    clasificacion: 'Sin información',
    interes: 'Diplomado Homeopatía',
    canal: '📢 Campañas / Ads',
    estado: 'Nuevo',
    estadoAcademico: 'En proceso',
    observaciones: '',
    montoTotalPagado: 0,
    montoTotalRecibido: 0,
    compraAnual: 0,
    nroFactura: '',
    fechaFactura: '',
    observacionesPago: 'Sin observaciones.',
    estadoPago: 'Pendiente'
  });

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [newHistory, setNewHistory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneWarning, setPhoneWarning] = useState<{type: 'lead' | 'student', match: string} | null>(null);
  const [confirmLeadId, setConfirmLeadId] = useState<string | null>(null);
  const [showPaymentData, setShowPaymentData] = useState(false);

  const [filterCanal, setFilterCanal] = useState('Todos');
  const [filterInteres, setFilterInteres] = useState('Todos');
  const [filterClasificacion, setFilterClasificacion] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterEstadoPago, setFilterEstadoPago] = useState('Todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (form.phone && form.phone.length >= 7) {
      const cleanPhone = form.phone.replace(/\D/g, '');
      const leadMatch = records.find(r => r.phone && r.id !== editingId && r.phone.replace(/\D/g, '') === cleanPhone);
      
      if (leadMatch && cleanPhone.length > 5) {
         setPhoneWarning({ type: 'lead', match: leadMatch.name || 'Lead sin nombre' });
         return;
      }
      
      localDB.getCollection('students').then(students => {
         const studentMatch = students.find((s:any) => s.phone && s.phone.replace(/\D/g, '') === cleanPhone);
         if (studentMatch && cleanPhone.length > 5) {
            setPhoneWarning({ type: 'student', match: studentMatch.name || 'Alumno sin nombre' });
         } else {
            setPhoneWarning(null);
         }
      }).catch(() => setPhoneWarning(null));
    } else {
      setPhoneWarning(null);
    }
  }, [form.phone, records, editingId]);

  const filteredRecords = records.filter(r => {
    const name = safe(r.name).toLowerCase();
    const rut = safe(r.rut).toLowerCase();
    const email = safe(r.email).toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchSearch = name.includes(term) || rut.includes(term) || email.includes(term);

    const matchCanal = filterCanal === 'Todos' || safe(r.canal) === filterCanal;
    const matchInteres = filterInteres === 'Todos' || safe(r.interes) === filterInteres;
    const matchClasificacion = filterClasificacion === 'Todos' || safe(r.clasificacion) === filterClasificacion;
    const matchEstado = filterEstado === 'Todos' || safe(r.estado) === filterEstado;
    const matchRegion = !filterRegion || safe(r.region).toLowerCase().includes(filterRegion.toLowerCase());
    const matchEstadoPago = filterEstadoPago === 'Todos' || safe(r.estadoPago) === filterEstadoPago;

    return matchSearch && matchCanal && matchInteres && matchClasificacion && matchEstado && matchRegion && matchEstadoPago;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...form,
        name: form.name.trim() || 'Sin Nombre (Solo WhatsApp)',
        rut: form.rut.trim() || 'No detallado',
        montoTotalPagado: form.montoTotalPagado === '' ? 0 : Number(form.montoTotalPagado),
        montoTotalRecibido: form.montoTotalRecibido === '' ? 0 : Number(form.montoTotalRecibido),
        compraAnual: form.compraAnual === '' ? 0 : Number(form.compraAnual)
      };

      console.log("Saving lead:", editingId, dataToSave);
      if (editingId) {
        await localDB.updateInCollection('school_leads', editingId, dataToSave);
        if (user) await addAuditLog(user, `Actualizó lead académico: ${form.name}`, 'SCHOOL');
        alert('Lead Académico Actualizado');
        setEditingId(null);
      } else {
        await localDB.saveToCollection('school_leads', dataToSave);
        await addNotification({
          title: 'Nuevo Lead Académico',
          message: `${user?.displayName || user?.email} registró a ${form.name}`,
          recipientRoles: ['admin'],
          sender: user?.displayName || user?.email || 'Sistema'
        });
        if (user) await addAuditLog(user, `Registró lead académico: ${form.name}`, 'SCHOOL');
        alert('Lead Académico Registrado');
      }
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
      setForm({ 
        fecha: new Date().toISOString().split('T')[0],
        name: '', 
        rut: '', 
        email: '', 
        phone: '', 
        region: 'Sin información',
        clasificacion: 'Sin información',
        interes: 'Diplomado Homeopatía',
        canal: '📢 Campañas / Ads',
        estado: 'Nuevo',
        estadoAcademico: 'En proceso',
        observaciones: '',
        montoTotalPagado: 0,
        montoTotalRecibido: 0,
        compraAnual: 0,
        nroFactura: '',
        fechaFactura: '',
        observacionesPago: 'Sin observaciones.',
        estadoPago: 'Pendiente'
      });
    } catch (error) {
      console.error("Error saving lead:", error);
      alert('Error al guardar: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const downloadExcelTemplate = () => {
    const headers = [
      ["Fecha Registro", "Nombre Apellido", "RUT Escrito", "Email", "Teléfono / WhatsApp", "CLASIFICACIÓN PROFESIONAL", "Programa de Interés", "Observaciones de seguimiento", "Monto Total Pagado", "Monto Recibido", "N° Factura", "Fecha Factura", "Observaciones Pago"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
    XLSX.writeFile(wb, "plantilla_importacion_escuela.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const row of data) {
          const newLead = {
            fecha: parseExcelDate(row["Fecha Registro"]),
            name: safe(row["Nombre Apellido"]),
            rut: safe(row["RUT Escrito"]),
            email: safe(row["Email"]),
            phone: safe(row["Teléfono / WhatsApp"]),
            clasificacion: safe(row["CLASIFICACIÓN PROFESIONAL"]) || 'Sin información',
            interes: safe(row["Programa de Interés"]) || 'Otro',
            canal: 'Importación Excel',
            estado: 'Nuevo',
            observaciones: safe(row["Observaciones de seguimiento"]),
            observacionesPago: safe(row["Observaciones Pago"]),
            montoTotalPagado: Number(row["Monto Total Pagado"]) || 0,
            montoTotalRecibido: Number(row["Monto Recibido"]) || 0,
            nroFactura: safe(row["N° Factura"]),
            fechaFactura: parseExcelDate(row["Fecha Factura"]),
            responsable: user.displayName || user.email || 'Sistema'
          };

          if (newLead.name && newLead.rut) {
            await localDB.saveToCollection('school_leads', newLead);
            importedCount++;
          }
        }

        await addAuditLog(user, `Importó ${importedCount} leads académicos desde Excel`, 'SCHOOL');
        alert(`Éxito: Se importaron ${importedCount} leads académicos correctamente.`);
        window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo. Asegúrese de usar la plantilla correcta.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const [transferringLead, setTransferringLead] = useState<any | null>(null);
  const [transferPaymentForm, setTransferPaymentForm] = useState({
    montoTotalPagado: 0,
    montoTotalRecibido: 0,
    fechaPago: new Date().toISOString().split('T')[0],
    estadoPago: 'Pendiente',
    nroFactura: '',
    fechaFactura: '',
    observaciones: ''
  });

  const confirmTransfer = async (e: React.FormEvent, lead: any) => {
    e.preventDefault();
    if (!lead) return;

    try {
      const studentData = {
        name: lead.name,
        rut: lead.rut,
        email: lead.email,
        phone: lead.phone,
        region: lead.region || '',
        clasificacion: lead.clasificacion,
        diplomado: lead.interes,
        pago: transferPaymentForm.estadoPago,
        avance: 0,
        observacionesAcademicas: lead.observaciones || 'Inscrito desde Captación',
        observacionesPago: transferPaymentForm.observaciones || lead.observacionesPago || '',
        montoTotalPagado: transferPaymentForm.montoTotalPagado === '' ? 0 : Number(transferPaymentForm.montoTotalPagado),
        montoTotalRecibido: transferPaymentForm.montoTotalRecibido === '' ? 0 : Number(transferPaymentForm.montoTotalRecibido),
        nroFactura: transferPaymentForm.nroFactura,
        fechaFactura: transferPaymentForm.fechaFactura
      };
      console.log("Saving student data:", studentData);
      await localDB.saveToCollection('students', studentData);
      
      // Sincronizar automáticamente con el módulo administrativo de Escuela
      const schoolPayment = {
        tipo: 'Ingreso Alumno',
        nombreAlumno: lead.name,
        rut: lead.rut,
        direccion: lead.direccion || '',
        email: lead.email,
        telefono: lead.phone,
        fechaPago: transferPaymentForm.fechaPago || new Date().toISOString().split('T')[0],
        montoTotalPagado: transferPaymentForm.montoTotalPagado === '' ? 0 : Number(transferPaymentForm.montoTotalPagado),
        montoTotalRecibido: transferPaymentForm.montoTotalRecibido === '' ? 0 : Number(transferPaymentForm.montoTotalRecibido),
        nroFactura: transferPaymentForm.nroFactura,
        fechaFactura: transferPaymentForm.fechaFactura,
        observaciones: transferPaymentForm.observaciones || lead.observacionesPago || `Matrícula desde Captación: ${lead.interes}`
      };
      console.log("Saving school payment:", schoolPayment);
      await localDB.saveToCollection('school_payments', schoolPayment);
      
      await addNotification({
        title: 'Nuevo Alumno Matriculado',
        message: `${user?.displayName || user?.email} matriculó a ${lead.name}. Se ha creado el registro en Administración.`,
        recipientRoles: ['admin'],
        sender: user?.displayName || user?.email || 'Sistema'
      });
      await localDB.deleteFromCollection('school_leads', lead.id);
      setSelectedLead(null);
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
      alert(`${lead.name} ahora es ALUMNO VIGENTE`);
    } catch(err) {
      console.error("Transfer error:", err);
      alert('Error en la transferencia de alumno: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const CLASIFICACIONES = ['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro'];
  const PROGRAMAS = [
    'Clase Única',
    'Diplomado',
    'Membresía',
    'MEMBRESÍA EX-ALUMNOS',
    'Módulo I',
    'Módulo II',
    'Taller Individual Módulo I',
    'Taller Individual Módulo II',
    'Otro'
  ];

  return (
    <>
      <div className="flex flex-col gap-8 w-full">
        <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-x-auto">
          <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4 font-bold flex items-center justify-between">
               <button 
                 type="button"
                 onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                 className="flex items-center gap-2 text-white hover:text-[#38BDF8] transition-colors font-bold outline-none cursor-pointer"
                 title="Haga clic para alternar filtros avanzados"
               >
                 <span>Registro de Potenciales Alumnos</span>
                 {showAdvancedFilters ? <ChevronUp className="w-4 h-4 text-[#38BDF8]" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
               </button>
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
            <div className="bg-[#152035] p-6 border-b flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-10 pr-4 py-2 border border-[#1E293B] bg-[#111A2E] text-white rounded-full text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="Buscar por nombre, RUT o email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#111A2E] rounded-2xl border border-[#1E293B] animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Canal de Origen</label>
                    <select className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white" value={filterCanal} onChange={e => setFilterCanal(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="📢 Campañas / Ads">📢 Campañas / Ads</option>
                      <option value="📸 Instagram">📸 Instagram</option>
                      <option value="👥 Facebook">👥 Facebook</option>
                      <option value="💬 WhatsApp">💬 WhatsApp</option>
                      <option value="📞 Llamada Directa">📞 Llamada Directa</option>
                      <option value="🤝 Recomendación">🤝 Recomendación</option>
                      <option value="🌐 Página Web">🌐 Página Web</option>
                      <option value="✏️ Otro">✏️ Otro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Programa de Interés</label>
                    <select className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white" value={filterInteres} onChange={e => setFilterInteres(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="Diplomado Homeopatía">Diplomado Homeopatía</option>
                      <option value="Diplomado en Homeopatía Veterinaria">Diplomado en Homeopatía Veterinaria</option>
                      {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clasificación Profesional</label>
                    <select className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white" value={filterClasificacion} onChange={e => setFilterClasificacion(e.target.value)}>
                      <option value="Todos">Todos</option>
                      {CLASIFICACIONES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado Seguimiento</label>
                    <select className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="Nuevo">Nuevo</option>
                      <option value="Contactado">Contactado</option>
                      <option value="En reunión">En reunión</option>
                      <option value="Matriculado">Matriculado</option>
                      <option value="No interesado">No interesado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Región / Comuna</label>
                    <input 
                      className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white outline-none" 
                      placeholder="Filtrar por región o comuna..." 
                      value={filterRegion} 
                      onChange={e => setFilterRegion(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado de Pago</label>
                    <select className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-2 text-xs text-white" value={filterEstadoPago} onChange={e => setFilterEstadoPago(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="En cuotas">En cuotas</option>
                      <option value="Por mensualidad">Por mensualidad</option>
                    </select>
                  </div>
                  <div className="col-span-full flex justify-end">
                    <button 
                      type="button"
                      onClick={() => {
                        setFilterCanal('Todos');
                        setFilterInteres('Todos');
                        setFilterClasificacion('Todos');
                        setFilterEstado('Todos');
                        setFilterRegion('');
                        setFilterEstadoPago('Todos');
                        setSearchTerm('');
                      }}
                      className="text-[10px] font-black text-red-400 hover:underline uppercase tracking-wider"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              )}
            </div>
            <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                <FormGroup label="Fecha Registro">
                   <input type="date" className="w-full border-b p-2 bg-[#152035] text-white outline-none" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} />
                 </FormGroup>
               <FormGroup label="Nombre Completo">
                <input className="w-full border-b p-2 font-bold bg-[#152035] text-white outline-none" placeholder="fernanda" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required />
              </FormGroup>
               <FormGroup label="RUT / ID">
                <input className="w-full border-b p-2 bg-[#152035] text-white outline-none" placeholder="201564425" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} required />
              </FormGroup>
               <FormGroup label="Correo Electrónico">
                <input type="email" className="w-full border-b p-2 bg-[#152035] text-white outline-none" placeholder="admin@cimasur.cl" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
              </FormGroup>
               <FormGroup label="Teléfono / WhatsApp">
                  <input className={cn("w-full border-b p-2 font-bold bg-[#152035] text-white outline-none", phoneWarning ? "border-amber-500 text-amber-600 bg-amber-50/50" : "")} placeholder="957414102" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} required />
                  {phoneWarning && (
                      <p className="text-[10px] uppercase font-black text-amber-600 mt-1.5 flex items-center gap-1">
                          ⚠️ ALERTA: FONO YA INSCRITO CÓMO {phoneWarning.type === 'student' ? 'ALUMNO' : 'LEAD'} ({phoneWarning.match})
                      </p>
                  )}
               </FormGroup>
               
               <FormGroup label="Región / Comuna">
                  <input className="w-full border-b p-2 bg-[#152035] text-white outline-none" placeholder="Sin información" value={form.region || ''} onChange={e => setForm({...form, region: e.target.value})} />
                </FormGroup>

                <FormGroup label="Estado Académico">
                  <select className="w-full border-b p-2 text-sm font-bold bg-[#152035] text-white outline-none cursor-pointer" value={form.estadoAcademico || 'En proceso'} onChange={e => setForm({...form, estadoAcademico: e.target.value})}>
                    <option value="Pendiente">🟡 Pendiente</option>
                    <option value="En proceso">🔵 En proceso</option>
                    <option value="Terminado">💚 Terminado</option>
                  </select>
                </FormGroup>

                <FormGroup label="Cómo llegó (Canal de Origen)">
                  <select className="w-full border-b p-2 text-sm bg-[#152035] text-white outline-none cursor-pointer font-bold" value={form.canal || ''} onChange={e => setForm({...form, canal: e.target.value})}>
                    <option value="📢 Campañas / Ads">📢 Campañas / Ads</option>
                    <option value="📸 Instagram">📸 Instagram</option>
                    <option value="👥 Facebook">👥 Facebook</option>
                    <option value="💬 WhatsApp">💬 WhatsApp</option>
                    <option value="📞 Llamada Directa">📞 Llamada Directa</option>
                    <option value="🤝 Recomendación">🤝 Recomendación</option>
                    <option value="🌐 Página Web">🌐 Página Web</option>
                    <option value="✏️ Otro">✏️ Otro</option>
                  </select>
                </FormGroup>

                <FormGroup label="CLASIFICACIÓN PROFESIONAL">
                  <select className="w-full border-b p-2 text-sm font-bold text-[#38BDF8]" value={form.clasificacion || ''} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                    {CLASIFICACIONES.map(c => <option key={c}>{c}</option>)}
                  </select>
               </FormGroup>

               <FormGroup label="Programa o Diplomado">
                  <select className="w-full border-b p-2 text-sm bg-[#152035] text-white outline-none cursor-pointer font-bold" value={form.interes || ''} onChange={e => setForm({...form, interes: e.target.value})}>
                    <option value="Diplomado Homeopatía">Diplomado Homeopatía</option>
                    <option value="Diplomado en Homeopatía Veterinaria">Diplomado en Homeopatía Veterinaria</option>
                    {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </FormGroup>

               <>
                  <FormGroup label="Arancel Total (Monto de Venta)">
                  <input type="number" className="w-full border-b p-2 font-mono bg-[#152035] text-white outline-none" placeholder="200000" value={form.montoTotalPagado || ''} onChange={e => setForm({...form, montoTotalPagado: e.target.value})} />
                </FormGroup>

                <FormGroup label="Monto Recibido (Neto en Cuenta)">
                  <input type="number" className="w-full border-b p-2 font-black text-emerald-600 bg-emerald-50 rounded" placeholder="200000" value={form.montoTotalRecibido || ''} onChange={e => setForm({...form, montoTotalRecibido: e.target.value})} />
                </FormGroup>

                <FormGroup label="Compra Anual Acumulada ($)">
                  <input type="number" className="w-full border-b p-2 font-mono text-amber-400 bg-[#152035] outline-none" placeholder="0" value={form.compraAnual || ''} onChange={e => setForm({...form, compraAnual: e.target.value})} />
                </FormGroup>

                <div className="col-span-full">
                  <FormGroup label="Observación Pago / Cobranza">
                    <input className="w-full border-b p-2 italic bg-[#152035] text-white outline-none" placeholder="Sin observaciones." value={form.observacionesPago || ''} onChange={e => setForm({...form, observacionesPago: e.target.value})} />
                  </FormGroup>
                </div>

                <div className="col-span-full"><FormGroup label="Observaciones de seguimiento">
                    <textarea className="w-full border rounded-2xl p-4 h-24 bg-[#152035] outline-none focus:bg-[#152035]" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} />
                  </FormGroup>
               </div></>
               
               <div className="col-span-full border-t border-[#1E293B] mt-4 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Facturación (Opcional)</h4>
                    <button 
                      type="button" 
                      onClick={() => setShowPaymentData(!showPaymentData)} 
                      className="text-[10px] bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg text-sky-400 hover:text-sky-300 font-bold uppercase tracking-widest"
                    >
                      {showPaymentData ? 'Ocultar Facturación' : 'Mostrar Facturación'}
                    </button>
                  </div>
                  {showPaymentData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                       <FormGroup label="N° Factura"><input className="w-full border-b p-2 bg-[#152035] text-white outline-none" value={form.nroFactura || ''} onChange={e => setForm({...form, nroFactura: e.target.value})} /></FormGroup>
                       <FormGroup label="Fecha Factura"><input type="date" className="w-full border-b p-2 bg-[#152035] text-white outline-none" value={form.fechaFactura || ''} onChange={e => setForm({...form, fechaFactura: e.target.value})} /></FormGroup>
                    </div>
                  )}
               </div>
               
               <div className="col-span-full flex gap-3">
                 <button type="submit" className="flex-1 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" /> {editingId ? 'ACTUALIZAR LEAD ACADÉMICO' : 'GUARDAR LEAD ACADÉMICO'}
                 </button>
                 {editingId && (
                   <button type="button" onClick={() => {
                     setEditingId(null);
                     setForm({ ...form, name: '', rut: '', email: '', phone: '', observaciones: '', montoTotalPagado: 0, montoTotalRecibido: 0, nroFactura: '', fechaFactura: '', observacionesPago: '' });
                   }} className="px-6 bg-[#1E293B] text-slate-200 py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center">
                      CANCELAR
                   </button>
                 )}
               </div>
            </form>
          </div>

        {selectedLead && (
          <Expediente
            selectedClient={{
              ...selectedLead,
              name: selectedLead.name,
              rut: selectedLead.rut,
              region: selectedLead.clasificacion,
              type: selectedLead.interes,
              fechaIngreso: selectedLead.fecha || new Date().toISOString(),
              historialUnificado: selectedLead.observaciones || '[SISTEMA] Sin registros de captación.'
            }}
            showIntranet={false}
            showComuna={false}
            onClose={() => setSelectedLead(null)}
            onUpdate={async(data) => {
               if (data.isProfileUpdate) {
                  const { updatedProfile } = data;
                  const currentDate = new Date().toLocaleString();
                  const userStamp = user?.displayName || user?.email || 'Admin';
                  const baseUpdateEntry = `\n[${currentDate}] - ${userStamp}\n▶ Actualización de datos base: ` + Object.keys(updatedProfile).map(k => `${k}: ${updatedProfile[k]}`).join(', ');
                  const newMerged = data.newHistory ? (selectedLead.observaciones || '') + `\n[${currentDate}] - ${userStamp}\n${data.newHistory}` : (selectedLead.observaciones || '');

                  await localDB.updateInCollection('school_leads', selectedLead.id, {
                     rut: updatedProfile.rut,
                     clasificacion: updatedProfile.region,
                     fecha: updatedProfile.fechaIngreso,
                     interes: updatedProfile.type,
                     montoTotalPagado: updatedProfile.montoTotalPagado,
                     montoTotalRecibido: updatedProfile.montoTotalRecibido,
                     pago: updatedProfile.pago || selectedLead.pago,
                     fechaPago: updatedProfile.fechaPago || selectedLead.fechaPago,
                     observacionesPago: typeof updatedProfile.observacionesPago !== 'undefined' ? updatedProfile.observacionesPago : selectedLead.observacionesPago,
                     unidadesAcademicas: updatedProfile.unidadesAcademicas || selectedLead.unidadesAcademicas || '',
                     historialPagos: updatedProfile.historialPagos || selectedLead.historialPagos || '',
                     observaciones: newMerged
                  });
                  setSelectedLead({ 
                     ...selectedLead, 
                     ...updatedProfile, 
                     pago: updatedProfile.pago || selectedLead.pago,
                     fechaPago: updatedProfile.fechaPago || selectedLead.fechaPago,
                     observacionesPago: typeof updatedProfile.observacionesPago !== 'undefined' ? updatedProfile.observacionesPago : selectedLead.observacionesPago,
                     unidadesAcademicas: updatedProfile.unidadesAcademicas || selectedLead.unidadesAcademicas || '',
                     historialPagos: updatedProfile.historialPagos || selectedLead.historialPagos || '',
                     observaciones: newMerged 
                  });
                  alert('Datos base de prospecto actualizados');
                  return;
               }

               const currentDate = new Date().toLocaleString();
               const userStamp = user?.displayName || user?.email || 'Admin';
               const header = `[${currentDate}] - ${userStamp}\n\u25b6 Actividad: ${data.activityType || activityType}\n\u25b6 Estado: ${data.currentStatus || currentStatus}`;
               const addedNote = data.newHistory ? `\nResumen: ${data.newHistory}` : '';
               const fullHistoryEntry = header + addedNote;

               const mergedHistory = selectedLead.observaciones 
                  ? selectedLead.observaciones + '\n\n' + fullHistoryEntry 
                  : fullHistoryEntry;

               await localDB.updateInCollection('school_leads', selectedLead.id, { 
                  observaciones: mergedHistory,
                  estado: data.currentStatus || currentStatus,
                  clasificacion: data.newCategory || newCategory || selectedLead.clasificacion
               });

               setSelectedLead({
                  ...selectedLead,
                  observaciones: mergedHistory,
                  estado: data.currentStatus || currentStatus,
                  clasificacion: data.newCategory || newCategory || selectedLead.clasificacion
               });

               if (user) await addAuditLog(user, `Actualizó gestión de lead: ${selectedLead.name}`, 'SCHOOL');
               alert('Gestión de captación guardada');
               setNewHistory('');
            }}
            onTransfer={async() => {
              await confirmTransfer(new Event('submit') as any, selectedLead);
            }}
            extraTransferFields={(
              <div className="bg-[#111A2E] p-4 rounded-2xl border border-[#1E293B] mt-4 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#1E293B] pb-2">Datos de Matrícula (Opcional)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Monto Total de Venta</label>
                    <input type="number" className="w-full border-b bg-[#152035] border-[#1E293B] p-2 text-sm outline-none" value={transferPaymentForm.montoTotalPagado ?? 0} onChange={e => setTransferPaymentForm({...transferPaymentForm, montoTotalPagado: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Monto Recibido</label>
                    <input type="number" className="w-full border-b bg-emerald-50 border-emerald-300 p-2 text-sm font-bold text-emerald-700 outline-none" value={transferPaymentForm.montoTotalRecibido ?? 0} onChange={e => setTransferPaymentForm({...transferPaymentForm, montoTotalRecibido: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">N° Factura</label>
                    <input className="w-full border-b bg-[#152035] border-[#1E293B] p-2 text-sm outline-none" value={transferPaymentForm.nroFactura || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, nroFactura: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fecha Factura</label>
                    <input type="date" className="w-full border-b bg-[#152035] border-[#1E293B] p-2 text-sm outline-none" value={transferPaymentForm.fechaFactura || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, fechaFactura: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estado Pago</label>
                    <select className="w-full border-b bg-[#152035] border-[#1E293B] p-2 text-sm outline-none" value={transferPaymentForm.estadoPago} onChange={e => setTransferPaymentForm({...transferPaymentForm, estadoPago: e.target.value})}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="En cuotas">En cuotas</option>
                      <option value="Por mensualidad">Por mensualidad</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Observación Pago</label>
                    <input className="w-full border-b bg-[#152035] border-[#1E293B] p-2 text-sm outline-none italic" value={transferPaymentForm.observaciones || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, observaciones: e.target.value})} placeholder={`Matrícula: ${selectedLead.interes}`} />
                  </div>
                </div>
              </div>
            )}
            newHistory={newHistory}
            setNewHistory={setNewHistory}
            newCategory={newCategory || selectedLead.clasificacion}
            setNewCategory={setNewCategory}
            activityType={activityType}
            setActivityType={setActivityType}
            currentStatus={currentStatus || selectedLead.estado}
            setCurrentStatus={setCurrentStatus}
            categories={['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro']}
          />
        )}
      </div>

      <div className="space-y-6">
         <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] rounded-2xl p-6  shadow-xl relative overflow-hidden group">
            <TrendingUp className="absolute top-[-10px] right-[-10px] w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" />
            <h4 className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Potenciales Alumnos Registrados</h4>
            <p className="text-4xl font-black">{records.length}</p>
         </div>
         <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-6 overflow-hidden">
                <h4 className="font-black text-white text-[10px] uppercase mb-4 tracking-widest border-b pb-2 flex justify-between items-center">
                <span>Gestionar Captaciones</span>
                <button
                  onClick={() => {
                    const data = records.map(r => [r.name, r.rut, r.interes, r.estado]);
                    exportTableToPDF('Reporte: Captaciones Académicas', ['Nombre', 'RUT', 'Interés', 'Estado'], data, 'captaciones_academicas');
                  }}
                  className="text-[#38BDF8] hover:text-white"
                >
                  <Download className="w-3 h-3" />
                </button>
            </h4>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {filteredRecords.map(r => (
                 <div key={r.id} className="border-b border-[#1E293B] pb-4 group">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="font-bold text-sm text-slate-200">{r.name}</p>
                          <p className="text-[9px] font-black uppercase text-[#38BDF8] italic mt-0.5">{r.clasificacion || 'Sin clasificación'}</p>
                       </div>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedLead(r);
                          }}
                          className="text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] font-black text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1 bg-[#111A2E] p-1.5 rounded hover:bg-[#111A2E]"
                          title="Ver Expediente"
                        >
                          <FileText className="w-3 h-3" /> Expediente
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedLead(r);
                            setTransferPaymentForm({
                              montoTotalPagado: r.montoTotalPagado || 0,
                              montoTotalRecibido: r.montoTotalRecibido || 0,
                              nroFactura: r.nroFactura || '',
                              fechaFactura: r.fechaFactura || '',
                              observaciones: r.observacionesPago || '',
                              estadoPago: r.estadoPago || 'Pendiente',
                              fechaPago: new Date().toISOString().split('T')[0]
                            });
                          }}
                          className="text-amber-400 group-hover:text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] font-black text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1 bg-[#111A2E] p-1.5 rounded"
                          title="Pasar a Alumno"
                        >
                          <GraduationCap className="w-3 h-3" /> Pasar a Alumno
                        </button>
                        <button 
                          onClick={async () => {
                            if (true) {
                              await localDB.saveToCollection('contacts', {
                                name: r.name,
                                rut: r.rut,
                                email: r.email,
                                phone: r.phone,
                                type: 'Lead',
                                origin: 'Escuela CIMASUR',
                                date: new Date().toISOString()
                              });
                              await localDB.deleteFromCollection('school_leads', r.id);
                              window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
                              window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'contacts' } }));
                              alert('Transferido a Leads (CRM General)');
                            }
                          }}
                          className="text-emerald-400 group-hover:text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] font-black text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1 bg-[#111A2E] p-1.5 rounded"
                          title="Pasar a Leads (CRM)"
                        >
                          <UserPlus className="w-3 h-3" /> Pasar a Leads
                        </button>
                        <RecordActions 
                          module="school"
                          onEdit={() => {
                            setForm({
                              ...form,
                              ...r
                            });
                            setEditingId(r.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onDelete={async () => {
                            await localDB.deleteFromCollection('school_leads', r.id);
                          }}
                        />
                       </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 bg-[#152035] p-2 rounded italic">
                       {r.interes} - {r.canal}
                    </div>
                 </div>
               ))}
               {records.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-8">No hay captaciones activas.</p>}
            </div>
         </div>
      </div>
    </>
  );
}

function StudentManager({ records }: { records: any[] }) {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [academicNote, setAcademicNote] = useState('');
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('En proceso');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiplomado, setFilterDiplomado] = useState('Todos');
  const [filterPago, setFilterPago] = useState('Todos');
  const [filterEstadoAcademico, setFilterEstadoAcademico] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'DIPLOMADO': true,
    'MODULOS': false,
    'TALLERES': false,
    'CLASES INDIVIDUALES': false,
    'CASOS CLINICOS': false,
    'OTRAS MODALIDADES': false,
  });

  const categoriesList = [
    'DIPLOMADO',
    'MODULOS',
    'TALLERES',
    'CLASES INDIVIDUALES',
    'CASOS CLINICOS',
    'OTRAS MODALIDADES'
  ];

  const getStudentCategory = (diplomadoName: string): string => {
    const name = (diplomadoName || '').toLowerCase();
    if (name.includes('diplomado')) {
      return 'DIPLOMADO';
    } else if (name.includes('módulo') || name.includes('modulo')) {
      return 'MODULOS';
    } else if (name.includes('taller')) {
      return 'TALLERES';
    } else if (name.includes('clase individual') || name.includes('clase única') || name.includes('clase unica') || name.includes('clases')) {
      return 'CLASES INDIVIDUALES';
    } else if (name.includes('caso clínico') || name.includes('caso clinico') || name.includes('casos')) {
      return 'CASOS CLINICOS';
    } else {
      return 'OTRAS MODALIDADES';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (filteredRecords: any[]) => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`¿Está seguro que desea eliminar masivamente ${selectedIds.length} alumnos? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        console.log(`Debug: Deleting student ${id}`);
        await localDB.deleteFromCollection('students', id);
      }
      setSelectedIds([]);
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
      alert(`Se han eliminado ${selectedIds.length} registros correctamente.`);
    } catch (err) {
      console.error('Error during bulk delete:', err);
      alert('Error parcial al eliminar.');
    }
  };

  const updateStudent = async (id: string, updates: any) => {
    const student = records.find(r => r.id === id);
    if (!student) return;

    let finalUpdates = { ...updates };

    await localDB.updateInCollection('students', id, finalUpdates);
    // Remove auto-close
  };

  const handleFieldLocalChange = (field: string, val: any) => {
    if (!selectedStudent) return;
    
    setSelectedStudent({
      ...selectedStudent,
      [field]: val
    });
  };

  const handleSaveAndAddNote = async (data?: any) => {
    if (!selectedStudent) return;

    if (data?.isProfileUpdate) {
        const { updatedProfile } = data;
        const currentDate = new Date().toLocaleString();
        const userStamp = !!localStorage ? 'Admin' : 'Admin'; // simple fallback
        const baseUpdateEntry = `\n[${currentDate}] - ${userStamp}\n▶ Actualización de datos base: ` + Object.keys(updatedProfile).map(k => `${k}: ${updatedProfile[k]}`).join(', ');
        const currentObs = selectedStudent.observacionesAcademicas || '';
        const newMerged = data.newHistory ? currentObs + `\n[${currentDate}] - ${userStamp}\n${data.newHistory}` : currentObs;

        const updates = {
            name: updatedProfile.name,
            rut: updatedProfile.rut,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
            region: updatedProfile.region,
            clasificacion: updatedProfile.clasificacion || selectedStudent.clasificacion,
            fechaIngreso: updatedProfile.fechaIngreso,
            diplomado: updatedProfile.type,
            montoTotalPagado: Number(updatedProfile.montoTotalPagado) || 0,
            montoTotalRecibido: Number(updatedProfile.montoTotalRecibido) || 0,
            pago: updatedProfile.pago || selectedStudent.pago,
            fechaPago: updatedProfile.fechaPago || selectedStudent.fechaPago,
            observacionesPago: typeof updatedProfile.observacionesPago !== 'undefined' ? updatedProfile.observacionesPago : selectedStudent.observacionesPago,
            avance: typeof updatedProfile.avance !== 'undefined' ? (parseInt(updatedProfile.avance) || 0) : (selectedStudent.avance || 0),
            estadoAcademico: updatedProfile.estadoAcademico || selectedStudent.estadoAcademico || 'En proceso',
            observacionesAcademicas: newMerged,
            unidadesAcademicas: updatedProfile.unidadesAcademicas || selectedStudent.unidadesAcademicas || '',
            historialPagos: updatedProfile.historialPagos || selectedStudent.historialPagos || ''
        };
        await localDB.updateInCollection('students', selectedStudent.id, updates);
        setSelectedStudent({ ...selectedStudent, ...updates });
        window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
        alert('Datos base actualizados');
        return;
    }

    // 1. Prepare updated notes (if academicNote exists)
    let newNotes = selectedStudent.observacionesAcademicas || '';
    if (data?.newHistory || academicNote) {
        newNotes = newNotes + `\n[${new Date().toLocaleString('es-CL')}] ${data?.newHistory || academicNote}`;
    }
    
    // 2. Prepare the update object covering ALL fields
    const updates = {
        pago: selectedStudent.pago,
        valor: selectedStudent.valor,
        avance: parseInt(selectedStudent.avance) || 0,
        clasificacion: selectedStudent.clasificacion,
        diplomado: selectedStudent.diplomado,
        estadoAcademico: selectedStudent.estadoAcademico || 'En proceso',
        observacionesAcademicas: newNotes
    };

    // 3. Update DB
    await localDB.updateInCollection('students', selectedStudent.id, updates);
    window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
    
    // 4. Update UI
    setSelectedStudent({
        ...selectedStudent,
        ...updates
    });
    setAcademicNote('');
    alert('Ficha y acción guardadas correctamente');
  };

  const handleDownloadFicha = () => {
    if (!selectedStudent) return;
    const data = [
      { label: 'Nombre', value: selectedStudent.name },
      { label: 'RUT', value: selectedStudent.rut },
      { label: 'Email', value: selectedStudent.email },
      { label: 'Clasificación', value: selectedStudent.clasificacion || '---' },
      { label: 'Diplomado/Curso', value: selectedStudent.diplomado || '---' },
      { label: 'Estado Pago', value: selectedStudent.pago },
      { label: 'Valor Arancel', value: selectedStudent.valor || '---' },
      { label: 'Avance Académico', value: `${selectedStudent.avance || 0}%` },
    ];
    
    exportExpedienteToPDF(
      `Ficha Académica: ${selectedStudent.name}`,
      data,
      `ficha_${selectedStudent.rut || 'alumno'}`
    );
  };

  if (selectedStudent) {
    return (
        <Expediente
        selectedClient={{
          ...selectedStudent,
          name: selectedStudent.name,
          rut: selectedStudent.rut,
          region: selectedStudent.clasificacion,
          type: selectedStudent.diplomado,
          fechaIngreso: selectedStudent.fechaIngreso || new Date().toISOString(),
          historialUnificado: selectedStudent.observacionesAcademicas || '[SISTEMA] Sin registros académicos.'
        }}
        showIntranet={false}
        isStudentMode={true}
        showComuna={false}
        onClose={() => setSelectedStudent(null)}
        onUpdate={handleSaveAndAddNote}
        newHistory={academicNote}
        setNewHistory={setAcademicNote}
        newCategory={selectedStudent.clasificacion}
        setNewCategory={(val) => handleFieldLocalChange('clasificacion', val)}
        activityType={activityType}
        setActivityType={setActivityType}
        currentStatus={currentStatus}
        setCurrentStatus={setCurrentStatus}
        categories={['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro']}
      />
    );
  }

  const filteredRecords = (Array.isArray(records) ? records : []).filter(s => {
    const name = safe(s.name).toLowerCase();
    const rut = safe(s.rut).toLowerCase();
    const diplomado = safe(s.diplomado).toLowerCase();
    const estadoAcademicoStr = safe(s.estadoAcademico || 'En proceso').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchSearch = name.includes(term) || rut.includes(term) || diplomado.includes(term) || estadoAcademicoStr.includes(term);
    const matchDiplomado = filterDiplomado === 'Todos' || (safe(s.diplomado) === filterDiplomado);
    const matchPago = filterPago === 'Todos' || (safe(s.pago) === filterPago) || (filterPago === 'Al Día' && !s.pago);

    const matchEstadoAcademico = (() => {
      if (filterEstadoAcademico === 'Todos') return true;
      const valLower = (s.estadoAcademico || 'En proceso').toLowerCase();
      if (filterEstadoAcademico === 'Pendiente') {
        return valLower.includes('pendiente');
      }
      if (filterEstadoAcademico === 'En proceso') {
        return valLower.includes('en proceso') || valLower === '';
      }
      if (filterEstadoAcademico === 'Terminado') {
        return valLower.includes('terminado') || valLower.includes('terminada') || valLower.includes('termino');
      }
      return false;
    })();

    return matchSearch && matchDiplomado && matchPago && matchEstadoAcademico;
  });

  const allDiplomados = ['Todos', ...Array.from(new Set(records.map(r => r.diplomado).filter(Boolean)))];
  const allPagos = ['Todos', 'Pago Webpay', 'Pago Transferencia', 'Pendiente', 'Cuotas', 'Crédito', 'Al Día', 'Otros'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-x-auto">
        <div className="p-6 bg-[#152035] border-b flex justify-between items-center">
           <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Base General Alumnos</h3>
           <div className="flex flex-col md:flex-row items-center gap-4">
              <button 
                onClick={() => {
                  const data = filteredRecords.map(s => [
                    s.name,
                    s.rut || '---',
                    s.diplomado || 'Diplomado Homeopatía',
                    s.pago || 'Al Día',
                    `${s.avance || 0}%`,
                    s.estadoAcademico || 'En proceso'
                  ]);
                  exportTableToExcel(
                    'Reporte: Alumnos',
                    ['Estudiante', 'RUT', 'Curso / Diplomado', 'Estado Pago', 'Avance', 'Estado Académico'],
                    data,
                    'lista_alumnos'
                  );
                }}
                className="bg-[#152035] border p-2 rounded-2xl hover:bg-[#111A2E] transition-colors" 
                title="Exportar Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </button>
              <button 
                onClick={() => {
                  const data = filteredRecords.map(s => [
                    s.name,
                    s.diplomado || 'Diplomado Homeopatía',
                    s.pago || 'Al Día',
                    `${s.avance || 0}%`,
                    s.estadoAcademico || 'En proceso'
                  ]);
                  exportTableToPDF(
                    'Reporte: Base General de Alumnos',
                    ['Estudiante', 'Curso / Diplomado', 'Estado Pago', 'Avance', 'Estado Académico'],
                    data,
                    'lista_alumnos'
                  );
                }}
                className="bg-[#152035] border p-2 rounded-2xl hover:bg-[#111A2E] transition-colors" 
                title="Exportar PDF"
              >
                <Download className="w-4 h-4 text-[#38BDF8]" />
              </button>
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="bg-red-50 text-red-700 px-4 py-2 rounded-2xl border border-red-200 font-bold text-xs hover:bg-red-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
                </button>
              )}
              <select 
                className="px-4 py-2 rounded-2xl border border-[#1E293B] bg-[#152035] focus:outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-200"
                value={filterPago}
                onChange={e => setFilterPago(e.target.value)}
              >
                {allPagos.map((p: any) => <option key={p} value={p}>{p === 'Todos' ? 'Estado Cuenta: Todos' : p}</option>)}
              </select>
              <select 
                className="px-4 py-2 rounded-2xl border bg-[#152035] border-[#1E293B] focus:outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-200"
                value={filterDiplomado}
                onChange={e => setFilterDiplomado(e.target.value)}
              >
                {allDiplomados.map((d: any) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                className="px-4 py-2 rounded-2xl border bg-[#152035] border-[#1E293B] focus:outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-200"
                value={filterEstadoAcademico}
                onChange={e => setFilterEstadoAcademico(e.target.value)}
              >
                <option value="Todos">Académico: Todos</option>
                <option value="Pendiente">🟡 Pendiente</option>
                <option value="En proceso">🔵 En proceso</option>
                <option value="Terminado">💚 Terminado</option>
              </select>

              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  className="pl-10 pr-4 py-2 border rounded-full text-xs w-full md:w-64 bg-[#152035] outline-none focus:ring-2 focus:ring-blue-100" 
                  placeholder="Buscar por Nombre, RUT o Curso..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
           </div>
        </div>
        <div className="divide-y divide-[#1E293B] border-t border-[#1E293B]">
          {categoriesList.map(cat => {
            const catRecords = filteredRecords.filter(r => getStudentCategory(r.diplomado) === cat);
            const isExpanded = !!expandedCats[cat];
            const isAllSelectedInCat = catRecords.length > 0 && catRecords.every(r => selectedIds.includes(r.id));
            
            const toggleSelectAllInCat = () => {
              if (isAllSelectedInCat) {
                const catIds = catRecords.map(r => r.id);
                setSelectedIds(prev => prev.filter(id => !catIds.includes(id)));
              } else {
                const catIds = catRecords.map(r => r.id);
                setSelectedIds(prev => Array.from(new Set([...prev, ...catIds])));
              }
            };

            return (
              <div key={cat} className="bg-[#152035]/20">
                {/* Category Header (Desplegable) */}
                <button
                  type="button"
                  onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  className="w-full bg-[#152035] hover:bg-[#1C2C4E] p-4 flex justify-between items-center transition-all outline-none border-b border-[#1E293B]"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-bold text-xs text-slate-200 tracking-wider">
                      {cat === 'DIPLOMADO' ? '🎓 DIPLOMADOS' :
                       cat === 'MODULOS' ? '📚 MÓDULOS' :
                       cat === 'TALLERES' ? '🛠️ TALLERES' :
                       cat === 'CLASES INDIVIDUALES' ? '👤 CLASES INDIVIDUALES' :
                       cat === 'CASOS CLINICOS' ? '🏥 CASOS CLÍNICOS' :
                       '🌐 OTRAS MODALIDADES'}
                    </span>
                    <span className="bg-[#1E3A5F]/40 text-[#38BDF8] border border-[#1E293B] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {catRecords.length} {catRecords.length === 1 ? 'Alumno' : 'Alumnos'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#38BDF8] hover:underline font-bold">
                    {isExpanded ? 'Contraer' : 'Expandir'}
                  </span>
                </button>

                {/* Category Table */}
                {isExpanded && (
                  <div className="overflow-x-auto bg-[#111A2E]/40">
                    {catRecords.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 italic">
                        No hay alumnos registrados en esta modalidad.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                         <thead>
                            <tr className="bg-[#152035]/60 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#1E293B]">
                               <th className="p-4 w-10">
                                 <input 
                                   type="checkbox"
                                   className="rounded bg-[#152035] border-[#1E293B]"
                                   checked={isAllSelectedInCat}
                                   onChange={toggleSelectAllInCat}
                                 />
                               </th>
                               <th className="p-4">Estudiante</th>
                               <th className="p-4">Curso / Diplomado</th>
                               <th className="p-4">Estado Pago</th>
                               <th className="p-4">Fecha Pago</th>
                               <th className="p-4 text-center">Avance</th>
                               <th className="p-4 text-center">Estado Académico</th>
                               <th className="p-4 text-right">Acciones</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-[#1E293B]">
                            {catRecords.map(s => (
                              <tr key={s.id} className="hover:bg-[#1E293B]/40 transition-colors">
                                 <td className="p-4">
                                   <input 
                                     type="checkbox"
                                     className="rounded bg-[#152035] border-[#1E293B]"
                                     checked={selectedIds.includes(s.id)}
                                     onChange={() => toggleSelect(s.id)}
                                   />
                                 </td>
                                 <td className="p-4">
                                    <div className="font-bold text-white text-xs">{safe(s.name)}</div>
                                    <div className="text-[9px] text-slate-400 font-mono italic">{safe(s.clasificacion)}</div>
                                 </td>
                                 <td className="p-4 text-xs font-medium text-slate-300">{safe(s.diplomado) || 'Diplomado Homeopatía'}</td>
                                 <td className="p-4">
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                      safe(s.pago) === 'Al Día' ? "bg-green-950/40 text-green-400 border-green-900" : (safe(s.pago)?.includes('Pago') ? "bg-blue-950/40 text-blue-400 border-blue-900" : "bg-amber-950/40 text-amber-400 border-amber-900")
                                    )}>{safe(s.pago) || 'Al Día'}</span>
                                 </td>
                                 <td className="p-4 text-[9px] font-bold text-slate-400">
                                    📅 {s.fechaPago ? formatDate(s.fechaPago) : '---'}
                                 </td>
                                 <td className="p-4">
                                    <div className="flex flex-col items-center gap-1">
                                       <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                          <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ width: `${s.avance || 0}%` }} />
                                       </div>
                                       <span className="text-[9px] font-black text-emerald-400">{s.avance || 0}%</span>
                                    </div>
                                 </td>
                                 <td className="p-4 text-center">
                                    <EstadoAcademicoInput studentId={s.id} initialValue={s.estadoAcademico || ''} />
                                 </td>
                                 <td className="p-4 text-right">
                                     <div className="flex items-center justify-end gap-2.5">
                                       <button 
                                           onClick={() => {
                                             const studentData = [
                                               { label: 'Nombre', value: s.name },
                                               { label: 'RUT', value: s.rut },
                                               { label: 'Curso/Diplomado', value: s.diplomado || 'Diplomado Homeopatía' },
                                               { label: 'Estado Académico', value: s.estadoAcademico || 'En proceso' },
                                               { label: 'Estado Pago', value: s.pago || 'Al Día' },
                                               { label: 'Avance', value: (s.avance || 0).toString() + '%' },
                                               { label: 'Ficha Académica', value: s.observacionesAcademicas || '' }
                                             ];
                                             viewExpedienteInNewTab('Expediente Académico: Alumno', studentData, `expediente_${s.name.replace(/\s+/g, '_')}`);
                                           }}
                                           className="text-amber-500 hover:text-amber-400 transition-colors" 
                                           title="Expediente (Ver en nueva pestaña)"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
                                       <button 
                                           onClick={() => {
                                             const studentData = [
                                               { label: 'Nombre', value: s.name },
                                               { label: 'RUT', value: s.rut },
                                               { label: 'Curso/Diplomado', value: s.diplomado || 'Diplomado Homeopatía' },
                                               { label: 'Estado Académico', value: s.estadoAcademico || 'En proceso' },
                                               { label: 'Estado Pago', value: s.pago || 'Al Día' },
                                               { label: 'Avance', value: (s.avance || 0).toString() + '%' }
                                             ];
                                             exportExpedienteToPDF('Ficha: Alumno', studentData, `alumno_${s.name.replace(/\s+/g, '_')}`);
                                           }}
                                           className="text-[#38BDF8] hover:text-white transition-colors" 
                                           title="PDF"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => setSelectedStudent(s)}
                                          className="text-[#38BDF8] hover:underline font-bold text-[8px] uppercase tracking-widest flex items-center gap-1 bg-[#152035] px-2 py-0.5 rounded border border-[#1E293B]"
                                        >
                                           <FileText className="w-2.5 h-2.5" /> Expediente
                                        </button>
                                        <RecordActions module="school" onDelete={async () => { await localDB.deleteFromCollection('students', s.id); window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } })); }} />
                                     </div>
                                  </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
         <StatsBox label="Alumnos Activos" value={records.length.toString()} icon={GraduationCap} color="green" />
      </div>
    </div>
  );
}

function TrackingView() {
  const [filter, setFilter] = useState<'all' | 'leads' | 'students'>('all');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [leads, setLeads] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const loadTrackingData = async () => {
      const l = await localDB.getCollection('school_leads');
      const s = await localDB.getCollection('students');
      setLeads(l);
      setStudents(s);
    };
    loadTrackingData();
  }, []);

  const combined = [
    ...(Array.isArray(leads) ? leads : []).map(l => ({ ...l, type: 'Lead' })),
    ...(Array.isArray(students) ? students : []).map(s => ({ ...s, type: 'Alumno' }))
  ].filter(item => {
    const name = safe(item.name).toLowerCase();
    const rut = safe(item.rut).toLowerCase();
    const term = search.toLowerCase();
    const matchesFilter = filter === 'all' || (filter === 'leads' && item.type === 'Lead') || (filter === 'students' && item.type === 'Alumno');
    const matchesSearch = name.includes(term) || rut.includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#152035] p-6 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex gap-2 p-1 bg-[#111A2E] rounded-2xl">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'all' ? "bg-[#152035] text-blue-900 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "text-slate-400")}
            >Detalle de clientes</button>
            <button 
              onClick={() => setFilter('leads')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'leads' ? "bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "text-slate-400")}
            >Leads</button>
            <button 
              onClick={() => setFilter('students')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'students' ? "bg-green-600 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "text-slate-400")}
            >Alumnos</button>
         </div>
         <div className="flex items-center gap-4 w-full md:w-auto">
           <button 
             onClick={() => {
               const tableData = combined.map(item => [
                 item.name,
                 item.rut || '---',
                 item.type,
                 item.clasificacion || 'Sin clasif.',
                 item.interes || item.diplomado || '---',
                 item.email || '---',
                 item.phone || '---'
               ]);
               exportTableToExcel(
                 `Reporte 360`,
                 ['Nombre', 'RUT', 'Tipo', 'Clasificación', 'Programa', 'Email', 'Teléfono'],
                 tableData,
                 `reporte_360`
               );
             }}
             className="bg-[#152035] border p-2 rounded-2xl hover:bg-[#111A2E] transition-colors"
             title="Exportar Reporte 360 a Excel"
           >
             <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
           </button>
           <button 
             onClick={() => {
               const tableData = combined.map(item => [
                 item.name,
                 item.rut || '---',
                 item.type,
                 item.clasificacion || 'Sin clasif.',
                 item.interes || item.diplomado || '---',
                 item.email || '---',
                 item.phone || '---'
               ]);
               exportTableToPDF(
                 `Reporte 360: ${filter.toUpperCase()}`,
                 ['Nombre', 'RUT', 'Tipo', 'Clasificación', 'Programa', 'Email', 'Teléfono'],
                 tableData,
                 `reporte_360_${filter}`
               );
             }}
             className="bg-[#152035] border p-2 rounded-2xl hover:bg-[#111A2E] transition-colors"
             title="Exportar Reporte 360 a PDF"
           >
             <Download className="w-4 h-4 text-[#38BDF8]" />
           </button>
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                className="pl-10 pr-4 py-2 border rounded-full text-xs w-full bg-[#152035] outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="Buscar en el Ecosistema..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
         </div>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] overflow-hidden min-h-[400px]">
        <table className="w-full text-xs">
           <thead>
              <tr className="bg-[#152035] border-b text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                 <th className="p-5">Entidad / Nombre</th>
                 <th className="p-5">Tipo / Estado</th>
                 <th className="p-5">Clasificación / Programa</th>
                 <th className="p-5 text-right">Contacto</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-200">
              {combined.map((item: any) => (
                <tr key={item.id} className="hover:bg-[#152035] transition-colors">
                   <td className="p-5 font-bold text-blue-900">{safe(item.name)} <span className="block text-[9px] text-slate-400 font-mono mt-1">{safe(item.rut)}</span></td>
                   <td className="p-5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                        item.type === 'Lead' ? "bg-[#111A2E] text-[#38BDF8]" : "bg-green-100 text-green-700"
                      )}>{item.type}</span>
                   </td>
                   <td className="p-5">
                      <p className="font-bold text-slate-300">{item.clasificacion || 'Sin clasif.'}</p>
                      <p className="text-[10px] text-slate-400">{item.interes || item.diplomado}</p>
                   </td>
                   <td className="p-5 text-right space-y-1">
                      <p className="flex items-center justify-end gap-2 text-slate-400 font-medium">{item.email} <Mail className="w-3 h-3" /></p>
                      <p className="flex items-center justify-end gap-2 text-slate-400 font-medium">{item.phone} <Smartphone className="w-3 h-3" /></p>
                      <button 
                        onClick={() => setSelectedClient(item)}
                        className="flex items-center justify-end gap-1 text-[10px] font-black text-amber-700 hover:text-amber-900 uppercase"
                      >
                        <FileText className="w-3 h-3" /> Ver Expediente
                      </button>
                   </td>
                </tr>
              ))}
              {combined.length === 0 && (
                <tr>
                   <td colSpan={4} className="p-20 text-center text-slate-400 italic">No se encontraron registros en el ecosistema 360°.</td>
                </tr>
              )}
           </tbody>
        </table>
      </div>
      {selectedClient && (
        <Expediente
          selectedClient={{
            ...selectedClient,
            name: selectedClient.name,
            rut: selectedClient.rut,
            region: selectedClient.clasificacion,
            type: selectedClient.type,
            fechaIngreso: selectedClient.fecha || selectedClient.fechaPago || new Date().toISOString(),
            historialUnificado: selectedClient.observaciones || selectedClient.observacionesAcademicas || '[SISTEMA] Sin registros.'
          }}
          showIntranet={false}
          showComuna={false}
          onClose={() => setSelectedClient(null)}
          onUpdate={async(data) => {
             // Logic to update the correct entity (lead or student)
             const collection = selectedClient.type === 'Lead' ? 'school_leads' : 'students';
             const field = selectedClient.type === 'Lead' ? 'observaciones' : 'observacionesAcademicas';
             
             if (data.isProfileUpdate) {
                // The user updated base specs via Expediente edits
                const { updatedProfile } = data;
                const currentDate = new Date().toLocaleString();
                const userStamp = 'Admin'; // simpler fallback
                const baseUpdateEntry = `\n[${currentDate}] - ${userStamp}\n▶ Actualización de datos base: ` + Object.keys(updatedProfile).map(k => `${k}: ${updatedProfile[k]}`).join(', ');
                const currentObs = selectedClient[field] || '';
                const newMerged = data.newHistory ? currentObs + `\n[${currentDate}] - ${userStamp}\n${data.newHistory}` : currentObs;

                await localDB.updateInCollection(collection, selectedClient.id, {
                  rut: updatedProfile.rut,
                  clasificacion: updatedProfile.region,
                  fecha: updatedProfile.fechaIngreso,
                  type: updatedProfile.type,
                  montoTotalPagado: updatedProfile.montoTotalPagado,
                  montoTotalRecibido: updatedProfile.montoTotalRecibido,
                  pago: updatedProfile.pago || selectedClient.pago,
                  fechaPago: updatedProfile.fechaPago || selectedClient.fechaPago,
                  observacionesPago: typeof updatedProfile.observacionesPago !== 'undefined' ? updatedProfile.observacionesPago : selectedClient.observacionesPago,
                  avance: typeof updatedProfile.avance !== 'undefined' ? (parseInt(updatedProfile.avance) || 0) : (selectedClient.avance || 0),
                  unidadesAcademicas: updatedProfile.unidadesAcademicas || selectedClient.unidadesAcademicas || '',
                  historialPagos: updatedProfile.historialPagos || selectedClient.historialPagos || '',
                  [field]: newMerged
               });
               setSelectedClient({ 
                  ...selectedClient, 
                  ...updatedProfile, 
                  avance: typeof updatedProfile.avance !== 'undefined' ? (parseInt(updatedProfile.avance) || 0) : (selectedClient.avance || 0),
                  unidadesAcademicas: updatedProfile.unidadesAcademicas || selectedClient.unidadesAcademicas || '',
                  historialPagos: updatedProfile.historialPagos || selectedClient.historialPagos || '',
                  fechaPago: updatedProfile.fechaPago || selectedClient.fechaPago,
                  observacionesPago: typeof updatedProfile.observacionesPago !== 'undefined' ? updatedProfile.observacionesPago : selectedClient.observacionesPago,
                  pago: updatedProfile.pago || selectedClient.pago,
                  [field]: newMerged 
               });
                alert('Datos base actualizados');
             } else {
                const currentDate = new Date().toLocaleString();
                const newEntry = `\n[${currentDate}] Actividad: ${data.activityType}. Obs: ${data.newHistory}`;
                const currentObs = selectedClient[field] || '';
                const updatedObs = currentObs + newEntry;

                await localDB.updateInCollection(collection, selectedClient.id, { [field]: updatedObs });
                setSelectedClient({ ...selectedClient, [field]: updatedObs });
                alert('Expediente actualizado');
             }
          }}
          onTransfer={async() => {}}
          extraTransferFields={null}
          newHistory={''}
          setNewHistory={() => {}}
          newCategory={selectedClient.clasificacion}
          setNewCategory={() => {}}
          activityType={''}
          setActivityType={() => {}}
          currentStatus={''}
          setCurrentStatus={() => {}}
          categories={['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro']}
        />
      )}
    </div>
  );
}

function SchoolActivities() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const [activities, setActivities] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<any | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    actividad: '',
    tipo: 'Actividad Académica',
    audienciaObjetivo: 'Ambos',
    categoriaObjetivo: 'Todos',
    observaciones: '',
    responsable: ''
  });

  const loadActivities = async () => {
    const data = await localDB.getCollection('school_activities');
    setActivities(data);
  };
  
  const autoRegisterInExpedientes = async (activity: string, tipo: string, categoria: string, observaciones: string, audienciaObjetivo: string) => {
    const allStudents = await localDB.getCollection('students');
    const allLeads = await localDB.getCollection('school_leads');
    
    let matchingRecords: any[] = [];
    if (audienciaObjetivo === 'Ambos' || audienciaObjetivo === 'Alumnos') {
        matchingRecords.push(...allStudents.filter(r => categoria === 'Todos' || r.clasificacion === categoria));
    }
    if (audienciaObjetivo === 'Ambos' || audienciaObjetivo === 'Leads') {
        matchingRecords.push(...allLeads.filter(r => categoria === 'Todos' || r.clasificacion === categoria).map(l => ({...l, isLead: true})));
    }
    
    for (const record of matchingRecords) {
        let audText = "Enviada a: " + (audienciaObjetivo === 'Ambos' ? 'Leads y Alumnos' : audienciaObjetivo);
        const newEntry = `\n[${new Date().toLocaleString('es-CL')}] Actividad: ${activity} (${tipo}). ${audText}. Obs: ${observaciones}`;
        if (record.isLead) {
            await localDB.updateInCollection('school_leads', record.id, { observaciones: (record.observaciones || '') + newEntry });
        } else {
            await localDB.updateInCollection('students', record.id, { observacionesAcademicas: (record.observacionesAcademicas || '') + newEntry });
        }
    }
  };

  useEffect(() => {
    loadActivities();
    if (user && !editingId) setForm(prev => ({ ...prev, responsable: user.displayName || user.email || '' }));
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingId) {
      await localDB.updateInCollection('school_activities', editingId, form);
      await addAuditLog(user, `Actualizó Actividad Escuela: ${form.actividad}`, 'SCHOOL');
      alert('Actividad Académica Actualizada');
      setEditingId(null);
    } else {
      await localDB.saveToCollection('school_activities', form);
      await autoRegisterInExpedientes(form.actividad, form.tipo, form.categoriaObjetivo, form.observaciones, form.audienciaObjetivo || 'Ambos');
      await addAuditLog(user, `Registró Actividad Escuela: ${form.actividad}`, 'SCHOOL');
      alert('Actividad Académica Registrada y Expedientes Actualizados');
    }

    setForm({ 
      fecha: new Date().toISOString().split('T')[0],
      actividad: '', 
      tipo: 'Actividad Académica',
      categoriaObjetivo: 'Todos',
      audienciaObjetivo: 'Ambos',
      observaciones: '',
      responsable: user.displayName || user.email || ''
    });
    loadActivities();
  };

  const handleEdit = (act: any) => {
    setEditingId(act.id);
    setForm({
      fecha: act.fecha,
      actividad: act.actividad,
      tipo: act.tipo,
      categoriaObjetivo: act.categoriaObjetivo || 'Todos',
      audienciaObjetivo: act.audienciaObjetivo || 'Ambos',
      observaciones: act.observaciones,
      responsable: act.responsable
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {detailView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#152035] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" /> Detalle Actividad Académica
              </h3>
              <button onClick={() => setDetailView(null)} className="text-white/70 hover:text-white transition-colors">
                <Trash2 className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8 border-b pb-6">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Actividad / Campaña</span>
                  <span className="text-lg font-bold text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">{detailView.actividad}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha</span>
                  <span className="text-lg font-bold text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">{formatDate(detailView.fecha)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo</span>
                  <span className="bg-[#152035] text-[#38BDF8] px-3 py-1 rounded-full font-bold text-xs">{detailView.tipo}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Responsable</span>
                  <span className="text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] font-medium">{detailView.responsable}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Observaciones</span>
                <div className="bg-[#152035] p-6 rounded-2xl text-slate-200 italic leading-relaxed border border-[#1E293B] whitespace-pre-wrap">
                  {detailView.observaciones || "Sin observaciones registradas."}
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => setDetailView(null)}
                  className="bg-[#111A2E] text-slate-300 px-8 py-3 rounded-2xl font-bold hover:bg-[#1E293B] transition-colors"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
           <span className="flex items-center gap-2">
             <History className="w-5 h-5" /> 
             {editingId ? 'Editando Actividad Académica' : 'Registro de Actividades Académicas / Campañas'}
           </span>
             {editingId && (
               <button 
                 onClick={() => {
                   setEditingId(null);
                   setForm({
                     fecha: new Date().toISOString().split('T')[0],
                     actividad: '',
                     tipo: 'Actividad Académica',
                     observaciones: '',
                     responsable: user?.displayName || user?.email || ''
                   });
                 }}
                 className="text-[10px] bg-[#152035]/20 hover:bg-[#1E293B]/50 px-3 py-1.5 rounded uppercase font-black transition-colors"
               >
                 Cancelar Edición
               </button>
             )}
          </div>
          <form className="p-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormGroup label="Fecha">
                <input type="date" className="w-full border-b p-2" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} required />
              </FormGroup>
              <FormGroup label="Nombre de Actividad / Campaña">
                <input 
                  className="w-full border-b p-2 font-bold" 
                  placeholder="Ej: AGENDA DE INDUCCIÓN" 
                  value={form.actividad || ''} 
                  onChange={e => setForm({...form, actividad: e.target.value})} 
                  required 
                />
              </FormGroup>
              <FormGroup label="Tipo">
                <select className="w-full border-b p-2" value={form.tipo || ''} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Actividad Académica</option>
                  <option>Campaña de Venta</option>
                  <option>Taller de Inducción</option>
                  <option>Webinar Educativo</option>
                  <option>Otros</option>
                </select>
              </FormGroup>
              <FormGroup label="Categoría Objetivo">
                <select className="w-full border-b p-2" value={form.categoriaObjetivo || ''} onChange={e => setForm({...form, categoriaObjetivo: e.target.value})}>
                  <option>Todos</option>
                  {['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Audiencia Objetivo">
                <select className="w-full border-b p-2" value={form.audienciaObjetivo || 'Ambos'} onChange={e => setForm({...form, audienciaObjetivo: e.target.value})}>
                  <option value="Ambos">Ambos (Leads y Alumnos)</option>
                  <option value="Leads">Solo Leads</option>
                  <option value="Alumnos">Solo Alumnos</option>
                </select>
              </FormGroup>
            </div>
            <FormGroup label="Observaciones">
              <textarea 
                className="w-full h-24 p-4 border rounded-2xl bg-[#152035] focus:bg-[#152035] outline-none"
                placeholder="Detalle de la actividad..."
                value={form.observaciones || ''}
                onChange={e => setForm({...form, observaciones: e.target.value})}
              />
            </FormGroup>
            <div className="flex justify-end">
              <button type="submit" className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  px-8 py-3 rounded-2xl font-bold shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'ACTUALIZAR CAMBIOS' : 'GUARDAR ACTIVIDAD'}
              </button>
            </div>
          </form>
        </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 bg-[#152035] border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-white">Historial Académico</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const data = activities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => [
                  formatDate(act.fecha),
                  act.actividad,
                  act.tipo,
                  act.responsable
                ]);
                exportTableToPDF('Historial Académico Escuela', ['Fecha', 'Actividad', 'Tipo', 'Responsable'], data, 'historial_escuela', 'l');
              }}
              className="p-2 hover:bg-[#1E293B] rounded transition-colors text-[#38BDF8]"
              title="Exportar PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                const data = activities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => [
                  formatDate(act.fecha),
                  act.actividad,
                  act.tipo,
                  act.responsable
                ]);
                exportTableToExcel('Historial Académico Escuela', ['Fecha', 'Actividad', 'Tipo', 'Responsable'], data, 'historial_escuela');
              }}
              className="p-2 hover:bg-[#1E293B] rounded transition-colors text-emerald-600"
              title="Exportar Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#152035]/50 text-left border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Fecha</th>
                <th className="p-4">Actividad</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => (
                <tr key={act.id} className="hover:bg-[#1E293B]/50 transition-colors">
                  <td className="p-4">{formatDate(act.fecha)}</td>
                  <td className="p-4 font-bold text-white">{act.actividad}</td>
                  <td className="p-4"><span className="bg-[#152035] text-[#38BDF8] px-2 py-0.5 rounded text-[10px] font-bold">{act.tipo}</span></td>
                  <td className="p-4 text-slate-400">{act.responsable}</td>
                  <td className="p-4 text-right">
                    <RecordActions 
                      module="school"
                      onView={() => setDetailView(act)}
                      onEdit={() => handleEdit(act)}
                      onDelete={async () => {
                        await localDB.deleteFromCollection('school_activities', act.id);
                        loadActivities();
                      }}
                    />
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">No hay actividades registradas en Escuela.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailStep({ num, title, desc }: any) {
  return (
    <div className="p-6 bg-[#152035] rounded-2xl border border-[#1E293B] flex flex-col items-center">
       <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  flex items-center justify-center text-xs font-black mb-4">{num}</span>
       <h5 className="font-bold text-white text-sm mb-1">{title}</h5>
       <p className="text-xs text-slate-400">{desc}</p>
    </div>
  );
}

function StatsBox({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-[#152035] text-[#38BDF8] border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    green: "bg-green-50 text-green-600 border-green-100"
  };

  return (
    <div className={cn("p-6 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center gap-6", colors[color] || colors.blue)}>
       <div className="w-14 h-14 rounded-2xl bg-[#152035] shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <Icon className="w-7 h-7" />
       </div>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
          <p className="text-2xl font-black">{value}</p>
       </div>
    </div>
  );
}

function FormGroup({ label, children }: any) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
