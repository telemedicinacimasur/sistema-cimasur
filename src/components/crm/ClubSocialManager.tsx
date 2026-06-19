import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Shield, Check, Search, Save, Edit3, HelpCircle, AlertCircle, ShoppingBag, 
  Calendar, RefreshCw, BarChart2, Plus, Sliders, CheckCircle, Users
} from 'lucide-react';
import { localDB } from '../../lib/auth';

interface ClientVentas {
  v2024: number;
  v2025: number;
  v2026: number;
}

interface ClubClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut: string;
  categoria: string; // Current saved category: 'Sin compra' | 'Sin categoría' | 'Bronce' | 'Plata' | 'Oro' | 'Platinum'
  region?: string;
  ventas?: ClientVentas; // Serialized or added locally to play with
  historialUnificado?: string;
}

const TIERS_DEFAULT = [
  {
    name: 'Sin categoría',
    min: 0,
    max: 499999,
    color: 'border-slate-300 bg-slate-50 text-slate-900 shadow-md',
    badge: 'bg-slate-200 text-slate-900 border-slate-300',
    benefits: [
      'Acceso general a catálogos online de CIMASUR',
      'Boletín técnico mensual por correo electrónico'
    ]
  },
  {
    name: 'Bronce',
    min: 500000,
    max: 1999999,
    color: 'border-amber-300 bg-amber-50/90 text-amber-950 shadow-md',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    benefits: [
      'Descuento por volumen en Productos Base (**)',
      'Invitación a todos los eventos gratuitos en línea (con prioridad para visitas a Laboratorio y Capacitaciones)',
      'Soporte técnico vía Google Form o WhatsApp',
      'Boletín informativo digital trimestral vía email (SI)'
    ]
  },
  {
    name: 'Plata',
    min: 2000000,
    max: 4999999,
    color: 'border-blue-200 bg-blue-50/95 text-blue-950 shadow-md',
    badge: 'bg-blue-100 text-blue-900 border-blue-200',
    benefits: [
      'Descuento por volumen en Productos Base y Avanzados (**)',
      '3 despachos gratuitos anuales vía Blue Express en compras superiores a $300.000.-',
      '5 muestras gratis de productos promocionales anuales',
      '1 artefacto de promoción gratis (minivitrinas/stickers u otro) anual',
      'Invitación a todos los eventos gratuitos en línea',
      'Soporte técnico vía Google Form o WhatsApp',
      'Boletín informativo digital trimestral vía email (SI)'
    ]
  },
  {
    name: 'Oro',
    min: 5000000,
    max: 11999999,
    color: 'border-yellow-300 bg-yellow-50/95 text-yellow-950 shadow-md',
    badge: 'bg-yellow-100 text-yellow-904 border-yellow-305',
    benefits: [
      'Descuento por volumen en Productos Base, Avanzados, Especialidades y Esencias Florales',
      '3 despachos gratuitos anuales vía Blue Express (solicitados previamente)',
      '10 muestras gratis anuales y acceso anticipado con 10% extra de descuento en nuevos productos',
      'Permite devolución y reposición según Política de Reposición de Productos CIMASUR',
      '1 Vademécum gratuito por actualización + 1 artefacto de promoción gratis anual',
      'Invitación a todos los eventos gratuitos en línea',
      'Soporte prioritario online por chat WhatsApp',
      'Boletín informativo digital trimestral vía email (SI)'
    ]
  },
  {
    name: 'Platinum',
    min: 12000000,
    max: Infinity,
    color: 'border-purple-300 bg-purple-50/95 text-purple-950 shadow-md',
    badge: 'bg-purple-100 text-purple-90 border-purple-200',
    benefits: [
      'Descuento por volumen en Todos los productos de la línea (*)',
      'Despacho SIN COSTO en todos los envíos vía Blue Express',
      '20 muestras gratis anuales y acceso anticipado con 10% extra de descuento en nuevos productos',
      'Permite devolución y reposición según Política de Reposición de Productos CIMASUR',
      '2 Vademécum gratuitos por actualización + 2 artefactos de promoción gratis anuales',
      'Invitación a todos los eventos gratuitos en línea',
      'Soporte prioritario online por chat WhatsApp',
      'Boletín informativo digital trimestral vía email (SI)'
    ]
  }
];

// Helper to calculate tier based on sales
function getTierBySales(sales: number, tiers: any[]) {
  const list = tiers && tiers.length > 0 ? tiers : TIERS_DEFAULT;
  for (const t of list) {
    if (sales >= t.min && sales <= t.max) {
      return t;
    }
  }
  return list[0];
}

// Default simulated values when none is defined in database
function getDefaultVentasForClient(categoria: string): ClientVentas {
  const cat = (categoria || 'Sin categoría').toLowerCase();
  if (cat.includes('platinum')) {
    return { v2024: 11500000, v2025: 12200000, v2026: 13500000 };
  } else if (cat.includes('oro')) {
    return { v2024: 4800000, v2025: 5200000, v2026: 6400000 };
  } else if (cat.includes('plata')) {
    return { v2024: 2100000, v2025: 2400000, v2026: 3100000 };
  } else if (cat.includes('bronce')) {
    return { v2024: 900000, v2025: 1100000, v2026: 1250000 };
  } else if (cat.includes('compra')) {
    return { v2024: 0, v2025: 0, v2026: 150000 };
  } else {
    return { v2024: 300000, v2025: 450000, v2026: 480000 };
  }
}

