import React, { useState, useEffect } from 'react';
import { Client } from '../../services/crm/types';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { 
  X, User, Building2, MapPin, Phone, Mail, Globe, Briefcase, 
  Calendar, Award, TrendingUp, Bot, FileText, Plus, Trash2, 
  Edit2, Save, Activity, DollarSign, Gift, Layers, Brain, Megaphone, Check
} from 'lucide-react';

interface Client360Props {
  clientId: string;
  onClose: () => void;
  onSave?: () => void;
}

export const Client360View: React.FC<Client360Props> = ({ clientId, onClose, onSave }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Sub-lists local states for easy updates
  const [contacts, setContacts] = useState<any[]>([]);
  const [veterinarios, setVeterinarios] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);

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
    setLoading(true);
    const c = await clientService.getFullClientData(clientId);
    if (c) {
      setClient(c);
      setEditForm(c);
      setContacts(c.contactos || []);
      setVeterinarios(c.veterinarios || []);
      setBitacora(c.bitacora || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

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
          <button onClick={onClose} className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-white rounded-lg text-xs font-bold">Cerrar</button>
        </div>
      </div>
    );
  }


  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { ventas, clubComercial, ...contactUpdates } = editForm;

      await clientService.updateClient(client.id, contactUpdates);

      if (clubComercial) {
        const loyaltyId = clubComercial.id || client.id;
        await localDB.updateInCollection('loyalty_accounts', loyaltyId, clubComercial);
      }

      await loadData();
      setIsEditing(false);
      if (onSave) onSave();
      window.dispatchEvent(new Event('db-change'));
      alert('Información general actualizada exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cambios.');
    }
  };

  const handleAddContact = async () => {
    if (!newContact.nombre || !newContact.email) {
      alert('Nombre y Email son obligatorios');
      return;
    }
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
    setNewBitacoraEntry('');
    await loadData();
    window.dispatchEvent(new Event('db-change'));
  };

  const formatCLP = (val: number) => `$${val.toLocaleString('es-CL')}`;

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 size={14} /> },
    { id: 'contactos', label: 'Contactos & Vets', icon: <User size={14} /> },
    { id: 'club', label: 'Club Comercial', icon: <Award size={14} /> },
    { id: 'oportunidades', label: 'Oportunidades', icon: <Megaphone size={14} /> },
    { id: 'ia', label: 'Inteligencia IA', icon: <Brain size={14} /> },
    { id: 'bitacora', label: 'Bitácora', icon: <FileText size={14} /> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#0D1527] border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#152035] p-6 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 border border-sky-500/20">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{client.name}</h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${client.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {client.estado}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-xs mt-1">
                <span className="font-mono text-slate-300">RUT: {client.rut}</span>
                {client.nombreFantasia && (
                  <span className="italic text-slate-500">({client.nombreFantasia})</span>
                )}
                <span>•</span>
                <span>Ingreso: {client.fechaIngreso}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-750 transition-all active:scale-95"
            >
              {isEditing ? <X size={14} /> : <Edit2 size={14} />}
              {isEditing ? 'Cancelar Edición' : 'Editar Información'}
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-[#0D1527] border-b border-slate-800 px-6 flex overflow-x-auto gap-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsEditing(false); }}
              className={`flex items-center gap-2 py-4 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-sky-400 text-sky-400 bg-sky-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div>
              {isEditing ? (
                <form onSubmit={handleSaveGeneral} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Razón Social *</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.name || ''} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Nombre Fantasía</label>
                      <input 
                        type="text" 
                        value={editForm.nombreFantasia || ''} 
                        onChange={e => setEditForm({...editForm, nombreFantasia: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">RUT *</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.rut || ''} 
                        onChange={e => setEditForm({...editForm, rut: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Giro Comercial</label>
                      <input 
                        type="text" 
                        value={editForm.giro || ''} 
                        onChange={e => setEditForm({...editForm, giro: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Email *</label>
                      <input 
                        type="email" 
                        required 
                        value={editForm.email || ''} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Teléfono</label>
                      <input 
                        type="text" 
                        value={editForm.telefono || ''} 
                        onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Dirección</label>
                      <input 
                        type="text" 
                        value={editForm.direccion || ''} 
                        onChange={e => setEditForm({...editForm, direccion: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Comuna</label>
                      <input 
                        type="text" 
                        value={editForm.comuna || ''} 
                        onChange={e => setEditForm({...editForm, comuna: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ciudad</label>
                      <input 
                        type="text" 
                        value={editForm.ciudad || ''} 
                        onChange={e => setEditForm({...editForm, ciudad: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Región</label>
                      <input 
                        type="text" 
                        value={editForm.region || ''} 
                        onChange={e => setEditForm({...editForm, region: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Sitio Web</label>
                      <input 
                        type="text" 
                        value={editForm.sitioWeb || ''} 
                        onChange={e => setEditForm({...editForm, sitioWeb: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ejecutivo Comercial</label>
                      <input 
                        type="text" 
                        value={editForm.ejecutivoComercial || ''} 
                        onChange={e => setEditForm({...editForm, ejecutivoComercial: e.target.value})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Estado</label>
                      <select 
                        value={editForm.estado} 
                        onChange={e => setEditForm({...editForm, estado: e.target.value as 'Activo' | 'Inactivo'})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                      <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">VENTAS ANUALES (CLP)</label>
                      <input 
                        type="number" 
                        value={editForm.clubComercial?.yearlyData?.[0]?.annualAmount || ''} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          const newYearlyData = [...(editForm.clubComercial?.yearlyData || [{year: new Date().getFullYear(), annualAmount: 0, monthlyAmount: 0, monthlyFrascos: 0}])];
                          newYearlyData[0].annualAmount = val;
                          newYearlyData[0].monthlyAmount = val / 12;
                          setEditForm({...editForm, clubComercial: {...editForm.clubComercial, yearlyData: newYearlyData} as any});
                        }}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                        placeholder="Ej: 12000000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">PROMEDIO MENSUAL (CLP)</label>
                      <input 
                        type="number" 
                        value={editForm.clubComercial?.yearlyData?.[0]?.monthlyAmount || ''} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          const newYearlyData = [...(editForm.clubComercial?.yearlyData || [{year: new Date().getFullYear(), annualAmount: 0, monthlyAmount: 0, monthlyFrascos: 0}])];
                          newYearlyData[0].monthlyAmount = val;
                          setEditForm({...editForm, clubComercial: {...editForm.clubComercial, yearlyData: newYearlyData} as any});
                        }}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">PROMEDIO MENSUAL (FRASCOS)</label>
                      <input 
                        type="number" 
                        value={editForm.clubComercial?.manualMonthlyFrascos || ''} 
                        onChange={e => setEditForm({...editForm, clubComercial: {...editForm.clubComercial, manualMonthlyFrascos: Number(e.target.value)} as any})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                        placeholder="Ej: 5.7"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Categoría Actual (Manual)</label>
                      <input 
                        type="text" 
                        value={editForm.clubComercial?.categoria || ''} 
                        onChange={e => setEditForm({...editForm, clubComercial: {...editForm.clubComercial, categoria: e.target.value} as any})}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                        placeholder="Ej: Bronce"
                      />
                    </div>
          </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Consumo de Frascos</label>
                      <input 
                        type="number" 
                        value={editForm.compras !== undefined ? editForm.compras : (editForm.frascos !== undefined ? editForm.frascos : '')} 
                        onChange={e => setEditForm({
                          ...editForm, 
                          compras: e.target.value ? Number(e.target.value) : 0,
                          frascos: e.target.value ? Number(e.target.value) : 0,
                          frascosComprados: e.target.value ? Number(e.target.value) : 0
                        })}
                        className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                        placeholder="Ej: 24"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Observaciones Internas</label>
                    <textarea 
                      value={editForm.observaciones || ''} 
                      onChange={e => setEditForm({...editForm, observaciones: e.target.value})}
                      className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white h-24" 
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
                    >
                      <Save size={14} />
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DetailField label="Razón Social" value={client.name} icon={<Building2 className="text-sky-400" />} />
                  <DetailField label="Nombre Fantasía" value={client.nombreFantasia} icon={<User className="text-indigo-400" />} />
                  <DetailField label="RUT" value={client.rut} icon={<FileText className="text-amber-400" />} />
                  <DetailField label="Giro Comercial" value={client.giro} icon={<Briefcase className="text-purple-400" />} />
                  <DetailField label="Email" value={client.email} icon={<Mail className="text-blue-400" />} />
                  <DetailField label="Teléfono" value={client.telefono} icon={<Phone className="text-emerald-400" />} />
                  <DetailField label="Dirección" value={client.direccion} icon={<MapPin className="text-rose-400" />} />
                  <DetailField label="Comuna" value={client.comuna} icon={<MapPin className="text-rose-400" />} />
                  <DetailField label="Ciudad/Región" value={`${client.ciudad || ''} ${client.region ? `, ${client.region}` : ''}`} icon={<MapPin className="text-rose-400" />} />
                  <DetailField label="Sitio Web" value={client.sitioWeb} icon={<Globe className="text-teal-400" />} />
                  <DetailField label="Ejecutivo Comercial" value={client.ejecutivoComercial || 'Sin asignar'} icon={<User className="text-orange-400" />} />
                  <DetailField label="Responsable Intranet" value={client.responsable || 'Sistema'} icon={<Layers className="text-sky-400" />} />
                  <DetailField label="Categoría Club" value={client.categoria || 'Sin categoría'} icon={<Award className="text-yellow-500" />} />
                  <DetailField label="Promedio Frascos Mensual" value={`${Number((((client.compraAnual || 0) / 12) / 10000).toFixed(1))} frascos/mes`} icon={<Activity className="text-emerald-400" />} />
                  <DetailField label="Consumo de Frascos (Total)" value={`${client.compras !== undefined ? client.compras : (client.frascos !== undefined ? client.frascos : 0)} frascos`} icon={<Activity className="text-orange-500" />} />
                  
                  <div className="md:col-span-2 lg:col-span-3 bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Observaciones Internas</span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{client.observaciones || 'No se registran observaciones.'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CONTACTOS & VETERINARIOS */}
          {activeTab === 'contactos' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* CONTACTS LIST */}
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-200 tracking-wider">Contactos de la Empresa</h3>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{contacts.length}</span>
                </div>

                <div className="space-y-3">
                  {contacts.map((c, i) => (
                    <div key={i} className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{c.nombre}</span>
                          {c.esPrincipal && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 border border-emerald-500/25 rounded-md">
                              Contacto Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{c.cargo || 'Sin Cargo'}</p>
                        <p className="text-xs text-slate-500">{c.email} {c.telefono ? `| ${c.telefono}` : ''} {c.celular ? `| Cel: ${c.celular}` : ''}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteContact(i)}
                        className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded border border-red-900/30 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add Contact Mini Form */}
                  <div className="bg-slate-900/10 border border-dashed border-slate-800 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Agregar Nuevo Contacto</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Nombre completo" 
                        value={newContact.nombre}
                        onChange={e => setNewContact({...newContact, nombre: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="Cargo" 
                        value={newContact.cargo}
                        onChange={e => setNewContact({...newContact, cargo: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="email" 
                        placeholder="Email" 
                        value={newContact.email}
                        onChange={e => setNewContact({...newContact, email: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="Celular" 
                        value={newContact.celular}
                        onChange={e => setNewContact({...newContact, celular: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input 
                          type="checkbox" 
                          checked={newContact.esPrincipal} 
                          onChange={e => setNewContact({...newContact, esPrincipal: e.target.checked})}
                          className="rounded text-sky-500 bg-[#050914] border-slate-800" 
                        />
                        Establecer como principal
                      </label>
                      <button 
                        onClick={handleAddContact}
                        className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        <Plus size={12} />
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* VETERINARIOS / PROFESIONALES */}
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-200 tracking-wider">Médicos Veterinarios Asoc.</h3>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{veterinarios.length}</span>
                </div>

                <div className="space-y-3">
                  {veterinarios.map((v, i) => (
                    <div key={i} className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-white">{v.nombre}</span>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">{v.especialidad || 'Generalista'}</p>
                        <p className="text-xs text-slate-500">{v.email} {v.telefono ? `| Tel: ${v.telefono}` : ''}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteVet(i)}
                        className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded border border-red-900/30 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add Vet Mini Form */}
                  <div className="bg-slate-900/10 border border-dashed border-slate-800 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vincular Nuevo Veterinario</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Nombre completo" 
                        value={newVet.nombre}
                        onChange={e => setNewVet({...newVet, nombre: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="Especialidad (ej. Cardiología)" 
                        value={newVet.especialidad}
                        onChange={e => setNewVet({...newVet, especialidad: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="email" 
                        placeholder="Email" 
                        value={newVet.email}
                        onChange={e => setNewVet({...newVet, email: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="Teléfono" 
                        value={newVet.telefono}
                        onChange={e => setNewVet({...newVet, telefono: e.target.value})}
                        className="bg-[#050914] border border-slate-850 p-2 rounded text-xs text-white" 
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAddVet}
                        className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        <Plus size={12} />
                        Vincular
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: CLUB COMERCIAL */}
          {activeTab === 'club' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#050914] border border-slate-850 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Award className="text-yellow-500 w-8 h-8" />
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Categoría Actual (2026)</h4>
                      <div className="text-2xl font-black text-white mt-1">{client.categoria || 'Sin categoría'}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-850/50 pt-4">
                     <span className="text-[10px] text-slate-500 font-bold block uppercase mb-4">Línea de Tiempo Histórica</span>
                     
                     <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                        {['2026', '2025', '2024'].map((year, idx) => {
                          const details = client.clubVentasDetail ? (typeof client.clubVentasDetail === 'string' ? JSON.parse(client.clubVentasDetail) : client.clubVentasDetail) : {};
                          const cat = details[`cat${year}`] || (year === '2026' ? client.categoria : null) || 'Sin categoría';
                          const sales = details[`v${year}`] || 0;
                          
                          return (
                            <div key={year} className="relative">
                              <div className={`absolute -left-[24px] top-1 w-4 h-4 rounded-full border-4 border-[#0D1527] z-10 ${idx === 0 ? 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-slate-700'}`} />
                              <div className="bg-[#0D1527] border border-slate-850 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-slate-500 uppercase">Ciclo {year}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${cat === 'Platinum' ? 'bg-purple-950 text-purple-300' : cat === 'Oro' ? 'bg-amber-950 text-amber-300' : cat === 'Plata' ? 'bg-slate-800 text-slate-300' : 'bg-orange-950 text-orange-300'}`}>
                                    {cat}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-white">${Number(sales).toLocaleString('es-CL')}</div>
                              </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                </div>

                <div className="bg-[#050914] border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <Gift size={16} />
                    Detalles de Venta y Promedios
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-sky-500/5 p-4 rounded-xl border border-sky-500/10">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Ventas Anuales Consolidadas</span>
                      <span className="text-xl font-black text-white">${(client.clubVentasDetail ? JSON.parse(client.clubVentasDetail).v2026 : 0)?.toLocaleString('es-CL')}</span>
                      <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#0D1527] p-3 rounded-xl border border-slate-850">
                         <span className="text-[9px] text-slate-500 font-bold block uppercase mb-1">Prom. Mensual</span>
                         <span className="text-xs font-bold text-white">${((client.clubVentasDetail ? JSON.parse(client.clubVentasDetail).v2026 : 0) / 12)?.toLocaleString('es-CL')}</span>
                       </div>
                       <div className="bg-[#0D1527] p-3 rounded-xl border border-slate-850">
                         <span className="text-[9px] text-slate-500 font-bold block uppercase mb-1">Brecha Prox. Cat.</span>
                         <span className="text-xs font-bold text-emerald-400">$1.240.000</span>
                       </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: OPORTUNIDADES & CAMPAÑAS */}
          {activeTab === 'oportunidades' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-200 tracking-wider">Oportunidades Comerciales Activas</h3>
                {client.oportunidades?.length ? (
                  <div className="space-y-3">
                    {client.oportunidades.map((o: any, i: number) => (
                      <div key={i} className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{o.tipo || o.opportunityType}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${o.prioridad === 'critical' || o.prioridad === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {o.prioridad || 'Media'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{o.descripcion || o.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No hay alertas de oportunidad activa para este cliente.</p>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-200 tracking-wider">Ejecuciones de Campañas</h3>
                {client.campanas?.length ? (
                  <div className="space-y-3">
                    {client.campanas.map((c: any, i: number) => (
                      <div key={i} className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-white">{c.nombre}</span>
                          <p className="text-[10px] text-slate-500">Canal: {c.canal} | Fecha: {c.fecha}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Enviado</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No se registran campañas enviadas a este cliente en este ciclo.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB: INTELIGENCIA IA */}
          {activeTab === 'ia' && (
            <div className="bg-sky-950/10 border border-sky-500/15 p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 text-sky-400 border-b border-sky-500/10 pb-3">
                <Bot size={20} />
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  Cognición Comercial por Gemini AI
                  <span className="bg-sky-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black">ACTIVE</span>
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest mb-1.5">Diagnóstico y Salud de Cuenta</h4>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-sky-500/5 p-4 rounded-xl border border-sky-500/5">
                    "{client.iaComercial?.insights || 'El motor de inteligencia está calculando el perfil psicofisiológico y los disparadores de compra preferenciales para este veterinario. Se cargará automáticamente al finalizar.'}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#050914] p-4 rounded-xl border border-slate-850">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Propensión a Abandono</span>
                    <span className="text-lg font-black text-white">{client.iaComercial?.propensionAbandono || 'Baja (8.5%)'}</span>
                  </div>
                  <div className="bg-[#050914] p-4 rounded-xl border border-slate-850">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Próxima Compra Recomendada</span>
                    <span className="text-lg font-black text-sky-400">{client.iaComercial?.proximaCompra || 'Cardiología Base Cimasur'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BITÁCORA */}
          {activeTab === 'bitacora' && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Agregar comentario de seguimiento..." 
                  value={newBitacoraEntry}
                  onChange={e => setNewBitacoraEntry(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddBitacora()}
                  className="flex-1 bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white" 
                />
                <button 
                  onClick={handleAddBitacora}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition-all active:scale-95"
                >
                  Registrar
                </button>
              </div>

              <div className="space-y-4">
                {bitacora.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="mx-auto w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs">No hay entradas de bitácora registradas.</p>
                  </div>
                ) : (
                  bitacora.map((entry, idx) => (
                    <div key={idx} className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Registrado por {entry.creador || 'Sistema'}</span>
                        <span className="font-mono">{new Date(entry.fecha).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{entry.comentario}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#152035] p-4 border-t border-slate-800 flex justify-end">
          <button 
            onClick={onClose} 
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl border border-slate-750 transition-all active:scale-95"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};

// HELPER MINI COMPONENTS
const DetailField: React.FC<{ label: string; value?: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl flex items-start gap-3">
    <div className="p-2 bg-slate-900 rounded-xl mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">{label}</span>
      <span className="text-xs font-bold text-white block truncate">{value || 'N/A'}</span>
    </div>
  </div>
);
