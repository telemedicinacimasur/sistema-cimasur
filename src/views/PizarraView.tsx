import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { localDB, localAuth } from "../lib/auth";
import { addNotification } from "../lib/notifications";
import {
  Calendar,
  Clock,
  CheckCircle,
  Archive,
  Plus,
  Edit2,
  Trash2,
  MessageCircle,
  Send,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
} from "lucide-react";

interface NoteReply {
  id: string;
  autor: string;
  autorEmail: string;
  texto: string;
  fecha: string;
}

interface AgreementRecord {
  id: string;
  fechaReunion: string;
  tema: string;
  acuerdos: string;
  autor: string;
  fechaCreacion: string;
}

interface NoteRecord {
  id?: string;
  titulo?: string;
  comentario: string;
  autor: string;
  autorEmail: string;
  targetUser?: string;
  targetUsers?: string[];
  workersAllowed: string[]; // empty means all
  fechaInicio: string;
  fechaTermino: string;
  estado: "Pendiente" | "Proceso" | "Terminado" | "Archivar";
  fechaCreacion: string;
  respuestas?: NoteReply[];
}

export default function PizarraView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<AgreementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [comentario, setComentario] = useState("");
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [workersAllowed, setWorkersAllowed] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fechaTermino, setFechaTermino] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [estado, setEstado] = useState<
    "Pendiente" | "Proceso" | "Terminado" | "Archivar"
  >("Pendiente");

  const [replyDialogNote, setReplyDialogNote] = useState<NoteRecord | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  const [showArchived, setShowArchived] = useState(false);
  const [showAgreementsModal, setShowAgreementsModal] = useState(false);
  
  // Agreement form states
  const [agreementMtgDate, setAgreementMtgDate] = useState(new Date().toISOString().split("T")[0]);
  const [agreementTheme, setAgreementTheme] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [minimizedAgreements, setMinimizedAgreements] = useState<string[]>([]);
  const [agreementSearchTerm, setAgreementSearchTerm] = useState("");

  const toggleMinimizeAgreement = (id: string) => {
    setMinimizedAgreements(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allNotes, allUsers, allAgreements] = await Promise.all([
        localDB.getCollection("pizarra_notes"),
        localAuth.getAllUsers(),
        localDB.getCollection("pizarra_agreements"),
      ]);
      setNotes(allNotes);
      setWorkers(allUsers.filter((u) => u.email !== user?.email));
      setAgreements(allAgreements);

      // Auto-open comment dialog if noteId query parameter is present
      const noteIdParam = new URLSearchParams(window.location.search).get("noteId");
      if (noteIdParam) {
        const found = allNotes.find((n: any) => n.id === noteIdParam);
        if (found) {
          setReplyDialogNote(found);
          try {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          } catch(err) {
            console.error("Failed to clean up query param history state:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementText.trim() || !agreementTheme.trim()) return;

    const payload: AgreementRecord = {
      id: crypto.randomUUID(),
      fechaReunion: agreementMtgDate,
      tema: agreementTheme,
      acuerdos: agreementText,
      autor: user?.displayName || user?.email || "Usuario",
      fechaCreacion: new Date().toISOString(),
    };

    await localDB.saveToCollection("pizarra_agreements", payload);
    setAgreementTheme("");
    setAgreementText("");
    loadData();
  };
  
  const handleDeleteAgreement = async (id: string) => {
    if (window.confirm("¿Eliminar este acuerdo de forma permanente?")) {
      await localDB.deleteFromCollection("pizarra_agreements", id);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;

    const payload: NoteRecord = {
      id: editingId || crypto.randomUUID(),
      fechaCreacion: editingId
        ? notes.find((n) => n.id === editingId)?.fechaCreacion ||
          new Date().toISOString()
        : new Date().toISOString(),
      titulo,
      comentario,
      autor: user?.displayName || user?.email || "Usuario",
      autorEmail: user?.email || "usuario@cimasur.cl",
      targetUser: "", // legacy backwards compatibility
      targetUsers,
      workersAllowed,
      fechaInicio,
      fechaTermino,
      estado,
    };

    const isNew = !editingId;
    await localDB.saveToCollection("pizarra_notes", payload);

    if (isNew || targetUsers.length > 0) {
      const notifUsers = [...new Set([...targetUsers, ...workersAllowed])];

      // Only explicitly send if there are targeted users or allowed workers
      if (notifUsers.length > 0) {
        const assignedNames = notifUsers.map(email => {
          return workers.find(w => w.email === email)?.displayName || email.split('@')[0];
        }).join(', ');

        await addNotification({
          title: "Nueva Nota en Pizarra",
          message: `${user?.displayName || user?.email} realizó una nota en la que asignó a: ${assignedNames}.`,
          sender: user?.email || "Sistema",
          recipientRoles: ["admin", "manager", "lab", "crm", "school", "gestion"],
          recipientUsers: notifUsers,
          pizarraNoteId: payload.id,
        });
      } else if (isNew) {
        // Provide an explicit general notification or roles if no target was set
        await addNotification({
          title: "Nueva Nota en Pizarra",
          message: `${user?.displayName || user?.email} ha creado una nueva nota global en la pizarra.`,
          sender: user?.email || "Sistema",
          recipientRoles: [
            "admin",
            "manager",
            "lab",
            "crm",
            "school",
            "gestion",
          ],
          recipientUsers: [],
          pizarraNoteId: payload.id,
        });
      }
    }

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setTitulo("");
    setComentario("");
    setTargetUsers([]);
    setWorkersAllowed([]);
    setFechaInicio(new Date().toISOString().split("T")[0]);
    setFechaTermino(new Date().toISOString().split("T")[0]);
    setEstado("Pendiente");
    setIsEditing(false);
    setEditingId(null);
  };

  const startEdit = (note: NoteRecord) => {
    setEditingId(note.id || null);
    setTitulo(note.titulo || "");
    setComentario(note.comentario);
    setTargetUsers(
      note.targetUsers || (note.targetUser ? [note.targetUser] : []),
    );
    setWorkersAllowed(note.workersAllowed || []);
    setFechaInicio(note.fechaInicio || new Date().toISOString().split("T")[0]);
    setFechaTermino(
      note.fechaTermino || new Date().toISOString().split("T")[0],
    );
    setEstado(note.estado || "Pendiente");
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar esta nota?")) {
      await localDB.deleteFromCollection("pizarra_notes", id);
      loadData();
    }
  };

  const handleStateChange = async (
    note: NoteRecord,
    newState: "Pendiente" | "Proceso" | "Terminado" | "Archivar",
  ) => {
    if (note.estado === "Archivar") {
      alert("Esta nota ya está Finalizada/Archivada y su estado no puede ser modificado.");
      return;
    }

    if (newState === "Archivar" && note.autorEmail !== user?.email) {
      alert("Solo el creador de la nota puede dar el finalizado (archivado/finalizado)");
      return;
    }

    await localDB.saveToCollection("pizarra_notes", {
      ...note,
      estado: newState,
    });

    // Notify users involved in this note about the state change
    const targetUsers =
      note.targetUsers || (note.targetUser ? [note.targetUser] : []);
    const notifUsers = [
      ...new Set([
        ...targetUsers,
        ...(note.workersAllowed || []),
        note.autorEmail,
      ]),
    ].filter((email) => email !== user?.email); // Do not notify oneself

    const assignedNames = targetUsers.length > 0 
      ? targetUsers.map(email => workers.find(w => w.email === email)?.displayName || email.split('@')[0]).join(', ')
      : 'todos';

    await addNotification({
      title: `Actualización de Nota en Pizarra`,
      message: `El estado de la nota de ${note.autor} para ${assignedNames} ha cambiado a "${newState}" por ${user?.displayName || user?.email}.`,
      sender: user?.email || "Sistema",
      recipientRoles: ["admin", "manager", "lab", "crm", "school", "gestion"],
      recipientUsers: notifUsers,
      pizarraNoteId: note.id,
    });

    loadData();
  };

  const handleAddReply = async (note: NoteRecord) => {
    if (!replyText.trim()) return;

    const newReply: NoteReply = {
      id: crypto.randomUUID(),
      autor: user?.displayName || user?.email || "Usuario",
      autorEmail: user?.email || "",
      texto: replyText.trim(),
      fecha: new Date().toISOString(),
    };

    const updatedNote = {
      ...note,
      respuestas: [...(note.respuestas || []), newReply],
    };

    await localDB.saveToCollection("pizarra_notes", updatedNote);

    // Notify author and other involved users
    const targetUsers =
      note.targetUsers || (note.targetUser ? [note.targetUser] : []);
    const notifUsers = [
      ...new Set([
        note.autorEmail,
        ...targetUsers,
        ...(note.respuestas?.map((r) => r.autorEmail) || []),
      ]),
    ].filter((email) => email !== user?.email);

    const assignedNames = targetUsers.length > 0 
      ? targetUsers.map(email => workers.find(w => w.email === email)?.displayName || email.split('@')[0]).join(', ')
      : 'todos';

    await addNotification({
      title: "Nueva Respuesta en Pizarra",
      message: `${user?.displayName || user?.email} respondió en la nota de ${note.autor} para ${assignedNames}: "${replyText.trim().substring(0, 60)}${replyText.trim().length > 60 ? '...' : ''}"`,
      sender: user?.email || "Sistema",
      recipientRoles: ["admin", "manager", "lab", "crm", "school", "gestion"],
      recipientUsers: notifUsers,
      pizarraNoteId: note.id,
    });

    setReplyText("");
    setReplyDialogNote(updatedNote as NoteRecord);
    loadData();
  };

  const handleEditReply = async (note: NoteRecord, replyId: string) => {
    if (!editingReplyText.trim()) return;

    const updatedRespuestas = (note.respuestas || []).map((reply) => {
      if (reply.id === replyId) {
        return {
          ...reply,
          texto: editingReplyText.trim(),
          fecha: new Date().toISOString(),
        };
      }
      return reply;
    });

    const updatedNote = {
      ...note,
      respuestas: updatedRespuestas,
    };

    await localDB.saveToCollection("pizarra_notes", updatedNote);

    setReplyDialogNote(updatedNote as NoteRecord);
    setEditingReplyId(null);
    setEditingReplyText("");
    loadData();
  };

  // Filter logic
  const isAdmin = user?.roles?.includes("admin") || user?.role === "admin";
  const visibleNotes = notes
    .filter((note) => {
      if (isAdmin) return true;
      if (note.autorEmail === user?.email) return true;

      const targets =
        note.targetUsers || (note.targetUser ? [note.targetUser] : []);
      if (
        targets.includes(user?.email || "") ||
        targets.includes(user?.displayName || "")
      )
        return true;

      if (note.workersAllowed && note.workersAllowed.length > 0) {
        return note.workersAllowed.includes(user?.email || "");
      }
      return true; // if empty, visible to all
    })
    .filter((note) => {
      if (showArchived) {
        return note.estado === "Archivar";
      } else {
        return note.estado !== "Archivar";
      }
    })
    .sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() -
        new Date(a.fechaCreacion).getTime(),
    );

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase">
            Pizarra de Notas
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Tablero central de comentarios y requerimientos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${
              showArchived
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? "Ocultar Archivados" : "Ver Archivados"}
          </button>
          
          <button
            onClick={() => setShowAgreementsModal(true)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0"
            title="Acuerdos de Reunión (Solo Admins)"
          >
            <BookOpen className="w-4 h-4" />
            Acuerdos
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
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-3xl shadow border border-slate-200 space-y-4"
        >
          <h2 className="text-lg font-black text-[#1E293B] uppercase mb-4">
            {editingId ? "Editar Nota" : "Redactar Nueva Nota"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8] mb-4 font-bold"
                placeholder="Título de la nota (opcional)"
              />
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                Comentario / Nota
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                placeholder="Escribe tu comentario aquí..."
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black uppercase text-slate-400">
                  Dirigido a (Usuarios)
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetUsers(workers.map((w) => w.email))}
                    className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetUsers([])}
                    className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative border border-slate-200 bg-slate-50 rounded-xl max-h-32 overflow-y-auto p-2">
                <div className="text-xs text-slate-500 mb-1">
                  Si no seleccionas a nadie, no va dirigido a nadie en
                  específico.
                </div>
                {workers.map((w) => (
                  <label
                    key={w.email}
                    className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={targetUsers.includes(w.email)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setTargetUsers([...targetUsers, w.email]);
                        else
                          setTargetUsers(
                            targetUsers.filter((email) => email !== w.email),
                          );
                      }}
                      className="rounded text-[#38BDF8] focus:ring-[#38BDF8]"
                    />
                    <span className="text-sm text-slate-700">
                      {w.displayName || w.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black uppercase text-slate-400">
                  ¿Quién puede ver? (Visibilidad)
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setWorkersAllowed(workers.map((w) => w.email))
                    }
                    className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkersAllowed([])}
                    className="text-[9px] font-black uppercase px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative border border-slate-200 bg-slate-50 rounded-xl max-h-32 overflow-y-auto p-2">
                <div className="text-xs text-slate-500 mb-1">
                  Si no seleccionas a nadie, todos podrán verla.
                </div>
                {workers.map((w) => (
                  <label
                    key={w.email}
                    className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={workersAllowed.includes(w.email)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setWorkersAllowed([...workersAllowed, w.email]);
                        else
                          setWorkersAllowed(
                            workersAllowed.filter((email) => email !== w.email),
                          );
                      }}
                      className="rounded text-[#38BDF8] focus:ring-[#38BDF8]"
                    />
                    <span className="text-sm text-slate-700">
                      {w.displayName || w.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                Fecha de Término
              </label>
              <input
                type="date"
                value={fechaTermino}
                onChange={(e) => setFechaTermino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#38BDF8]"
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
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
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 2px, transparent 2px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {visibleNotes.map((note) => {
            const isOverdue = (() => {
              if (note.estado === "Terminado" || note.estado === "Archivar") return false;
              if (!note.fechaTermino) return false;
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const limitDate = new Date(note.fechaTermino);
              limitDate.setHours(23, 59, 59, 999);
              
              return today > limitDate;
            })();

            let noteColor =
              "bg-[#fcf8e3] border-[#faebcc] shadow-amber-900/10 text-[#8a6d3b]";
            let statusColor = "bg-amber-100 text-amber-800";
            let statusIcon = <Clock className="w-3 h-3" />;

            if (note.estado === "Proceso") {
              noteColor =
                "bg-[#d9edf7] border-[#bce8f1] shadow-blue-900/10 text-[#31708f]";
              statusColor = "bg-blue-100 text-blue-800";
            } else if (note.estado === "Terminado") {
              noteColor =
                "bg-[#dff0d8] border-[#d6e9c6] shadow-emerald-900/10 text-[#3c763d]";
              statusColor = "bg-emerald-100 text-emerald-800";
              statusIcon = <CheckCircle className="w-3 h-3" />;
            } else if (note.estado === "Archivar") {
              noteColor =
                "bg-slate-100 border-slate-300 shadow-slate-900/10 text-slate-500 opacity-80";
              statusColor = "bg-slate-200 text-slate-700";
              statusIcon = <Archive className="w-3 h-3" />;
            }

            if (isOverdue) {
              noteColor = "bg-[#fff1f2] border-red-500 shadow-red-900/15 text-red-900 !border-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
              statusColor = "bg-red-200 text-red-800";
            }

            return (
              <div
                key={note.id}
                className={`group ${noteColor} p-5 rounded-xl border-2 relative shadow-[0_4px_15px_rgba(0,0,0,0.05)] transform transition-all hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] flex flex-col`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 rounded-full bg-red-500/80 shadow-sm border border-red-600/30 rotate-3" />

                <div className="mb-3 pr-6 mt-1">
                  <div className="text-[10px] font-black uppercase opacity-60 mb-1 flex justify-between items-center">
                    <span>De: {note.autor.split(" ")[0]}</span>
                    <span>
                      {new Date(note.fechaCreacion).toLocaleDateString()}
                    </span>
                  </div>
                  {(() => {
                    const targets =
                      note.targetUsers ||
                      (note.targetUser ? [note.targetUser] : []);
                    if (targets.length > 0) {
                      return (
                        <div
                          className="text-[10px] font-bold text-[#1E293B] bg-white/40 px-2 py-0.5 rounded inline-block mb-1 max-w-full truncate"
                          title={targets
                            .map(
                              (t) =>
                                workers.find((w) => w.email === t)
                                  ?.displayName || t,
                            )
                            .join(", ")}
                        >
                          Para:{" "}
                          {targets
                            .map(
                              (t) =>
                                workers
                                  .find((w) => w.email === t)
                                  ?.displayName?.split(" ")[0] ||
                                t.split("@")[0],
                            )
                            .join(", ")}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {note.workersAllowed && note.workersAllowed.length > 0 && (
                    <div
                      className="text-[9px] font-bold opacity-70 mb-2 truncate"
                      title={note.workersAllowed.join(", ")}
                    >
                      Visible solo por seleccionados
                    </div>
                  )}
                </div>

                {isOverdue && (
                  <div className="flex items-center gap-1 bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded mb-3 animate-pulse border border-red-700 shadow-sm inline-flex self-start">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>¡Fecha Límite Superada!</span>
                  </div>
                )}

                {note.titulo && (
                  <h3 className="text-base font-black uppercase tracking-tight mb-2 leading-tight opacity-90">
                    {note.titulo}
                  </h3>
                )}

                <p className="text-sm font-medium whitespace-pre-wrap flex-1 mb-4 leading-snug">
                  {note.comentario}
                </p>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold opacity-75 border-t border-black/10 pt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Inicio:{" "}
                      {new Date(note.fechaInicio).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold opacity-75">
                    <div className="flex flex-col gap-1 w-full mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Fin:{" "}
                        {new Date(note.fechaTermino).toLocaleDateString()}
                      </div>

                      <div className="flex mt-2 justify-between items-center w-full bg-white/30 p-1.5 rounded-lg border border-black/5">
                        {note.estado === "Archivar" ? (
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded inline-flex items-center gap-1 bg-slate-200 text-slate-700 border border-slate-300 w-full justify-center`}>
                            {statusIcon} Archivado / Finalizado
                          </span>
                        ) : (
                          <select
                            value={note.estado}
                            onChange={(e) =>
                              handleStateChange(note, e.target.value as any)
                            }
                            className={`text-[9px] font-black uppercase pl-2 pr-4 py-1 rounded appearance-none outline-none cursor-pointer ${statusColor}`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Proceso">En Proceso</option>
                            <option value="Terminado">Terminado</option>
                            {note.autorEmail === user?.email && (
                              <option value="Archivar">
                                Archivado / Finalizado
                              </option>
                            )}
                          </select>
                        )}

                        {note.autorEmail === user?.email && note.estado !== "Archivar" && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(note)}
                              className="p-1.5 hover:bg-white/50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id!)}
                              className="p-1.5 hover:bg-white/50 rounded-md transition-colors text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 w-full">
                        <button
                          onClick={() => setReplyDialogNote(note)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white/40 hover:bg-white/60 rounded-lg text-[9px] font-black uppercase transition-colors border border-black/5"
                        >
                          <MessageCircle className="w-3 h-3" />
                          {note.respuestas && note.respuestas.length > 0
                            ? `Respuestas (${note.respuestas.length})`
                            : "Responder"}
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
              <button
                onClick={() => setReplyDialogNote(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                title="Cerrar"
              >
                <span className="sr-only">Cerrar</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-xs font-bold text-slate-500 mb-2">
                  Nota Original:
                </div>
                {replyDialogNote.titulo && (
                  <h4 className="text-sm font-black uppercase mb-1">
                    {replyDialogNote.titulo}
                  </h4>
                )}
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {replyDialogNote.comentario}
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Por {replyDialogNote.autor} el{" "}
                  {new Date(replyDialogNote.fechaCreacion).toLocaleString()}
                </div>
                {(() => {
                  const targets =
                    replyDialogNote.targetUsers ||
                    (replyDialogNote.targetUser
                      ? [replyDialogNote.targetUser]
                      : []);
                  if (targets.length > 0) {
                    return (
                      <div className="mt-2 text-[10px] font-bold text-[#1E293B] bg-slate-100 p-2 rounded-lg">
                        A cargo:{" "}
                        {targets
                          .map(
                            (t) =>
                              workers.find((w) => w.email === t)?.displayName ||
                              t,
                          )
                          .join(", ")}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="space-y-3">
                {replyDialogNote.respuestas &&
                replyDialogNote.respuestas.length > 0 ? (
                  replyDialogNote.respuestas.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                        <span className="text-[#38BDF8]">{reply.autor}</span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(reply.fecha).toLocaleString()}</span>
                          {reply.autorEmail === user?.email && editingReplyId !== reply.id && (
                            <button
                              onClick={() => {
                                setEditingReplyId(reply.id);
                                setEditingReplyText(reply.texto);
                              }}
                              className="text-[#38BDF8] hover:text-[#0ea5e9] transition-colors font-black uppercase text-[9px] border border-[#38BDF8]/25 hover:border-[#38BDF8] px-1.5 py-0.5 rounded bg-sky-50"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </div>

                      {editingReplyId === reply.id ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <textarea
                            value={editingReplyText}
                            onChange={(e) => setEditingReplyText(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-[#38BDF8] resize-none h-16 font-medium"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingReplyId(null);
                                setEditingReplyText("");
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleEditReply(replyDialogNote, reply.id)}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase bg-[#38BDF8] hover:bg-[#0ea5e9] text-white rounded-md transition-colors"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                          {reply.texto}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 text-sm italic py-4">
                    No hay respuestas aún. Sé el primero en responder.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
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

      {/* Agreements Modal (Hidden Tool) */}
      {showAgreementsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Acuerdos de Reunión 
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase ml-2 tracking-widest border border-red-200">Acceso Privado</span>
              </h3>
              <button
                onClick={() => setShowAgreementsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                title="Cerrar"
              >
                <span className="sr-only">Cerrar</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 flex flex-col lg:flex-row gap-6">
               <div className="lg:w-1/3 flex flex-col gap-4">
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="text-[12px] font-black uppercase text-slate-700 tracking-widest mb-4">Registrar Nuevo Acuerdo</h4>
                    <form onSubmit={handleSaveAgreement} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha de Reunión</label>
                        <input
                          type="date"
                          value={agreementMtgDate}
                          onChange={e => setAgreementMtgDate(e.target.value)}
                          required
                          className="w-full bg-slate-50 text-slate-700 text-xs font-bold rounded p-2.5 border border-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tema Principal</label>
                        <input
                          type="text"
                          value={agreementTheme}
                          onChange={e => setAgreementTheme(e.target.value)}
                          required
                          placeholder="Ej: Estrategia Q3"
                          className="w-full bg-slate-50 text-slate-700 text-xs font-bold rounded p-2.5 border border-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Conversación y Acuerdos</label>
                        <textarea
                          value={agreementText}
                          onChange={e => setAgreementText(e.target.value)}
                          required
                          rows={6}
                          placeholder="Detalle los puntos de conversación y acuerdos logrados..."
                          className="w-full bg-slate-50 text-slate-700 text-xs rounded p-2.5 border border-slate-200 outline-none focus:border-indigo-500 resize-none font-medium"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors shadow"
                      >
                        Crear Registro
                      </button>
                    </form>
                 </div>
               </div>

               <div className="lg:w-2/3 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h4 className="text-[12px] font-black uppercase text-slate-700 tracking-widest shrink-0">Historial de Reuniones ({agreements.length})</h4>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar palabra clave..."
                        value={agreementSearchTerm}
                        onChange={(e) => setAgreementSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-2 bg-white text-xs font-medium rounded-xl border border-slate-200 outline-none focus:border-indigo-500 w-full sm:w-56 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {agreements.length === 0 ? (
                      <div className="text-center p-8 bg-white/50 border border-slate-200 border-dashed rounded-2xl text-slate-500 text-sm italic font-medium">
                        No hay acuerdos registrados aún.
                      </div>
                    ) : (
                      agreements
                        .filter(ag => 
                          agreementSearchTerm === "" || 
                          ag.tema.toLowerCase().includes(agreementSearchTerm.toLowerCase()) || 
                          ag.acuerdos.toLowerCase().includes(agreementSearchTerm.toLowerCase())
                        )
                        .sort((a,b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()).map(ag => {
                        const isMinimized = minimizedAgreements.includes(ag.id);
                        return (
                        <div key={ag.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative group">
                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            <button
                              onClick={() => toggleMinimizeAgreement(ag.id)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                              title={isMinimized ? "Expandir" : "Minimizar"}
                            >
                              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteAgreement(ag.id)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className={`flex items-center gap-3 border-b border-slate-100 ${isMinimized ? 'pb-0 border-none' : 'mb-3 pb-3'}`}>
                             <div className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                               <Calendar className="w-3.5 h-3.5" />
                               {new Date(ag.fechaReunion).toLocaleDateString()}
                             </div>
                             <h5 className="font-bold text-slate-800 pr-16 truncate">{ag.tema}</h5>
                          </div>
                          
                          {!isMinimized && (
                            <>
                              <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                                {ag.acuerdos}
                              </div>
                              
                              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                 <span>Ingresado por: {ag.autor}</span>
                                 <span>Registro: {new Date(ag.fechaCreacion).toLocaleDateString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )})
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
