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
  newIntranet: string;
  setNewIntranet: (val: string) => void;
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
  newIntranet,
  setNewIntranet,
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Data & Stats */}
        <div className="lg:col-span-8 p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-shadow">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600"><CreditCard className="w-5 h-5" /></div>
               <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inversión Recibida</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(selectedClient.montoTotalRecibido || 0)}</p>
               </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-shadow">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600"><Activity className="w-5 h-5" /></div>
               <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Estado de Cuenta</p>
                  <p className="text-lg font-black text-slate-800">{selectedClient.pago || 'Normal'}</p>
               </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-shadow">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600"><Calendar className="w-5 h-5" /></div>
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
            </div>
          </div>

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
                <div className="relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar-white pr-4">
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
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-4 bg-slate-50 border-l border-slate-200 p-8 space-y-8 flex flex-col h-full overflow-y-auto">
          <div className="space-y-6">
            <div className="relative">
              <h4 className="text-[11px] font-black text-[#001736] uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Activity className="w-4 h-4 text-indigo-500" /> Registrar Nueva Acción
              </h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Generar trazabilidad instantánea</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 space-y-6">
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

               <CRMField label="Detalles del Suceso">
                 <textarea 
                   className="w-full h-48 p-4 border border-slate-100 rounded-2xl bg-slate-50 focus:bg-white text-sm font-medium transition-all outline-none resize-none ring-2 ring-transparent focus:ring-blue-100 leading-relaxed shadow-inner" 
                   value={newHistory}
                   onChange={e => setNewHistory(e.target.value)}
                   placeholder="Documente aquí los hallazgos o pasos realizados con este cliente..."
                 />
               </CRMField>

               <div className="grid grid-cols-1 gap-4">
                 <CRMField label="Etapa de Gestión">
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
                 <CRMField label="Inscrito Intranet">
                    <select 
                      className={cn(
                        "w-full border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none transition-all",
                        (newIntranet || selectedClient.intranet) === 'Si' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}
                      value={newIntranet || selectedClient.intranet || 'No'}
                      onChange={e => setNewIntranet(e.target.value)}
                    >
                      <option value="No">No (Acceso denegado)</option>
                      <option value="Si">Si (Acceso total)</option>
                    </select>
                 </CRMField>
               </div>

               <button 
                 onClick={() => onUpdate({ activityType, newHistory, currentStatus, newIntranet })}
                 className="w-full bg-[#001736] text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all outline-none ring-4 ring-white"
               >
                  <Save className="w-5 h-5" /> Sincronizar Registro
               </button>
            </div>

            {extraTransferFields}
            
            {onTransfer && (
              <div className="pt-4 mt-4 border-t border-slate-200">
                <button 
                  onClick={onTransfer}
                  className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-amber-600 shadow-amber-100 transition-all active:scale-95 group"
                >
                   <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> Promover a Alumno
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-8 border-t border-slate-200">
            <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity className="w-16 h-16" />
               </div>
               <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Análisis Inteligente</p>
               </div>
               <h5 className="text-sm font-bold italic mb-3 leading-tight">Motor de Predicción CIMASUR:</h5>
               <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                 Analizando categoría <span className="text-amber-400">[{selectedClient.categoria || selectedClient.clasificacion || 'General'}]</span> y ciclo de ventas anual. 
                 {selectedClient.type === 'Lead' 
                   ? ' El prospecto muestra alta afinidad con el diplomado. Recomendamos cierre estratégico antes del próximo corte trimestral.' 
                   : ' Se sugiere escalar a nivel superior basado en su avance académico del ' + (selectedClient.avance || 0) + '%.'}
               </p>
               <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase text-slate-500">Último Análisis: Hoy</span>
                  <span className="text-[8px] font-black uppercase text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full">v5.0 Activo</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
