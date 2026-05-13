import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, safe, parseExcelDate } from '../lib/utils';
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
  FileText
} from 'lucide-react';

import { RecordActions } from '../components/RecordActions';
import { Expediente } from '../components/Expediente';

import { addNotification } from '../lib/notifications';

export default function SchoolView() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const [activeView, setActiveView] = useState<'register' | 'students' | 'tracking' | 'activities'>('register');
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const colName = activeView === 'students' ? 'students' : 'school_leads';
      const result = await localDB.getCollection(colName);
      setData(result);
    };
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, [activeView]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#001736] tracking-tight">Centro Académico CIMASUR</h2>
          <p className="text-slate-500 text-sm">Ecosistema integrado de captación, formación y seguimiento.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
           <TabButton active={activeView === 'register'} onClick={() => setActiveView('register')} icon={UserPlus}>Captación</TabButton>
           <TabButton active={activeView === 'students'} onClick={() => setActiveView('students')} icon={GraduationCap}>Alumnos</TabButton>
           <TabButton active={activeView === 'tracking'} onClick={() => setActiveView('tracking')} icon={LineChart}>Vista 360°</TabButton>
           <TabButton active={activeView === 'activities'} onClick={() => setActiveView('activities')} icon={History}>Actividades</TabButton>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeView === 'register' && <ContactRegister records={data} />}
        {activeView === 'students' && <StudentManager records={data} />}
        {activeView === 'tracking' && <TrackingView />}
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
        "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-white text-[#002b5b] shadow-sm" : "text-slate-400 hover:text-slate-600"
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
    clasificacion: 'Sin información',
    interes: 'Diplomado Homeopatía',
    canal: 'Instagram',
    estado: 'Nuevo',
    observaciones: '',
    montoTotalPagado: 0,
    montoTotalRecibido: 0,
    nroFactura: '',
    fechaFactura: '',
    observacionesPago: ''
  });

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [newHistory, setNewHistory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
       await localDB.updateInCollection('school_leads', editingId, form);
       if (user) await addAuditLog(user, `Actualizó lead académico: ${form.name}`, 'SCHOOL');
       alert('Lead Académico Actualizado');
       setEditingId(null);
    } else {
       await localDB.saveToCollection('school_leads', form);
       await addNotification({
         title: 'Nuevo Lead Académico',
         message: `${user?.displayName || user?.email} registró a ${form.name}`,
         recipientRoles: ['admin'],
         sender: user?.displayName || user?.email || 'Sistema'
       });
       if (user) await addAuditLog(user, `Registró lead académico: ${form.name}`, 'SCHOOL');
       alert('Lead Académico Registrado');
    }
    setForm({ 
      ...form, 
      name: '', 
      rut: '', 
      email: '', 
      phone: '', 
      observaciones: '',
      montoTotalPagado: 0,
      montoTotalRecibido: 0,
      nroFactura: '',
      fechaFactura: '',
      observacionesPago: ''
    });
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
            responsable: user.displayName || user.email || 'Sistema'
          };

          if (newLead.name && newLead.rut) {
            await localDB.saveToCollection('school_leads', newLead);
            importedCount++;
          }
        }

        await addAuditLog(user, `Importó ${importedCount} leads académicos desde Excel`, 'SCHOOL');
        alert(`Éxito: Se importaron ${importedCount} leads académicos correctamente.`);
        window.dispatchEvent(new Event('db-change'));
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
        clasificacion: lead.clasificacion,
        diplomado: lead.interes,
        pago: transferPaymentForm.montoTotalRecibido > 0 ? 'Pagado' : 'Pendiente',
        avance: 0,
        observacionesAcademicas: 'Inscrito desde Captación',
        montoTotalPagado: transferPaymentForm.montoTotalPagado,
        montoTotalRecibido: transferPaymentForm.montoTotalRecibido,
        nroFactura: transferPaymentForm.nroFactura,
        fechaFactura: transferPaymentForm.fechaFactura
      };
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
        montoTotalPagado: transferPaymentForm.montoTotalPagado,
        montoTotalRecibido: transferPaymentForm.montoTotalRecibido,
        nroFactura: transferPaymentForm.nroFactura,
        fechaFactura: transferPaymentForm.fechaFactura,
        observaciones: transferPaymentForm.observaciones || `Matrícula desde Captación: ${lead.interes}`
      };
      await localDB.saveToCollection('school_payments', schoolPayment);
      
      await addNotification({
        title: 'Nuevo Alumno Matriculado',
        message: `${user?.displayName || user?.email} matriculó a ${lead.name}. Se ha creado el registro en Administración.`,
        recipientRoles: ['admin'],
        sender: user?.displayName || user?.email || 'Sistema'
      });
      await localDB.deleteFromCollection('school_leads', lead.id);
      setSelectedLead(null);
      window.dispatchEvent(new Event('db-change'));
      alert(`${lead.name} ahora es ALUMNO VIGENTE`);
    } catch(err) {
      alert('Error en la transferencia de alumno');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="bg-[#002b5b] p-4 text-white font-bold flex items-center justify-between">
               <span className="flex items-center gap-2">Registro de Potenciales Alumnos</span>
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
            <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
               <FormGroup label="Fecha Registro"><input type="date" className="w-full border-b p-2" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormGroup>
               <FormGroup label="Nombre Apellido"><input className="w-full border-b p-2 font-bold" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required /></FormGroup>
               <FormGroup label="RUT Escrito"><input className="w-full border-b p-2" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} required /></FormGroup>
               <FormGroup label="Email"><input type="email" className="w-full border-b p-2" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></FormGroup>
               <FormGroup label="Teléfono / WhatsApp"><input className="w-full border-b p-2" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></FormGroup>
               
               <FormGroup label="CLASIFICACIÓN PROFESIONAL">
                  <select className="w-full border-b p-2 text-sm font-bold text-blue-700" value={form.clasificacion || ''} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                    {CLASIFICACIONES.map(c => <option key={c}>{c}</option>)}
                  </select>
               </FormGroup>

               <FormGroup label="Programa de Interés">
                  <select className="w-full border-b p-2 text-sm" value={form.interes || ''} onChange={e => setForm({...form, interes: e.target.value})}>
                    {PROGRAMAS.map(p => <option key={p}>{p}</option>)}
                  </select>
               </FormGroup>

               <div className="col-span-full">
                  <FormGroup label="Observaciones de seguimiento">
                    <textarea className="w-full border rounded-xl p-4 h-24 bg-slate-50 outline-none focus:bg-white" value={form.observaciones || ''} onChange={e => setForm({...form, observaciones: e.target.value})} />
                  </FormGroup>
               </div>
               
               <div className="col-span-full border-t border-slate-200 mt-4 pt-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Datos de Matrícula / Pago</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <FormGroup label="Total de Venta (Opcional)"><input type="number" className="w-full border-b p-2" value={form.montoTotalPagado ?? 0} onChange={e => setForm({...form, montoTotalPagado: Number(e.target.value)})} /></FormGroup>
                     <FormGroup label="Monto Recibido"><input type="number" className="w-full border-b p-2 font-black text-emerald-600 bg-emerald-50 rounded" value={form.montoTotalRecibido ?? 0} onChange={e => setForm({...form, montoTotalRecibido: Number(e.target.value)})} /></FormGroup>
                     <FormGroup label="N° Factura"><input className="w-full border-b p-2" value={form.nroFactura || ''} onChange={e => setForm({...form, nroFactura: e.target.value})} /></FormGroup>
                     <FormGroup label="Fecha Factura"><input type="date" className="w-full border-b p-2" value={form.fechaFactura || ''} onChange={e => setForm({...form, fechaFactura: e.target.value})} /></FormGroup>
                     <div className="col-span-1 md:col-span-4">
                        <FormGroup label="Observación Pago"><input className="w-full border-b p-2 italic" value={form.observacionesPago || ''} onChange={e => setForm({...form, observacionesPago: e.target.value})} placeholder="Ej: Pago total del diplomado..." /></FormGroup>
                     </div>
                  </div>
               </div>
               
               <div className="col-span-full flex gap-3">
                 <button type="submit" className="flex-1 bg-[#001736] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" /> {editingId ? 'ACTUALIZAR LEAD ACADÉMICO' : 'GUARDAR LEAD ACADÉMICO'}
                 </button>
                 {editingId && (
                   <button type="button" onClick={() => {
                     setEditingId(null);
                     setForm({ ...form, name: '', rut: '', email: '', phone: '', observaciones: '', montoTotalPagado: 0, montoTotalRecibido: 0, nroFactura: '', fechaFactura: '', observacionesPago: '' });
                   }} className="px-6 bg-slate-200 text-slate-700 py-4 rounded-xl font-bold shadow-xl flex items-center justify-center">
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
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mt-4 space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Datos de Matrícula (Opcional)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Monto Total de Venta</label>
                    <input type="number" className="w-full border-b bg-white border-slate-300 p-2 text-sm outline-none" value={transferPaymentForm.montoTotalPagado ?? 0} onChange={e => setTransferPaymentForm({...transferPaymentForm, montoTotalPagado: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Monto Recibido</label>
                    <input type="number" className="w-full border-b bg-emerald-50 border-emerald-300 p-2 text-sm font-bold text-emerald-700 outline-none" value={transferPaymentForm.montoTotalRecibido ?? 0} onChange={e => setTransferPaymentForm({...transferPaymentForm, montoTotalRecibido: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">N° Factura</label>
                    <input className="w-full border-b bg-white border-slate-300 p-2 text-sm outline-none" value={transferPaymentForm.nroFactura || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, nroFactura: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Fecha Factura</label>
                    <input type="date" className="w-full border-b bg-white border-slate-300 p-2 text-sm outline-none" value={transferPaymentForm.fechaFactura || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, fechaFactura: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Observación Pago</label>
                    <input className="w-full border-b bg-white border-slate-300 p-2 text-sm outline-none italic" value={transferPaymentForm.observaciones || ''} onChange={e => setTransferPaymentForm({...transferPaymentForm, observaciones: e.target.value})} placeholder={`Matrícula: ${selectedLead.interes}`} />
                  </div>
                </div>
              </div>
            )}
            newHistory={newHistory}
            setNewHistory={setNewHistory}
            newCategory={newCategory || selectedLead.clasificacion}
            setNewCategory={setNewCategory}
            newIntranet={'No'}
            setNewIntranet={() => {}}
            activityType={activityType}
            setActivityType={setActivityType}
            currentStatus={currentStatus || selectedLead.estado}
            setCurrentStatus={setCurrentStatus}
            categories={['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro']}
          />
        )}
      </div>

      <div className="space-y-6">
         <div className="bg-[#002b5b] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <TrendingUp className="absolute top-[-10px] right-[-10px] w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" />
            <h4 className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Potenciales Alumnos Registrados</h4>
            <p className="text-4xl font-black">{records.length}</p>
         </div>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                <h4 className="font-black text-[#001736] text-[10px] uppercase mb-4 tracking-widest border-b pb-2 flex justify-between items-center">
                <span>Gestionar Captaciones</span>
                <button
                  onClick={() => {
                    const data = records.map(r => [r.name, r.rut, r.interes, r.estado]);
                    exportTableToPDF('Reporte: Captaciones Académicas', ['Nombre', 'RUT', 'Interés', 'Estado'], data, 'captaciones_academicas');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-3 h-3" />
                </button>
            </h4>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {records.map(r => (
                 <div key={r.id} className="border-b border-slate-50 pb-4 group">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="font-bold text-sm text-slate-700">{r.name}</p>
                          <p className="text-[9px] font-black uppercase text-blue-500 italic mt-0.5">{r.clasificacion || 'Sin clasificación'}</p>
                       </div>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedLead(r);
                            setTransferPaymentForm({
                              montoTotalPagado: r.montoTotalPagado || 0,
                              montoTotalRecibido: r.montoTotalRecibido || 0,
                              nroFactura: r.nroFactura || '',
                              fechaFactura: r.fechaFactura || '',
                              observaciones: r.observacionesPago || '',
                              fechaPago: new Date().toISOString().split('T')[0]
                            });
                          }}
                          className="bg-slate-100 p-1.5 rounded hover:bg-amber-100 hover:text-amber-700 transition-colors"
                          title="Mover a Estudiante"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <RecordActions 
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
                    <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 p-2 rounded italic">
                       {r.interes} - {r.canal}
                    </div>
                 </div>
               ))}
               {records.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-8">No hay captaciones activas.</p>}
            </div>
         </div>
      </div>
    </div>
  );
}

function StudentManager({ records }: { records: any[] }) {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [academicNote, setAcademicNote] = useState('');
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('En proceso');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiplomado, setFilterDiplomado] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      window.dispatchEvent(new Event('db-change'));
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

  const handleSaveAndAddNote = async () => {
    if (!selectedStudent) return;

    // 1. Prepare updated notes (if academicNote exists)
    let newNotes = selectedStudent.observacionesAcademicas || '';
    if (academicNote) {
        newNotes = newNotes + `\n[${new Date().toLocaleString('es-CL')}] ${academicNote}`;
    }
    
    // 2. Prepare the update object covering ALL fields
    const updates = {
        pago: selectedStudent.pago,
        valor: selectedStudent.valor,
        avance: parseInt(selectedStudent.avance) || 0,
        clasificacion: selectedStudent.clasificacion,
        diplomado: selectedStudent.diplomado,
        observacionesAcademicas: newNotes
    };

    // 3. Update DB
    await localDB.updateInCollection('students', selectedStudent.id, updates);
    
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
        showComuna={false}
        onClose={() => setSelectedStudent(null)}
        onUpdate={handleSaveAndAddNote}
        newHistory={academicNote}
        setNewHistory={setAcademicNote}
        newCategory={selectedStudent.clasificacion}
        setNewCategory={(val) => handleFieldLocalChange('clasificacion', val)}
        newIntranet={selectedStudent.intranet || 'No'}
        setNewIntranet={(val) => handleFieldLocalChange('intranet', val)}
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
    const term = searchTerm.toLowerCase();
    const matchSearch = name.includes(term) || rut.includes(term);
    const matchDiplomado = filterDiplomado === 'Todos' || (safe(s.diplomado) === filterDiplomado);
    return matchSearch && matchDiplomado;
  });

  const allDiplomados = ['Todos', ...Array.from(new Set(records.map(r => r.diplomado).filter(Boolean)))];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
           <h3 className="text-xl font-black text-[#001736] uppercase tracking-tighter italic">Base General Alumnos</h3>
           <div className="flex flex-col md:flex-row items-center gap-4">
              <button 
                onClick={() => {
                  const data = filteredRecords.map(s => [
                    s.name,
                    s.rut || '---',
                    s.diplomado || 'Diplomado Homeopatía',
                    s.pago || 'Al Día',
                    `${s.avance || 0}%`
                  ]);
                  exportTableToExcel(
                    'Reporte: Alumnos',
                    ['Estudiante', 'RUT', 'Curso / Diplomado', 'Estado Pago', 'Avance'],
                    data,
                    'lista_alumnos'
                  );
                }}
                className="bg-white border p-2 rounded-lg hover:bg-slate-100 transition-colors" 
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
                    `${s.avance || 0}%`
                  ]);
                  exportTableToPDF(
                    'Reporte: Base General de Alumnos',
                    ['Estudiante', 'Curso / Diplomado', 'Estado Pago', 'Avance'],
                    data,
                    'lista_alumnos'
                  );
                }}
                className="bg-white border p-2 rounded-lg hover:bg-slate-100 transition-colors" 
                title="Exportar PDF"
              >
                <Download className="w-4 h-4 text-blue-600" />
              </button>
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold text-xs hover:bg-red-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
                </button>
              )}
              <select 
                className="px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-700"
                value={filterDiplomado}
                onChange={e => setFilterDiplomado(e.target.value)}
              >
                {allDiplomados.map((d: any) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  className="pl-10 pr-4 py-2 border rounded-full text-xs w-full md:w-64 bg-white outline-none focus:ring-2 focus:ring-blue-100" 
                  placeholder="Buscar por Nombre o RUT..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
           </div>
        </div>
        <table className="w-full text-sm">
           <thead>
              <tr className="bg-slate-50/50 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                 <th className="p-5 w-10">
                   <input 
                     type="checkbox"
                     className="rounded"
                     checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                     onChange={() => toggleSelectAll(filteredRecords)}
                   />
                 </th>
                 <th className="p-5">Estudiante</th>
                 <th className="p-5">Curso / Diplomado</th>
                 <th className="p-5">Estado Pago</th>
                 <th className="p-5 text-center">Avance</th>
                 <th className="p-5 text-right">Acciones</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                   <td className="p-5">
                     <input 
                       type="checkbox"
                       className="rounded"
                       checked={selectedIds.includes(s.id)}
                       onChange={() => toggleSelect(s.id)}
                     />
                   </td>
                   <td className="p-5">
                      <div className="font-bold text-[#001736]">{safe(s.name)}</div>
                      <div className="text-[10px] text-slate-400 font-mono italic">{safe(s.clasificacion)}</div>
                   </td>
                   <td className="p-5 font-medium">{safe(s.diplomado) || 'Diplomado Homeopatía'}</td>
                   <td className="p-5">
                      <span className={cn(
                        "px-3 py-1 rounded text-[9px] font-black uppercase border",
                        safe(s.pago) === 'Al Día' ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      )}>{safe(s.pago) || 'Al Día'}</span>
                   </td>
                   <td className="p-5">
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.avance || 0}%` }} />
                         </div>
                         <span className="text-[9px] font-bold text-slate-500">{s.avance || 0}%</span>
                      </div>
                   </td>
                   <td className="p-5 text-right">
                       <div className="flex items-center justify-end gap-3">
                         <button 
                             onClick={() => {
                               const studentData = [
                                 { label: 'Nombre', value: s.name },
                                 { label: 'RUT', value: s.rut },
                                 { label: 'Curso/Diplomado', value: s.diplomado || 'Diplomado Homeopatía' },
                                 { label: 'Estado Pago', value: s.pago || 'Al Día' },
                                 { label: 'Avance', value: (s.avance || 0).toString() + '%' },
                                 { label: 'Ficha Académica', value: s.observacionesAcademicas || '' }
                               ];
                               viewExpedienteInNewTab('Expediente Académico: Alumno', studentData, `expediente_${s.name.replace(/\s+/g, '_')}`);
                             }}
                             className="text-amber-600 hover:text-amber-800" 
                             title="Expediente (Ver en nueva pestaña)"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                         <button 
                             onClick={() => {
                               const studentData = [
                                 { label: 'Nombre', value: s.name },
                                 { label: 'RUT', value: s.rut },
                                 { label: 'Curso/Diplomado', value: s.diplomado || 'Diplomado Homeopatía' },
                                 { label: 'Estado Pago', value: s.pago || 'Al Día' },
                                 { label: 'Avance', value: (s.avance || 0).toString() + '%' }
                               ];
                               exportExpedienteToPDF('Ficha: Alumno', studentData, `alumno_${s.name.replace(/\s+/g, '_')}`);
                             }}
                             className="text-blue-600 hover:text-blue-800" 
                             title="PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setSelectedStudent(s)}
                            className="text-[#002b5b] font-black text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1"
                          >
                             <BadgeCheck className="w-3 h-3" /> Ver Ficha
                          </button>
                          <RecordActions onDelete={async () => { await localDB.deleteFromCollection('students', s.id); window.dispatchEvent(new Event('db-change')); }} />
                       </div>
                    </td>
                </tr>
              ))}
           </tbody>
        </table>
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
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'all' ? "bg-white text-blue-900 shadow-sm" : "text-slate-400")}
            >Detalle de clientes</button>
            <button 
              onClick={() => setFilter('leads')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'leads' ? "bg-blue-900 text-white shadow-sm" : "text-slate-400")}
            >Leads</button>
            <button 
              onClick={() => setFilter('students')}
              className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", filter === 'students' ? "bg-green-600 text-white shadow-sm" : "text-slate-400")}
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
             className="bg-white border p-2 rounded-lg hover:bg-slate-100 transition-colors"
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
             className="bg-white border p-2 rounded-lg hover:bg-slate-100 transition-colors"
             title="Exportar Reporte 360 a PDF"
           >
             <Download className="w-4 h-4 text-blue-600" />
           </button>
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                className="pl-10 pr-4 py-2 border rounded-full text-xs w-full bg-white outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="Buscar en el Ecosistema..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[400px]">
        <table className="w-full text-xs">
           <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                 <th className="p-5">Entidad / Nombre</th>
                 <th className="p-5">Tipo / Estado</th>
                 <th className="p-5">Clasificación / Programa</th>
                 <th className="p-5 text-right">Contacto</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {combined.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                   <td className="p-5 font-bold text-blue-900">{safe(item.name)} <span className="block text-[9px] text-slate-400 font-mono mt-1">{safe(item.rut)}</span></td>
                   <td className="p-5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                        item.type === 'Lead' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>{item.type}</span>
                   </td>
                   <td className="p-5">
                      <p className="font-bold text-slate-600">{item.clasificacion || 'Sin clasif.'}</p>
                      <p className="text-[10px] text-slate-400">{item.interes || item.diplomado}</p>
                   </td>
                   <td className="p-5 text-right space-y-1">
                      <p className="flex items-center justify-end gap-2 text-slate-500 font-medium">{item.email} <Mail className="w-3 h-3" /></p>
                      <p className="flex items-center justify-end gap-2 text-slate-500 font-medium">{item.phone} <Smartphone className="w-3 h-3" /></p>
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
    categoriaObjetivo: 'Todos',
    observaciones: '',
    responsable: ''
  });

  const loadActivities = async () => {
    const data = await localDB.getCollection('school_activities');
    setActivities(data);
  };
  
  const autoRegisterInExpedientes = async (activity: string, tipo: string, categoria: string, observaciones: string) => {
    const allStudents = await localDB.getCollection('students');
    const allLeads = await localDB.getCollection('school_leads');
    const allRecords = [...allStudents, ...allLeads.map(l => ({...l, isLead: true}))];
    
    const matchingRecords = allRecords.filter(r => categoria === 'Todos' || r.clasificacion === categoria);
    
    for (const record of matchingRecords) {
        const newEntry = `\n[${new Date().toLocaleString('es-CL')}] Actividad: ${activity} (${tipo}). Obs: ${observaciones}`;
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
      await autoRegisterInExpedientes(form.actividad, form.tipo, form.categoriaObjetivo, form.observaciones);
      await addAuditLog(user, `Registró Actividad Escuela: ${form.actividad}`, 'SCHOOL');
      alert('Actividad Académica Registrada y Expedientes Actualizados');
    }

    setForm({ 
      fecha: new Date().toISOString().split('T')[0],
      actividad: '', 
      tipo: 'Actividad Académica',
      categoriaObjetivo: 'Todos',
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
                  <span className="text-lg font-bold text-[#002b5b]">{detailView.actividad}</span>
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
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Observaciones</span>
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                 className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded uppercase font-black transition-colors"
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
            </div>
            <FormGroup label="Observaciones">
              <textarea 
                className="w-full h-24 p-4 border rounded-xl bg-slate-50 focus:bg-white outline-none"
                placeholder="Detalle de la actividad..."
                value={form.observaciones || ''}
                onChange={e => setForm({...form, observaciones: e.target.value})}
              />
            </FormGroup>
            <div className="flex justify-end">
              <button type="submit" className="bg-[#001736] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'ACTUALIZAR CAMBIOS' : 'GUARDAR ACTIVIDAD'}
              </button>
            </div>
          </form>
        </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-[#002b5b]">Historial Académico</h3>
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
              className="p-2 hover:bg-slate-200 rounded transition-colors text-blue-600"
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
              className="p-2 hover:bg-slate-200 rounded transition-colors text-emerald-600"
              title="Exportar Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Fecha</th>
                <th className="p-4">Actividad</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => (
                <tr key={act.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">{formatDate(act.fecha)}</td>
                  <td className="p-4 font-bold text-[#001736]">{act.actividad}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{act.tipo}</span></td>
                  <td className="p-4 text-slate-500">{act.responsable}</td>
                  <td className="p-4 text-right">
                    <RecordActions 
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
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
       <span className="w-8 h-8 rounded-full bg-[#001736] text-white flex items-center justify-center text-xs font-black mb-4">{num}</span>
       <h5 className="font-bold text-[#001736] text-sm mb-1">{title}</h5>
       <p className="text-xs text-slate-400">{desc}</p>
    </div>
  );
}

function StatsBox({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    green: "bg-green-50 text-green-600 border-green-100"
  };

  return (
    <div className={cn("p-6 rounded-2xl border shadow-sm flex items-center gap-6", colors[color] || colors.blue)}>
       <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
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
