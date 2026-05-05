import React, { useState, useEffect } from 'react';
import { localDB } from '../lib/auth';
import { cn, formatDate } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF, viewExpedienteInNewTab } from '../lib/pdfUtils';
import { 
  GraduationCap, 
  UserPlus, 
  BadgeCheck, 
  LineChart,
  Search,
  Save,
  Clock,
  BookOpen,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Mail,
  Smartphone,
  Trash2,
  Download,
  Edit
} from 'lucide-react';

import { RecordActions } from '../components/RecordActions';

export default function SchoolView() {
  const [activeView, setActiveView] = useState<'register' | 'students' | 'tracking'>('register');
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
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeView === 'register' && <ContactRegister records={data} />}
        {activeView === 'students' && <StudentManager records={data} />}
        {activeView === 'tracking' && <TrackingView />}
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
    observaciones: ''
  });

  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await localDB.saveToCollection('school_leads', form);
    alert('Lead Académico Registrado');
    setForm({ ...form, name: '', rut: '', email: '', phone: '', observaciones: '' });
  };

  const moveToStudents = async (lead: any) => {
    try {
      const studentData = {
        name: lead.name,
        rut: lead.rut,
        email: lead.email,
        phone: lead.phone,
        clasificacion: lead.clasificacion,
        diplomado: lead.interes,
        pago: 'Pendiente',
        avance: 0,
        observacionesAcademicas: 'Inscrito desde Captación'
      };
      await localDB.saveToCollection('students', studentData);
      await localDB.deleteFromCollection('school_leads', lead.id);
      setSelectedLead(null);
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
             <span className="text-[10px] opacity-70 italic">Lead Management System</span>
          </div>
          <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
             <FormGroup label="Fecha Registro"><input type="date" className="w-full border-b p-2" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} /></FormGroup>
             <FormGroup label="Nombre Apellido"><input className="w-full border-b p-2 font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></FormGroup>
             <FormGroup label="RUT Escrito"><input className="w-full border-b p-2" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} required /></FormGroup>
             <FormGroup label="Email"><input type="email" className="w-full border-b p-2" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></FormGroup>
             <FormGroup label="Teléfono / WhatsApp"><input className="w-full border-b p-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></FormGroup>
             
             <FormGroup label="CLASIFICACIÓN PROFESIONAL">
                <select className="w-full border-b p-2 text-sm font-bold text-blue-700" value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                  {CLASIFICACIONES.map(c => <option key={c}>{c}</option>)}
                </select>
             </FormGroup>

             <FormGroup label="Programa de Interés">
                <select className="w-full border-b p-2 text-sm" value={form.interes} onChange={e => setForm({...form, interes: e.target.value})}>
                  {PROGRAMAS.map(p => <option key={p}>{p}</option>)}
                </select>
             </FormGroup>

             <div className="col-span-full">
                <FormGroup label="Observaciones de seguimiento">
                  <textarea className="w-full border rounded-xl p-4 h-24 bg-slate-50 outline-none focus:bg-white" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
                </FormGroup>
             </div>
             
             <button type="submit" className="col-span-full bg-[#001736] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-3">
                <Save className="w-5 h-5" /> GUARDAR LEAD ACADÉMICO
             </button>
          </form>
        </div>

        {selectedLead && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-in slide-in-from-top-4">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-amber-900 text-sm flex items-center gap-2 uppercase">
                   <ArrowRight className="w-4 h-4" /> Transferir a Alumnos: {selectedLead.name}
                </h4>
                <button onClick={() => setSelectedLead(null)} className="text-[10px] font-bold text-amber-700">CANCELAR</button>
             </div>
             <p className="text-xs text-amber-800 mb-6 font-medium">Al confirmar, el registro se moverá permanentemente a la base de Alumnos Vigentes para control académico y pagos.</p>
             <button 
               onClick={() => moveToStudents(selectedLead)}
               className="w-full bg-amber-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-amber-700 transition-colors"
             >
                CONFIRMAR MATRÍCULA E INGRESO
             </button>
          </div>
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
                          onClick={() => setSelectedLead(r)}
                          className="bg-slate-100 p-1.5 rounded hover:bg-amber-100 hover:text-amber-700 transition-colors"
                          title="Mover a Estudiante"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <RecordActions 
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiplomado, setFilterDiplomado] = useState('Todos');

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
         <div className="bg-[#001736] p-4 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Ficha Académica: {selectedStudent.name}</h3>
            <div className="flex items-center gap-4">
              <button onClick={handleDownloadFicha} className="text-white/70 hover:text-white" title="Descargar PDF"><Download className="w-4 h-4" /></button>
              <button onClick={() => setSelectedStudent(null)} className="text-xs uppercase font-black opacity-70">Cerrar</button>
            </div>
         </div>
         <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase text-slate-400">
                  <div className="bg-slate-50 p-3 rounded">RUT: <span className="text-slate-900 block mt-1">{selectedStudent.rut}</span></div>
                  <div className="bg-slate-50 p-3 rounded">Email: <span className="text-slate-900 block mt-1 lowercase font-normal">{selectedStudent.email}</span></div>
                  <div className="bg-slate-50 p-3 rounded">
                    Clasif: 
                    <select 
                      className="text-slate-900 block mt-1 bg-transparent border-none outline-none font-bold w-full"
                      value={selectedStudent.clasificacion || ''}
                      onChange={e => handleFieldLocalChange('clasificacion', e.target.value)}
                    >
                      {['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="bg-slate-100 p-3 rounded ring-1 ring-blue-100 flex flex-col">
                    DIPLOMADO / CURSO: 
                    <input 
                      className="text-slate-900 block mt-1 bg-transparent border-none outline-none font-bold placeholder:text-slate-300" 
                      value={selectedStudent.diplomado || ''}
                      placeholder="Ingrese nombre manual..."
                      onChange={e => handleFieldLocalChange('diplomado', e.target.value)}
                    />
                  </div>
               </div>
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h4 className="text-[10px] font-black text-blue-900 uppercase mb-4 tracking-widest">Control Académico y Pagos</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <FormGroup label="Estado de Pago">
                        <select 
                          className="w-full border-b p-2 bg-transparent font-bold text-sm" 
                          value={selectedStudent.pago} 
                          onChange={e => handleFieldLocalChange('pago', e.target.value)}
                        >
                           <option>Al Día</option><option>Pendiente</option><option>Vencido</option><option>Becado</option>
                        </select>
                     </FormGroup>
                     <FormGroup label="ValorMatricula / Arancel">
                        <input 
                          type="text"
                          className="w-full border-b p-2 bg-transparent font-bold text-sm" 
                          placeholder="$ 0.000"
                          value={selectedStudent.valor || ''}
                          onChange={e => handleFieldLocalChange('valor', e.target.value)}
                        />
                     </FormGroup>
                     <FormGroup label="Avance (%)">
                        <input 
                           type="number" 
                           className="w-full border-b p-2 bg-transparent font-bold text-sm underline decoration-blue-300" 
                           value={selectedStudent.avance || ''} 
                           onChange={e => handleFieldLocalChange('avance', e.target.value)}
                        />
                     </FormGroup>
                  </div>
               </div>
            </div>
            <div className="space-y-4">
               <FormGroup label="Historial Académico / Observaciones">
                  <div className="text-xs font-mono p-4 bg-slate-900 text-green-400 rounded-xl h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                     {selectedStudent.observacionesAcademicas || '[SISTEMA] Sin registros académicos.'}
                  </div>
               </FormGroup>
               <div className="pt-2">
                  <textarea 
                    className="w-full border rounded-xl p-3 text-xs bg-slate-50 h-20" 
                    placeholder="Agregar nueva acción académica o comentario de progreso..." 
                    value={academicNote}
                    onChange={e => setAcademicNote(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={handleSaveAndAddNote}
                      className="w-full bg-[#001736] text-white py-2 rounded-lg font-black text-[10px] uppercase hover:bg-blue-950 transition-colors"
                    >
                       REGISTRAR ACCIÓN
                    </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  const filteredRecords = records.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(term) || (s.rut && s.rut.toLowerCase().includes(term));
    const matchDiplomado = filterDiplomado === 'Todos' || (s.diplomado && s.diplomado === filterDiplomado);
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
                      <div className="font-bold text-[#001736]">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono italic">{s.clasificacion}</div>
                   </td>
                   <td className="p-5 font-medium">{s.diplomado || 'Diplomado Homeopatía'}</td>
                   <td className="p-5">
                      <span className={cn(
                        "px-3 py-1 rounded text-[9px] font-black uppercase border",
                        s.pago === 'Al Día' ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      )}>{s.pago || 'Al Día'}</span>
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
                          <RecordActions onDelete={async () => { await localDB.deleteFromCollection('students', s.id); }} />
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
    ...leads.map(l => ({ ...l, type: 'Lead' })),
    ...students.map(s => ({ ...s, type: 'Alumno' }))
  ].filter(item => {
    const matchesFilter = filter === 'all' || (filter === 'leads' && item.type === 'Lead') || (filter === 'students' && item.type === 'Alumno');
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.rut.toLowerCase().includes(search.toLowerCase());
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
                   <td className="p-5 font-bold text-blue-900">{item.name} <span className="block text-[9px] text-slate-400 font-mono mt-1">{item.rut}</span></td>
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
