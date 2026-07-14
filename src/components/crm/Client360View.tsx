import React, { useState, useEffect } from 'react';
import { Client } from '../../services/crm/types';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { 
  X, User, Building2, MapPin, Phone, Mail, Globe, Briefcase, 
  Calendar, Award, TrendingUp, Bot, FileText, Plus, Trash2, 
  Edit3, Save, Activity, DollarSign, Gift, Layers, Brain, Megaphone, Check,
  Zap, ClipboardList, Stethoscope, Hash, Target, ClipboardCheck, Edit2
} from 'lucide-react';
import { motion } from 'motion/react';

interface Client360Props {
  clientId: string;
  onClose: () => void;
  onSave?: () => void;
}

export const Client360View: React.FC<Client360Props> = ({ clientId, onClose, onSave }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [selectedClubYear, setSelectedClubYear] = useState<string>('2026');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Sub-lists local states for easy updates
  const [contacts, setContacts] = useState<any[]>([]);
  const [veterinarios, setVeterinarios] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [globalActivities, setGlobalActivities] = useState<any[]>([]);

  // Add sub-list form states
  const [newContact, setNewContact] = useState({ nombre: '', cargo: '', telefono: '', celular: '', email: '', esPrincipal: false });
  const [newVet, setNewVet] = useState({ nombre: '', especialidad: '', email: '', telefono: '' });
  const [newBitacoraEntry, setNewBitacoraEntry] = useState('');

  const clientService = new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const c = await clientService.getFullClientData(clientId);
      if (c) {
        setClient(c);
        setEditForm(c);
        
        // Handle potentially stringified arrays from DB
        const parseArray = (val: any) => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return [];
            }
          }
          return [];
        };

        setContacts(parseArray(c.contactos));
        setVeterinarios(parseArray(c.veterinarios));
        setBitacora(parseArray(c.bitacora));
        
        // Fetch global activities for this client
        const allGlobal = await localDB.getCollection('crm_activities');
        const related = allGlobal.filter((a: any) => a.clientId === clientId || a.clientId === c.rut || a.clientId === c.id);
        setGlobalActivities(related);
        
        // Also ensure client object has parsed campanas for the UI
        c.campanas = parseArray(c.campanas);
        c.oportunidades = parseArray(c.oportunidades);
      }
    } catch (error) {
      console.error("Error loading client 360 data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    await clientService.updateClient(client.id, editForm);
    setIsEditing(false);
    await loadData();
    if (onSave) onSave();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleAddContact = async () => {
    if (!newContact.nombre) return;
    const updated = [...contacts, newContact];
    await clientService.updateClient(client.id, { contactos: updated });
    setNewContact({ nombre: '', cargo: '', telefono: '', celular: '', email: '', esPrincipal: false });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleDeleteContact = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    await clientService.updateClient(client.id, { contactos: updated });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleAddVet = async () => {
    if (!newVet.nombre || !newVet.email) {
      alert('Nombre y Email son obligatorios');
      return;
    }
    const updated = [...veterinarios, newVet];
    await clientService.updateClient(client.id, { veterinarios: updated });
    setNewVet({ nombre: '', especialidad: '', email: '', telefono: '' });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleDeleteVet = async (index: number) => {
    const updated = veterinarios.filter((_, i) => i !== index);
    await clientService.updateClient(client.id, { veterinarios: updated });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleAddBitacora = async () => {
    if (!newBitacoraEntry.trim()) return;
    const newEntry = {
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      comentario: newBitacoraEntry,
      creador: 'Usuario CRM'
    };
    const updated = [newEntry, ...bitacora];
    await clientService.updateClient(client.id, { bitacora: updated });

    // Also register in global CRM activities for visibility across the platform
    try {
      await localDB.saveToCollection('crm_activities', {
        fecha: newEntry.fecha,
        campania: 'Gestión Directa',
        tipo: 'Nota de Seguimiento',
        observaciones: newBitacoraEntry,
        responsable: 'Usuario CRM',
        clientId: client.id
      });
    } catch (err) {
      console.error("Error logging global activity", err);
    }

    setNewBitacoraEntry('');
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
          <Activity className="w-10 h-10 text-sky-400 animate-spin" />
          <p className="text-white font-bold text-sm">Cargando Ficha Cliente 360°...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl">
          <X className="w-10 h-10 text-red-500" />
          <p className="text-white font-bold text-sm">Cliente no encontrado</p>
          <button onClick={onClose} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">Cerrar</button>
        </div>
      </div>
    );
  }

  const formatCLP = (val: number) => `$${val.toLocaleString('es-CL')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#050914] w-full max-w-7xl h-[92vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* HEADER EXPEDIENTE */}
        <div className="p-6 border-b border-slate-800 bg-[#0D1527] flex justify-between items-start shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <FileText className="text-sky-500 w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Expediente de Cliente</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">Activo</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 max-w-2xl truncate">
                {client.name || client.nombre || 'Sin nombre'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-rose-950/30 hover:bg-rose-950/50 text-rose-500 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Cerrar Expediente
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-[#050914]">
          {/* SUMMARY CARDS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
            {[
              { label: 'RUT', value: client.rut || '---' },
              { label: 'COMUNA', value: client.comuna || 'N/A' },
              { label: 'TIPO EMPRESA', value: client.tipo_empresa || client.giro || 'Empresa' },
              { label: 'FECHA INGRESO', value: client.fechaIngreso || client.fecha_ingreso || '---' }
            ].map((card, i) => (
              <div key={i} className="bg-[#0D1527] border border-slate-850 p-4 rounded-2xl flex flex-col gap-1 shadow-md shadow-black/20">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</span>
                <span className="text-sm font-bold text-white truncate">{card.value}</span>
              </div>
            ))}
            <div className="bg-[#0D1527] border border-sky-500/20 p-4 rounded-2xl flex items-center justify-between shadow-md shadow-sky-950/10">
              <div>
                <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest block mb-1">INSCRITO INTRANET</span>
                <span className="text-sm font-bold text-emerald-400">Si</span>
              </div>
              <button className="bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-orange-900/20">
                REGISTRAR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: HISTORIAL */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,1)]"></div>
                  Historial Detallado de Actividades
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{bitacora.length + globalActivities.length} Registros Encontrados</span>
              </div>

              <div 
                className="bg-[#030712] border border-slate-850 rounded-3xl p-8 min-h-[600px] relative overflow-hidden shadow-2xl"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' stroke-opacity='0.03' fill='none'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px'
                }}
              >
                <div className="space-y-10 relative z-10 max-w-3xl mx-auto">
                  {bitacora.length === 0 && globalActivities.length === 0 ? (
                    <div className="text-center py-32 opacity-20">
                      <FileText className="mx-auto w-16 h-16 text-white mb-4" />
                      <p className="text-sm text-white font-medium italic">No hay entradas registradas.</p>
                    </div>
                  ) : (
                    // Merge and sort all entries
                    [
                      ...bitacora.map(b => ({ ...b, source: 'Manual', type: 'Nota' })),
                      ...globalActivities.map(g => ({ 
                        ...g, 
                        comentario: g.observaciones, 
                        creador: g.responsable, 
                        source: 'Sistema', 
                        type: g.tipo,
                        title: g.campania
                      }))
                    ]
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((entry, idx) => (
                      <div key={idx} className="relative group">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 mb-3">
                            <p className="text-[11px] text-slate-500 font-bold italic">
                              --- {entry.creador || 'Gestión'} ({entry.fecha ? new Date(entry.fecha).toLocaleDateString() : '---'}) ---
                            </p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${entry.source === 'Sistema' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                              {entry.source === 'Sistema' ? entry.type : 'Nota Manual'}
                            </span>
                          </div>
                          {entry.title && (
                            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">{entry.title}</p>
                          )}
                          <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line tracking-tight">
                            {entry.comentario}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: GESTIÓN */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-3xl space-y-6 shadow-2xl">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={14} className="text-sky-500" />
                  Nueva Gestión / Seguimiento
                </h3>

                <div className="space-y-5">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Nombre / Razón Social</label>
                    <input readOnly value={client.name || client.nombre} className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-xs text-white/70 font-bold truncate cursor-not-allowed" />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">RUT / ID</label>
                    <input readOnly value={client.rut} className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-xs text-white/70 font-mono cursor-not-allowed" />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Tipo de Actividad</label>
                    <select className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-xs text-white font-bold outline-none focus:border-sky-500 transition-all cursor-pointer">
                      <option>Nota de Seguimiento</option>
                      <option>Llamada Telefónica</option>
                      <option>Email masivo</option>
                      <option>WhatsApp</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Detalle de la Actividad</label>
                    <textarea 
                      placeholder="Escriba los pormenores de la gestión realizada..."
                      value={newBitacoraEntry}
                      onChange={e => setNewBitacoraEntry(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-800 p-4 rounded-xl text-xs text-white outline-none focus:border-sky-500 transition-all min-h-[120px] resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                      <select className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-[11px] text-white font-bold cursor-pointer">
                        <option>Bronce</option>
                        <option>Plata</option>
                        <option>Oro</option>
                        <option>Platinum</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Estado Actual</label>
                      <select className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-[11px] text-white font-bold cursor-pointer">
                        <option>En proceso</option>
                        <option>Completado</option>
                        <option>Pendiente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Compra Anual Acumulada ($)</label>
                    <input 
                      type="number" 
                      readOnly
                      value={client.compraAnual || 144136}
                      className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-xs text-white/70 font-black cursor-not-allowed" 
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className="w-5 h-5 rounded border border-slate-700 bg-slate-900 flex items-center justify-center group-hover:border-sky-500 transition-all">
                      <div className="w-3 h-3 rounded-sm bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>
                    </div>
                    <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-200 transition-all uppercase tracking-wide">Es Cliente de Gestión</span>
                  </label>

                  <div className="pt-2 space-y-5">
                    {/* SIMULADOR CLUB CIMASUR */}
                    <div className="bg-[#050914] border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                          <Award size={14} /> SIMULADOR CLUB CIMASUR
                        </h4>
                        <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest">
                          CATEGORÍA: {client.categoria || 'Bronce'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-500 uppercase tracking-wider">Progreso para categoría {client.categoria || 'Bronce'}</span>
                          <span className="text-white">100%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            className="h-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                          <span>Meta para {client.categoria || 'Bronce'}: $30.000</span>
                          <span>Actual: ${(client.compraAnual || 144136).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                        <p className="text-[10px] text-emerald-400 font-black leading-tight">
                          ✓ ¡Excelente! Ya cumplió con el mínimo de $30.000 para la categoría {client.categoria || 'Bronce'} durante este año.
                        </p>
                      </div>
                    </div>

                    {/* ACELERACIÓN */}
                    <div className="bg-[#050914] border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} /> CAMPAÑA & PLAN DE ACELERACIÓN
                      </h4>
                      
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">CATEGORÍA OBJETIVO:</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['Bronce', 'Plata', 'Oro', 'Platinum'].map(cat => (
                            <button key={cat} className={`py-2 rounded text-[8px] font-black uppercase transition-all ${cat === 'Plata' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-850 text-slate-600 border border-slate-800'}`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                         <span className="text-[10px] text-emerald-400 font-black uppercase">✓ ¡Categoría ya superada hoy!</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleAddBitacora}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs py-4 rounded-2xl transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      REGISTRAR GESTIÓN
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-600 italic text-center pt-2 uppercase font-bold tracking-tight">
                    Utilice el botón superior para guardar el historial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
