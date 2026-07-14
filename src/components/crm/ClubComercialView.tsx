import React, { useState, useEffect, useMemo } from 'react';
import { Award, Users, Gift, Activity, Search, Check, X, ShieldCheck, Clock, Settings, Trash2, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { localDB } from '../../lib/auth';
import { motion, AnimatePresence } from 'motion/react';

const TIER_COLORS: Record<string, string> = {
  'Platinum': '#A855F7',
  'Oro': '#EAB308',
  'Plata': '#94A3B8',
  'Bronce': '#D97706',
  'Sin categoría': '#64748B',
  'Sin Compra': '#475569'
};

const parseBitacora = (bitacoraField: any): any[] => {
  if (!bitacoraField) return [];
  if (Array.isArray(bitacoraField)) return bitacoraField;
  if (typeof bitacoraField === 'string') {
    try {
      const parsed = JSON.parse(bitacoraField);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing bitacora JSON string", e);
      return [];
    }
  }
  return [];
};

// Definimos los valores por defecto
const DEFAULT_BENEFITS: Record<string, string[]> = {
  'Platinum': [
    'Despacho Gratis Ilimitado: Envíos a todo Chile sin costo.',
    'Soporte Prioritario: Atención 24/7 con línea directa.',
    'Regalo Aniversario: Set de productos premium una vez al año.'
  ],
  'Oro': [
    'Despacho Gratis (5/mes): Hasta 5 envíos gratis por mes.',
    'Soporte Preferencial: Atención en menos de 2 horas.'
  ],
  'Plata': [
    'Despacho Gratis (1/mes): 1 envío gratis al mes.'
  ],
  'Bronce': [
    'Boletín Exclusivo: Acceso a noticias y ofertas antes que todos.'
  ]
};

export default function ClubComercialView({ onViewClient }: { onViewClient?: (id: string) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'rewards'>('dashboard');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [selectedClientForReward, setSelectedClientForReward] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  // Estado para los beneficios dinámicos
  const [beneficiosPorCategoria, setBeneficiosPorCategoria] = useState<Record<string, string[]>>(DEFAULT_BENEFITS);
  
  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configYear, setConfigYear] = useState('2026');
  const [configRanges, setConfigRanges] = useState<Record<string, {min: number, max: number}>>({
    Bronce: { min: 0, max: 999999 },
    Plata: { min: 1000000, max: 2999999 },
    Oro: { min: 3000000, max: 4999999 },
    Platinum: { min: 5000000, max: 99999999 }
  });
  const [configBenefits, setConfigBenefits] = useState<Record<string, string[]>>(DEFAULT_BENEFITS);
  
  useEffect(() => {
    loadContacts();
    loadConfig(selectedYear);
    const handleDbChange = () => {
      loadContacts();
      loadConfig(selectedYear);
    };
    window.addEventListener('db-change', handleDbChange);
    return () => window.removeEventListener('db-change', handleDbChange);
  }, [selectedYear]);

  const loadConfig = async (year: string) => {
    try {
      const response = await fetch(`/api/crm/config/categories/${year}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ranges) setConfigRanges(data.ranges);
        if (data.benefits) {
          setBeneficiosPorCategoria(data.benefits);
          setConfigBenefits(data.benefits);
        } else {
          setBeneficiosPorCategoria(DEFAULT_BENEFITS);
          setConfigBenefits(DEFAULT_BENEFITS);
        }
      }
    } catch (e) {
      console.error("Error loading config", e);
    }
  };

  const loadContacts = async () => {
    const data = await localDB.getCollection('contacts');
    setContacts(data || []);
  };

  const activeContacts = contacts.filter(c => 
    c.estado !== 'Eliminado' && 
    (c.categoria !== 'Sin categoría' || c.categoria !== 'Sin compra' || c.intranet === 'si' || c.estado === 'Activo')
  );
  
  const stats = useMemo(() => {
    const counts: Record<string, number> = { 'Platinum': 0, 'Oro': 0, 'Plata': 0, 'Bronce': 0 };
    let totalConsolidado = 0;

    activeContacts.forEach(c => {
      const details = c.clubVentasDetail ? (typeof c.clubVentasDetail === 'string' ? JSON.parse(c.clubVentasDetail) : c.clubVentasDetail) : {};
      
      // Get category for selected year or current category if it matches
      const catKey = `cat${selectedYear}`;
      const salesKey = `v${selectedYear}`;
      
      // Normalize category comparison (handle potential case differences and spaces)
      const rawCat = (details[catKey] || (selectedYear === '2026' ? c.categoria : null) || 'Sin categoría').toString().trim();
      let cat = 'Sin categoría';
      
      if (/platinum/i.test(rawCat)) cat = 'Platinum';
      else if (/oro/i.test(rawCat)) cat = 'Oro';
      else if (/plata/i.test(rawCat)) cat = 'Plata';
      else if (/bronce/i.test(rawCat)) cat = 'Bronce';

      const sales = Number(details[salesKey] || 0);

      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
      totalConsolidado += sales;
    });

    return {
      counts,
      totalConsolidado,
      pieData: Object.keys(counts).map(key => ({ name: key, value: counts[key] }))
    };
  }, [activeContacts, selectedYear]);

  const handleRegisterBenefitUse = async () => {
    if (!selectedClientForReward || !selectedReward) return;
    
    const client = contacts.find(c => c.id === selectedClientForReward);
    if (!client) return;
    
    const bitacoraEntry = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      usuario: 'Usuario CRM',
      comentario: `Uso de Beneficio: ${selectedReward}`,
      tipo: 'beneficio'
    };

    // Register global activity
    try {
      await localDB.saveToCollection('crm_activities', {
        fecha: new Date().toISOString(),
        campania: 'Club Comercial',
        tipo: 'Uso de Beneficio',
        observaciones: `Uso de Beneficio: ${selectedReward}`,
        responsable: 'Usuario CRM',
        clientId: client.id
      });
    } catch (err) {
      console.error("Error logging global activity", err);
    }
    
    const currentBitacora = parseBitacora(client.bitacora);
    const newBitacora = [bitacoraEntry, ...currentBitacora];
    
    await localDB.updateInCollection('contacts', client.id, {
      bitacora: JSON.stringify(newBitacora)
    });
    
    alert('Uso de beneficio registrado en la bitácora exitosamente.');
    setSelectedReward(null);
    setSelectedClientForReward('');
    loadContacts(); // Refresh
  };

  useEffect(() => {
    if (isConfigOpen) {
      loadConfig(configYear);
    }
  }, [configYear, isConfigOpen]);

  const handleSaveConfig = async (applyToAll = false) => {
    try {
      const yearsToSave = applyToAll ? ['2024', '2025', '2026'] : [configYear];
      
      const promises = yearsToSave.map(year => 
        fetch('/api/crm/config/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, ranges: configRanges, benefits: configBenefits })
        })
      );

      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        alert(applyToAll ? 'Configuración aplicada a TODOS los años exitosamente.' : 'Configuración guardada para el año seleccionado exitosamente.');
        setBeneficiosPorCategoria(configBenefits);
        setIsConfigOpen(false);
        loadContacts();
        window.dispatchEvent(new Event('db-change'));
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar la configuración. Revisa la consola.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Award className="text-amber-400" size={28} />
            Club Comercial CIMASUR®
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-400">
              Gestión de categorías y beneficios de clientes fidelizados.
            </p>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-[#0D1527] border border-slate-800 text-[10px] font-bold text-sky-400 px-2 py-1 rounded-lg outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="2024">Ciclo 2024</option>
              <option value="2025">Ciclo 2025</option>
              <option value="2026">Ciclo 2026</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#254C7C] border border-[#1E293B] text-sky-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Settings size={16} /> Configurar Rangos
          </button>
          <div className="flex bg-[#0D1527] border border-slate-800 p-1 rounded-xl">
            <SubTabButton active={activeSubTab === 'dashboard'} onClick={() => setActiveSubTab('dashboard')} icon={<Activity size={14} />} label="Dashboard" />
            <SubTabButton active={activeSubTab === 'rewards'} onClick={() => setActiveSubTab('rewards')} icon={<Gift size={14} />} label="Catálogo de Beneficios" />
          </div>
        </div>
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard 
              label="Platinum" 
              value={stats.counts.Platinum} 
              color={TIER_COLORS.Platinum} 
              icon={<Award size={20} />} 
            />
            <KPICard 
              label="Oro" 
              value={stats.counts.Oro} 
              color={TIER_COLORS.Oro} 
              icon={<Award size={20} />} 
            />
            <KPICard 
              label="Plata" 
              value={stats.counts.Plata} 
              color={TIER_COLORS.Plata} 
              icon={<Award size={20} />} 
            />
            <KPICard 
              label="Bronce" 
              value={stats.counts.Bronce} 
              color={TIER_COLORS.Bronce} 
              icon={<Award size={20} />} 
            />
            <div className="bg-[#0D1527] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group transition-all hover:bg-[#152035]">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={48} className="text-sky-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monto Consolidado</span>
              <div className="mt-2">
                <div className="text-xl font-black text-white font-mono leading-tight">
                  ${stats.totalConsolidado.toLocaleString('es-CL')}
                </div>
                <p className="text-[9px] text-slate-500 mt-1 uppercase">Facturación histórica Ciclo {selectedYear}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Socios Ciclo {selectedYear}</span>
                  <div className="text-3xl font-black text-white font-mono mt-1">
                    {(Object.values(stats.counts) as number[]).reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                <div className="p-3 bg-sky-950/30 text-sky-400 rounded-2xl border border-sky-900/50">
                  <Users size={24} />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 bg-[#0D1527] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Users size={16} className="text-slate-400" /> Distribución por Categoría (Ciclo {selectedYear})
              </h3>
              <div className="h-64">
                {stats.pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.name] || TIER_COLORS['Sin categoría']} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px' }}
                        itemStyle={{ color: '#F8FAFC' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No hay datos registrados para el Ciclo {selectedYear}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'rewards' && (
        <div className="space-y-8">
          {Object.entries(beneficiosPorCategoria).map(([category, benefits]: [string, string[]]) => (
            <div key={category} className="bg-[#0D1527] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2" style={{ color: TIER_COLORS[category] }}>
                <ShieldCheck size={20} /> Categoría {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefits.map((benefit, index) => {
                  // Sumarize uses
                  const uses = contacts.reduce((acc, client) => {
                    if (client.bitacora) {
                      const logs = parseBitacora(client.bitacora);
                      const benefitText = `Uso de Beneficio: ${benefit}`;
                      const benefitLogs = logs.filter((l: any) => 
                        l && (
                          l.descripcion === benefitText || 
                          l.comentario === benefitText || 
                          l.detalle === benefitText ||
                          (l.comentario && String(l.comentario).includes(benefitText)) ||
                          (l.detalle && String(l.detalle).includes(benefitText))
                        )
                      );
                      if (benefitLogs.length > 0) {
                        acc.push({ client, count: benefitLogs.length });
                      }
                    }
                    return acc;
                  }, [] as {client: any, count: number}[]);
                  
                  const totalUses = uses.reduce((acc, u) => acc + u.count, 0);

                  return (
                    <div key={index} className="bg-[#050914] border border-slate-850 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <Gift size={16} className="text-slate-400" />
                        </div>
                        <p className="text-xs text-white mb-4 font-bold">{benefit}</p>
                      </div>
                      
                      <div className="border-t border-slate-850 pt-3 mt-2">
                        <div className="text-[10px] text-slate-500 font-medium mb-3">
                          {totalUses} Canjes realizados
                        </div>
                        <button 
                          onClick={() => setSelectedReward(benefit)}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          Registrar Uso
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Benefit Modal */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-0 bg-[#050914]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D1527] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-[#152035] border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                <h3 className="text-md font-black text-white flex items-center gap-2">
                  <Gift size={18} className="text-sky-400" /> Registrar Uso de Beneficio
                </h3>
                <button onClick={() => setSelectedReward(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-[#050914] p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Beneficio Seleccionado</span>
                  <div className="font-bold text-white">{selectedReward}</div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Buscar Cliente</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o RUT..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-800 p-2 pl-9 rounded-lg text-xs text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {contacts
                      .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.rut?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 10)
                      .map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setSelectedClientForReward(c.id)}
                          className={`p-2 rounded-lg cursor-pointer flex justify-between items-center text-xs ${selectedClientForReward === c.id ? 'bg-sky-900/40 border border-sky-800/50 text-white' : 'hover:bg-slate-800 text-slate-300 border border-transparent'}`}
                        >
                          <div>
                            <div className="font-bold">{c.name}</div>
                            <div className="text-[10px] text-slate-500">{c.rut} | {c.categoria || 'Sin categoría'}</div>
                          </div>
                          {selectedClientForReward === c.id && <Check size={14} className="text-sky-400" />}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-[#152035] border-t border-slate-800 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setSelectedReward(null)} className="text-xs font-bold text-slate-400 hover:text-white">Cancelar</button>
                <button 
                  disabled={!selectedClientForReward}
                  onClick={handleRegisterBenefitUse}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase px-6 py-2.5 rounded-xl transition-all shadow-md"
                >
                  Registrar en Bitácora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Config Modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 bg-[#050914]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D1527] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#152035] border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                <h3 className="text-md font-black text-white flex items-center gap-2">
                  <Settings size={18} className="text-sky-400" /> Configurar Rangos de Categoría y Beneficios
                </h3>
                <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Año Comercial</label>
                  <select 
                    value={configYear}
                    onChange={(e) => setConfigYear(e.target.value)}
                    className="w-full bg-[#050914] border border-slate-800 p-3 rounded-lg text-sm font-bold text-white outline-none focus:border-sky-500"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {Object.entries(configRanges).map(([cat, range]: [string, {min: number, max: number}]) => (
                    <div key={cat} className="bg-[#050914] border border-slate-850 p-4 rounded-xl space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 font-black" style={{ color: TIER_COLORS[cat] }}>{cat}</div>
                        <div className="flex-1">
                          <label className="block text-[9px] uppercase text-slate-500 mb-1">Mínimo (CLP)</label>
                          <input 
                            type="number"
                            value={range.min}
                            onChange={(e) => setConfigRanges(prev => ({ ...prev, [cat]: { ...prev[cat as keyof typeof prev], min: Number(e.target.value) } }))}
                            className="w-full bg-[#0D1527] border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] uppercase text-slate-500 mb-1">Máximo (CLP)</label>
                          <input 
                            type="number"
                            value={range.max}
                            onChange={(e) => setConfigRanges(prev => ({ ...prev, [cat]: { ...prev[cat as keyof typeof prev], max: Number(e.target.value) } }))}
                            className="w-full bg-[#0D1527] border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Editor de beneficios para esta categoría */}
                      {configBenefits[cat] && (
                        <div className="pt-4 border-t border-slate-800/50 space-y-3">
                          <label className="block text-[10px] font-bold uppercase text-slate-400">Beneficios ({cat})</label>
                          {configBenefits[cat] && configBenefits[cat].map((benefit, bIdx) => (
                            <div key={bIdx} className="bg-[#0D1527] p-2 rounded-lg border border-slate-800/80 flex items-center gap-2 group">
                              <input 
                                type="text"
                                value={benefit}
                                onChange={(e) => {
                                  const newBenefits = { ...configBenefits };
                                  newBenefits[cat][bIdx] = e.target.value;
                                  setConfigBenefits(newBenefits);
                                }}
                                className="w-full bg-[#152035] border border-slate-700 p-2 rounded text-xs text-white outline-none focus:border-sky-500"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const newBenefits = { ...configBenefits };
                                  newBenefits[cat] = (newBenefits[cat] || []).filter((_, i) => i !== bIdx);
                                  setConfigBenefits(newBenefits);
                                }}
                                className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Escribe y presiona Enter para añadir beneficio..."
                              className="flex-1 bg-[#050914] border border-slate-800 border-dashed p-2 rounded text-xs text-slate-400 outline-none focus:border-sky-500"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                  const val = e.currentTarget.value.trim();
                                  setConfigBenefits(prev => ({...prev, [cat]: [...(prev[cat] || []), val]}));
                                  e.currentTarget.value = "";
                                  e.preventDefault();
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#152035] border-t border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold italic">
                   * Guardar aplicará cambios únicamente al año seleccionado arriba.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsConfigOpen(false)} className="text-xs font-bold text-slate-400 hover:text-white">Cancelar</button>
                  <button 
                    onClick={() => handleSaveConfig(true)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all shadow-md"
                    title="Copia estos rangos y beneficios a todos los ciclos (2024, 2025, 2026)"
                  >
                    Aplicar a Todos los Años
                  </button>
                  <button 
                    onClick={() => handleSaveConfig(false)}
                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs uppercase px-6 py-2.5 rounded-xl transition-all shadow-md"
                  >
                    Guardar Año {configYear}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function SubTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${active ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function KPICard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0D1527] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-md group transition-all hover:bg-[#152035]">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-1.5 rounded-lg opacity-80" style={{ backgroundColor: `${color}20`, color: color }}>
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-black text-white font-mono leading-none">{value}</div>
        <div className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Socios registrados</div>
      </div>
    </div>
  );
}
