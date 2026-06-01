import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  Trash2, 
  Search, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  FileText
} from 'lucide-react';
import { localDB } from '../../lib/auth';
import { cn, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function TrashBinManager() {
  const { user } = useAuth();
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('Todos');

  const getCollectionFriendlyName = (col: string) => {
    switch (col) {
      case 'order_tracking': return 'Seguimiento de Pedidos y Courier';
      case 'quotes': return 'Cotizaciones Históricas';
      case 'sales': return 'Registro de Ventas';
      case 'sales_gestion': return 'Ventas de Gestión';
      case 'dte_records': return 'Registros Contables DTE';
      case 'pet_payments': return 'Pagos Mascotas';
      case 'school_payments': return 'Pagos Alumnos Escuela';
      case 'students': return 'Fichas de Alumnos';
      case 'school_leads': return 'Leads Escuela';
      default: return col;
    }
  };

  const loadTrash = async () => {
    setIsLoading(true);
    try {
      const data = await localDB.getCollection('trash_bin');
      setTrashItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading trash_bin:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const getRecordSummary = (item: any) => {
    const data = item.recordData || {};
    const col = item.originalCollection;
    
    if (col === 'order_tracking') {
      return `Cotiz N°: ${data.nroCotiz || 'S/N'} | Órden: ${data.ot || 'Sin OT'} | Cliente: ${data.cliente || 'Sin Cliente'} | Situación: ${data.situacion || 'PENDIENTE'}`;
    }
    if (col === 'quotes') {
      return `Cotiz N°: ${data.nroCotiz || 'S/N'} | Cliente: ${data.cliente || 'S/S'} | Elaborado: ${data.fechaElab || ''} | Cantidad: ${data.undTotal || 0} UNDs`;
    }
    if (col === 'sales') {
      return `Venta N°: ${data.nroCotiz || 'S/N'} | Cliente: ${data.cliente || 'S/C'} | Fecha: ${data.fechaElab || ''} | Estado: ${data.estado || ''}`;
    }
    if (col === 'school_payments') {
      return `Pago Escuela | Alumno: ${data.alumno || 'S/A'} | Diplomado: ${data.diplomado || ''} | Cuota: ${data.nroCuota || 0} | Monto: $${data.monto || 0}`;
    }
    if (col === 'pet_payments') {
      return `Pago Mascota | Propietario: ${data.propietario || 'S/P'} | Mascota: ${data.nombrePaciente || ''} | Rut: ${data.rutPropietario || ''}`;
    }
    if (col === 'dte_records') {
      return `Factura N°: ${data.folio || 'S/N'} | Receptor: ${data.receptorNombre || ''} | Total: ${data.montoTotal || 0}`;
    }
    
    // Fallback labels
    const identifier = data.nroCotiz || data.folio || data.id || data.nombre || data.cliente || '';
    return `Registro ID: ${identifier} ${data.fecha ? '| Fecha: ' + data.fecha : ''}`;
  };

  const handleRestore = async (trashRecord: any) => {
    try {
      // 1. Save data back to original collection
      await localDB.saveToCollection(trashRecord.originalCollection, trashRecord.recordData);
      
      // 2. Delete from trash bin
      await localDB.deleteFromCollection('trash_bin', trashRecord.id);
      
      // 3. Optional Audit trail log
      if (user) {
        try {
          const { addAuditLog } = await import('../../lib/auth');
          await addAuditLog(user, `Restauró registro ID ${trashRecord.originalId} en la colección ${trashRecord.originalCollection}`, 'Papelera');
        } catch {}
      }

      // Refresh list
      alert(`✅ Restauración Exitosa:\n\nEl registro ha sido re-insertado de forma correcta en la colección "${getCollectionFriendlyName(trashRecord.originalCollection)}".`);
      window.dispatchEvent(new Event('db-change'));
      loadTrash();
    } catch (e) {
      console.error("Error restoring record:", e);
      alert("Lo sentimos, ocurrió un problema al restaurar el registro.");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm("⚠️ ELIMINACIÓN PERMANENTE:\n\n¿Está absolutamente seguro de eliminar permanentemente este registro de la papelera? Esta acción destruirá la información para siempre y no podrá recuperarse en el futuro.")) {
      try {
        await localDB.deleteFromCollection('trash_bin', id);
        window.dispatchEvent(new Event('db-change'));
        loadTrash();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar de la papelera.");
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    if (window.confirm(`⚠️ ESTÁ POR VACIAR COMPLETAMENTE LA PAPELERA DE RECICLAJE:\n\nSe eliminarán de forma irreversible todos los registros (${trashItems.length}) guardados en la papelera.\n\n¿Desea proceder?`)) {
      try {
        setIsLoading(true);
        for (const item of trashItems) {
          await localDB.deleteFromCollection('trash_bin', item.id);
        }
        window.dispatchEvent(new Event('db-change'));
        await loadTrash();
        alert("Papelera de reciclaje vaciada correctamente.");
      } catch (e) {
        console.error(e);
        alert("Ocurrió un error.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const availableCollections = useMemo(() => {
    const cols = new Set<string>();
    trashItems.forEach(item => {
      if (item.originalCollection) {
        cols.add(item.originalCollection);
      }
    });
    return Array.from(cols);
  }, [trashItems]);

  const filteredTrash = useMemo(() => {
    return trashItems.filter(item => {
      const summary = getRecordSummary(item).toLowerCase();
      const colFriendly = getCollectionFriendlyName(item.originalCollection).toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = summary.includes(query) || colFriendly.includes(query) || item.originalId?.toLowerCase().includes(query);
      const matchesCollection = collectionFilter === 'Todos' || item.originalCollection === collectionFilter;
      
      return matchesSearch && matchesCollection;
    }).sort((a,b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  }, [trashItems, searchQuery, collectionFilter]);

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-[#334155] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-[#38BDF8]" />
            Papelera de Reciclaje CIMASUR (Seguridad de Datos)
          </h4>
          <p className="text-xs text-slate-400">
            Cualquier registro eliminado en la plataforma será respaldado automáticamente aquí antes de ser borrado permanentemente, protegiendo su administración histórica.
          </p>
        </div>
        
        {trashItems.length > 0 && (
          <button
            type="button"
            onClick={handleEmptyTrash}
            className="px-4 py-2 bg-rose-550/10 hover:bg-rose-550/20 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar Papelera ({trashItems.length})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0F172A] p-4 rounded-2xl border border-[#1E293B]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, cotización, folio u otros detalles del registro eliminado..."
            className="w-full bg-[#152035] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#38BDF8] transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-start md:self-auto shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Módulo:</span>
          <select
            value={collectionFilter}
            onChange={e => setCollectionFilter(e.target.value)}
            className="bg-[#152035] text-white text-xs border border-[#1E293B] px-3 py-2 rounded-xl outline-none cursor-pointer font-bold focus:border-[#38BDF8] w-full md:w-auto"
          >
            <option value="Todos">Todos los Módulos</option>
            {availableCollections.map(col => (
              <option key={col} value={col}>
                {getCollectionFriendlyName(col)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadTrash}
            disabled={isLoading}
            className="p-2 bg-[#152035] hover:bg-[#1C2C47] text-slate-400 hover:text-white rounded-xl border border-[#1E293B] transition-all cursor-pointer"
            title="Recargar Papelera"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-[#152035] rounded-3xl border border-[#1E293B] overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#38BDF8] animate-spin" />
            <span className="text-xs font-bold text-slate-400">Consultando papelera de seguridad...</span>
          </div>
        ) : filteredTrash.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#111A2E] flex items-center justify-center text-[#38BDF8]/20 border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-black text-white uppercase tracking-wider">Papelera Limpia</h5>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {searchQuery || collectionFilter !== 'Todos' 
                  ? 'No se encontraron registros eliminados coincidiendo con los filtros.' 
                  : 'Excelente, no hay registros eliminados en este momento.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1B2942]/60 border-b border-[#1E293B] text-slate-400">
                  <th className="p-4 font-black uppercase tracking-widest text-[9px]">Módulo Original</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[9px]">Fecha Eliminación</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[9px]">Resumen de Contenido del Registro</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[9px] text-right">Acciones de Seguridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {filteredTrash.map((item) => (
                  <tr key={item.id} className="hover:bg-[#111A2E]/30 transition-colors group">
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg uppercase tracking-wide">
                        {getCollectionFriendlyName(item.originalCollection)}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-400">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(item.deletedAt).toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-bold leading-relaxed pr-6 max-w-xl truncate">
                        {getRecordSummary(item)}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>Original ID: <strong>{item.originalId}</strong></span>
                      </div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                          title="Restaurar registro a su módulo original"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(item.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-505/20 text-rose-400 border border-rose-500/10 rounded-lg transition-all hover:scale-105 cursor-pointer"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#1E293B]/20 p-4 rounded-2xl border border-[#1E293B] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
          <span className="font-bold text-white block">Aviso de Resiliency de Datos CIMASUR</span>
          Cualquier tipo de documento que haya sido limpiado por purgas automáticas, o borrado manualmente de las pestañas de Administración (como Cotizaciones, Clientes, Facturas u Historial de Ventas) puede ser visualizado y restaurado inmediatamente desde esta consola.
        </div>
      </div>
    </div>
  );
}
