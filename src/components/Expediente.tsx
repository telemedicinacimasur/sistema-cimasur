import React from 'react';
import { FileText, Save, History, ArrowRight } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

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
}
//... rest of the file ...

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
  showComuna = true
}) => {
  return (
    <div className="bg-slate-50 min-h-[600px] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500 border border-slate-200">
      <div className="bg-[#001736] p-6 text-white flex justify-between items-center">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
           </div>
           <div>
             <h3 className="text-xl font-bold leading-tight">Expediente</h3>
             <p className="text-xs uppercase tracking-widest font-black text-blue-300 opacity-80">{selectedClient.name}</p>
           </div>
         </div>
         <button onClick={onClose} className="bg-red-900/40 border border-red-500/30 text-red-200 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-800 transition-all active:scale-95">Cerrar Expediente</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
         <div className="lg:col-span-8 p-6 lg:p-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">RUT</span>
                  <span className="text-sm font-bold text-[#001736]">{selectedClient.rut}</span>
               </div>
               {showComuna && (
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{comunaLabel}</span>
                    <span className="text-sm font-bold text-[#001736]">{selectedClient.region || '---'}</span>
                 </div>
               )}
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo</span>
                  <span className="text-sm font-bold text-[#001736]">{selectedClient.type || selectedClient.clasificacion}</span>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha Ingreso</span>
                  <span className="text-sm font-bold text-[#001736]">{formatDate(selectedClient.fechaIngreso)}</span>
               </div>
               {showIntranet && (
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                    <span className="block text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1">Inscrito Intranet</span>
                    <span className={cn(
                      "text-sm font-black italic",
                      (newIntranet || selectedClient.intranet) === 'Si' ? "text-emerald-600" : "text-red-500"
                    )}>{newIntranet || selectedClient.intranet || 'No'}</span>
                 </div>
               )}
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-tighter flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                     Historial detallado
                  </h4>
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
                    {categories.map(c => <option key={c}>{c}</option>)}
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

              {showIntranet && (
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
              )}

              <button 
                onClick={onUpdate}
                className="w-full bg-[#001736] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all active:scale-95 text-xs ring-4 ring-white"
              >
                 <Save className="w-5 h-5" /> Registrar en Expediente
              </button>
              {onTransfer && (
                <button 
                  onClick={onTransfer}
                  className="w-full mt-4 bg-amber-600 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all active:scale-95 text-xs ring-4 ring-amber-50"
                >
                   <ArrowRight className="w-5 h-5" /> Transferir a Alumno
                </button>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};