export function ClubSocialManager() {
  const [clients, setClients] = useState<ClubClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterDirection, setFilterDirection] = useState<'all' | 'up' | 'down' | 'same'>('all');
  
  // Real or custom tiers list state
  const [tiersList, setTiersList] = useState<any[]>(() => {
    const saved = localStorage.getItem('cimasur_club_tiers_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed.map((item, idx) => ({
            ...item,
            min: Number(item.min) || 0,
            max: item.max === null || item.max === "Infinity" || idx === 4 ? Infinity : Number(item.max),
            color: TIERS_DEFAULT[idx].color, // Keep the correct black-text background styling
            badge: TIERS_DEFAULT[idx].badge,
            benefits: Array.isArray(item.benefits) ? item.benefits : []
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return TIERS_DEFAULT;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [editTiersConfig, setEditTiersConfig] = useState<any[]>([]);
  const [activeSettingsTab, setActiveSettingsTab] = useState(0);

  // Simulated addition or dynamic play with category bounds
  const [simExtraVentas, setSimExtraVentas] = useState(0);
  const [campaignTargetTier, setCampaignTargetTier] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Individual sales inputs
  const [editSales, setEditSales] = useState<ClientVentas>({ v2024: 0, v2025: 0, v2026: 0 });
  const [isEditingSales, setIsEditingSales] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Load clients
  const loadData = async () => {
    try {
      const contacts = await localDB.getCollection('contacts');
      // Format as Club Client
      const formatted: ClubClient[] = contacts.map(c => {
        let salesDetail = c.clubVentasDetail;
        if (typeof salesDetail === 'string') {
          try {
            salesDetail = JSON.parse(salesDetail);
          } catch {
            salesDetail = null;
          }
        }
        
        // If not found in record, generate beautiful deterministic default values based on category
        const defaultSales = getDefaultVentasForClient(c.categoria);
        return {
          id: c.id,
          name: c.name || 'Sin Nombre',
          email: c.email || 'Sin Email',
          phone: c.phone || 'Sin Teléfono',
          rut: c.rut || 'Sin RUT',
          categoria: c.categoria || 'Sin categoría',
          region: c.region,
          ventas: salesDetail || defaultSales,
          historialUnificado: c.historialUnificado
        };
      });
      setClients(formatted);
      
      // Auto-select first client if none selected
      if (formatted.length > 0 && !selectedClientId) {
        setSelectedClientId(formatted[0].id);
        setEditSales(formatted[0].ventas || getDefaultVentasForClient(formatted[0].categoria));
      }
    } catch (e) {
      console.error("Error loading club social clients", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  const selectedClient = useMemo(() => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      return client;
    }
    return null;
  }, [clients, selectedClientId]);

  // Set inputs when selected client changes
  useEffect(() => {
    if (selectedClient && selectedClient.ventas) {
      setEditSales({ ...selectedClient.ventas });
      setSimExtraVentas(0);
      setIsEditingSales(false);
      setCopiedMessageId(null);
      
      // Auto-set the campaign target tier to the next tier
      const currentTierIndex = tiersList.findIndex(t => t.name.toLowerCase() === (selectedClient.categoria || 'Sin categoría').toLowerCase());
      if (currentTierIndex !== -1 && currentTierIndex < tiersList.length - 1) {
        setCampaignTargetTier(tiersList[currentTierIndex + 1].name);
      } else {
        setCampaignTargetTier('Oro'); // fallback
      }
    }
  }, [selectedClientId, selectedClient, tiersList]);

  // Derived calculations for clients
  const enrichedClients = useMemo(() => {
    return clients.map(c => {
      const v2026 = c.ventas?.v2026 || 0;
      const v2025 = c.ventas?.v2025 || 0;
      
      const calculatedTierObject2026 = getTierBySales(v2026, tiersList);
      const calculatedTierObject2025 = getTierBySales(v2025, tiersList);
      
      const calcTier = calculatedTierObject2026.name;
      const calcTierPrev = calculatedTierObject2025.name;
      const currentTier = c.categoria || 'Sin categoría';
      
      let trend: 'up' | 'down' | 'same' = 'same';
      
      const idx2026 = tiersList.findIndex(t => t.name.toLowerCase() === calcTier.toLowerCase());
      const idx2025 = tiersList.findIndex(t => t.name.toLowerCase() === calcTierPrev.toLowerCase());
      const idxCurrent = tiersList.findIndex(t => t.name.toLowerCase() === currentTier.toLowerCase());

      if (idx2026 > idx2025) trend = 'up';
      else if (idx2026 < idx2025) trend = 'down';

      // Compare current saved category vs calculated recommendation
      let actionRequired: 'upgrade' | 'downgrade' | 'none' = 'none';
      if (idx2026 > idxCurrent && idxCurrent !== -1) {
        actionRequired = 'upgrade';
      } else if (idx2026 < idxCurrent && idxCurrent !== -1) {
        actionRequired = 'downgrade';
      }

      return {
        ...c,
        calculatedTier: calcTier,
        calculatedTierPrev: calcTierPrev,
        trend,
        actionRequired,
        v2026,
        v2025
      };
    });
  }, [clients, tiersList]);

  // Filter list
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                            c.rut.toLowerCase().includes(search.toLowerCase()) || 
                            c.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesCat = filterCategory === 'Todas' || c.categoria.toLowerCase() === filterCategory.toLowerCase();
      
      let matchesDirection = true;
      if (filterDirection === 'up') {
        matchesDirection = c.actionRequired === 'upgrade';
      } else if (filterDirection === 'down') {
        matchesDirection = c.actionRequired === 'downgrade';
      } else if (filterDirection === 'same') {
        matchesDirection = c.actionRequired === 'none';
      }

      return matchesSearch && matchesCat && matchesDirection;
    });
  }, [enrichedClients, search, filterCategory, filterDirection]);

  // Interactive calculations for SELECTED client (including simulated values)
  const simulatedVentas2026 = useMemo(() => {
    if (!selectedClient) return 0;
    const base2026 = isEditingSales ? editSales.v2026 : (selectedClient.ventas?.v2026 || 0);
    return base2026 + simExtraVentas;
  }, [selectedClient, editSales, isEditingSales, simExtraVentas]);

  const simulatedTier = useMemo(() => {
    return getTierBySales(simulatedVentas2026, tiersList);
  }, [simulatedVentas2026, tiersList]);

  const nextTierInfo = useMemo(() => {
    const currentTierIndex = tiersList.findIndex(t => t.name === simulatedTier.name);
    if (currentTierIndex !== -1 && currentTierIndex < tiersList.length - 1) {
      const nextTier = tiersList[currentTierIndex + 1];
      const remainingBytes = nextTier.min - simulatedVentas2026;
      const progressPercent = Math.min(100, Math.round((simulatedVentas2026 / nextTier.min) * 100));
      return {
        nextName: nextTier.name,
        remaining: remainingBytes,
        progress: progressPercent,
        almostThere: progressPercent >= 75
      };
    }
    return null;
  }, [simulatedTier, simulatedVentas2026, tiersList]);

  // Save the custom sales and calculated category to the active record!
  const handleSaveAndCommit = async (saveCalculatedCategoryOnly = false) => {
    if (!selectedClient) return;
    setSavingStatus(true);
    try {
      const finalCategoryStr = saveCalculatedCategoryOnly ? simulatedTier.name : selectedClient.categoria;
      
      // We will commit 'clubVentasDetail' as a property JSON object to DB
      const currentObs = selectedClient.historialUnificado || '';
      const updateMsg = `\n\n--- Actualización Club Social (${new Date().toLocaleDateString('es-CL')}) ---\n` +
                        `Ventas anuales actualizadas a: 2024: $${editSales.v2024.toLocaleString('es-CL')}, 2025: $${editSales.v2025.toLocaleString('es-CL')}, 2026: $${editSales.v2026.toLocaleString('es-CL')}.\n` +
                        `Categoría real actualizada a: ${simulatedTier.name} (Anterior: ${selectedClient.categoria})`;

      const updates: any = {
        categoria: simulatedTier.name, // Immediately upgrade to matching simulated calculated tier
        clubVentasDetail: JSON.stringify(editSales),
        historialUnificado: currentObs + updateMsg
      };

      await localDB.updateInCollection('contacts', selectedClient.id, updates);
      
      // Dispatch refresh
      window.dispatchEvent(new Event('db-change'));
      setIsEditingSales(false);
      setSimExtraVentas(0);
      alert(`¡Éxito! Base de Club Social guardada y categoría sincronizada a: ${simulatedTier.name}`);
    } catch (e) {
      alert("Error al guardar la información del club.");
      console.error(e);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleQuickAddSale = (amount: number) => {
    setSimExtraVentas(prev => prev + amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      
      {/* SECTION HEADER */}
      <div className="bg-[#152035] rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
              Módulo Club Social
            </span>
            <span className="p-1 px-2.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
              Motor Comercial v2026
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tight italic leading-none">
            Análisis de Tiers & Club Social Cimasur
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-xl">
            Simula las ventas anuales acumuladas, monitorea ascensos o descensos automáticos de categorías y asigna los beneficios exclusivos del club correspondientes a cada miembro.
          </p>
        </div>
        
        {/* QUICK STATS */}
        <div className="flex flex-col sm:flex-row gap-4 items-center self-stretch xl:self-auto">
          {/* ADJUST THRESHOLDS & BENEFITS TRIGGER BUTTON */}
          <button
            onClick={() => {
              const activeState = !showSettings;
              setShowSettings(activeState);
              if (activeState) {
                setEditTiersConfig([...tiersList]);
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-pink-500/10 hover:from-amber-500/20 hover:to-pink-500/20 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            <Sliders className="w-4 h-4 text-pink-400" />
            {showSettings ? 'Cerrar Ajustes ✕' : 'Modificar Reglas y Beneficios 👑'}
          </button>

          <div className="flex flex-1 gap-4 p-4 bg-[#0D1527] rounded-2xl border border-slate-800 justify-around items-center self-stretch sm:self-auto">
            <div className="text-center px-4">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Socios Club</div>
              <div className="text-xl font-mono font-black text-white">{clients.length}</div>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="text-center px-4">
              <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wide">Por Ascender 📈</div>
              <div className="text-xl font-mono font-black text-amber-400">
                {enrichedClients.filter(c => c.actionRequired === 'upgrade').length}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="text-center px-4">
              <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-wide">Por Descender 📉</div>
              <div className="text-xl font-mono font-black text-red-400">
                {enrichedClients.filter(c => c.actionRequired === 'downgrade').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC COLLAPSIBLE TIERS & BENEFITS EDITOR PANEL */}
      {showSettings && (
        <div className="bg-[#152035] rounded-3xl p-6 border-2 border-pink-500/30 shadow-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800 pb-3 gap-3">
            <div>
              <span className="text-[10px] font-mono font-black text-pink-400 uppercase tracking-widest">MOTOR DE REGLAS DE NEGOCIO CIMASUR</span>
              <h3 className="text-base font-black text-white uppercase tracking-tight mt-1">Configurador de Límites de Ventas y Beneficios</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Define los montos de entrada para cada categoría de socio y actualiza la lista de beneficios que se desbloquean en tiempo real.</p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("¿Estás seguro de restablecer todos los niveles y beneficios a la lista de beneficios oficial de CIMASUR? Se sobrescribirá cualquier cambio personalizado.")) {
                    setEditTiersConfig(JSON.parse(JSON.stringify(TIERS_DEFAULT)));
                    setActiveSettingsTab(0);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                Restablecer a Beneficios Oficiales 🏆
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 px-3 self-end sm:self-auto rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest cursor-pointer"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {editTiersConfig.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSettingsTab(idx)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  activeSettingsTab === idx
                    ? 'bg-pink-500/15 border-pink-500 text-pink-300 font-black shadow-lg shadow-pink-500/10'
                    : 'bg-[#0D1527] border-slate-800 text-slate-400 hover:bg-[#1E293B] hover:text-slate-200'
                }`}
              >
                <div className="text-[9px] uppercase font-mono font-bold tracking-wider opacity-70">NIVEL {idx + 1}</div>
                <div className="text-xs font-black truncate">{t.name}</div>
              </button>
            ))}
          </div>

          {editTiersConfig[activeSettingsTab] && (
            <div className="p-5 bg-[#0D1527] rounded-3xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Monto Mínimo de Entrada (Venta Acumulada Anual)
                  </label>
                  {activeSettingsTab === 0 ? (
                    <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 text-xs font-mono font-black text-slate-500">
                      Fijo en $0 para nivel inicial "Sin categoría"
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono font-black text-slate-500">$</span>
                      <input
                        type="number"
                        value={editTiersConfig[activeSettingsTab].min}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          const updated = [...editTiersConfig];
                          updated[activeSettingsTab] = {
                            ...updated[activeSettingsTab],
                            min: val
                          };
                          // Dynamically set max bound for previous tier sequentially!
                          if (activeSettingsTab > 0) {
                            updated[activeSettingsTab - 1] = {
                              ...updated[activeSettingsTab - 1],
                              max: val - 1
                            };
                          }
                          setEditTiersConfig(updated);
                        }}
                        className="w-full bg-[#152035] border border-slate-700 rounded-xl py-2 pl-7 pr-4 text-xs font-mono font-black focus:outline-none focus:border-pink-500 text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Monto Máximo de Salida (Cálculo Automático)
                  </label>
                  <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 text-xs font-mono font-black text-slate-300">
                    {editTiersConfig[activeSettingsTab].max === Infinity 
                      ? '∞ (Sin límite superior)' 
                      : `$${editTiersConfig[activeSettingsTab].max.toLocaleString('es-CL')}`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                    Beneficios Activos ({editTiersConfig[activeSettingsTab].benefits.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...editTiersConfig];
                      updated[activeSettingsTab] = {
                        ...updated[activeSettingsTab],
                        benefits: [...updated[activeSettingsTab].benefits, 'Nuevo beneficio exclusivo del club']
                      };
                      setEditTiersConfig(updated);
                    }}
                    className="p-1 px-3 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Agregar Beneficio
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {editTiersConfig[activeSettingsTab].benefits.map((benefit: string, bIdx: number) => (
                    <div key={bIdx} className="flex gap-2 items-center">
                      <span className="text-pink-500 font-black font-mono text-xs">✓</span>
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => {
                          const updated = [...editTiersConfig];
                          const benefitsCopy = [...updated[activeSettingsTab].benefits];
                          benefitsCopy[bIdx] = e.target.value;
                          updated[activeSettingsTab] = {
                            ...updated[activeSettingsTab],
                            benefits: benefitsCopy
                          };
                          setEditTiersConfig(updated);
                        }}
                        className="flex-1 bg-[#152035] border border-slate-700 rounded-lg p-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                        placeholder="Ejemplo: Despacho gratuito permanente"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...editTiersConfig];
                          const benefitsCopy = [...updated[activeSettingsTab].benefits];
                          benefitsCopy.splice(bIdx, 1);
                          updated[activeSettingsTab] = {
                            ...updated[activeSettingsTab],
                            benefits: benefitsCopy
                          };
                          setEditTiersConfig(updated);
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-lg text-rose-400 text-xs transition-colors cursor-pointer flex items-center justify-center"
                        title="Eliminar beneficio"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {editTiersConfig[activeSettingsTab].benefits.length === 0 && (
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase italic p-4 text-center">
                      No hay beneficios definidos para este nivel. Agrega uno o más beneficios arriba.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditTiersConfig([...tiersList]);
                    setShowSettings(false);
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-805 hover:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Save tiers list config
                    // Recalculate max boundaries in sequence to ensure 100% mathematical validity
                    const updated = [...editTiersConfig];
                    for (let i = 0; i < updated.length - 1; i++) {
                      updated[i].max = updated[i + 1].min - 1;
                    }
                    updated[updated.length - 1].max = Infinity;

                    setTiersList(updated);
                    localStorage.setItem('cimasur_club_tiers_config', JSON.stringify(updated));
                    
                    // Trigger refresh
                    window.dispatchEvent(new Event('db-change'));
                    setShowSettings(false);
                    alert("¡Configuración de niveles y beneficios comerciales guardada con éxito!");
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-650 hover:from-pink-650 hover:to-purple-750 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-pink-500/15 cursor-pointer transition-all"
                >
                  Guardar Configuración 👑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TIERS METRIC INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {tiersList.map((t, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${t.color} flex flex-col justify-between space-y-4 shadow-xl transition-transform hover:scale-[1.02]`}>
            <div>
              <div className="flex justify-between items-center text-black">
                <span className="font-sans font-black uppercase text-xs tracking-wider">{t.name}</span>
                <Award className="w-4 h-4 text-slate-800" />
              </div>
              <p className="text-[10px] font-mono font-black tracking-widest mt-1.5 text-slate-700">
                {t.min === 0 ? 'DESDE $0' : idx === tiersList.length - 1 ? `MÁS DE $${(t.min / 1000000).toFixed(1)}M+` : `$${(t.min/1000000).toFixed(1)}M a $${(t.max/1000000).toFixed(1)}M`}
              </p>
            </div>
            
            <div className="pt-2.5 border-t border-black/10">
              <span className="text-[9px] text-slate-800 font-extrabold uppercase tracking-widest block mb-1">Beneficios principales:</span>
              <ul className="space-y-1 text-[10px] text-slate-900 font-semibold leading-normal">
                {t.benefits.slice(0, 3).map((b: string, bIdx: number) => (
                  <li key={bIdx} className="flex items-start gap-1">
                    <span className="text-emerald-700 font-extrabold text-[11px] leading-none">✓</span> <span>{b}</span>
                  </li>
                ))}
                {t.benefits.length > 3 && (
                  <li className="text-indigo-800 font-bold italic text-[9px] mt-0.5">+ ver todos</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN OFICIAL DE REQUISITOS Y CONDICIONES DEL CLUB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0D1527] p-6 rounded-3xl border border-slate-800 shadow-xl animate-in fade-in duration-300">
        
        {/* COLUMNA 1: REQUISITOS PARA PERTENECER AL CLUB */}
        <div className="bg-[#152035]/50 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="p-1 px-2 text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg font-black font-mono">REGISTRO</span>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Requisitos para Ser Parte del Club</h4>
          </div>
          
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black flex items-center justify-center shrink-0">1</span>
              <div>
                <span className="text-xs font-extrabold text-slate-200 block uppercase tracking-tight">Antigüedad Comercial</span>
                <span className="text-[11px] text-slate-400 leading-normal">Haber registrado compras continuas durante una antigüedad mínima de 6 meses.</span>
              </div>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black flex items-center justify-center shrink-0">2</span>
              <div>
                <span className="text-xs font-extrabold text-slate-200 block uppercase tracking-tight">Intranet Corporativa</span>
                <span className="text-[11px] text-slate-400 leading-normal">Ser un usuario activo de la Intranet CIMASUR.</span>
              </div>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 font-mono text-xs font-black flex items-center justify-center shrink-0">3</span>
              <div className="flex-1">
                <span className="text-xs font-extrabold text-slate-200 block uppercase tracking-tight">Formulario de Inscripción Oficial</span>
                <span className="text-[11px] text-slate-400 leading-normal block mb-2 font-medium">Completar el proceso formal rellenando el formulario oficial habilitado en línea:</span>
                <a 
                  href="https://forms.gle/EdjuUipUedDPVnSy7" 
                  target="_blank" 
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#254C7B] text-sky-100 border border-sky-400/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  Rellenar Formulario de Inscripción
                  <ArrowUpRight className="w-3.5 h-3.5 text-sky-300" />
                </a>
              </div>
            </li>
          </ul>
        </div>

        {/* COLUMNA 2: REGULACION Y NOTAS COMERCIALES */}
        <div className="bg-[#152035]/50 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="p-1 px-2 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-black font-mono">NOTAS</span>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Notas al Pie y Condiciones de Compra</h4>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-[#0D1527] rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block mb-1">(*) DESCUENTOS POR VOLUMEN</span>
              <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                El beneficio de descuento por volumen que se aplicará dependerá directamente del volumen real de compra facturado. <strong className="text-amber-300 font-extrabold">Los descuentos no son acumulables</strong>, aplicándose siempre de manera automática el de mayor porcentaje o valor para el cliente.
              </p>
            </div>

            <div className="p-3 bg-[#0D1527] rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-widest block mb-1">(**) EXCLUSIONES DE DESCUENTOS</span>
              <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                Los descuentos especiales de las categorías de socios <strong className="text-rose-400 font-extrabold">no aplican para los siguientes productos</strong>:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {['ADE', 'Tópicos', 'Oftálmicos', 'Altas Diluciones', 'Inyectables', 'Fuera de Vademécum'].map((ex, exIdx) => (
                  <span key={exIdx} className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-905/30 font-mono text-[9px] font-black uppercase">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* CORE INTERACTIVE INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* LEFT COLUMN: CLIENT LIST WITH SEARCH */}
        <div className="lg:col-span-5 bg-[#152035] rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 bg-[#1E3A5F]/20 border-b border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Directorio de Clientes de Club
            </h3>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por Nombre, RUT, correo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0D1527] border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-sky-500 text-white placeholder-slate-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-[#0D1527] border border-slate-800 rounded-lg text-[9px] px-2 py-1 font-bold text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="Todas">Categorías (Todas)</option>
                <option value="Sin categoría">Sin Categoría</option>
                <option value="Bronce">Bronce</option>
                <option value="Plata">Plata</option>
                <option value="Oro">Oro</option>
                <option value="Platinum">Platinum</option>
              </select>

              <select
                value={filterDirection}
                onChange={e => setFilterDirection(e.target.value as any)}
                className="bg-[#0D1527] border border-slate-800 rounded-lg text-[9px] px-2 py-1 font-bold text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="all">Sugerencia Comercial (Todos)</option>
                <option value="up">Aumento Recomendado 📈</option>
                <option value="down">Degradación Recomendada 📉</option>
                <option value="same">Mantener Categoría ✓</option>
              </select>
            </div>
          </div>

          {/* Client Rows List */}
          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-800/70 scrollbar-thin">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                No se encontraron clientes para los filtros indicados.
              </div>
            ) : (
              filteredClients.map(c => {
                const totalSales = c.ventas?.v2026 || 0;
                const isSelected = c.id === selectedClientId;
                const trendIcon = c.trend === 'up' ? '📈' : c.trend === 'down' ? '📉' : '➔';
                
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={`w-full p-4 flex flex-col space-y-2 text-left transition-all ${isSelected ? 'bg-slate-800/50 border-l-4 border-sky-400' : 'hover:bg-slate-800/20'}`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="max-w-[70%]">
                        <h4 className="text-xs font-black text-white truncate uppercase">{c.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">{c.rut}</span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={`p-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          c.categoria === 'Platinum' ? "bg-purple-950/80 text-purple-300 border-purple-800/80" :
                          c.categoria === 'Oro' ? "bg-amber-950/80 text-amber-300 border-amber-800/80" :
                          c.categoria === 'Plata' ? "bg-indigo-950/80 text-indigo-300 border-indigo-800/80" :
                          c.categoria === 'Bronce' ? "bg-orange-950/80 text-orange-300 border-orange-850/80" :
                          "bg-slate-900 text-slate-300 border-slate-700"
                        }`}>
                          {c.categoria.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end w-full pt-1">
                      <div className="text-[10px] text-slate-400">
                        Venta 2026: <strong className="text-white font-mono">${totalSales.toLocaleString('es-CL')}</strong>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        {c.actionRequired === 'upgrade' && (
                          <span className="p-0.5 px-1.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider border border-emerald-500/20">
                            ▲ RECOMIENDA ASCENDER
                          </span>
                        )}
                        {c.actionRequired === 'downgrade' && (
                          <span className="p-0.5 px-1.5 rounded bg-red-400/10 text-red-400 text-[8px] font-black uppercase tracking-wider border border-red-500/20">
                            ▼ RECOMIENDA DEGRADAR
                          </span>
                        )}
                        {c.actionRequired === 'none' && (
                          <span className="text-slate-500 text-[8px] font-bold">Mantiene ✓</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL, ANALYZER AND SIMULATOR PLAYER */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClient ? (
            <>
              {/* DETAILS AND HISTORICAL SALES */}
              <div className="bg-[#152035] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-black text-sky-400 uppercase tracking-widest">
                      FICHA SOCIO CLUB SOCIAL
                    </span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1">
                      {selectedClient.name}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedClient.email} | {selectedClient.phone}</p>
                  </div>

                  <span className={`p-1.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider border ${
                    selectedClient.categoria === 'Platinum' ? "bg-purple-950 text-purple-300 border-purple-800/80 shadow-[0_0_15px_rgba(168,85,247,0.15)]" :
                    selectedClient.categoria === 'Oro' ? "bg-amber-950 text-amber-300 border-amber-800/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]" :
                    selectedClient.categoria === 'Plata' ? "bg-indigo-950 text-indigo-300 border-indigo-800/80" :
                    selectedClient.categoria === 'Bronce' ? "bg-orange-950 text-orange-300 border-orange-850/80" :
                    "bg-slate-900 text-slate-300 border-slate-700"
                  }`}>
                    {selectedClient.categoria.toUpperCase()} ACTUAL
                  </span>
                </div>

                {/* DETALLE DE VENTA ANUAL */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                      Detalle de Compras y Venta Anual
                    </h4>
                    
                    {!isEditingSales ? (
                      <button
                        onClick={() => setIsEditingSales(true)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Editar Ventas
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditingSales(false);
                            setEditSales({ ...selectedClient.ventas! });
                          }}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-800 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            // Update local client array and database
                            setSavingStatus(true);
                            try {
                              const updateObj = {
                                clubVentasDetail: JSON.stringify(editSales)
                              };
                              await localDB.updateInCollection('contacts', selectedClient.id, updateObj);
                              window.dispatchEvent(new Event('db-change'));
                              setIsEditingSales(false);
                              alert("Venta anual actualizada con éxito.");
                            } catch {
                              alert("Error al actualizar ventas.");
                            } finally {
                              setSavingStatus(false);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Aplicar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* 2024 */}
                    <div className="p-3 bg-[#0D1527] rounded-xl border border-slate-800 text-center space-y-1">
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase">VENTA ANUAL 2024</span>
                      {isEditingSales ? (
                        <input
                          type="number"
                          value={editSales.v2024}
                          onChange={e => setEditSales({ ...editSales, v2024: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-center text-white font-mono focus:outline-none focus:border-indigo-400"
                        />
                      ) : (
                        <div className="text-sm font-mono font-black text-slate-300">
                          ${(selectedClient.ventas?.v2024 || 0).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                    {/* 2025 */}
                    <div className="p-3 bg-[#0D1527] rounded-xl border border-slate-800 text-center space-y-1">
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase">VENTA ANUAL 2025</span>
                      {isEditingSales ? (
                        <input
                          type="number"
                          value={editSales.v2025}
                          onChange={e => setEditSales({ ...editSales, v2025: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-center text-white font-mono focus:outline-none focus:border-indigo-400"
                        />
                      ) : (
                        <div className="text-sm font-mono font-black text-slate-300 flex items-center justify-center gap-1">
                          ${(selectedClient.ventas?.v2025 || 0).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                    {/* 2026 */}
                    <div className="p-3 bg-[#0D1527]/90 rounded-xl border border-slate-800 text-center space-y-1">
                      <span className="text-[9px] text-sky-400 font-extrabold uppercase">VENTA ANUAL 2026</span>
                      {isEditingSales ? (
                        <input
                          type="number"
                          value={editSales.v2026}
                          onChange={e => setEditSales({ ...editSales, v2026: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-center text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                      ) : (
                        <div className="text-sm font-mono font-black text-white">
                          ${(selectedClient.ventas?.v2026 || 0).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CRITERIO DE CAMBIO DE CATEGORÍA COMPARATIVO */}
                  <div className="bg-[#0D1527]/50 rounded-2xl p-4 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-black uppercase block">TENDENCIA HISTÓRICA 2025 ➔ 2026</span>
                      <div className="flex items-center gap-2">
                        {selectedClient.ventas && selectedClient.ventas.v2026 > selectedClient.ventas.v2025 ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <TrendingUp className="w-4 h-4" /> Ascendiendo en Compras (+${(selectedClient.ventas.v2026 - selectedClient.ventas.v2025).toLocaleString('es-CL')})
                          </div>
                        ) : selectedClient.ventas && selectedClient.ventas.v2026 < selectedClient.ventas.v2025 ? (
                          <div className="flex items-center gap-1 text-rose-400 font-bold">
                            <TrendingDown className="w-4 h-4" /> Descendiendo en Compras (-${(selectedClient.ventas.v2025 - selectedClient.ventas.v2026).toLocaleString('es-CL')})
                          </div>
                        ) : (
                          <div className="text-slate-400 font-bold">
                            Sin variación interanual
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-black uppercase block">ESTADO SUGERIDO</span>
                      {selectedClient.categoria !== simulatedTier.name ? (
                        <div className={`p-1 px-2.5 rounded font-black text-[10px] uppercase inline-flex items-center gap-1.5 ${
                          selectedClient.ventas && selectedClient.ventas.v2026 > getDefaultVentasForClient(selectedClient.categoria).v2026 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {selectedClient.categoria !== simulatedTier.name && (selectedClient.ventas?.v2026 || 0) > (selectedClient.ventas?.v2025 || 0) ? 'Ascender Sugerido 📈' : 'Degradar Sugerido 📉'}
                        </div>
                      ) : (
                        <div className="p-1 px-2.5 rounded bg-slate-800 text-slate-400 font-black text-[10px] uppercase inline-flex items-center gap-1">
                          Mantiene Nivel ✓
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIMULATION CARD & BENEFITS PLAYER ("JUGAR CON ELLOS") */}
              <div className="bg-[#152035] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-pink-400 animate-pulse" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Simulador Comercial Club Social
                    </h3>
                  </div>

                  <span className="text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded p-1 px-2 font-black uppercase">
                    MODO INTERACTIVO
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  Añade compras simuladas para comprobar qué beneficios desbloquea este cliente o pulsa botones rápidos para añadir montos directos sobre la venta 2026.
                </p>

                {/* SLIDER OR SIMULATION INPUT */}
                <div className="p-4 bg-[#0D1527] rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-slate-400 uppercase">Simular Compra Adicional:</span>
                      <span className="text-pink-400 font-mono text-sm">+${simExtraVentas.toLocaleString('es-CL')}</span>
                    </div>
                    
                    <input
                      type="range"
                      min="0"
                      max="15000000"
                      step="100000"
                      value={simExtraVentas}
                      onChange={e => setSimExtraVentas(Number(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-extrabold font-mono pt-1">
                      <span>$0</span>
                      <span>$5M</span>
                      <span>$10M</span>
                      <span>$15M+</span>
                    </div>
                  </div>

                  {/* QUICK SIMULATOR BUTTONS */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[100000, 500000, 1000000, 3000000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => handleQuickAddSale(amt)}
                        className="p-1.5 px-3 bg-[#152035] hover:bg-[#1E293B] text-slate-300 border border-slate-700/60 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        +{amt === 100000 ? '100K' : amt === 500000 ? '500K' : amt === 1000000 ? '1M' : '3M'}
                      </button>
                    ))}
                    <button
                      onClick={() => setSimExtraVentas(0)}
                      className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>

                {/* THE SIMULATION RESULTS SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* TIER UNLOCKED AND ASCENT/DESCENT CHECK */}
                  <div className="p-4 bg-[#0D1527] rounded-2xl border border-slate-850 space-y-3">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">TIER ALCANZADO (SIMULADO)</span>
                    
                    <div className="flex items-center gap-3">
                      <span className={`p-1 px-3 rounded-lg text-xs font-black uppercase tracking-wider border ${
                        simulatedTier.name === 'Platinum' ? "bg-purple-950 text-purple-300 border-purple-800/80" :
                        simulatedTier.name === 'Oro' ? "bg-amber-950 text-amber-300 border-amber-800/80" :
                        simulatedTier.name === 'Plata' ? "bg-indigo-950 text-indigo-300 border-indigo-800/80" :
                        simulatedTier.name === 'Bronce' ? "bg-orange-950 text-orange-300 border-orange-850/80" :
                        "bg-slate-900 text-slate-300 border-slate-700"
                      }`}>
                        {simulatedTier.name.toUpperCase()}
                      </span>

                      {simulatedTier.name !== selectedClient.categoria && (
                        <div className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> ¡Nuevo Nivel Alcanzado!
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-slate-850">
                      <span className="text-[10px] text-slate-400 block">Venta Simulada Total 2026:</span>
                      <span className="text-lg font-mono font-black text-pink-400">
                        ${simulatedVentas2026.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  {/* NEXT TIER PROGRES BAR / DETAILS */}
                  <div className="p-4 bg-[#0D1527] rounded-2xl border border-slate-850 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">PROGRESO SIGUIENTE TIER</span>
                      
                      {nextTierInfo ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">Camino a <strong className="text-slate-200">{nextTierInfo.nextName}</strong></span>
                            <span className="text-sky-400 font-mono">{nextTierInfo.progress}%</span>
                          </div>
                          
                          {/* Progress bar background */}
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${
                                nextTierInfo.progress >= 90 ? 'from-[#38BDF8] to-emerald-400' : 'from-indigo-500 to-pink-500'
                              }`}
                              style={{ width: `${nextTierInfo.progress}%` }}
                            ></div>
                          </div>

                          <div className="text-[10px] text-slate-400 font-medium">
                            Falta para llegar a {nextTierInfo.nextName}: <span className="font-mono text-slate-200 font-black">${nextTierInfo.remaining.toLocaleString('es-CL')}</span>
                          </div>

                          {nextTierInfo.almostThere && (
                            <div className="p-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-black uppercase mt-1 animate-bounce">
                              💥 ¡Falta poco para {nextTierInfo.nextName}!
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 py-4 text-center rounded-lg bg-purple-950/20 border border-purple-500/10 text-purple-300 font-black text-[10px] uppercase tracking-wider">
                          👑 MÁXIMO PROGRAMADO DESBLOQUEADO (PLATINUM)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PLAN DE ACELERACIÓN Y CAMPAÑAS DE FIDELIZACIÓN (TÁCTICA COMERCIAL) */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                        Plan de Aceleración y Campañas de Fidelización 🎯
                      </h4>
                    </div>
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded p-1 px-1.5 font-bold uppercase">
                      Tácticas Comerciales
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Usa esta herramienta comercial para diseñar cuotas de compras mensuales y coordinar promociones especiales de incentivo rápido ("Fast-Track 3 días") para escalar de categoría al cliente.
                  </p>

                  {/* SELECT TARGET TIER FOR THE CAMPAIGN */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">1. Seleccionar Categoría Objetivo para la Campaña:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {tiersList.map(tier => {
                        // Skip "Sin categoría"
                        if (tier.name === 'Sin categoría') return null;
                        
                        const isSelected = campaignTargetTier === tier.name;
                        return (
                          <button
                            key={tier.name}
                            type="button"
                            onClick={() => setCampaignTargetTier(tier.name)}
                            className={`p-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/5"
                                : "bg-[#0D1527] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            {tier.name === 'Platinum' ? 'Platinum 🏆' :
                             tier.name === 'Oro' ? 'Oro 🥇' :
                             tier.name === 'Plata' ? 'Plata 🥈' :
                             tier.name === 'Bronce' ? 'Bronce 🥉' : tier.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const selectedTierForCampaign = tiersList.find(t => t.name === campaignTargetTier) || tiersList[1]; // fallback to Bronce
                    const neededForTier = selectedTierForCampaign.min;
                    const remForTier = Math.max(0, neededForTier - simulatedVentas2026);
                    const isAlreadyReached = simulatedVentas2026 >= neededForTier;
                    
                    const curMonthIdx = new Date().getMonth(); // 0 is Jan, 5 is June
                    const remainingMonths = Math.max(1, 12 - curMonthIdx); // remaining months in calendar year

                    const monthlyQuota = remForTier / remainingMonths;
                    
                    // Generate WhatsApp copywriting message
                    const limitDate = new Date();
                    limitDate.setDate(limitDate.getDate() + 3);
                    const limitDateString = limitDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
                    
                    const waMessage = `¡Hola *${selectedClient.name}*! Le saluda Fernanda Contreras de Cimasur. 🌟\n\n` +
                      `Queremos felicitarlo por sus compras este año y contarle que se encuentra súper cerca de subir a nuestra destacada categoría *${selectedTierForCampaign.name}* en el Club Social Cimasur.\n\n` +
                      `Para que comience a disfrutar de todos los beneficios exclusivos de manera INMEDIATA (como: ${selectedTierForCampaign.benefits.slice(0, 2).join(', ')}), hemos preparado una campaña especial de *Subida Express "Fast-Track 3 Días"*: \n\n` +
                      `⚡ *La Promoción:* Si aprueba o realiza compras especiales por un monto total de *\n` +
                      `$${remForTier.toLocaleString('es-CL')}* en las próximas 72 horas (plazo hasta el ${limitDateString}), ¡le activaremos de inmediato y para todo el resto del año el nivel *${selectedTierForCampaign.name}* con todos sus privilegios directos!\n\n` +
                      `¿Le gustaría coordinar hoy un pedido especial con nosotros para aprovechar esta oportunidad única? ¡Quedamos muy atentos!`;

                    return (
                      <div className="space-y-4">
                        {/* CALCULATOR OF GOALS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* MONTHLY PLAN FOR REMAINING YEAR */}
                          <div className="p-3.5 bg-[#0D1527] rounded-xl border border-slate-800 space-y-1">
                            <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wider block">Plan Mensual Proyectado (2026):</span>
                            <div className="text-xs font-bold text-slate-200">
                              {isAlreadyReached ? (
                                <span className="text-emerald-400 font-black flex items-center gap-1">✓ Categoría ya alcanzada</span>
                              ) : (
                                <>
                                  Monto de Compra: <span className="text-indigo-400 font-black text-sm">${monthlyQuota.toLocaleString('es-CL', { maximumFractionDigits: 0 })} / mes</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-medium leading-normal">
                              Requerido durante <span className="text-slate-300 font-bold">{remainingMonths} meses restantes</span> para calificar el próximo año.
                            </span>
                          </div>

                          {/* ACCELERATION TRIGER FOR CURRENT WEEK */}
                          <div className="p-3.5 bg-[#0D1527] rounded-xl border border-slate-800 space-y-1">
                            <span className="text-[9px] text-pink-400 font-extrabold uppercase tracking-wider block">Oportunidad de Cierre Express (3 Días):</span>
                            <div className="text-xs font-bold text-slate-200">
                              {isAlreadyReached ? (
                                <span className="text-emerald-400 font-black">✓ Requisitos cumplidos</span>
                              ) : (
                                <>
                                  Facturación requerida: <span className="text-pink-400 font-black text-sm">${remForTier.toLocaleString('es-CL')} t/ahora</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-medium leading-normal">
                              Incentivo comercial para activar de inmediato categoría temporal en este mes.
                            </span>
                          </div>
                        </div>

                        {/* DETAILED TRIGGER CAMPAIGN BOX */}
                        {!isAlreadyReached ? (
                          <div className="bg-[#0D1527] rounded-2xl border border-pink-500/20 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] text-pink-400 font-black tracking-widest uppercase flex items-center gap-1">
                                <span className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                                Campaña: "Fast-Track 3 Días a {selectedTierForCampaign.name}"
                              </span>
                              <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Límite: {limitDateString}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Copia este mensaje promocional redactado a la medida del cliente y envíaselo por WhatsApp. Es una táctica de alto impacto comercial para forzar pedidos especiales de fin de mes.
                            </p>

                            {/* TEXT BOX COPYWRITING */}
                            <div className="relative">
                              <textarea
                                readOnly
                                value={waMessage}
                                className="w-full h-36 text-xs text-slate-300 bg-[#152035] p-3 rounded-lg border border-slate-800 outline-none font-sans leading-relaxed resize-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(waMessage);
                                  setCopiedMessageId(selectedClient.id + '-' + selectedTierForCampaign.name);
                                  setTimeout(() => setCopiedMessageId(null), 3000);
                                }}
                                className="absolute right-2 bottom-3 p-1.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black uppercase shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                {copiedMessageId === (selectedClient.id + '-' + selectedTierForCampaign.name) ? (
                                  <>✓ ¡Copiado!</>
                                ) : (
                                  <>Copiar para WhatsApp 💬</>
                                )}
                              </button>
                            </div>

                            {/* TRIGGER INTEGRATION SUCCESS ACTION */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#152035]/50 p-3 rounded-xl border border-slate-800">
                              <p className="text-[10px] text-slate-400 leading-normal flex-1 font-medium">
                                ¿El cliente aceptó la propuesta de campaña? Pulsa este botón para registrar la compra de inmediato y hacerlo subir de categoría temporal:
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSimExtraVentas(prev => prev + remForTier);
                                  alert(`¡Excelente! Se ha registrado el éxito de la campaña táctica para ${selectedClient.name}. Se le adicionó una compra de $${remForTier.toLocaleString('es-CL')} simulada para subir hoy mismo a la categoría ${selectedTierForCampaign.name}. Recuerda aplicar los cambios abajo.`);
                                }}
                                className="p-2 px-3 bg-[#111A2E] hover:bg-pink-900/30 text-pink-400 border border-pink-500/20 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 justify-center whitespace-nowrap"
                              >
                                <Plus className="w-3.5 h-3.5" /> Registrar Éxito de Campaña
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl text-center">
                            🎉 ¡Excelente! Jessica Wenzel califica plenamente para {selectedTierForCampaign.name} con las compras actuales o simuladas de este año. No requiere campaña de aceleración para este nivel.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* DETAILS OF BENEFITS DELIVERED */}
                <div className="p-4 rounded-2xl bg-indigo-950/10 border border-indigo-500/15 space-y-3">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Beneficios Club Social Desbloqueados
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {simulatedTier.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-[#0D1527]/40 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                        <span className="p-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                  {selectedClient.categoria !== simulatedTier.name && (
                    <button
                      onClick={() => handleSaveAndCommit(true)}
                      disabled={savingStatus}
                      className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {savingStatus ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" /> Aplicar Categoría Real ({simulatedTier.name})
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleSaveAndCommit(false)}
                    disabled={savingStatus}
                    className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar Ventas & Cerrar</>}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#152035] rounded-3xl p-12 border border-slate-800 text-center text-slate-500 font-bold uppercase tracking-widest">
              Selecciona un cliente del directorio para comenzar el análisis comercial.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
