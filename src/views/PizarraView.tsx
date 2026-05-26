import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localDB, localAuth } from '../lib/auth';
import { addNotification } from '../lib/notifications';
import { Calendar, Clock, CheckCircle, Archive, Plus, Edit2, Trash2, MessageCircle, Send } from 'lucide-react';

interface NoteReply {
  id: string;
  autor: string;
  autorEmail: string;
  texto: string;
  fecha: string;
}

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
  respuestas?: NoteReply[];
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

  const [replyDialogNote, setReplyDialogNote] = useState<NoteRecord | null>(null);
  const [replyText, setReplyText] = useState('');

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

    const isNew = !editingId;
    await localDB.saveToCollection('pizarra_notes', payload);

    if (isNew || targetUsers.length > 0) {
       const notifUsers = [...new Set([...targetUsers, ...workersAllowed])];

       // Only explicitly send if there are targeted users or allowed workers
       if (notifUsers.length > 0) {
           await addNotification({
               title: 'Nueva Nota en Pizarra',
               message: `${user?.displayName || user?.email} te ha asignado/mencionado en una nota.`,
               type: 'info',
               sender: user?.email || 'Sistema',
               recipientRoles: [], 
               recipientUsers: notifUsers
           });
       } else if (isNew) {
           // Provide an explicit general notification or roles if no target was set
           await addNotification({
               title: 'Nueva Nota en Pizarra',
               message: `${user?.displayName || user?.email} ha creado una nueva nota global.`,
               type: 'info',
               sender: user?.email || 'Sistema',
               recipientRoles: ['admin', 'manager', 'lab', 'crm', 'school', 'gestion'], 
               recipientUsers: []
           });
       }
    }

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
    
    // Notify users involved in this note about the state change
    const targetUsers = note.targetUsers || (note.targetUser ? [note.targetUser] : []);
    const notifUsers = [...new Set([...targetUsers, ...(note.workersAllowed || []), note.autorEmail])].filter(email => email !== user?.email); // Do not notify oneself

    if (notifUsers.length > 0) {
        await addNotification({
            title: `Actualización de Nota en Pizarra`,
            message: `El estado de una nota ha cambiado a "${newState}".`,
            type: newState === 'Terminado' ? 'success' : 'info',
            sender: user?.email || 'Sistema',
            recipientRoles: [], 
            recipientUsers: notifUsers
        });
    }

    loadData();
  };

  const handleAddReply = async (note: NoteRecord) => {
    if (!replyText.trim()) return;
    
    const newReply: NoteReply = {
      id: crypto.randomUUID(),
      autor: user?.displayName || user?.email || 'Usuario',
      autorEmail: user?.email || '',
      texto: replyText.trim(),
      fecha: new Date().toISOString()
    };
    
    const updatedNote = {
      ...note,
      respuestas: [...(note.respuestas || []), newReply]
    };
    
    await localDB.saveToCollection('pizarra_notes', updatedNote);
    
    // Notify author and other involved users
    const notifUsers = [...new Set([
        note.autorEmail,
        ...(note.targetUsers || []),
        ...(note.targetUser ? [note.targetUser] : []),
        ...(note.respuestas?.map(r => r.autorEmail) || [])
    ])].filter(email => email !== user?.email);

    if (notifUsers.length > 0) {
       await addNotification({
           title: 'Nueva Respuesta en Pizarra',
           message: `${user?.displayName || user?.email} ha respondido a una nota.`,
           type: 'info',
           sender: user?.email || 'Sistema',
           recipientRoles: [], 
           recipientUsers: notifUsers
       });
    }

    setReplyText('');
    setReplyDialogNote(updatedNote as NoteRecord);
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
               <div className="flex justify-between items-center mb-2">
                 <label className="block text-[10px] font-black uppercase text-slate-400">Dirigido a (Usuarios)</label>
                 <div className="flex gap-1">
                   <button type="button" onClick={() => setTargetUsers(workers.map(w => w.email))} className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors">Todos</button>
                   <button type="button" onClick={() => setTargetUsers([])} className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors">Ninguno</button>
                 </div>
               </div>
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
               <div className="flex justify-between items-center mb-2">
                 <label className="block text-[10px] font-black uppercase text-slate-400">¿Quién puede ver? (Visibilidad)</label>
                 <div className="flex gap-1">
                   <button type="button" onClick={() => setWorkersAllowed(workers.map(w => w.email))} className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors">Todos</button>
                   <button type="button" onClick={() => setWorkersAllowed([])} className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors">Ninguno</button>
                 </div>
               </div>
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
                 <option value="Proceso">En Proceso</option>
                 <option value="Terminado">Terminado</option>
                 <option value="Archivar">Archivado/Finalizado</option>
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
                           <option value="Proceso">En Proceso</option>
                           <option value="Terminado">Terminado</option>
                           <option value="Archivar">Archivado / Finalizado</option>
                         </select>
                         
                         {(note.autorEmail === user?.email) && (
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEdit(note)} className="p-1.5 hover:bg-white/50 rounded-md transition-colors" title="Editar"><Edit2 className="w-3 h-3" /></button>
                             <button onClick={() => handleDelete(note.id!)} className="p-1.5 hover:bg-white/50 rounded-md transition-colors text-red-600" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                           </div>
                         )}
                      </div>
                      
                      <div className="mt-2 w-full">
                        <button 
                          onClick={() => setReplyDialogNote(note)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white/40 hover:bg-white/60 rounded-lg text-[9px] font-black uppercase transition-colors border border-black/5"
                        >
                          <MessageCircle className="w-3 h-3" />
                          {note.respuestas && note.respuestas.length > 0 ? `Respuestas (${note.respuestas.length})` : 'Responder'}
                        </button>
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

      {replyDialogNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-slate-800 flex items-center gap-2">
                 <MessageCircle className="w-5 h-5 text-[#38BDF8]" /> 
                 Oculto: Respuestas de la Nota
               </h3>
               <button onClick={() => setReplyDialogNote(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <Trash2 className="w-5 h-5 opacity-0" />
                 <span className="sr-only">Cerrar</span>
                 <svg className="w-5 h-5 absolute top-5 right-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
               <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                 <div className="text-xs font-bold text-slate-500 mb-2">Nota Original:</div>
                 <p className="text-sm text-slate-700 whitespace-pre-wrap">{replyDialogNote.comentario}</p>
                 <div className="mt-2 text-[10px] text-slate-400">Por {replyDialogNote.autor} el {new Date(replyDialogNote.fechaCreacion).toLocaleString()}</div>
                 {(() => {
                    const targets = replyDialogNote.targetUsers || (replyDialogNote.targetUser ? [replyDialogNote.targetUser] : []);
                    if (targets.length > 0) {
                      return (
                        <div className="mt-2 text-[10px] font-bold text-[#1E293B] bg-slate-100 p-2 rounded-lg">
                          A cargo: {targets.map(t => workers.find(w => w.email === t)?.displayName || t).join(', ')}
                        </div>
                      );
                    }
                    return null;
                 })()}
               </div>

               <div className="space-y-3">
                 {replyDialogNote.respuestas && replyDialogNote.respuestas.length > 0 ? (
                   replyDialogNote.respuestas.map(reply => (
                     <div key={reply.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase text-slate-500">
                          <span className="text-[#38BDF8]">{reply.autor}</span>
                          <span>{new Date(reply.fecha).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                          {reply.texto}
                        </p>
                     </div>
                   ))
                 ) : (
                   <p className="text-center text-slate-400 text-sm italic py-4">No hay respuestas aún. Sé el primero en responder.</p>
                 )}
               </div>
             </div>

             <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
               <textarea
                 value={replyText}
                 onChange={e => setReplyText(e.target.value)}
                 placeholder="Escribe una respuesta confidencial..."
                 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8] resize-none h-14"
               />
               <button 
                 onClick={() => {
                   handleAddReply(replyDialogNote);
                 }}
                 disabled={!replyText.trim()}
                 className="px-4 bg-[#1E293B] text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
               >
                 <Send className="w-5 h-5" />
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
