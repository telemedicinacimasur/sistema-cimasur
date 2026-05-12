import React, { useState } from 'react';
import { FileText, Download, Edit, Trash2, History, FileSpreadsheet, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RecordActionsProps {
  onView?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onExcel?: () => void;
  onComment?: () => void;
}

export const RecordActions = ({ onView, onDownload, onEdit, onDelete, onHistory, onExcel, onComment }: RecordActionsProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-center gap-2 relative">
      {onView && <button type="button" onClick={onView} title="Ver Expediente" className="text-slate-600 hover:text-slate-800"><FileText className="w-4 h-4" /></button>}
      {onComment && <button type="button" onClick={onComment} title="Comentar" className="text-blue-500 hover:text-blue-700"><MessageCircle className="w-4 h-4" /></button>}
      {onDownload && <button type="button" onClick={onDownload} title="Descargar PDF" className="text-blue-600 hover:text-blue-800"><Download className="w-4 h-4" /></button>}
      {onExcel && <button type="button" onClick={onExcel} title="Descargar Excel" className="text-emerald-600 hover:text-emerald-800"><FileSpreadsheet className="w-4 h-4" /></button>}
      {onEdit && <button type="button" onClick={onEdit} title="Editar" className="text-amber-600 hover:text-amber-800"><Edit className="w-4 h-4" /></button>}
      {onHistory && <button type="button" onClick={onHistory} title="Historial" className="text-purple-600 hover:text-purple-800"><History className="w-4 h-4" /></button>}
      {onDelete && (
        <>
          <button type="button" onClick={() => setShowConfirm(true)} title="Eliminar" className="text-red-500 hover:text-red-700 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          
          {showConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white border text-center border-slate-200 shadow-2xl rounded-2xl p-6 w-full max-w-sm">
                 <p className="text-sm font-bold text-slate-700 mb-6">¿Desea eliminar este registro permanentemente?</p>
                 <div className="flex justify-center gap-3">
                   <button type="button" onClick={async () => { setShowConfirm(false); await onDelete!(); }} className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase hover:bg-red-700 transition-colors">Sí, Eliminar</button>
                   <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-xs font-black uppercase hover:bg-slate-200 transition-colors">No, Cancelar</button>
                 </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
