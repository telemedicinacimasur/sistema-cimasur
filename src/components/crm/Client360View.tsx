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
import { motion, AnimatePresence } from 'motion/react';

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
  const [targetCategory, setTargetCategory] = useState<string>('Plata');

  const CATEGORY_THRESHOLDS: Record<string, number> = {
    'Sin categoría': 0,
    'Bronce': 684000,
    'Plata': 2760000,
    'Oro': 6600000,
    'Platinum': 12000000
  };

  const getTierForSales = (sales: number) => {
    if (sales >= 12000000) return 'Platinum';
    if (sales >= 6600000) return 'Oro';
    if (sales >= 2760000) return 'Plata';
    if (sales >= 684000) return 'Bronce';
    return 'Sin categoría';
  };

  // Compute dynamic sales and category based on selectedClubYear
  const clubDetails = client?.clubVentasDetail ? (typeof client.clubVentasDetail === 'string' ? JSON.parse(client.clubVentasDetail) : client.clubVentasDetail) : {};
  const catKey = `cat${selectedClubYear}`;
  const salesKey = `v${selectedClubYear}`;
  
  const dynamicCategory = (clubDetails[catKey] || (selectedClubYear === '2026' ? client?.categoria : null) || 'Sin categoría').toString().trim();
  const dynamicSales = Number(clubDetails[salesKey]) !== undefined && !isNaN(Number(clubDetails[salesKey]))
    ? Number(clubDetails[salesKey])
    : (selectedClubYear === '2026' ? (Number(client?.compraAnual) || 0) : 0);
  
  useEffect(() => {
    let tCat = 'Plata';
    if (dynamicSales >= 12000000) tCat = 'Platinum';
    else if (dynamicSales >= 6600000) tCat = 'Oro';
    else if (dynamicSales >= 2760000) tCat = 'Plata';
    else if (dynamicSales >= 684000) tCat = 'Bronce';
    else tCat = 'Sin categoría';
    setTargetCategory(tCat);
  }, [selectedClubYear, dynamicSales]);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Sub-lists local states for easy updates
  const [contacts, setContacts] = useState<any[]>([]);
  const [veterinarios, setVeterinarios] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryText, setEditingEntryText] = useState<string>('');
  const [deletingSystemEntry, setDeletingSystemEntry] = useState<any | null>(null);
  const [globalActivities, setGlobalActivities] = useState<any[]>([]);

  // Add sub-list form states
  const [newContact, setNewContact] = useState({ nombre: '', cargo: '', telefono: '', celular: '', email: '', esPrincipal: false });
  const [newVet, setNewVet] = useState({ nombre: '', especialidad: '', email: '', telefono: '' });
  const [newBitacoraEntry, setNewBitacoraEntry] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newComuna, setNewComuna] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Sin categoría');
  const [newCompraAnual, setNewCompraAnual] = useState<string>('0');
  const [activityType, setActivityType] = useState<string>('Nota de Seguimiento');
  const [gestionStatus, setGestionStatus] = useState<string>('En proceso');

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
        setNewPhone(c.telefono || c.phone || c.celular || '');
        setNewEmail(c.email || '');
        setNewComuna(c.comuna || '');
        setNewDireccion(c.direccion || '');
        setNewCategory(c.categoria || 'Sin categoría');
        setNewCompraAnual(c.compraAnual !== undefined && c.compraAnual !== null ? String(c.compraAnual) : '0');
        
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
    
    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización',
      tipo: 'Actualización de Datos',
      observaciones: `Se actualizaron los datos generales de la cuenta.`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });
    
    setIsEditing(false);
    await loadData();
    if (onSave) onSave();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleAddContact = async () => {
    if (!newContact.nombre) return;
    const updated = [...contacts, newContact];
    await clientService.updateClient(client.id, { contactos: updated });
    
    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización',
      tipo: 'Nuevo Contacto',
      observaciones: `Se agregó el contacto: ${newContact.nombre}`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });
    
    setNewContact({ nombre: '', cargo: '', telefono: '', celular: '', email: '', esPrincipal: false });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleDeleteContact = async (index: number) => {
    const deletedName = contacts[index]?.nombre;
    const updated = contacts.filter((_, i) => i !== index);
    await clientService.updateClient(client.id, { contactos: updated });
    
    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización',
      tipo: 'Eliminación Contacto',
      observaciones: `Se eliminó el contacto: ${deletedName}`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });
    
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
    
    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización',
      tipo: 'Nuevo Médico',
      observaciones: `Se agregó el médico/veterinario: ${newVet.nombre}`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });
    
    setNewVet({ nombre: '', especialidad: '', email: '', telefono: '' });
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleDeleteVet = async (index: number) => {
    const deletedName = veterinarios[index]?.nombre;
    const updated = veterinarios.filter((_, i) => i !== index);
    await clientService.updateClient(client.id, { veterinarios: updated });
    
    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización',
      tipo: 'Eliminación Médico',
      observaciones: `Se eliminó el médico/veterinario: ${deletedName}`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });
    
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleQuickSaveCategoryAndSales = async () => {
    if (!client) return;
    const amount = Number(newCompraAnual) || 0;
    const catToSave = newCategory || getTierForSales(amount);

    let existingClubDetails: any = {};
    if (client.clubVentasDetail) {
      try {
        existingClubDetails = typeof client.clubVentasDetail === 'string' ? JSON.parse(client.clubVentasDetail) : client.clubVentasDetail;
      } catch (e) {
        existingClubDetails = {};
      }
    }
    existingClubDetails['v2026'] = amount;
    existingClubDetails['cat2026'] = catToSave;

    await clientService.updateClient(client.id, {
      compraAnual: amount,
      categoria: catToSave,
      clubVentasDetail: JSON.stringify(existingClubDetails)
    });

    await localDB.saveToCollection('crm_activities', {
      fecha: new Date().toISOString(),
      campania: 'Actualización Comercial',
      tipo: 'Actualización Compra/Categoría',
      observaciones: `Se actualizó la Compra Anual Acumulada a $${amount.toLocaleString('es-CL')} y Categoría a "${catToSave}".`,
      responsable: 'Usuario CRM',
      clientId: client.id
    });

    alert(`¡Datos Comerciales Guardados Con Éxito!\n\n- Compra Anual Acumulada: $${amount.toLocaleString('es-CL')}\n- Categoría Club: ${catToSave}`);
    await loadData();
    if (onSave) onSave();
    window.dispatchEvent(new Event('db-change'));
  };

  const handleAddBitacora = async () => {
    if (!client) return;
    const amount = Number(newCompraAnual) || 0;
    const catToSave = newCategory || getTierForSales(amount);
    const commentText = newBitacoraEntry.trim() || `Gestión ${activityType}: Categoría ${catToSave}, Compra Anual $${amount.toLocaleString('es-CL')}`;

    const newEntry = {
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      comentario: commentText,
      creador: 'Usuario CRM',
      title: activityType,
      source: 'Manual'
    };
    const updated = [newEntry, ...bitacora];

    let existingClubDetails: any = {};
    if (client.clubVentasDetail) {
      try {
        existingClubDetails = typeof client.clubVentasDetail === 'string' ? JSON.parse(client.clubVentasDetail) : client.clubVentasDetail;
      } catch (e) {
        existingClubDetails = {};
      }
    }
    existingClubDetails['v2026'] = amount;
    existingClubDetails['cat2026'] = catToSave;

    const updates: any = { 
      bitacora: updated,
      compraAnual: amount,
      categoria: catToSave,
      clubVentasDetail: JSON.stringify(existingClubDetails)
    };

    if (newPhone && newPhone !== (client.telefono || client.phone || client.celular)) updates.telefono = newPhone;
    if (newEmail && newEmail !== client.email) updates.email = newEmail;
    if (newComuna && newComuna !== client.comuna) updates.comuna = newComuna;
    if (newDireccion && newDireccion !== client.direccion) updates.direccion = newDireccion;

    await clientService.updateClient(client.id, updates);

    try {
      await localDB.saveToCollection('crm_activities', {
        fecha: newEntry.fecha,
        campania: 'Gestión Directa',
        tipo: activityType,
        observaciones: commentText,
        responsable: 'Usuario CRM',
        clientId: client.id
      });
    } catch (err) {
      console.error("Error logging global activity", err);
    }

    setNewBitacoraEntry('');
    await loadData();
    if (onSave) onSave();
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

        {/* TABS */}
        <div className="flex px-8 border-b border-slate-800 bg-[#050914] gap-8 shrink-0">
          <button 
            onClick={() => setActiveTab('general')} 
            className={`py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'general' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Información 360° & Contactos
          </button>
          <button 
            onClick={() => setActiveTab('gestion')} 
            className={`py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'gestion' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Gestión e Historial
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

          {activeTab === 'gestion' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: HISTORIAL */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* SIMULADOR CLUB CIMASUR */}
                <div className="bg-[#050914] border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                      <Award size={14} /> CLUB CIMASUR: STATUS
                      <input 
                        type="number"
                        value={selectedClubYear}
                        onChange={(e) => setSelectedClubYear(e.target.value)}
                        className="ml-2 bg-[#0A1120] border border-amber-500/30 text-amber-500 text-[10px] py-1 px-2 rounded-lg outline-none cursor-pointer font-bold w-16"
                      />
                    </h4>
                    <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest">
                      CATEGORÍA ACTUAL: {dynamicCategory}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">SIMULADOR DE META (SELECCIONE CATEGORÍA):</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'].map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setTargetCategory(cat)}
                          className={`py-2 px-1 rounded text-[8px] font-black uppercase transition-all truncate ${targetCategory === cat ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-850 text-slate-600 border border-slate-800'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-slate-500 uppercase tracking-wider">Progreso para objetivo: {targetCategory}</span>
                      <span className="text-white">
                        {CATEGORY_THRESHOLDS[targetCategory] > 0 
                          ? Math.min(100, Math.floor((dynamicSales / CATEGORY_THRESHOLDS[targetCategory]) * 100))
                          : 100}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${CATEGORY_THRESHOLDS[targetCategory] > 0 ? Math.min(100, (dynamicSales / CATEGORY_THRESHOLDS[targetCategory]) * 100) : 100}%` }}
                        className="h-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                      <span>Meta para {targetCategory}: ${CATEGORY_THRESHOLDS[targetCategory].toLocaleString()}</span>
                      <span>Actual: ${dynamicSales.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    {dynamicSales >= CATEGORY_THRESHOLDS[targetCategory] ? (
                      <p className="text-[10px] text-emerald-400 font-black leading-tight">
                        ✓ ¡Excelente! Ya cumplió con el mínimo de ${CATEGORY_THRESHOLDS[targetCategory].toLocaleString()} para la categoría {targetCategory} durante este año.
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-400 font-black leading-tight">
                        Faltan ${(CATEGORY_THRESHOLDS[targetCategory] - dynamicSales).toLocaleString()} para alcanzar {targetCategory}.
                      </p>
                    )}
                  </div>
                </div>

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
                            <div className="flex items-center gap-2">
                              {entry.source === 'Manual' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      if (editingEntryId === entry.id) {
                                        // Save logic
                                        const updatedBitacora = bitacora.map(b => 
                                          b.id === entry.id ? { ...b, comentario: editingEntryText } : b
                                        );
                                        setBitacora(updatedBitacora);
                                        if (client) {
                                          import('../../lib/auth').then(({ localDB }) => {
                                            localDB.updateInCollection('contacts', client.id, { bitacora: updatedBitacora }).then(() => {
                                              setEditingEntryId(null);
                                              window.dispatchEvent(new Event('db-change'));
                                            });
                                          });
                                        }
                                      } else {
                                        setEditingEntryId(entry.id || idx.toString());
                                        setEditingEntryText(entry.comentario || '');
                                      }
                                    }}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {editingEntryId === (entry.id || idx.toString()) ? 'Guardar' : 'Editar'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('¿Está seguro de eliminar esta nota manual?')) {
                                        const updatedBitacora = bitacora.filter(b => b.id !== entry.id);
                                        setBitacora(updatedBitacora);
                                        if (client) {
                                          import('../../lib/auth').then(({ localDB }) => {
                                            localDB.updateInCollection('contacts', client.id, { bitacora: updatedBitacora }).then(() => {
                                              window.dispatchEvent(new Event('db-change'));
                                            });
                                          });
                                        }
                                      }
                                    }}
                                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                              {entry.source === 'Sistema' && (
                                <button
                                  onClick={() => setDeletingSystemEntry(entry)}
                                  className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${entry.source === 'Sistema' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                {entry.source === 'Sistema' ? entry.type : 'Nota Manual'}
                              </span>
                            </div>
                          </div>
                          {entry.title && (
                            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">{entry.title}</p>
                          )}
                          {editingEntryId === (entry.id || idx.toString()) ? (
                            <textarea
                              value={editingEntryText}
                              onChange={(e) => setEditingEntryText(e.target.value)}
                              className="w-full bg-[#050914] border border-sky-500/50 p-3 rounded-lg text-xs text-white outline-none min-h-[80px]"
                            />
                          ) : (
                            <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line tracking-tight">
                              {entry.comentario}
                            </div>
                          )}
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
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Tipo de Actividad</label>
                    <select 
                      value={activityType}
                      onChange={e => setActivityType(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-xs text-white font-bold outline-none focus:border-sky-500 transition-all cursor-pointer"
                    >
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
                      <select 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-[11px] text-white font-bold cursor-pointer outline-none focus:border-sky-500"
                      >
                        <option value="Sin categoría">Sin categoría</option>
                        <option value="Bronce">Bronce</option>
                        <option value="Plata">Plata</option>
                        <option value="Oro">Oro</option>
                        <option value="Platinum">Platinum</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Estado Actual</label>
                      <select 
                        value={gestionStatus}
                        onChange={e => setGestionStatus(e.target.value)}
                        className="w-full bg-[#050914] border border-slate-800 p-3 rounded-xl text-[11px] text-white font-bold cursor-pointer outline-none focus:border-sky-500"
                      >
                        <option>En proceso</option>
                        <option>Completado</option>
                        <option>Pendiente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Compra Anual Acumulada ($)</label>
                      <span className="text-[9px] text-sky-400 font-bold">
                        Sugerido: {getTierForSales(Number(newCompraAnual) || 0)}
                      </span>
                    </div>
                    <input 
                      type="number" 
                      value={newCompraAnual}
                      onChange={e => {
                        const val = e.target.value;
                        setNewCompraAnual(val);
                        const autoCat = getTierForSales(Number(val) || 0);
                        setNewCategory(autoCat);
                      }}
                      className="w-full bg-[#050914] border border-sky-500/50 p-3 rounded-xl text-xs text-white font-black outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all" 
                      placeholder="0"
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleQuickSaveCategoryAndSales}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-black text-[10px] py-2.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Save size={14} />
                    GUARDAR COMPRA Y CATEGORÍA
                  </button>

                  <label 
                    className="flex items-center gap-3 cursor-pointer group py-1"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (client) {
                        const currentVal = client.isGestionCustomer || false;
                        const newVal = !currentVal;
                        
                        await localDB.updateInCollection('contacts', client.id, { 
                          isGestionCustomer: newVal 
                        });
                        
                        if (newVal) {
                          const existingGestionRecords = await localDB.getCollection('gestion_records');
                          const alreadyExists = existingGestionRecords.some((r: any) => r.rut === client.rut);
                          
                          if (!alreadyExists) {
                            const gestionRecord = {
                              fechaIngreso: client.fechaIngreso || new Date().toISOString().split('T')[0],
                              nombre: client.name,
                              rut: client.rut,
                              tipoEmpresa: client.type,
                              comuna: client.region,
                              celular: client.phone || '',
                              email: client.email || '',
                              categoria: client.categoria,
                              estado: 'En proceso',
                              consultora: 'CRM',
                              observaciones: `Sincronizado desde Perfil 360 CRM\n\n${client.historialUnificado || ''}`
                            };
                            await localDB.saveToCollection('gestion_records', gestionRecord);
                          }
                        }
                        
                        await localDB.saveToCollection('crm_activities', {
                          fecha: new Date().toISOString(),
                          campania: 'Actualización',
                          tipo: newVal ? 'Activación Gestión' : 'Desactivación Gestión',
                          observaciones: `El cliente fue ${newVal ? 'marcado' : 'desmarcado'} como Cliente de Gestión.`,
                          responsable: 'Usuario CRM',
                          clientId: client.id
                        });
                        
                        await loadData();
                        window.dispatchEvent(new Event('db-change'));
                      }
                    }}
                  >
                    <div className="w-5 h-5 rounded border border-slate-700 bg-slate-900 flex items-center justify-center group-hover:border-sky-500 transition-all">
                      {client.isGestionCustomer && (
                        <div className="w-3 h-3 rounded-sm bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-200 transition-all uppercase tracking-wide">Es Cliente de Gestión</span>
                  </label>

                  <div className="pt-2 space-y-5">
                    <button 
                      onClick={handleAddBitacora}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs py-4 rounded-2xl transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      REGISTRAR EN HISTORIAL DETALLADO
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-600 italic text-center pt-2 uppercase font-bold tracking-tight">
                    Utilice el botón superior para guardar el historial.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* DATOS GENERALES */}
              <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-3xl space-y-6 shadow-2xl h-fit">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={16} className="text-sky-500" />
                    Datos del Negocio
                  </h3>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="text-sky-400 hover:text-sky-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Edit2 size={12} /> Editar
                    </button>
                  ) : (
                    <button onClick={handleSaveGeneral} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30">
                      Guardar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Nombre / Razón Social</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.nombre || editForm.name || ''}
                      onChange={e => setEditForm({...editForm, nombre: e.target.value, name: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white font-bold transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">RUT</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.rut || ''}
                      onChange={e => setEditForm({...editForm, rut: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white font-mono transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.email || ''}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Teléfono</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.telefono || editForm.phone || editForm.celular || ''}
                      onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white transition-all`} 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Dirección</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.direccion || ''}
                      onChange={e => setEditForm({...editForm, direccion: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Comuna</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.comuna || ''}
                      onChange={e => setEditForm({...editForm, comuna: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Tipo Empresa</label>
                    <input 
                      readOnly={!isEditing}
                      value={editForm.tipo_empresa || editForm.giro || ''}
                      onChange={e => setEditForm({...editForm, tipo_empresa: e.target.value})}
                      className={`w-full bg-[#050914] border ${isEditing ? 'border-sky-500/50' : 'border-slate-800'} p-3 rounded-xl text-xs text-white transition-all`} 
                    />
                  </div>
                </div>
              </div>

              {/* CONTACTOS Y VETERINARIOS */}
              <div className="space-y-8">
                {/* CONTACTOS */}
                <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-3xl shadow-2xl">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                    <User size={16} className="text-emerald-500" />
                    Contactos Clave
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    {contacts.map((c, idx) => (
                      <div key={idx} className="bg-[#050914] border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-slate-700 transition-all">
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            {c.nombre} 
                            {c.esPrincipal && <span className="bg-emerald-500/20 text-emerald-400 text-[8px] uppercase tracking-widest px-2 py-0.5 rounded">Principal</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{c.cargo} • {c.email} • {c.telefono || c.celular}</p>
                        </div>
                        <button onClick={() => handleDeleteContact(idx)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-500/10 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {contacts.length === 0 && (
                      <div className="text-center py-6 text-slate-600 text-xs italic">No hay contactos registrados.</div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Agregar Contacto</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input 
                        placeholder="Nombre" 
                        value={newContact.nombre}
                        onChange={e => setNewContact({...newContact, nombre: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-emerald-500 outline-none" 
                      />
                      <input 
                        placeholder="Cargo" 
                        value={newContact.cargo}
                        onChange={e => setNewContact({...newContact, cargo: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-emerald-500 outline-none" 
                      />
                      <input 
                        placeholder="Teléfono/Celular" 
                        value={newContact.telefono}
                        onChange={e => setNewContact({...newContact, telefono: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-emerald-500 outline-none" 
                      />
                      <input 
                        placeholder="Email" 
                        value={newContact.email}
                        onChange={e => setNewContact({...newContact, email: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-emerald-500 outline-none" 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newContact.esPrincipal}
                          onChange={e => setNewContact({...newContact, esPrincipal: e.target.checked})}
                          className="accent-emerald-500" 
                        />
                        Contacto Principal
                      </label>
                      <button onClick={handleAddContact} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 flex items-center gap-2">
                        <Plus size={12} /> Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* VETERINARIOS */}
                <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-3xl shadow-2xl">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Stethoscope size={16} className="text-amber-500" />
                    Cuerpo Médico / Veterinarios
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    {veterinarios.map((v, idx) => (
                      <div key={idx} className="bg-[#050914] border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-slate-700 transition-all">
                        <div>
                          <p className="text-xs font-bold text-white">{v.nombre}</p>
                          <p className="text-[10px] text-slate-400">{v.especialidad || 'General'} • {v.email}</p>
                        </div>
                        <button onClick={() => handleDeleteVet(idx)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-500/10 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {veterinarios.length === 0 && (
                      <div className="text-center py-6 text-slate-600 text-xs italic">No hay veterinarios registrados.</div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Agregar Veterinario</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input 
                        placeholder="Nombre completo" 
                        value={newVet.nombre}
                        onChange={e => setNewVet({...newVet, nombre: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-amber-500 outline-none" 
                      />
                      <input 
                        placeholder="Especialidad" 
                        value={newVet.especialidad}
                        onChange={e => setNewVet({...newVet, especialidad: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-amber-500 outline-none" 
                      />
                      <input 
                        placeholder="Email" 
                        value={newVet.email}
                        onChange={e => setNewVet({...newVet, email: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-amber-500 outline-none" 
                      />
                      <input 
                        placeholder="Teléfono (Opcional)" 
                        value={newVet.telefono}
                        onChange={e => setNewVet({...newVet, telefono: e.target.value})}
                        className="bg-[#050914] border border-slate-800 p-2.5 rounded-lg text-xs text-white focus:border-amber-500 outline-none" 
                      />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleAddVet} className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/30 flex items-center gap-2">
                        <Plus size={12} /> Añadir Vet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Deletion Modal */}
        <AnimatePresence>
          {deletingSystemEntry && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#050914] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Trash2 size={16} className="text-red-500" />
                    Eliminar Registro de Campaña
                  </h3>
                  <p className="text-xs text-slate-400">
                    ¿Desea eliminar este registro solo para este cliente o eliminar todos los registros de la campaña <span className="font-bold text-sky-400">"{deletingSystemEntry.title}"</span> para todos los clientes incorporados?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      if (client) {
                        import('../../lib/auth').then(({ localDB }) => {
                          localDB.deleteFromCollection('crm_activities', deletingSystemEntry.id).then(() => {
                            setGlobalActivities(prev => prev.filter(a => a.id !== deletingSystemEntry.id));
                            setDeletingSystemEntry(null);
                            window.dispatchEvent(new Event('db-change'));
                          });
                        });
                      }
                    }}
                    className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    Eliminar SOLO de este cliente
                  </button>
                  <button 
                    onClick={() => {
                      import('../../lib/auth').then(async ({ localDB }) => {
                        const allActivities = await localDB.getCollection('crm_activities');
                        const toDelete = allActivities.filter((a: any) => a.campania === deletingSystemEntry.title);
                        for (const act of toDelete) {
                          await localDB.deleteFromCollection('crm_activities', act.id);
                        }
                        setGlobalActivities(prev => prev.filter(a => a.campania !== deletingSystemEntry.title));
                        setDeletingSystemEntry(null);
                        window.dispatchEvent(new Event('db-change'));
                      });
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    Eliminar de TODOS los clientes (Toda la campaña)
                  </button>
                  <button 
                    onClick={() => setDeletingSystemEntry(null)}
                    className="w-full text-slate-500 hover:text-white text-xs font-bold py-3 px-4 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};
