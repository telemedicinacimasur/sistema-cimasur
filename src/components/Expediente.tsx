import React, { useState, useEffect } from 'react';
import { 
  FileText, Save, History, ArrowRight, Edit3, X, User, Target, CreditCard, 
  Activity, MapPin, Phone, Mail, Calendar, TrendingUp, Check, Upload, 
  Award, AlertCircle, Plus, Percent, ShieldCheck, Download, Trash2, Sliders
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { localDB } from '../lib/auth';

export function CRMField({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1 bg-[#10192e] border border-[#1e293b]/50 p-2.5 rounded-xl flex flex-col justify-between", className)}>
      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      <div className="text-sm font-bold text-slate-100 min-h-[20px] flex items-center">
        {children}
      </div>
    </div>
  );
}

export interface ExpedienteProps {
  selectedClient: any;
  onClose: () => void;
  onUpdate: (data: any) => Promise<void>;
  onTransfer?: () => Promise<void>;
  newHistory: string;
  setNewHistory: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  activityType: string;
  setActivityType: (val: string) => void;
  currentStatus: string;
  setCurrentStatus: (val: string) => void;
  categories: string[];
  showIntranet?: boolean;
  comunaLabel?: string;
  showComuna?: boolean;
  extraTransferFields?: React.ReactNode;
  customForm?: React.ReactNode;
}

export const Expediente: React.FC<ExpedienteProps> = ({
  selectedClient,
  onClose,
  onUpdate,
  onTransfer,
  newHistory,
  setNewHistory,
  newCategory,
  setNewCategory,
  activityType,
  setActivityType,
  currentStatus,
  setCurrentStatus,
  categories,
  showIntranet = true,
  comunaLabel = 'Comuna',
  showComuna = true,
  extraTransferFields,
  customForm
}) => {
  const [isEditingData, setIsEditingData] = useState(false);
  const [editForm, setEditForm] = useState(selectedClient);
  
  // Ledger/Payments synced in dynamic note entries/state
  const [payments, setPayments] = useState<any[]>([]);

  const [paymentForm, setPaymentForm] = useState({
    cuota: 'Cuota Mensual / Arancel',
    monto: '200000',
    fecha: new Date().toISOString().split('T')[0],
    documento: '',
    metodo: 'Transferencia Bancaria'
  });

  const [addPaymentSuccess, setAddPaymentSuccess] = useState('');

  // Curriculum outline containing list of modules/classes/workshops
  const [courseModules, setCourseModules] = useState<any[]>([]);

  // Input states for writing modules/classes/workshops manually
  const [newModName, setNewModName] = useState('');
  const [newModDur, setNewModDur] = useState('10 Horas');

  useEffect(() => {
    setEditForm(selectedClient);
    
    // Attempt to read custom units if saved, otherwise load default template
    let loadedModules: any[] = [];
    if (selectedClient.unidadesAcademicas) {
      try {
        if (typeof selectedClient.unidadesAcademicas === 'string') {
          loadedModules = JSON.parse(selectedClient.unidadesAcademicas);
        } else if (Array.isArray(selectedClient.unidadesAcademicas)) {
          loadedModules = selectedClient.unidadesAcademicas;
        }
      } catch (err) {
        console.error('Error parsing loaded academic units:', err);
      }
    }
    
    if (!loadedModules || loadedModules.length === 0) {
      loadedModules = [];
    }
    setCourseModules(loadedModules);

    // Attempt to read custom historical payments if saved
    let loadedPayments: any[] = [];
    if (selectedClient.historialPagos) {
      try {
        if (typeof selectedClient.historialPagos === 'string') {
          loadedPayments = JSON.parse(selectedClient.historialPagos);
        } else if (Array.isArray(selectedClient.historialPagos)) {
          loadedPayments = selectedClient.historialPagos;
        }
      } catch (err) {
        console.error('Error parsing loaded historical payments:', err);
      }
    }
    setPayments(loadedPayments);
  }, [selectedClient]);

  const handleSaveEdit = async () => {
    try {
      await onUpdate({ 
        isProfileUpdate: true, 
        updatedProfile: {
          ...editForm,
          unidadesAcademicas: JSON.stringify(courseModules),
          historialPagos: JSON.stringify(payments)
        }, 
        newHistory: '' 
      });
      setIsEditingData(false);
    } catch (e) {
      console.error(e);
    }
  };

  const persistModules = async (updatedList: any[], targetProgress?: number) => {
    const finalProg = typeof targetProgress !== 'undefined' ? targetProgress : (editForm.avance || 0);
    const updatedForm = {
      ...editForm,
      avance: finalProg,
      unidadesAcademicas: JSON.stringify(updatedList),
      historialPagos: JSON.stringify(payments)
    };
    setEditForm(updatedForm);
    await onUpdate({
      isProfileUpdate: true,
      updatedProfile: updatedForm,
      newHistory: ''
    });
  };

  const handleAddCustomModule = async () => {
    if (!newModName.trim()) {
      alert('Por favor ingrese el nombre de la clase, taller o módulo.');
      return;
    }
    const newId = courseModules.length > 0 ? Math.max(...courseModules.map(m => m.id)) + 1 : 1;
    const newModuleObj = {
      id: newId,
      name: newModName.trim(),
      duracion: newModDur.trim() || 'Variable',
      estado: 'No Iniciado'
    };

    const updatedList = [...courseModules, newModuleObj];
    setCourseModules(updatedList);
    setNewModName('');
    await persistModules(updatedList);
  };

  const handleDeleteModule = async (moduleId: number) => {
    const moduleToDelete = courseModules.find(m => m.id === moduleId);
    if (!moduleToDelete) return;

    if (!confirm(`¿Está seguro de eliminar la unidad "${moduleToDelete.name}" del avance de este alumno?`)) {
      return;
    }

    const updatedList = courseModules.filter(m => m.id !== moduleId);
    setCourseModules(updatedList);
    await persistModules(updatedList);
  };

  const handleUpdateModuleStatus = async (moduleId: number, nextEstado: string) => {
    const updatedList = courseModules.map(m => {
      if (m.id === moduleId) return { ...m, estado: nextEstado };
      return m;
    });

    setCourseModules(updatedList);
    await persistModules(updatedList);
  };

  const handleManualProgressChange = async (val: number) => {
    const progress = Math.max(0, Math.min(100, Math.round(val)));
    const updatedForm = {
      ...editForm,
      avance: progress
    };
    setEditForm(updatedForm);
    
    await onUpdate({
      isProfileUpdate: true,
      updatedProfile: {
        ...updatedForm,
        unidadesAcademicas: JSON.stringify(courseModules)
      },
      newHistory: ''
    });
  };

  const handleRecalculateProgress = () => {
    if (courseModules.length === 0) {
      alert('No hay unidades académicas registradas.');
      return;
    }
    const completedCount = courseModules.filter(m => m.estado === 'Completado').length;
    const progress = Math.round((completedCount / courseModules.length) * 100);
    handleManualProgressChange(progress);
    alert(`Progreso recalculado con éxito según unidades completadas (Proporción: ${completedCount}/${courseModules.length}): ${progress}%`);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = Number(paymentForm.monto) || 0;
    if (parsedMonto <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    const docRef = paymentForm.documento.trim() || `V-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPaymentObj = {
      id: payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1,
      cuota: paymentForm.cuota,
      monto: parsedMonto,
      fecha: paymentForm.fecha,
      documento: docRef,
      estado: 'Pagado',
      metodo: paymentForm.metodo
    };

    const updatedPayments = [newPaymentObj, ...payments];
    setPayments(updatedPayments);

    // Sum up totals directly from remaining payments
    const finalReceived = updatedPayments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

    const updatedForm = {
      ...editForm,
      montoTotalRecibido: finalReceived,
      avance: editForm.avance || 0,
      pago: editForm.pago,
      unidadesAcademicas: JSON.stringify(courseModules),
      historialPagos: JSON.stringify(updatedPayments)
    };

    setEditForm(updatedForm);

    await onUpdate({ 
      isProfileUpdate: true, 
      updatedProfile: updatedForm, 
      newHistory: '' 
    });

    setAddPaymentSuccess(`Pago por ${formatCurrency(parsedMonto)} registrado.`);
    setPaymentForm(prev => ({ ...prev, monto: '200000', documento: '' }));
    setTimeout(() => setAddPaymentSuccess(''), 3000);
  };

  const handleDeletePayment = async (paymentId: number) => {
    const paymentToDelete = payments.find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    if (!confirm(`¿Está seguro de eliminar el pago "${paymentToDelete.cuota}" por ${formatCurrency(paymentToDelete.monto)}?`)) {
      return;
    }

    const updatedPayments = payments.filter(p => p.id !== paymentId);
    setPayments(updatedPayments);

    // Recalculate and sum up totals from remaining payments
    const finalReceived = updatedPayments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

    const updatedForm = {
      ...editForm,
      montoTotalRecibido: finalReceived,
      avance: editForm.avance || 0,
      pago: editForm.pago,
      unidadesAcademicas: JSON.stringify(courseModules),
      historialPagos: JSON.stringify(updatedPayments)
    };

    setEditForm(updatedForm);

    await onUpdate({ 
      isProfileUpdate: true, 
      updatedProfile: updatedForm, 
      newHistory: '' 
    });
  };

  const handleToggleModule = async (moduleId: number, currentEstado: string) => {
    let nextEstado = 'No Iniciado';
    if (currentEstado === 'No Iniciado') nextEstado = 'En Curso';
    else if (currentEstado === 'En Curso') nextEstado = 'Completado';
    else nextEstado = 'No Iniciado';

    const updatedModules = courseModules.map(m => {
      if (m.id === moduleId) return { ...m, estado: nextEstado };
      return m;
    });

    setCourseModules(updatedModules);

    const completedCount = updatedModules.filter(m => m.estado === 'Completado').length;
    const recalculatedProgression = completedCount * 20;

    const modifiedForm = {
      ...editForm,
      avance: recalculatedProgression
    };

    setEditForm(modifiedForm);

    await onUpdate({
      isProfileUpdate: true,
      updatedProfile: modifiedForm,
      newHistory: ''
    });
  };

  const submitNote = () => {
    if (!newHistory.trim()) {
      alert('Por favor ingrese el contenido de la observación antes de guardar.');
      return;
    }
    onUpdate({ activityType: activityType || 'Nota de Seguimiento', newHistory, currentStatus: currentStatus || 'En proceso' });
  };

  // Convert and split log nicely
  const rawHistory = selectedClient.historialUnificado || selectedClient.observacionesAcademicas || '';
  const parsedHistoryEntries = rawHistory
    .split('\n\n')
    .map((e: string) => e.trim())
    .filter(Boolean);

  return (
    <div className="bg-[#0b101d] rounded-2xl shadow-2xl overflow-hidden border border-[#1e293b] flex flex-col font-sans max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* DOSSIER HEADER */}
      <div className="bg-[#0e172a] text-white border-b border-[#1e293b] p-6 lg:p-8 relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400">Expediente Alumno Oficial</span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                  selectedClient.type === 'Lead' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                )}>
                  {selectedClient.type === 'Lead' ? 'Prospecto / Lead' : 'Alumno Regular'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">{selectedClient.name}</h2>
              <div className="text-slate-400 text-xs flex items-center gap-2 mt-1 font-mono">
                <span>RUT: {selectedClient.rut}</span>
                <span>•</span>
                <span>{selectedClient.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={onClose} 
              className="bg-slate-800 hover:bg-slate-700/80 text-slate-300 pr-5 pl-4 py-2.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer border border-[#1e293b] w-full lg:w-auto justify-center"
            >
              <X className="w-4 h-4" /> Volver a la Lista
            </button>
          </div>
        </div>
      </div>

      {/* DOSSIER CONTENT - FIXED DOUBLE COLUMN WITH HIGH DENSITY & VISUAL QUALITY */}
      <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto max-h-[85vh] custom-scrollbar">
        
        {/* COLUMN 1: DATOS MAESTROS Y AVANCES (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* FICHA TÉCNICA RE-CODIFIED */}
          <div className="bg-[#121b2d] rounded-2xl border border-[#1e293b]/70 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#38bdf8] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#38bdf8]" /> 1. Ficha de Registro del Estudiante
              </h3>
              {!isEditingData ? (
                <button 
                  onClick={() => {
                    setEditForm(selectedClient);
                    setIsEditingData(true);
                  }} 
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-300 uppercase tracking-wider rounded-lg border border-[#1e293b] cursor-pointer transition-all"
                >
                  Editar Ficha
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setIsEditingData(false)} className="px-2.5 py-1 text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-lg uppercase tracking-wider cursor-pointer font-bold">
                    Cancelar
                  </button>
                  <button onClick={handleSaveEdit} className="px-2.5 py-1 text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg uppercase tracking-wider cursor-pointer font-bold transition-all">
                    Guardar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CRMField label="Nombre Completo">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  />
                ) : (
                  <span className="text-slate-100">{selectedClient.name}</span>
                )}
              </CRMField>

              <CRMField label="RUT / ID">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.rut || ''} 
                    onChange={e => setEditForm({...editForm, rut: e.target.value})} 
                  />
                ) : (
                  <span className="text-slate-300 font-mono text-[13px]">{selectedClient.rut}</span>
                )}
              </CRMField>

              <CRMField label="Correo Electrónico">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.email || ''} 
                    onChange={e => setEditForm({...editForm, email: e.target.value})} 
                  />
                ) : (
                  <span className="text-slate-200 text-xs flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-400" /> {selectedClient.email || 'No ingresado'}
                  </span>
                )}
              </CRMField>

              <CRMField label="Teléfono / WhatsApp">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.phone || ''} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                  />
                ) : (
                  <span className="text-slate-200 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> {selectedClient.phone || 'No ingresado'}
                  </span>
                )}
              </CRMField>

              <CRMField label="Región / Comuna">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.region || ''} 
                    onChange={e => setEditForm({...editForm, region: e.target.value})} 
                  />
                ) : (
                  <span className="text-slate-200 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" /> {selectedClient.region || 'Metropolitana'}
                  </span>
                )}
              </CRMField>

              <CRMField label="Programa o Diplomado">
                {isEditingData ? (
                  <input 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold outline-none focus:border-sky-500" 
                    value={editForm.type || ''} 
                    onChange={e => setEditForm({...editForm, type: e.target.value})} 
                  />
                ) : (
                  <span className="text-[#38bdf8] text-xs font-extrabold uppercase truncate">
                    {selectedClient.type || 'Diplomado en Homeopatía Veterinaria'}
                  </span>
                )}
              </CRMField>

              <CRMField label="Cómo llegó (Canal de Origen)">
                {isEditingData ? (
                  <select 
                    className="w-full bg-[#152035] border border-[#1e293b] rounded p-1 text-white text-xs font-bold outline-none" 
                    value={editForm.comoLlego || 'Campañas / Ads'} 
                    onChange={e => setEditForm({...editForm, comoLlego: e.target.value})}
                  >
                    <option value="Campañas / Ads">📢 Campañas / Ads</option>
                    <option value="Instagram">📸 Instagram</option>
                    <option value="Facebook">👥 Facebook</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="Llamada Directa">📞 Llamada Directa</option>
                    <option value="Recomendación">🤝 Recomendación</option>
                    <option value="Página Web">🌐 Página Web</option>
                    <option value="Otro">✏️ Otro</option>
                  </select>
                ) : (
                  <span className="text-pink-400 text-xs uppercase tracking-tight font-black">
                    📢 {selectedClient.comoLlego || 'Campañas / Ads'}
                  </span>
                )}
              </CRMField>

              <CRMField label="Arancel Total (Monto de Venta)">
                {isEditingData ? (
                  <input 
                    type="number"
                    className="w-full bg-[#152035] border border-[#1e293b]/70 rounded px-2 py-1 text-white text-xs font-bold font-mono outline-none focus:border-sky-500" 
                    value={editForm.montoTotalPagado ?? 0} 
                    onChange={e => setEditForm({...editForm, montoTotalPagado: Number(e.target.value)})} 
                  />
                ) : (
                  <span className="text-slate-200 text-xs font-mono font-bold">
                    {formatCurrency(selectedClient.montoTotalPagado || 0)}
                  </span>
                )}
              </CRMField>
              <CRMField label="Monto Recibido (Neto en Cuenta)">
                {isEditingData ? (
                  <input 
                    type="number"
                    className="w-full bg-[#152035] border border-[#1e293b]/70 rounded px-2 py-1 text-white text-xs font-bold font-mono outline-none focus:border-sky-500" 
                    value={editForm.montoTotalRecibido ?? 0} 
                    onChange={e => setEditForm({...editForm, montoTotalRecibido: Number(e.target.value)})} 
                  />
                ) : (
                  <span className="text-emerald-400 text-xs font-mono font-bold">
                    {formatCurrency(selectedClient.montoTotalRecibido || 0)}
                  </span>
                )}
              </CRMField>
              <CRMField label="Compromiso / Fecha de Pago">
                {isEditingData ? (
                  <input 
                    type="date"
                    className="w-full bg-[#152035] border border-[#1e293b] rounded px-2 py-1 text-white text-xs font-bold font-mono outline-none focus:border-sky-500" 
                    value={editForm.fechaPago || ''} 
                    onChange={e => setEditForm({...editForm, fechaPago: e.target.value})} 
                  />
                ) : (
                  <span className="text-amber-400 text-xs font-black">
                    📅 {selectedClient.fechaPago ? formatDate(selectedClient.fechaPago) : 'No detallada'}
                  </span>
                )}
              </CRMField>
            </div>

            {/* Custom school system fields inside leads profile screen */}
            {extraTransferFields && (
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                 <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                   <AlertCircle className="w-4 h-4" /> REQUISITOS DE TRASPASO ACADÉMICO:
                 </div>
                 {extraTransferFields}
               </div>
            )}

            {onTransfer && (
              <div className="flex justify-end pt-2">
                <button 
                  onClick={onTransfer}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" /> Promover Alumno Regular
                </button>
              </div>
            )}
          </div>

          {/* AVANCE CURRICULAR (MANUAL PERCENTAGE & ENTIRELY WRITABLE CLASS LIST) */}
          <div className="bg-[#121b2d] rounded-2xl border border-[#1e293b]/70 p-6 space-y-5">
            
            {/* Header with Title and Value */}
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" /> 2. Control de Avance Curricular (Manual)
                </h3>
                <p className="text-[9px] text-[#94a3b8] uppercase tracking-widest mt-0.5">Defina el % de avance directamente o escriba talleres específicos abajo</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 border border-emerald-500/20 rounded-xl">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-xs font-black text-white">{editForm.avance || 0}% de Avance</span>
              </div>
            </div>

            {/* Direct Slider & Percentage Numeric Box */}
            <div className="bg-[#0f1725] p-4 rounded-xl border border-[#1e293b] space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" /> Ajuste Directo de Avance Global (%)
              </label>
              
              <div className="flex items-center gap-4">
                {/* Visual Slider */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg appearance-none"
                  value={editForm.avance || 0}
                  onChange={e => handleManualProgressChange(parseInt(e.target.value) || 0)}
                />

                {/* Direct Numeric Input Box */}
                <div className="flex items-center bg-[#152033] border border-[#243555] rounded-xl px-2.5 py-1 w-20">
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    className="w-full bg-transparent text-white font-black font-mono text-sm outline-none text-center"
                    value={editForm.avance || 0}
                    onChange={e => handleManualProgressChange(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-[#64748b] font-black ml-0.5">%</span>
                </div>
              </div>

              {/* Progress bar and hints */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-sky-500 h-full transition-all duration-300" style={{ width: `${editForm.avance || 0}%` }} />
              </div>
            </div>

            {/* Sub-form: Escribir el Módulo, Clase o Taller Manualmente */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-[#1e293b]/70 space-y-3">
              <div className="text-[10px] font-black text-[#38bdf8] uppercase tracking-wider block">
                ✍️ Registrar Clase, Taller o Módulo Manualmente
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <input 
                    type="text"
                    placeholder="Escriba el nombre del Taller o Clase..." 
                    className="w-full bg-[#10192e] border border-[#1e293b] text-xs font-bold text-white rounded-lg p-2.5 outline-none focus:border-emerald-500"
                    value={newModName}
                    onChange={e => setNewModName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-4">
                  <input 
                    type="text"
                    placeholder="Ej. 10 Horas" 
                    className="w-full bg-[#10192e] border border-[#1e293b] text-xs font-bold text-slate-300 rounded-lg p-2.5 outline-none focus:border-emerald-500"
                    value={newModDur}
                    onChange={e => setNewModDur(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleAddCustomModule}
                  className="bg-sky-600 hover:bg-sky-500 border border-sky-700 text-white font-black uppercase text-[10px] tracking-wider px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Unidad Académica
                </button>
              </div>
            </div>

            {/* List of Custom Modules with status changer & delete button */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[10px] uppercase font-black text-[#94a3b8] tracking-widest">
                <span>Roster de Clases y Unidades Académicas</span>
                <button 
                  onClick={handleRecalculateProgress}
                  className="text-[9px] font-black text-sky-400 hover:text-sky-300 underline uppercase tracking-wider cursor-pointer"
                >
                  Sincronizar Avance con Clases
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {courseModules.length > 0 ? (
                  courseModules.map((m, index) => (
                    <div 
                      key={m.id}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors",
                        m.estado === 'Completado' 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : (m.estado === 'En Curso' ? "bg-indigo-500/5 border-indigo-500/20" : "bg-[#0f1725] border-[#1e293b]")
                      )}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="font-mono text-[9px] text-[#475569] font-black">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-100 truncate">{m.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5 tracking-wider">Duración: {m.duracion}</p>
                        </div>
                      </div>

                      {/* Dropdown status selection & Delete button */}
                      <div className="flex items-center justify-end gap-2.5">
                        <select 
                          value={m.estado}
                          onChange={e => handleUpdateModuleStatus(m.id, e.target.value)}
                          className={cn(
                            "bg-slate-900 text-[10px] font-black uppercase tracking-wider border rounded px-2 py-1 outline-none transition cursor-pointer",
                            m.estado === 'Completado' ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20" :
                            m.estado === 'En Curso' ? "text-indigo-400 border-indigo-500/30 bg-indigo-950/20" : "text-slate-400 border-slate-700 bg-slate-800"
                          )}
                        >
                          <option value="No Iniciado">🔴 No Iniciado</option>
                          <option value="En Curso">🟡 En Curso</option>
                          <option value="Completado">💚 Completado</option>
                        </select>

                        <button 
                          onClick={() => handleDeleteModule(m.id)}
                          className="p-1 px-1.5 hover:bg-slate-800 rounded text-rose-500 hover:text-rose-400 transition cursor-pointer border border-transparent hover:border-slate-700/60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center border border-dashed border-[#1e293b]/50 rounded-xl">
                    <Sliders className="w-6 h-6 text-slate-600 mx-auto opacity-30 mb-1.5" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sin unidades académicas registradas</p>
                    <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">Escriba una unidad arriba para comenzar</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 2: FINANZAS Y BITÁCORA DE CONTROL (lg:col-span-5) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          
          {/* RESUMEN FINANCIERO Y ABONO INLINE */}
          <div className="bg-[#121b2d] rounded-2xl border border-[#1e293b]/70 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <CreditCard className="w-4 h-4 text-emerald-400" /> 3. Resumen Arancelar y Control de Pagos
            </h3>

            {/* Mathematical financial dashboard */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#10192e] border border-[#1e293b] p-3 rounded-xl">
                <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider block">Arancel Total</span>
                <span className="text-xs font-black font-mono text-slate-200 block mt-1">
                  {formatCurrency(editForm.montoTotalPagado || 0)}
                </span>
              </div>
              <div className="bg-[#10192e] border border-[#1e293b] p-3 rounded-xl">
                <span className="text-[8px] font-extrabold uppercase text-indigo-400 tracking-wider block">Total Recibido (Neto en Cuenta)</span>
                <span className="text-xs font-black font-mono text-emerald-400 block mt-1">
                  {formatCurrency(editForm.montoTotalRecibido || 0)}
                </span>
              </div>
              {['Cuotas', 'Crédito'].includes(editForm.pago || '') && (
                <div className="bg-[#10192e] border border-[#1e293b] p-3 rounded-xl">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider block">Saldo Restante</span>
                  <span className={cn(
                    "text-xs font-black font-mono mt-1 block",
                    ((editForm.montoTotalPagado || 0) - (editForm.montoTotalRecibido || 0)) > 0 ? "text-amber-400" : "text-emerald-500"
                  )}>
                    {formatCurrency(Math.max(0, (editForm.montoTotalPagado || 0) - (editForm.montoTotalRecibido || 0)))}
                  </span>
                </div>
              )}
              <div className="bg-[#10192e] border border-[#1e293b] p-3 rounded-xl">
                <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider block">Estado de Cuenta</span>
                {isEditingData ? (
                  <select 
                    className="w-full bg-[#152035] border border-[#1e293b]/70 rounded p-1 text-white text-[10px] font-bold outline-none mt-1" 
                    value={editForm.pago || ''} 
                    onChange={e => setEditForm({...editForm, pago: e.target.value})}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Pago Webpay">Pago Webpay</option>
                    <option value="Pago Transferencia">Pago Transferencia</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Cuotas">Cuotas</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Al Día">Al Día</option>
                    <option value="Otros">Otros</option>
                  </select>
                ) : (
                  <span className="text-xs font-black uppercase inline-block text-white mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block",
                      (editForm.pago === 'Al Día' || editForm.pago?.includes('Pago')) ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    )}>{editForm.pago || 'Al Día'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Brief list of Ledger */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Historial de Cuotas</span>
              <div className="max-h-[160px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1.5">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <div key={p.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-[#1e293b]/55 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="font-extrabold text-slate-200">{p.cuota}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formatDate(p.fecha)} • Ref: {p.documento}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-black">{formatCurrency(p.monto)}</span>
                        <button 
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-white/5 cursor-pointer"
                          title="Eliminar pago"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-[#1e293b]/40 rounded-xl">
                    <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Sin pagos o cuotas registradas</p>
                    <p className="text-[8.5px] text-slate-600 uppercase tracking-wider mt-0.5">Use el formulario de abajo para ingresar un pago (neto)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Inline dynamic coupon payment adder */}
            <form onSubmit={handleAddPayment} className="p-3 bg-slate-900/50 rounded-xl border border-[#1e293b] space-y-2.5 pt-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">REGISTRADOR DE PAGOS (NETO EN CUENTA)</span>
              {addPaymentSuccess && (
                <div className="p-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg">
                  ✓ {addPaymentSuccess}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  required
                  placeholder="Detalle pago (ej: Cuota 3)"
                  className="w-full bg-[#10192e] border border-[#1e293b] rounded p-2 text-white text-xs outline-none focus:border-emerald-500"
                  value={paymentForm.cuota}
                  onChange={e => setPaymentForm({...paymentForm, cuota: e.target.value})}
                />
                <input 
                  type="number" 
                  required
                  placeholder="Monto ($)"
                  className="w-full bg-[#10192e] border border-[#1e293b] rounded p-2 text-white font-mono text-xs outline-none focus:border-emerald-500"
                  value={paymentForm.monto}
                  onChange={e => setPaymentForm({...paymentForm, monto: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Ref / Boleta o Transfer"
                  className="w-full bg-[#10192e] border border-[#1e293b] rounded p-2 text-white text-xs outline-none"
                  value={paymentForm.documento}
                  onChange={e => setPaymentForm({...paymentForm, documento: e.target.value})}
                />
                <button 
                  type="submit"
                  className="w-full bg-[#18233a] hover:bg-emerald-600 hover:text-white border border-[#243557] rounded text-[10px] font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>

          {/* COLLAPSED BITÁCORA DE CONTROL / TIMELINE AND WRITING NOTE */}
          <div className="bg-[#121b2d] rounded-2xl border border-[#1e293b]/70 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#38bdf8] flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <History className="w-4 h-4 text-[#38bdf8]" /> 4. Bitácora Oficial de Control Escolar
            </h3>

            {/* Input to write new note */}
            <div className="space-y-2 bg-[#0f1726]/60 border border-[#1e293b] p-3 rounded-xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Agregar Nueva Ficha de Seguimiento</span>
              <div className="flex gap-2">
                <select 
                  className="bg-[#14203a] border border-[#1e293b] rounded p-1 text-[10px] font-bold text-slate-200 outline-none"
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                >
                  <option>Nota de Seguimiento</option>
                  <option>Llamada Telefónica</option>
                  <option>Reunión Presencial</option>
                  <option>Actualización Administrativa</option>
                </select>
                <select 
                  className="bg-[#14203a] border border-[#1e293b] rounded p-1 text-[10px] font-bold text-slate-200 outline-none"
                  value={currentStatus || selectedClient.estado}
                  onChange={e => setCurrentStatus(e.target.value)}
                >
                  <option value="Sin interacción">Estado: Sin interacción</option>
                  <option value="En proceso">Estado: En proceso</option>
                  <option value="Inactivo">Estado: Inactivo</option>
                  <option value="Matriculado">Estado: Matriculado</option>
                </select>
              </div>
              <textarea 
                className="w-full text-xs font-semibold bg-[#10192e] border border-[#1e293b] rounded-lg p-2.5 h-20 text-slate-200 resize-none outline-none focus:border-sky-500 leading-normal" 
                value={newHistory}
                onChange={e => setNewHistory(e.target.value)}
                placeholder="Escriba aquí los detalles..."
              />
              <button 
                onClick={submitNote}
                className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold uppercase text-[10px] tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition shadow"
              >
                <Save className="w-3.5 h-3.5" /> Registrar en Bitácora
              </button>
            </div>

            {/* Official historic log visualization */}
            <div className="space-y-4 pt-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Registro Cronológico Escolar</span>
              
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-3 pr-1.5">
                {parsedHistoryEntries.length > 0 ? (
                  parsedHistoryEntries.reverse().map((entry: string, index: number) => {
                    return (
                      <div key={index} className="p-3 bg-[#0d1527] hover:bg-[#0f172c] transition-all border border-[#1e293b]/70 rounded-xl relative pl-6 group">
                        <div className="absolute left-2.5 top-3.5 w-1.5 h-1.5 bg-[#38bdf8] rounded-full ring-4 ring-[#38bdf8]/15" />
                        <div className="text-[11px] font-bold text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {entry}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center">
                    <History className="w-8 h-8 text-slate-700 mx-auto opacity-30 mb-2" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sin registros históricos en esta bitácora</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
