import React, { useState } from 'react';
import { FileText, Download, Edit, Trash2, History, FileSpreadsheet, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RecordActionsProps {
  onView?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onExcel?: () => void;
  onComment?: () => void;
  module?: 'lab' | 'crm' | 'school' | 'gestion' | 'admin' | 'manager';
}

export const RecordActions = ({ onView, onDownload, onEdit, onDelete, onHistory, onExcel, onComment, module }: RecordActionsProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useAuth();
  
  const userRoles = user?.roles || [user?.role || ''];
  const isAdmin = userRoles.includes('admin');
  
  // Permission checks
  const canEdit = isAdmin || !module || (user?.permissions?.[module]?.edit ?? true);
  const canDelete = isAdmin || !module || (user?.permissions?.[module]?.delete ?? true);

   return (
    <div className="flex items-center justify-center gap-2 relative">
      {onView && <button type="button" onClick={onView} title="Ver Registro" className="text-slate-600 hover:text-slate-800 transition-transform active:scale-90"><FileText className="w-4 h-4" /></button>}
      {onComment && <button type="button" onClick={onComment} title="Comentar" className="text-blue-500 hover:text-blue-700 transition-transform active:scale-90"><MessageCircle className="w-4 h-4" /></button>}
      {onDownload && <button type="button" onClick={onDownload} title="Descargar PDF" className="text-blue-600 hover:text-blue-800 transition-transform active:scale-90"><Download className="w-4 h-4" /></button>}
      {onExcel && <button type="button" onClick={onExcel} title="Descargar Excel" className="text-emerald-600 hover:text-emerald-800 transition-transform active:scale-90"><FileSpreadsheet className="w-4 h-4" /></button>}
      {onEdit && canEdit && <button type="button" onClick={onEdit} title="Editar" className="text-amber-600 hover:text-amber-800 transition-transform active:scale-90"><Edit className="w-4 h-4" /></button>}
      {onHistory && <button type="button" onClick={onHistory} title="Historial" className="text-purple-600 hover:text-purple-800 transition-transform active:scale-90"><History className="w-4 h-4" /></button>}
      {onDelete && canDelete && (
        <div className="relative inline-flex items-center justify-center">
          <button type="button" onClick={() => setShowConfirm(true)} title="Eliminar" className="text-red-500 hover:text-red-700 transition-all active:scale-90">
            <Trash2 className="w-4 h-4" />
          </button>
          
          {showConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[#152035] border-2 border-[#1E293B] text-center shadow-2xl rounded-3xl p-8 w-full max-w-sm scale-in-center animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                     <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Confirmar Eliminación</h4>
                  <p className="text-sm font-medium text-slate-500 mb-8 px-4">¿Está seguro de que desea eliminar este registro permanentemente? Esta acción es irreversible.</p>
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={async () => { setShowConfirm(false); await onDelete!(); }} className="w-full bg-red-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100">Sí, Eliminar Permanentemente</button>
                    <button type="button" onClick={() => setShowConfirm(false)} className="w-full bg-[#111A2E] text-slate-500 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">No, Mantener Registro</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
