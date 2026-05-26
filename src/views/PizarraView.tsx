import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localDB, localAuth } from '../lib/auth';
import { Calendar, Clock, CheckCircle, Archive, Plus, Edit2, Trash2 } from 'lucide-react';

interface NoteRecord {
  id?: string;
  comentario: string;
  autor: string;
  autorEmail: string;
  targetUser?: string;
  targetUsers?: string[];
  workersAllowed: string[]; // empty means all
  fechaInicio: string;
  fechaTermino: string;
  estado: 'Pendiente' | 'Proceso' | 'Terminado' | 'Archivar';
  fechaCreacion: string;
}

export default function PizarraView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [workersAllowed, setWorkersAllowed] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaTermino, setFechaTermino] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState<'Pendiente' | 'Proceso' | 'Terminado' | 'Archivar'>('Pendiente');

  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allNotes, allUsers] = await Promise.all([
        localDB.getCollection('pizarra_notes'),
        localAuth.getAllUsers()
      ]);
      setNotes(allNotes);
      setWorkers(allUsers.filter(u => u.email !== user?.email));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;

    const payload: NoteRecord = {
      ...(editingId ? { id: editingId } : { id: crypto.randomUUID(), fechaCreacion: new Date().toISOString() }),
      comentario,
      autor: user?.displayName || user?.email || 'Usuario',
      autorEmail: user?.email || 'usuario@cimasur.cl',
      targetUser: '', // legacy backwards compatibility
      targetUsers,
      workersAllowed,
      fechaInicio,
      fechaTermino,
      estado,
      ...(editingId ? { fechaCreacion: notes.find(n => n.id === editingId)?.fechaCreacion || new Date().toISOString() } : {})
    };

    await localDB.saveToCollection('pizarra_notes', payload);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setComentario('');
    setTargetUsers([]);
    setWorkersAllowed([]);
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setFechaTermino(new Date().toISOString().split('T')[0]);
    setEstado('Pendiente');
    setIsEditing(false);
    setEditingId(null);
  };

  const startEdit = (note: NoteRecord) => {
    setEditingId(note.id || null);
    setComentario(note.comentario);
    setTargetUsers(note.targetUsers || (note.targetUser ? [note.targetUser] : []));
    setWorkersAllowed(note.workersAllowed || []);
    setFechaInicio(note.fechaInicio || new Date().toISOString().split('T')[0]);
    setFechaTermino(note.fechaTermino || new Date().toISOString().split('T')[0]);
    setEstado(note.estado || 'Pendiente');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta nota?')) {
      await localDB.deleteFromCollection('pizarra_notes', id);
      loadData();
    }
  };

  const handleStateChange = async (note: NoteRecord, newState: 'Pendiente' | 'Proceso' | 'Terminado' | 'Archivar') => {
    await localDB.saveToCollection('pizarra_notes', { ...note, estado: newState });
    loadData();
  };

  // Filter logic
  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
  const visibleNotes = notes.filter(note => {
    if (isAdmin) return true;
    if (note.autorEmail === user?.email) return true;
    
    const targets = note.targetUsers || (note.targetUser ? [note.targetUser] : []);
    if (targets.includes(user?.email || '') || targets.includes(user?.displayName || '')) return true;
    
    if (note.workersAllowed && note.workersAllowed.length > 0) {
      return note.workersAllowed.includes(user?.email || '');
    }
    return true; // if empty, visible to all
  }).filter(note => {
    if (!showArchived && note.estado === 'Archivar') return false;
    return true;
  }).sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase">Pizarra de Notas</h1>
          <p className="text-slate-500 text-sm font-medium">Tablero central de comentarios y requerimientos.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${
              showArchived ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
          </button>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[#38BDF8] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#0284C7] transition-all shadow"
            >
              <Plus className="w-4 h-4" /> Nueva Nota
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow border border-slate-200 space-y-4">
          <h2 className="text-lg font-black text-[#1E293B] uppercase mb-4">
            {editingId ? 'Editar Nota' : 'Redactar Nueva Nota'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Comentario / Nota</label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                placeholder="Escribe tu comentario aquí..."
                required
              />
            </div>

            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Dirigido a (Usuarios)</label>
               <div className="relative border border-slate-200 bg-slate-50 rounded-xl max-h-32 overflow-y-auto p-2">
                 <div className="text-xs text-slate-500 mb-1">Si no seleccionas a nadie, no va dirigido a nadie en específico.</div>
                 {workers.map(w => (
                   <label key={w.email} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                     <input
                       type="checkbox"
                       checked={targetUsers.includes(w.email)}
                       onChange={(e) => {
                         if (e.target.checked) setTargetUsers([...targetUsers, w.email]);
                         else setTargetUsers(targetUsers.filter(email => email !== w.email));
                       }}
                       className="rounded text-[#38BDF8] focus:ring-[#38BDF8]"
                     />
                     <span className="text-sm text-slate-700">{w.displayName || w.email}</span>
                   </label>
                 ))}
               </div>
            </div>

            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">¿Quién puede ver? (Visibilidad)</label>
               <div className="relative border border-slate-200 bg-slate-50 rounded-xl max-h-32 overflow-y-auto p-2">
                 <div className="text-xs text-slate-500 mb-1">Si no seleccionas a nadie, todos podrán verla.</div>
                 {workers.map(w => (
                   <label key={w.email} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                     <input
                       type="checkbox"
                       checked={workersAllowed.includes(w.email)}
                       onChange={(e) => {
                         if (e.target.checked) setWorkersAllowed([...workersAllowed, w.email]);
                         else setWorkersAllowed(workersAllowed.filter(email => email !== w.email));
                       }}
                       className="rounded text-[#38BDF8] focus:ring-[#38BDF8]"
                     />
                     <span className="text-sm text-slate-700">{w.displayName || w.email}</span>
                   </label>
                 ))}
               </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Fecha de Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Fecha de Término</label>
              <input
                type="date"
                value={fechaTermino}
                onChange={e => setFechaTermino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                required
              />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Estado</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
              >
                 <option value="Pendiente">Pendiente</option>
                 <option value="Proceso">Proceso</option>
                 <option value="Terminado">Terminado</option>
                 <option value="Archivar">Archivar</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#1E293B] text-white rounded-xl text-xs font-black uppercase hover:bg-black shadow"
            >
              Guardar Nota
            </button>
          </div>
        </form>
      )}

      {/* Whiteboard Layout */}
      <div className="bg-[#f0f4f8] p-8 rounded-3xl min-h-[500px] border-4 border-slate-200 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {visibleNotes.map(note => {
             let noteColor = 'bg-[#fcf8e3] border-[#faebcc] shadow-amber-900/10 text-[#8a6d3b]';
             let statusColor = 'bg-amber-100 text-amber-800';
             let statusIcon = <Clock className="w-3 h-3" />;
             
             if (note.estado === 'Proceso') {
               noteColor = 'bg-[#d9edf7] border-[#bce8f1] shadow-blue-900/10 text-[#31708f]';
               statusColor = 'bg-blue-100 text-blue-800';
             } else if (note.estado === 'Terminado') {
               noteColor = 'bg-[#dff0d8] border-[#d6e9c6] shadow-emerald-900/10 text-[#3c763d]';
               statusColor = 'bg-emerald-100 text-emerald-800';
               statusIcon = <CheckCircle className="w-3 h-3" />;
             } else if (note.estado === 'Archivar') {
               noteColor = 'bg-slate-100 border-slate-300 shadow-slate-900/10 text-slate-500 opacity-80';
               statusColor = 'bg-slate-200 text-slate-700';
               statusIcon = <Archive className="w-3 h-3" />;
             }

             return (
              <div key={note.id} className={`group ${noteColor} p-5 rounded-xl border-2 relative shadow-[0_4px_15px_rgba(0,0,0,0.05)] transform transition-all hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] flex flex-col`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 rounded-full bg-red-500/80 shadow-sm border border-red-600/30 rotate-3" />
                
                <div className="mb-3 pr-6 mt-1">
                  <div className="text-[10px] font-black uppercase opacity-60 mb-1 flex justify-between items-center">
                    <span>De: {note.autor.split(' ')[0]}</span>
                    <span>{new Date(note.fechaCreacion).toLocaleDateString()}</span>
                  </div>
                  {(() => {
                    const targets = note.targetUsers || (note.targetUser ? [note.targetUser] : []);
                    if (targets.length > 0) {
                      return (
                        <div className="text-[10px] font-bold text-[#1E293B] bg-white/40 px-2 py-0.5 rounded inline-block mb-1 max-w-full truncate" title={targets.map(t => workers.find(w => w.email === t)?.displayName || t).join(', ')}>
                          Para: {targets.map(t => workers.find(w => w.email === t)?.displayName?.split(' ')[0] || t.split('@')[0]).join(', ')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {note.workersAllowed && note.workersAllowed.length > 0 && (
                     <div className="text-[9px] font-bold opacity-70 mb-2 truncate" title={note.workersAllowed.join(', ')}>
                       Visible solo por seleccionados
                     </div>
                  )}
                </div>
                
                <p className="text-sm font-medium whitespace-pre-wrap flex-1 mb-4 leading-snug">
                  {note.comentario}
                </p>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold opacity-75 border-t border-black/10 pt-2">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Inicio: {new Date(note.fechaInicio).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold opacity-75">
                    <div className="flex flex-col gap-1 w-full mt-1">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Fin: {new Date(note.fechaTermino).toLocaleDateString()}</div>
                      
                      <div className="flex mt-2 justify-between items-center w-full bg-white/30 p-1.5 rounded-lg border border-black/5">
                         <select
                           value={note.estado}
                           onChange={(e) => handleStateChange(note, e.target.value as any)}
                           className={`text-[9px] font-black uppercase pl-2 pr-4 py-1 rounded appearance-none outline-none cursor-pointer ${statusColor}`}
                         >
                           <option value="Pendiente">Pendiente</option>
                           <option value="Proceso">Proceso</option>
                           <option value="Terminado">Terminado</option>
                           <option value="Archivar">Archivar</option>
                         </select>
                         
                         {(isAdmin || note.autorEmail === user?.email) && (
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEdit(note)} className="p-1.5 hover:bg-white/50 rounded-md transition-colors" title="Editar"><Edit2 className="w-3 h-3" /></button>
                             <button onClick={() => handleDelete(note.id!)} className="p-1.5 hover:bg-white/50 rounded-md transition-colors text-red-600" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
             );
          })}
          
          {visibleNotes.length === 0 && (
             <div className="col-span-full h-40 flex items-center justify-center text-slate-400 font-bold italic border-2 border-dashed border-slate-300 rounded-3xl">
               La pizarra está limpia. No hay notas visibles.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
