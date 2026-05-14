import React, { useState, useEffect } from 'react';
import { FileText, Save, History, ArrowRight, Edit3, X, User, Target, CreditCard, Activity, MapPin, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';

export function CRMField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      {children}
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
  const [activeTab, setActiveTab] = useState('Información General');
  
  const tabs = [
    'Información General', 
    'Capacitaciones',
    'Pagos', 
    'Interacciones', 
    'Documentos',
    'Comercial',
    'Seguimiento',
    'Automatizaciones',
    'Historial', 
    'Inteligencia'
  ];

  useEffect(() => {
    setEditForm(selectedClient);
  }, [selectedClient]);

  const handleSaveEdit = async () => {
    try {
      await onUpdate({ isProfileUpdate: true, updatedProfile: editForm, newHistory: '' });
      setIsEditingData(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen lg:min-h-[800px] rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 border border-slate-200 flex flex-col">
      {/* 360° Header Summary */}
      <div className="bg-[#001736] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
            <Activity className="w-64 h-64" />
        </div>
        
        <div className="p-8 lg:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl ring-4 ring-white/10 group">
              <User className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-3xl font-black tracking-tight uppercase italic">{selectedClient.name}</h3>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                  selectedClient.type === 'Lead' ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                )}>
                  {selectedClient.type === 'Lead' ? 'Prospecto' : 'Alumno Vigente'}
                </span>
              </div>
              <p className="text-blue-300/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> RUT: {selectedClient.rut} • {selectedClient.email}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
             <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="block text-[8px] font-black uppercase text-blue-300/60 tracking-widest mb-1">Categoría</span>
                <span className="text-sm font-black uppercase tracking-tight">{selectedClient.categoria || selectedClient.clasificacion || 'General'}</span>
             </div>
             <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="block text-[8px] font-black uppercase text-blue-300/60 tracking-widest mb-1">Interés Prgms.</span>
                <span className="text-sm font-black uppercase tracking-tight truncate max-w-[120px] inline-block">{selectedClient.interes || selectedClient.type || 'Varios'}</span>
             </div>
             <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="block text-[8px] font-black uppercase text-blue-300/60 tracking-widest mb-1">Estado Pago</span>
                <span className={cn(
                  "text-sm font-black uppercase tracking-tight",
                  selectedClient.pago === 'Al Día' ? "text-emerald-400" : "text-amber-400"
                )}>{selectedClient.pago || 'Pendiente'}</span>
             </div>
             <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-2xl transition-all shadow-xl flex items-center justify-center group">
               <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
             </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-8 flex overflow-x-auto gap-8 justify-start custom-scrollbar shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap py-4 px-2 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 hover:text-[#001736]",
              activeTab === tab ? "border-[#001736] text-[#001736]" : "border-transparent text-slate-400"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50 relative custom-scrollbar">
        <div className="p-8 pb-32 h-full overflow-y-auto w-full max-w-7xl mx-auto space-y-8">
          {activeTab === 'Información General' && (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                   <div className="p-3 bg-slate-50 rounded-2xl text-blue-600"><CreditCard className="w-5 h-5" /></div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inversión Recibida</p>
                      <p className="text-lg font-black text-slate-800">{formatCurrency(selectedClient.montoTotalRecibido || 0)}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                   <div className="p-3 bg-slate-50 rounded-2xl text-emerald-600"><Activity className="w-5 h-5" /></div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Estado de Cuenta</p>
                      <p className="text-lg font-black text-slate-800">{selectedClient.pago || 'Normal'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                   <div className="p-3 bg-slate-50 rounded-2xl text-amber-600"><Calendar className="w-5 h-5" /></div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ingreso al Sistema</p>
                      <p className="text-lg font-black text-slate-800">{formatDate(selectedClient.fechaIngreso)}</p>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                <div className="p-8 space-y-8">
                   <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                           <User className="w-4 h-4 text-blue-600" /> Datos Maestros del Expediente
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Información veridica de registro</p>
                      </div>
                      {!isEditingData ? (
                        <button onClick={() => setIsEditingData(true)} className="flex items-center gap-2 px-6 py-2.5 bg-[#001736] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                      ) : (
                        <div className="flex gap-2">
                           <button onClick={() => setIsEditingData(false)} className="px-6 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300">
                             Cancelar
                           </button>
                           <button onClick={handleSaveEdit} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg">
                             Guardar
                           </button>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                      <CRMField label="Nombre Completo">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        ) : (
                          <span className="text-sm font-black text-slate-800">{selectedClient.name}</span>
                        )}
                      </CRMField>
                      <CRMField label="RUT Identidad">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.rut || ''} onChange={e => setEditForm({...editForm, rut: e.target.value})} />
                        ) : (
                          <span className="text-sm font-black text-slate-500 font-mono italic">{selectedClient.rut}</span>
                        )}
                      </CRMField>
                      <CRMField label="Correo Electrónico">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                        ) : (
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Mail className="w-3 h-3 text-blue-500" /> {selectedClient.email}</span>
                        )}
                      </CRMField>
                      <CRMField label="Teléfono / WhatsApp">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                        ) : (
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Phone className="w-3 h-3 text-emerald-500" /> {selectedClient.phone}</span>
                        )}
                      </CRMField>
                      <CRMField label="Ubicación / Región">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.region || ''} onChange={e => setEditForm({...editForm, region: e.target.value})} />
                        ) : (
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-3 h-3 text-rose-500" /> {selectedClient.region || 'No registrada'}</span>
                        )}
                      </CRMField>
                      <CRMField label="Programa Base">
                        {isEditingData ? (
                          <input className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/50 rounded font-bold" value={editForm.type || editForm.clasificacion || ''} onChange={e => setEditForm({...editForm, type: e.target.value})} />
                        ) : (
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">{selectedClient.type || selectedClient.clasificacion}</span>
                        )}
                      </CRMField>
                   </div>
                   
                   {extraTransferFields && (
                     <div className="pt-8 border-t border-slate-100">
                        {extraTransferFields}
                     </div>
                   )}
                   
                   {onTransfer && (
                     <div className="pt-4 flex justify-end">
                       <button 
                         onClick={onTransfer}
                         className="bg-amber-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-amber-600 hover:scale-105 transition-all text-xs"
                       >
                          <ArrowRight className="w-4 h-4" /> Promover a Alumno
                       </button>
                     </div>
                   )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'Historial' && (
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Cronología de Actividad 360°</h4>
                  <div className="h-px flex-1 bg-slate-200" />
               </div>
               
               <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                     <History className="w-32 h-32 text-white rotate-12" />
                  </div>
                  <div className="relative z-10 max-h-[500px] overflow-y-auto custom-scrollbar-white pr-4">
                     {selectedClient.historialUnificado ? (
                      <div className="space-y-6">
                         {selectedClient.historialUnificado.split('\n\n').reverse().map((entry: string, idx: number) => (
                           <div key={idx} className="relative pl-8 group">
                              <div className="absolute left-0 top-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors" />
                              <div className="absolute left-[-4px] top-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />
                              <div className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/5 transition-all text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium font-sans">
                                 {entry}
                              </div>
                           </div>
                         ))}
                      </div>
                     ) : (
                      <div className="py-20 text-center space-y-4">
                         <History className="w-16 h-16 text-slate-700 mx-auto opacity-20" />
                         <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Sin actividad registrada en el ecosistema</p>
                      </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'Interacciones' && (
             <div className="max-w-3xl mx-auto space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8">
                  <div className="space-y-2 text-center pb-6 border-b border-slate-100">
                    <Activity className="w-8 h-8 text-indigo-500 mx-auto" />
                    <h4 className="text-lg font-black text-[#001736] uppercase tracking-widest">Registrar Nueva Acción</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generar trazabilidad instantánea en el CRM</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <CRMField label="Tipo de Interacción">
                       <select 
                         className="w-full border border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white transition-all outline-none ring-2 ring-transparent focus:ring-blue-100" 
                         value={activityType}
                         onChange={e => setActivityType(e.target.value)}
                       >
                         <option>Nota de Seguimiento</option>
                         <option>Llamada Telefónica</option>
                         <option>Reunión Presencial</option>
                         <option>Campaña Email</option>
                         <option>Actualización Administrativa</option>
                         <option>Otro</option>
                       </select>
                     </CRMField>
                     <CRMField label="Etapa de Gestión / Estado">
                        <select 
                          className="w-full border border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-blue-900 outline-none hover:bg-white transition-colors"
                          value={currentStatus || selectedClient.estado}
                          onChange={e => setCurrentStatus(e.target.value)}
                        >
                          <option>En proceso</option>
                          <option>Prospecto VIP</option>
                          <option>Pendiente de Cierre</option>
                          <option>Matriculado</option>
                          <option>Inactivo</option>
                        </select>
                     </CRMField>
                  </div>
                  {activityType === 'Otro' && (
                     <CRMField label="Especificar otro tipo">
                        <input className="w-full border border-slate-200 p-4 rounded-xl text-sm" placeholder="Mencionar el tipo de interacción" />
                     </CRMField>
                  )}
                  <CRMField label="Detalles del Suceso (Obligatorio)">
                    <textarea 
                      className="w-full h-48 p-4 border border-slate-100 rounded-2xl bg-slate-50 focus:bg-white text-sm font-medium transition-all outline-none resize-none ring-2 ring-transparent focus:ring-blue-100 leading-relaxed shadow-inner" 
                      value={newHistory}
                      onChange={e => setNewHistory(e.target.value)}
                      placeholder="Documente aquí los hallazgos, acuerdos o pasos realizados con este cliente..."
                    />
                  </CRMField>

                  <button 
                    onClick={() => {
                        if (activityType === 'Otro' && !newHistory) { alert('La observación es obligatoria en categoría "Otro"'); return; }
                        onUpdate({ activityType, newHistory, currentStatus });
                    }}
                    className="w-full bg-[#001736] text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all outline-none"
                  >
                     <Save className="w-5 h-5" /> Guardar Interacción en Historial
                  </button>
               </div>
             </div>
          )}

          {activeTab === 'Inteligencia' && (
             <div className="max-w-4xl mx-auto py-12">
                <div className="p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Activity className="w-64 h-64" />
                   </div>
                   <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-amber-400 rounded-2xl shadow-lg ring-4 ring-amber-400/20"><TrendingUp className="w-6 h-6 text-[#001736]" /></div>
                         <div>
                            <h3 className="text-2xl font-black italic tracking-tighter">Motor Comercial Predictivo</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Inteligencia Artificial CIMASUR</p>
                         </div>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 space-y-6">
                         <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-sm font-bold text-slate-300">Análisis del Perfil: <b className="text-white">{selectedClient.name}</b></span>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">Calculado Hoy</span>
                         </div>
                         <p className="text-sm text-slate-300 leading-relaxed font-medium">
                           Analizando categoría <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">[{selectedClient.categoria || selectedClient.clasificacion || 'General'}]</span> y ciclo de ventas de la escuela.
                         </p>
                         <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                           <p className="text-slate-200 text-sm italic">
                             {selectedClient.type === 'Lead' 
                               ? '💡 El prospecto muestra una alta posibilidad de conversión en los programas de Diplomado basándonos en su clasificación profesional. Se recomienda un seguimiento cercano con oferta de valor esta semana.' 
                               : '🚀 Alumno vigente. Su progresión académica indica que está listo para cross-selling en Módulos de Especialización superior.'}
                           </p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* Dummy placeholders for other tabs to show layout works */}
          {['Capacitaciones', 'Pagos', 'Documentos', 'Comercial', 'Seguimiento', 'Automatizaciones'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm border-dashed">
               <Activity className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-lg font-black text-slate-800 tracking-tight">Módulo {activeTab} en construcción</h3>
               <p className="text-xs text-slate-500 mt-2">Próximamente disponible en el ecosistema.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
