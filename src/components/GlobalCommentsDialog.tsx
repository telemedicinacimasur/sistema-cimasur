import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, User, Tag, Calendar, Filter, Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { localDB, localAuth } from '../lib/auth';
import { addNotification } from '../lib/notifications';
import { cn } from '../lib/utils';

interface GlobalCommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommentReply {
  id: string;
  autor: string;
  texto: string;
  fecha: string;
}

interface CommentRecord {
  id?: string;
  modulo: string;
  subModulo: string;
  comentario: string;
  autor: string;
  autorEmail: string;
  fecha: string;
  trabajadorMencionado?: string; // email or username
  estado?: 'Pendiente' | 'En proceso' | 'Comprado';
  visibilidad?: string[]; // user emails allowed to see, empty = all
  respuestas?: CommentReply[];
}

export const GlobalCommentsDialog: React.FC<GlobalCommentsDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedModulo, setSelectedModulo] = useState('');
  const [selectedSubModulo, setSelectedSubModulo] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [selectedTrabajador, setSelectedTrabajador] = useState('');
  const [visibilidad, setVisibilidad] = useState<string[]>([]);
  
  // Reply states
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Feed Filter states
  const [filterModulo, setFilterModulo] = useState('Todos');

  // Sub-modules definition
  const subModulesMap: Record<string, string[]> = {
    'Laboratorio': [
      'Evaluación Gotas Puras',
      'Elaboración Gotas y Diluciones',
      'Ingreso Nosodes',
      'Ficha Tinturas Madres',
      'Preparación Gotas Puras',
      'Registro de Insumos laboratorio T.M. y otros',
      'Vademécum',
      'Mantención',
      'Stock de Insumo Diario',
      'Seguimiento de Pedidos',
      'Formulación Magistral'
    ],
    'Administración': [
      'Seguimiento de Cotizaciones',
      'Detalle de Ventas',
      'Detalle de Ventas GESTIÓN',
      'Detalle de DTE',
      'Control de Pagos Veterinarios',
      'Saldos Escuela Cimasur',
      'Gestión de Códigos y Diluciones',
      'Resumen de ventas Frascos y Pesos',
      'Matriz de Presupuesto y Flujo'
    ],
    'Comercial CRM': [
      'Ficha de Cliente',
      'Historial de Clientes',
      'Historial de Actividades Recientes'
    ],
    'Gestión': [
      'Clientes Estratégicos',
      'Historial de Actividades',
      'Expedientes de Gestión'
    ],
    'Escuela CIMASUR': [
      'Matrícula de Alumnos',
      'Control de Pagos',
      'Registro Académico',
      'Reporte 360'
    ]
  };

  const subModulesDescriptions: Record<string, string> = {
    // Laboratorio
    'Evaluación Gotas Puras': 'Control de estado para elaboración.',
    'Elaboración Gotas y Diluciones': 'Registro de gotas puras y diluciones.',
    'Ingreso Nosodes': 'Registro de muestras médicas - nosodes clientes.',
    'Ficha Tinturas Madres': 'Preparación de tintura madre.',
    'Preparación Gotas Puras': 'Composición y formulación comparativa.',
    'Registro de Insumos laboratorio T.M. y otros': 'Detalle Ingreso Productos para Tinturas.',
    'Vademécum': 'Productos requeridos para productos de vademécum.',
    'Mantención': 'Registro de limpieza y calibración de equipos de laboratorio.',
    'Stock de Insumo Diario': 'Control de saldos por área de producción.',
    'Seguimiento de Pedidos': 'Trazabilidad, Courier y Estados de Envío.',
    'Formulación Magistral': 'Elaboración y composición de fórmulas magistrales.',

    // Administración
    'Seguimiento de Cotizaciones': 'Control de presupuestos, vendedores y estados de aprobación.',
    'Detalle de Ventas': 'Registro diario de facturas y boletas emitidas por cliente.',
    'Detalle de Ventas GESTIÓN': 'Registro diario de ventas con detalle de productos y cotización.',
    'Detalle de DTE': 'Control administrativo de documentos tributarios electrónicos.',
    'Control de Pagos Veterinarios': 'Registro de pagos tutor, mail, fono y honorarios veterinarios.',
    'Saldos Escuela Cimasur': 'Control de pagos de alumnos, meta anual y gastos académicos.',
    'Gestión de Códigos y Diluciones': 'Gestión de Códigos y Diluciones.',
    'Resumen de ventas Frascos y Pesos': 'Análisis dinámico de volumen de frascos y recaudación por documentos.',
    'Matriz de Presupuesto y Flujo': 'Control detallado de presupuesto anual, proyecciones y gastos mensuales.',

    // Comercial CRM
    'Ficha de Cliente': 'Gestión y datos de contacto de clientes.',
    'Historial de Clientes': 'Registro de interacciones históricas de clientes CRM.',
    'Historial de Actividades Recientes': 'Registro cronológico de llamadas, reuniones y seguimientos.',

    // Gestión
    'Clientes Estratégicos': 'Seguimiento de convenios y clientes preferenciales.',
    'Historial de Actividades': 'Registro cronológico de actividades de gestión.',
    'Expedientes de Gestión': 'Carpeta digital con todos los antecedentes del cliente.',

    // Escuela CIMASUR
    'Matrícula de Alumnos': 'Registro y control del proceso de matrícula.',
    'Control de Pagos': 'Control de cuotas y estados de pago estudiantiles.',
    'Registro Académico': 'Historial de calificaciones y asistencia académica.',
    'Reporte 360': 'Visión integral del progreso de los alumnos.'
  };

  const moduleRoles: Record<string, string> = {
    'Laboratorio': 'lab',
    'Administración': 'manager',
    'Comercial CRM': 'crm',
    'Gestión': 'gestion',
    'Escuela CIMASUR': 'school'
  };

  // Extract logged-in user roles
  const userRoles = user?.roles ? user.roles : [user?.role || 'viewer'];
  const isAdmin = userRoles.map(r => r.toLowerCase()).includes('admin');

  // Determine which modules are visible/actionable for this user
  const visibleModules = Object.keys(subModulesMap).filter(modName => {
    if (isAdmin) return true;
    const requiredRole = moduleRoles[modName];
    return userRoles.some(r => r.toLowerCase() === requiredRole || r.toLowerCase() === `viewer_${requiredRole}`);
  });

  // Load comments & workers on mount
  const loadData = async () => {
    setLoading(true);
    try {
      const [allComments, allUsers] = await Promise.all([
        localDB.getCollection('comments'),
        localAuth.getAllUsers()
      ]);
      
      // Sort comments by date newest first
      const sortedComments = [...allComments].sort((a, b) => b.fecha.localeCompare(a.fecha));
      setComments(sortedComments);
      setWorkers(allUsers.filter(u => u.email !== user?.email));
    } catch (e) {
      console.error("Error loading comments", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Auto-select first visible module
      if (visibleModules.length > 0) {
        setSelectedModulo(visibleModules[0]);
        setSelectedSubModulo(subModulesMap[visibleModules[0]][0]);
      }
    }
  }, [isOpen]);

  // Handle module selection changes
  const handleModuloChange = (modName: string) => {
    setSelectedModulo(modName);
    const submodules = subModulesMap[modName] || [];
    setSelectedSubModulo(submodules[0] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim() || !selectedModulo || !selectedSubModulo) return;

    const targetRole = moduleRoles[selectedModulo] || 'viewer';
    const tagWorker = selectedTrabajador ? selectedTrabajador : undefined;

    const commentItem: CommentRecord = {
      id: crypto.randomUUID(),
      modulo: selectedModulo,
      subModulo: selectedSubModulo,
      comentario: nuevoComentario,
      autor: user?.displayName || user?.email || 'Usuario',
      autorEmail: user?.email || 'usuario@cimasur.cl',
      fecha: new Date().toISOString(),
      trabajadorMencionado: tagWorker,
      estado: 'Pendiente',
      visibilidad: visibilidad.length > 0 ? visibilidad : undefined,
      respuestas: []
    };

    try {
      // Save comment to database
      await localDB.saveToCollection('comments', commentItem);

      // Create interactive notifications
      const recipientRoles = ['admin', targetRole];
      const recipientUsers = tagWorker ? [tagWorker] : [];

      const mentionText = tagWorker ? ` (Dirigido a: ${tagWorker})` : '';
      await addNotification({
         title: `Nuevo Comentario: ${selectedSubModulo}`,
         message: `${user?.displayName || 'Usuario'} comentó en ${selectedModulo} > ${selectedSubModulo}: "${nuevoComentario}"${mentionText}`,
         recipientRoles,
         recipientUsers,
         sender: user?.displayName || user?.email || 'Usuario'
      });

      // Reset fields
      setNuevoComentario('');
      setSelectedTrabajador('');
      setVisibilidad([]);
      
      // Reload feed
      await loadData();
    } catch (err) {
      console.error("Error saving comment", err);
    }
  };

  // Logged-in user has permission to see comments only for their visible modules
  const filteredCommentsFeed = comments.filter(c => {
    const isModVisible = isAdmin || visibleModules.includes(c.modulo);
    if (!isModVisible) return false;

    if (filterModulo !== 'Todos' && c.modulo !== filterModulo) {
      return false;
    }
    
    // Visibility check
    if (c.visibilidad && c.visibilidad.length > 0) {
      if (!isAdmin && !c.visibilidad.includes(user?.email || '')) {
        return false; // Not in allowed list and not admin
      }
    }
    
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: 'Pendiente' | 'En proceso' | 'Comprado') => {
    try {
      const dbComments = await localDB.getCollection('comments');
      const target = dbComments.find((c: any) => c.id === id);
      if (target) {
        target.estado = newStatus;
        await localDB.saveToCollection('comments', target);
        loadData();
      }
    } catch (e) { console.error(e); }
  };

  const handleReplySubmit = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const dbComments = await localDB.getCollection('comments');
      const target = dbComments.find((c: any) => c.id === commentId);
      if (target) {
        if (!target.respuestas) target.respuestas = [];
        target.respuestas.push({
          id: crypto.randomUUID(),
          autor: user?.displayName || user?.email || 'Usuario',
          texto: replyText,
          fecha: new Date().toISOString(),
        });
        await localDB.saveToCollection('comments', target);
        setReplyText('');
        setReplyingTo(null);
        loadData();
      }
    } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#060B13]/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-[#0B1527] border border-[#1E3A5F]/80 rounded-3xl w-full max-w-5xl h-[85vh] shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#1E3A5F]/40 bg-[#111C31]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/30 text-sky-400">
              <MessageSquare className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-black text-xl text-white uppercase tracking-tighter">
                Comentarios Inter-Módulo
              </h2>
              <p className="text-slate-400 text-xs font-bold">
                Red centralizada de comentarios, coordinación de equipos y alertas.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* TAREAS / NOTAS TIPO CALENDARIO */}
        <div className="bg-[#091120] border-b border-[#1E3A5F]/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
              Calendario de Tareas - {new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {comments.filter(c => c.trabajadorMencionado && c.estado !== 'Comprado').length === 0 ? (
              <div className="text-xs text-slate-500 font-bold italic py-2 px-4 bg-[#111C31] rounded-xl border border-slate-700/50">
                No hay tareas pendientes asignadas para este mes.
              </div>
            ) : (
              comments
                .filter(c => c.trabajadorMencionado && c.estado !== 'Comprado')
                .map(c => (
                  <div key={`task_${c.id}`} className="min-w-[240px] max-w-[280px] bg-[#152035] p-3 rounded-xl border border-emerald-500/20 shadow-md shrink-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">
                          Para: {c.trabajadorMencionado}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(c.fecha).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold mb-2 break-words line-clamp-3 leading-snug">
                        {c.comentario}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                       <span className={cn("text-[9px] font-black uppercase p-1 px-2 rounded", c.estado === 'En proceso' ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")}>
                         {c.estado || 'Pendiente'}
                       </span>
                       <button onClick={() => handleStatusChange(c.id!, 'Comprado')} className="text-[9px] font-black uppercase bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-slate-700">
                         Archivar ✔
                       </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#1E3A5F]/40 overflow-hidden">
          
          {/* Left panel: Create Comment */}
          <div className="w-full md:w-[40%] p-6 overflow-y-auto bg-[#0C192E]">
            <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider mb-4 flex items-center gap-2">
              <Send className="w-4 h-4" /> Registrar Nuevo Comentario
            </h3>

            {visibleModules.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/35 rounded-2xl p-4 text-center">
                <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-black text-white uppercase">Sin permisos de escritura</p>
                <p className="text-slate-400 text-[11px] font-bold mt-1">No tienes módulos asignados con permisos visibles.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Module selection */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Módulo Destino</label>
                  <select
                    className="w-full bg-[#111C31] text-white border-2 border-[#1E3A5F]/60 rounded-xl p-3 text-xs font-bold focus:border-sky-500 outline-none transition-colors"
                    value={selectedModulo}
                    onChange={(e) => handleModuloChange(e.target.value)}
                    required
                  >
                    {visibleModules.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-module filter/selection */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Sub-Módulo Asociado</label>
                  <select
                    className="w-full bg-[#111C31] text-white border-2 border-[#1E3A5F]/60 rounded-xl p-3 text-xs font-bold focus:border-sky-500 outline-none transition-colors"
                    value={selectedSubModulo}
                    onChange={(e) => setSelectedSubModulo(e.target.value)}
                    required
                  >
                    {(subModulesMap[selectedModulo] || []).map(sm => (
                      <option key={sm} value={sm}>{sm}</option>
                    ))}
                  </select>
                  {subModulesDescriptions[selectedSubModulo] && (
                    <span className="text-[10px] text-sky-400 font-bold block mt-1.5 italic bg-sky-500/5 p-2 rounded-lg border border-sky-500/15">
                      💡 {subModulesDescriptions[selectedSubModulo]}
                    </span>
                  )}
                </div>

                {/* Mention a specific worker (email/username) */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Dirigido a Trabajador (Opcional)</label>
                  <select
                    className="w-full bg-[#111C31] text-white border-2 border-[#1E3A5F]/60 rounded-xl p-3 text-xs font-bold focus:border-sky-500 outline-none transition-colors"
                    value={selectedTrabajador}
                    onChange={(e) => setSelectedTrabajador(e.target.value)}
                  >
                    <option value="">A todo el equipo del módulo</option>
                    {workers.map(w => (
                      <option key={w.uid} value={w.email || w.displayName}>{w.displayName || w.email} ({w.role})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">
                    Esto enviará una notificación dirigida directamente a este usuario.
                  </span>
                </div>

                {/* Visibility logic */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Visibilidad (Quién lo puede ver)</label>
                  <select
                    multiple
                    className="w-full bg-[#111C31] text-white border-2 border-[#1E3A5F]/60 rounded-xl p-3 text-xs font-bold focus:border-sky-500 outline-none transition-colors h-24"
                    value={visibilidad}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions).map(o => o.value);
                      if (options.includes('')) setVisibilidad([]);
                      else setVisibilidad(options);
                    }}
                  >
                    <option value="">Todos los que tengan acceso</option>
                    {workers.map(w => (
                      <option key={`vis_${w.uid}`} value={w.email}>{w.displayName || w.email}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">
                    Usa Ctrl/Cmd + click para seleccionar varios. (Vacío = todos).
                  </span>
                </div>

                {/* Actual Comment textarea */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Comentario / Mensaje</label>
                  <textarea
                    className="w-full bg-[#111C31] text-white border-2 border-[#1E3A5F]/60 rounded-xl p-3 text-xs font-medium h-28 focus:border-sky-500 outline-none transition-colors resize-none"
                    placeholder="Escribe aquí el mensaje, directriz o consulta para tu equipo..."
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    required
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(56,189,248,0.2)]"
                >
                  <Send className="w-4 h-4" /> GUARDAR COMENTARIO
                </button>
              </form>
            )}
          </div>

          {/* Right panel: Recent History Feed */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-[#0A111F]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" /> Historial de Comentarios Recientes
              </h3>
              
              {/* Filters for Feed */}
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  className="bg-[#111C31] text-[#38BDF8] border border-[#1E3A5F]/50 rounded-lg p-1 px-2.5 font-bold outline-none"
                  value={filterModulo}
                  onChange={(e) => setFilterModulo(e.target.value)}
                >
                  <option value="Todos">Todos los Módulos</option>
                  {visibleModules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comments scrollfeed */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                  Buscando historial de comentarios en base de datos...
                </div>
              ) : filteredCommentsFeed.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-[#1E3A5F]/30 rounded-2xl bg-[#090F1B]/40 text-slate-400 text-xs font-medium italic">
                  No se han registrado comentarios en tus módulos accesibles aún.
                </div>
              ) : (
                filteredCommentsFeed.map((c, i) => (
                  <div 
                    key={c.id || i}
                    className="p-4 bg-[#111C31]/90 rounded-2xl border border-[#1E3A5F]/40 hover:border-sky-500/40 hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all flex flex-col relative overflow-hidden group"
                  >
                    {/* Header line of item */}
                    <div className="flex justify-between items-start gap-3 mb-2 flex-wrap text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-700 font-bold text-white flex items-center justify-center text-[10px]">
                          {c.autor[0]?.toUpperCase()}
                        </div>
                        <span className="font-extrabold text-[#38BDF8]">{c.autor}</span>
                        <span className="text-slate-500 font-bold">&lt;{c.autorEmail}&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          className={cn(
                            "bg-transparent border border-slate-700 rounded-lg p-1 text-[9px] font-black uppercase outline-none cursor-pointer transition-colors",
                            c.estado === 'Comprado' ? "text-emerald-400 border-emerald-500/30" :
                            c.estado === 'En proceso' ? "text-amber-400 border-amber-500/30" : "text-rose-400 border-rose-500/30"
                          )}
                          value={c.estado || 'Pendiente'}
                          onChange={(e) => handleStatusChange(c.id!, e.target.value as any)}
                        >
                          <option value="Pendiente" className="bg-[#111C31] text-rose-400">Pendiente</option>
                          <option value="En proceso" className="bg-[#111C31] text-amber-400">En proceso</option>
                          <option value="Comprado" className="bg-[#111C31] text-emerald-400">Comprado</option>
                        </select>
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.fecha).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/35 text-rose-400">
                        {c.modulo}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/35 text-indigo-400">
                        {c.subModulo}
                      </span>
                      {c.trabajadorMencionado && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-amber-400" /> Dirigido a: {c.trabajadorMencionado}
                        </span>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-white text-xs font-bold leading-relaxed mb-3 whitespace-pre-wrap">
                      {c.comentario}
                    </p>

                    {/* Replies */}
                    {c.respuestas && c.respuestas.length > 0 && (
                      <div className="mt-2 space-y-2 border-l-2 border-slate-700/50 pl-3">
                        {c.respuestas.map(r => (
                          <div key={r.id} className="bg-slate-800/30 p-2.5 rounded-xl border border-slate-700/30 text-[10px]">
                            <div className="flex justify-between text-slate-400 font-bold mb-1">
                              <span className="text-sky-300">{r.autor}</span>
                              <span>{new Date(r.fecha).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-200">{r.texto}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id!)}
                        className="text-[10px] font-black uppercase tracking-wider text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors bg-sky-500/10 px-3 py-1.5 rounded-lg"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> {c.respuestas?.length || 0} Respuestas
                      </button>
                    </div>

                    {/* Reply Form */}
                    {replyingTo === c.id && (
                      <form onSubmit={(e) => handleReplySubmit(e, c.id!)} className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Escribe una respuesta..."
                          className="flex-1 bg-[#090F1B] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
                        />
                        <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-3 py-2 flex items-center justify-center transition-colors">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer info banner */}
        <div className="p-4 border-t border-[#1E3A5F]/40 bg-[#111C31] text-[10px] font-bold text-slate-400 text-center flex items-center justify-center gap-3">
          <Tag className="w-3.5 h-3.5 text-sky-400" /> Los comentarios se registran con firma digital única de auditoría y son transmitidos instantáneamente al equipo correspondiente.
        </div>

      </div>
    </div>
  );
};
