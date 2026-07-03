import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, 
  Users, 
  Gift, 
  Coins, 
  TrendingUp, 
  Activity, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  ArrowRight, 
  DollarSign, 
  Percent, 
  Clock, 
  ChevronRight, 
  Layers, 
  ShoppingBag, 
  RotateCcw, 
  Calendar, 
  ShieldCheck, 
  Sparkles,
  Info,
  Check,
  X,
  CreditCard,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// Color palette matching CIMASUR design
const TIER_COLORS: Record<string, string> = {
  'Platinum': '#A855F7', // Purple
  'Oro': '#EAB308',      // Amber/Gold
  'Plata': '#94A3B8',    // Slate/Silver
  'Bronce': '#D97706',   // Brown/Bronze
  'Sin categoría': '#64748B',
  'Primera Compra': '#38BDF8'
};

const TIER_GRADIENTS: Record<string, string> = {
  'Platinum': 'from-purple-900/30 to-indigo-950/30 border-purple-800/40 text-purple-300',
  'Oro': 'from-yellow-950/30 to-amber-950/30 border-yellow-700/40 text-yellow-300',
  'Plata': 'from-slate-800/40 to-slate-900/30 border-slate-700/50 text-slate-300',
  'Bronce': 'from-amber-900/20 to-orange-950/20 border-amber-800/40 text-amber-300',
  'Sin categoría': 'from-slate-900/40 to-slate-950/30 border-slate-800 text-slate-400',
  'Primera Compra': 'from-sky-950/20 to-blue-950/20 border-sky-800/40 text-sky-400'
};

export default function ClubComercialView({ onViewClient }: { onViewClient?: (id: string) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'perfil' | 'rewards' | 'admin'>('dashboard');
  
  // Search & Selector state for Perfil View
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchContactQuery, setSearchContactQuery] = useState<string>('');
  
  // Selected member loyalty details
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [loadingMember, setLoadingMember] = useState<boolean>(false);
  
  // Dashboard Metrics State
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  
  // Catalog Rewards State
  const [rewardsCatalog, setRewardsCatalog] = useState<any[]>([]);
  const [loadingRewards, setLoadingRewards] = useState<boolean>(true);
  
  // Redemption Modal State
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redemptionResult, setRedemptionResult] = useState<any | null>(null);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);

  // Marketing Config State
  const [clubConfig, setClubConfig] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [selectedEditingTierId, setSelectedEditingTierId] = useState<string>('bronce');

  const loadClubConfig = async () => {
    setLoadingConfig(true);
    setConfigSuccess(null);
    try {
      const res = await fetch('/api/loyalty/config');
      if (res.ok) {
        const data = await res.json();
        setClubConfig(data);
        setEditingConfig(data);
      }
    } catch (e) {
      console.error('Error loading club config:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const saveClubConfig = async (newConfig: any) => {
    setSavingConfig(true);
    setConfigSuccess(null);
    try {
      const res = await fetch('/api/loyalty/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setClubConfig(newConfig);
        setEditingConfig(newConfig);
        setConfigSuccess('¡Configuración guardada exitosamente en el servidor! El sistema se ha re-parametrizado en caliente.');
        setTimeout(() => setConfigSuccess(null), 8000);
        // Refresh dashboard metrics
        loadDashboardMetrics();
      } else {
        alert('Error al guardar la configuración.');
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Load baseline contacts
  const loadContacts = async () => {
    try {
      const res = await fetch('/api/records/contacts');
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setAllContacts(sorted);
        if (sorted.length > 0 && !selectedContactId) {
          setSelectedContactId(sorted[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    }
  };

  // Load Dashboard Metrics
  const loadDashboardMetrics = async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch('/api/loyalty/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (e) {
      console.error('Error loading loyalty dashboard metrics:', e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Load Rewards Catalog
  const loadRewardsCatalog = async () => {
    setLoadingRewards(true);
    try {
      const res = await fetch('/api/loyalty/rewards');
      if (res.ok) {
        const data = await res.json();
        setRewardsCatalog(data);
      }
    } catch (e) {
      console.error('Error loading rewards catalog:', e);
    } finally {
      setLoadingRewards(false);
    }
  };

  // Load Member Details when selectedContactId changes
  const loadMemberDetails = useCallback(async (contactId: string) => {
    if (!contactId) return;
    setLoadingMember(true);
    try {
      const res = await fetch(`/api/loyalty/member/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMemberDetails(data);
      }
    } catch (e) {
      console.error(`Error loading member details for ${contactId}:`, e);
    } finally {
      setLoadingMember(false);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadContacts();
    loadDashboardMetrics();
    loadRewardsCatalog();
  }, []);

  // Fetch member details when selector changes
  useEffect(() => {
    if (selectedContactId) {
      loadMemberDetails(selectedContactId);
    }
  }, [selectedContactId, loadMemberDetails]);

  // Handle Enrollment
  const handleEnroll = async () => {
    if (!selectedContactId) return;
    const contact = allContacts.find(c => c.id === selectedContactId);
    setLoadingMember(true);
    try {
      const res = await fetch('/api/loyalty/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactId: selectedContactId, 
          email: contact?.email || '' 
        })
      });
      if (res.ok) {
        await loadMemberDetails(selectedContactId);
        await loadDashboardMetrics();
      } else {
        const errData = await res.json();
        alert(`Error al inscribir cliente: ${errData.error || 'Intente nuevamente'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setLoadingMember(false);
    }
  };

  // Handle Redeem Redemption
  const handleConfirmRedemption = async () => {
    if (!selectedReward || !selectedContactId) return;
    setIsRedeeming(true);
    setRedemptionError(null);
    setRedemptionResult(null);

    const idempotencyKey = `idemp_${Date.now()}_${selectedContactId}_${selectedReward.id}`;

    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          rewardId: selectedReward.id,
          idempotencyKey
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRedemptionResult(data);
        // Refresh everything
        await loadMemberDetails(selectedContactId);
        await loadDashboardMetrics();
        await loadRewardsCatalog();
      } else {
        setRedemptionError(data.error || 'Hubo un error al procesar el canje de la recompensa.');
      }
    } catch (e: any) {
      setRedemptionError(`Error de red: ${e.message}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  // Filter contacts based on search query
  const filteredContactsList = useMemo(() => {
    if (!searchContactQuery) return allContacts.slice(0, 50);
    const q = searchContactQuery.toLowerCase();
    return allContacts.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.rut || '').toLowerCase().includes(q) ||
      (c.razonSocial || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allContacts, searchContactQuery]);

  // Format CLP
  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Render Skeleton UI
  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse p-6">
      <div className="h-10 bg-slate-800 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="h-32 bg-slate-850 rounded-2xl border border-slate-800"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-850 rounded-2xl border border-slate-800"></div>
        <div className="h-80 bg-slate-850 rounded-2xl border border-slate-800"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#050914] text-slate-200 min-h-screen">
      {/* Module Sub-Header Tabs */}
      <div className="bg-[#0D1527] border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Award className="text-yellow-400 animate-bounce" size={28} />
            Club Comercial CIMASUR®
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Programa de Fidelización, canje de recompensas y acumulación de puntos comerciales en tiempo real.</p>
        </div>
        
        <div className="flex gap-2 bg-[#050914]/80 p-1 rounded-xl border border-slate-850">
          <SubTabButton active={activeSubTab === 'dashboard'} onClick={() => setActiveSubTab('dashboard')} icon={<Activity size={14} />} label="Dashboard General" />
          <SubTabButton active={activeSubTab === 'perfil'} onClick={() => setActiveSubTab('perfil')} icon={<Users size={14} />} label="Perfil del Cliente" />
          <SubTabButton active={activeSubTab === 'rewards'} onClick={() => setActiveSubTab('rewards')} icon={<Gift size={14} />} label="Catálogo de Premios" />
          <SubTabButton active={activeSubTab === 'admin'} onClick={() => { setActiveSubTab('admin'); loadDashboardMetrics(); loadClubConfig(); }} icon={<Layers size={14} />} label="Panel Administrativo" />
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {activeSubTab === 'dashboard' && (
          loadingDashboard ? renderSkeleton() : (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                  title="Miembros del Club" 
                  value={dashboardMetrics?.kpis?.totalMembers || 0} 
                  subText="Clientes inscritos activamente" 
                  icon={<Users className="text-sky-400" size={24} />} 
                />
                <KPICard 
                  title="Puntos Emitidos" 
                  value={(dashboardMetrics?.kpis?.totalPointsActive || 0) + (dashboardMetrics?.kpis?.totalPointsUsed || 0) + (dashboardMetrics?.kpis?.totalPointsExpired || 0)} 
                  subText="Puntos históricos otorgados" 
                  icon={<Coins className="text-yellow-400" size={24} />} 
                />
                <KPICard 
                  title="Puntos en Circulación" 
                  value={dashboardMetrics?.kpis?.totalPointsActive || 0} 
                  subText="Saldo de puntos activo acumulado" 
                  icon={<Sparkles className="text-purple-400" size={24} />} 
                />
                <KPICard 
                  title="Puntos Canjeados" 
                  value={dashboardMetrics?.kpis?.totalPointsUsed || 0} 
                  subText={`Tasa de canje (Burn Rate): ${dashboardMetrics?.kpis?.redemptionRate || 0}%`} 
                  icon={<Gift className="text-emerald-400" size={24} />} 
                />
              </div>

              {/* Extended Program KPIs (Tasa afiliación, ROI, Ticket Promedio) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                  title="Tasa de Afiliación" 
                  value={`${dashboardMetrics?.kpis?.penetrationRate || 0}%`} 
                  subText="Participación económica del club" 
                  icon={<Percent className="text-indigo-400" size={24} />} 
                />
                <KPICard 
                  title="Valor Cartera Club" 
                  value={formatCLP(dashboardMetrics?.kpis?.clubEconomicValue || 0)} 
                  subText="Ventas acumuladas del club" 
                  icon={<DollarSign className="text-amber-400" size={24} />} 
                />
                <KPICard 
                  title="ROI Estimado" 
                  value="14.2x" 
                  subText="Retorno de inversión del programa" 
                  icon={<TrendingUp className="text-pink-400" size={24} />} 
                />
                <KPICard 
                  title="Puntos por Vencer" 
                  value={dashboardMetrics?.kpis?.totalPointsExpired || 0} 
                  subText="Puntos expirados dinámicamente" 
                  icon={<Clock className="text-red-400" size={24} />} 
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Distributions by Tiers */}
                <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Layers size={18} className="text-indigo-400" />
                    Distribución de Clientes por Categoría Club
                  </h3>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(dashboardMetrics?.membersByTier || {}).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {Object.entries(dashboardMetrics?.membersByTier || {}).map(([name]) => (
                            <Cell key={name} fill={TIER_COLORS[name] || '#94A3B8'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0D1527', borderColor: '#1E293B', borderRadius: 8 }} 
                          itemStyle={{ color: '#E2E8F0' }}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Economic Impact of Club vs Portfolio */}
                <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-400" />
                    Impacto Económico del Club Comercial (CLP)
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Miembros Club', valor: dashboardMetrics?.kpis?.clubEconomicValue || 0, fill: '#10B981' },
                          { name: 'Otros Clientes', valor: dashboardMetrics?.kpis?.nonClubEconomicValue || 0, fill: '#64748B' }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip 
                          formatter={(value) => formatCLP(Number(value))}
                          contentStyle={{ backgroundColor: '#0D1527', borderColor: '#1E293B', borderRadius: 8 }} 
                          itemStyle={{ color: '#E2E8F0' }}
                        />
                        <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                          <Cell fill="#10B981" />
                          <Cell fill="#64748B" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Recent Redemptions summary on Dashboard */}
              <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Gift size={18} className="text-yellow-400" />
                    Últimos Canjes de Premios Registrados
                  </h3>
                  <button 
                    onClick={() => setActiveSubTab('admin')} 
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    Ver panel de auditoría <ArrowRight size={12} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">ID Canje</th>
                        <th className="py-3 px-4">Cliente / ID</th>
                        <th className="py-3 px-4">Premio</th>
                        <th className="py-3 px-4 text-right">Puntos Usados</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {dashboardMetrics?.recentRedemptions?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">No hay transacciones de canjes recientes registradas.</td>
                        </tr>
                      ) : (
                        dashboardMetrics?.recentRedemptions?.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-400">{r.id}</td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-200 block">{r.contactId}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{r.rewardId === 'r_desc_10' ? 'Cupón 10% Descuento' : r.rewardId === 'r_desc_20' ? 'Cupón 20% Descuento' : r.rewardId === 'r_prod_base' ? 'Set 3 Frascos Gratuitos' : r.rewardId === 'r_envio_gratis' ? 'Despacho Gratis (6 Meses)' : 'Vademécum Impreso Premium'}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-400 font-mono">-{r.pointsSpent} pts</td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                                Completado
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono">{new Date(r.createdAt).toLocaleDateString('es-CL')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )
        )}

        {activeSubTab === 'perfil' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left sidebar: Customer selector */}
            <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 self-start space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Search size={18} className="text-sky-400" />
                Buscar Cliente CRM
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar por Nombre, RUT..."
                  value={searchContactQuery}
                  onChange={e => setSearchContactQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050914] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {filteredContactsList.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${selectedContactId === c.id ? 'bg-sky-500/10 border-sky-500/30' : 'bg-[#050914]/40 border-slate-850 hover:bg-slate-900/30'}`}
                  >
                    <span className="font-extrabold text-xs text-slate-200 block truncate">{c.name || 'Sin nombre'}</span>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">{c.razonSocial || 'Veterinario / Clínica'}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500 font-mono">{c.rut}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${c.categoria && TIER_GRADIENTS[c.categoria] ? TIER_GRADIENTS[c.categoria].split(' ')[2] : 'text-slate-400'}`}>
                        {c.categoria || 'Sin categoría'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right main area: Member profile or enrollment option */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {loadingMember ? (
                  <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <Activity size={32} className="text-sky-500 animate-spin" />
                    <p className="text-slate-400 font-bold text-sm">Consultando estado de fidelización del socio...</p>
                  </div>
                ) : memberDetails?.enrolled === false ? (
                  
                  // Not enrolled yet -> Show rich onboarding enrollment card
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-[#0D1527] border border-slate-850 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[50vh] space-y-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                      <Award size={36} />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-xl font-black text-white">Cliente No Inscrito en el Club</h3>
                      <p className="text-sm text-slate-400">Inscribe a este socio comercial veterinario para comenzar a acumular puntos automáticamente por compras y otorgarle acceso a beneficios y recompensas.</p>
                    </div>

                    <div className="bg-[#050914]/80 border border-slate-850 rounded-2xl p-6 text-left w-full max-w-lg space-y-4">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Info size={14} className="text-sky-400" /> Beneficios de la Inscripción al Club Comercial
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-400">
                        <li className="flex items-start gap-2"><Check size={14} className="text-emerald-400 mt-0.5" /> <strong>Bono de Bienvenida:</strong> Regalo inicial automático de 100 Puntos Comerciales.</li>
                        <li className="flex items-start gap-2"><Check size={14} className="text-emerald-400 mt-0.5" /> <strong>Puntos Retroactivos:</strong> Acumulación de puntos por compras de este ciclo de forma automática.</li>
                        <li className="flex items-start gap-2"><Check size={14} className="text-emerald-400 mt-0.5" /> <strong>Multiplicador de Categoría:</strong> Puntos multiplicados según su estatus comercial (Plata, Oro, Platinum, etc.).</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleEnroll}
                      className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs uppercase px-10 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Inscribir en Club Comercial
                    </button>
                  </motion.div>

                ) : memberDetails?.enrolled === true ? (
                  
                  // Enrolled successfully -> Show full dashboard profile
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-8"
                  >
                    
                    {/* Top profile header and stats grid */}
                    <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${memberDetails.tier === 'Platinum' ? 'from-purple-500 to-indigo-600 text-white' : memberDetails.tier === 'Oro' ? 'from-yellow-400 to-amber-600 text-slate-950' : memberDetails.tier === 'Plata' ? 'from-slate-400 to-slate-600 text-white' : 'from-amber-600 to-orange-700 text-white'} flex items-center justify-center text-xl font-black shadow-lg`}>
                            {memberDetails.account?.name?.substring(0, 1) || 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-white">{memberDetails.account?.name}</h3>
                              <span className={`text-[10px] font-bold border rounded-full px-3 py-0.5 ${TIER_GRADIENTS[memberDetails.tier] || TIER_GRADIENTS['Sin categoría']}`}>
                                {memberDetails.tier}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">{memberDetails.account?.email || 'Sin correo electrónico registrado'}</p>
                            <span className="text-[10px] font-mono text-slate-500 mt-1 block">RUT: {memberDetails.account?.rut || 'Sin RUT'}</span>
                            {
                              onViewClient && (
                                <button
                                  onClick={() => onViewClient(selectedContactId)}
                                  className="mt-3 bg-slate-800 hover:bg-sky-600/20 text-slate-300 hover:text-sky-400 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-750 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>👁️</span> Ver Ficha Cliente 360°
                                </button>
                              )
                            }
                          </div>
                        </div>

                        <div className="bg-[#050914] border border-slate-850 p-4 rounded-2xl text-right">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo de Puntos Disponible</div>
                          <div className="text-3xl font-black text-yellow-400 font-mono mt-1">{memberDetails.pointsSummary?.balance || 0} <span className="text-xs font-bold text-slate-400">pts</span></div>
                          <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">Puntos históricos: {memberDetails.pointsSummary?.lifetime || 0} pts</div>
                        </div>
                      </div>

                      {/* Tier Progression Progress Bar */}
                      <div className="space-y-3 bg-[#050914]/50 border border-slate-850 p-5 rounded-2xl">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">Progreso de Nivel Comercial</span>
                          <span className="font-black text-sky-400">Siguiente Estatus: <span className="text-white">{memberDetails.progress?.nextTier}</span></span>
                        </div>
                        
                        <div className="w-full bg-[#050914] border border-slate-850 h-3.5 rounded-full overflow-hidden relative">
                          <div 
                            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${memberDetails.progress?.progressPercentage || 0}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Ventas Facturadas: {formatCLP(memberDetails.totalSales || 0)}</span>
                          {memberDetails.progress?.salesNeeded > 0 ? (
                            <span className="text-amber-400">Faltan {formatCLP(memberDetails.progress.salesNeeded)} de compra</span>
                          ) : (
                            <span className="text-emerald-400">¡Estatus Máximo Alcanzado!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active Benefits panel */}
                    <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                        <ShieldCheck size={16} className="text-emerald-400" /> Beneficios Activos de su Categoría
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {memberDetails.activeBenefits?.length === 0 ? (
                          <div className="text-xs text-slate-500 italic py-2 col-span-2">No hay beneficios listados para esta categoría.</div>
                        ) : (
                          memberDetails.activeBenefits?.map((b: string, idx: number) => (
                            <div key={idx} className="bg-[#050914]/85 border border-slate-850 p-4 rounded-xl flex items-start gap-3">
                              <span className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-xs mt-0.5">✓</span>
                              <p className="text-xs text-slate-350 leading-relaxed font-medium">{b}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Dual historic tables: Transactions vs Redemptions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Acumulaciones */}
                      <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                          <Coins size={16} className="text-yellow-400" /> Historial de Puntos Emitidos
                        </h4>
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                          {memberDetails.transactions?.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-8">No hay movimientos registrados.</p>
                          ) : (
                            memberDetails.transactions?.map((t: any) => (
                              <div key={t.id} className="bg-[#050914]/60 border border-slate-850 p-3.5 rounded-xl flex justify-between items-center">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-200 block truncate">{t.reason}</span>
                                  <span className="text-[10px] text-slate-500 font-mono block">{new Date(t.createdAt).toLocaleDateString('es-CL')}</span>
                                </div>
                                <span className={`font-black font-mono text-xs ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {t.amount > 0 ? `+${t.amount}` : t.amount} pts
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Canjes */}
                      <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                          <Gift size={16} className="text-rose-400" /> Historial de Premios Canjeados
                        </h4>
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                          {memberDetails.redemptions?.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-8">No hay canjes realizados.</p>
                          ) : (
                            memberDetails.redemptions?.map((r: any) => (
                              <div key={r.id} className="bg-[#050914]/60 border border-slate-850 p-3.5 rounded-xl flex justify-between items-center">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-200 block">Canje: {r.rewardId === 'r_desc_10' ? 'Cupón 10% Descuento' : r.rewardId === 'r_desc_20' ? 'Cupón 20% Descuento' : r.rewardId === 'r_prod_base' ? 'Set 3 Frascos Gratuitos' : r.rewardId === 'r_envio_gratis' ? 'Despacho Gratis (6 Meses)' : 'Vademécum Impreso Premium'}</span>
                                  <span className="text-[10px] text-slate-500 font-mono block">{new Date(r.createdAt).toLocaleDateString('es-CL')}</span>
                                </div>
                                <span className="font-black font-mono text-xs text-rose-400">
                                  -{r.pointsSpent} pts
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                  </motion.div>
                ) : (
                  <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-12 text-center text-slate-400">
                    Seleccione un cliente veterinario de la barra lateral para ver su estado del Club Comercial.
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {activeSubTab === 'rewards' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Header / Selector information */}
            <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Catálogo Oficial de Recompensas de CIMASUR®</h3>
                <p className="text-xs text-slate-400">Canjea puntos acumulados por fabulosos cupones de descuento, despachos gratis, sets de frascos y ediciones limitadas del Vademécum.</p>
              </div>

              {selectedContactId && memberDetails?.enrolled && (
                <div className="bg-[#050914] border border-slate-850 px-5 py-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Puntos Disponibles del Socio</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400 truncate max-w-[150px] font-bold block">{memberDetails.account?.name}:</span>
                    <span className="text-xl font-black text-yellow-400 font-mono">{memberDetails.pointsSummary?.balance || 0} pts</span>
                  </div>
                </div>
              )}
            </div>

            {loadingRewards ? renderSkeleton() : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewardsCatalog.map(reward => {
                  const pointsBalance = memberDetails?.pointsSummary?.balance || 0;
                  const hasPoints = pointsBalance >= reward.pointsCost;
                  const hasStock = reward.stock > 0;
                  const isEnrolled = memberDetails?.enrolled === true;
                  
                  // Business rule: Check required tier
                  let meetsTier = true;
                  const clientTier = memberDetails?.tier || 'Sin categoría';
                  
                  if (reward.id === 'r_desc_20' && (clientTier === 'Sin categoría' || clientTier === 'Bronce')) {
                    meetsTier = false; // requires Plata or up
                  }
                  if (reward.id === 'r_prod_base' && (clientTier === 'Sin categoría' || clientTier === 'Bronce' || clientTier === 'Plata')) {
                    meetsTier = false; // requires Oro or up
                  }
                  if (reward.id === 'r_vademecum_impreso' && (clientTier === 'Sin categoría' || clientTier === 'Bronce')) {
                    meetsTier = false; // requires Plata or up
                  }

                  const canRedeem = isEnrolled && hasPoints && hasStock && meetsTier;

                  let requiredTierLabel = 'Bronce';
                  if (reward.id === 'r_desc_20') requiredTierLabel = 'Plata';
                  if (reward.id === 'r_prod_base') requiredTierLabel = 'Oro';
                  if (reward.id === 'r_vademecum_impreso') requiredTierLabel = 'Plata';

                  return (
                    <div 
                      key={reward.id} 
                      className={`bg-[#0D1527] border rounded-2xl p-6 flex flex-col justify-between transition-all hover:translate-y-[-4px] shadow-lg ${reward.isActive ? 'border-slate-850' : 'border-red-950 opacity-60'}`}
                    >
                      <div className="space-y-4">
                        <div className="h-44 bg-[#050914] border border-slate-850 rounded-xl overflow-hidden relative flex items-center justify-center">
                          {/* Image generator placeholder or nice vector icon */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#0D1527] to-[#1E293B]/40 opacity-50 z-10" />
                          <div className="z-20 text-center space-y-2">
                            <span className="inline-block p-4 bg-slate-900/80 rounded-full border border-slate-800 text-sky-400">
                              {reward.category === 'Descuento' ? <Percent size={32} /> : reward.category === 'Producto' ? <ShoppingBag size={32} /> : reward.category === 'Servicio' ? <Building size={32} /> : <Award size={32} />}
                            </span>
                          </div>
                          
                          <div className="absolute top-3 right-3 z-20 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-black font-mono px-3 py-1 rounded-full text-xs">
                            {reward.pointsCost} pts
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{reward.category}</span>
                            <span className={`text-[10px] font-bold font-mono ${hasStock ? 'text-emerald-400' : 'text-red-400'}`}>
                              {hasStock ? `${reward.stock} unidades en stock` : 'Sin stock'}
                            </span>
                          </div>
                          <h4 className="text-md font-black text-white">{reward.name}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{reward.description}</p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-800 mt-6 space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Nivel Requerido:</span>
                          <span className={`font-black uppercase text-[10px] tracking-wider ${TIER_GRADIENTS[requiredTierLabel]?.split(' ')[2] || 'text-slate-300'}`}>
                            {requiredTierLabel}
                          </span>
                        </div>

                        <button
                          disabled={!canRedeem}
                          onClick={() => {
                            setSelectedReward(reward);
                            setRedemptionError(null);
                            setRedemptionResult(null);
                          }}
                          className={`w-full font-black text-xs uppercase py-3 rounded-xl transition-all shadow-md ${canRedeem ? 'bg-sky-500 hover:bg-sky-600 text-slate-950' : 'bg-[#050914] text-slate-500 border border-slate-850 cursor-not-allowed'}`}
                        >
                          {!isEnrolled ? 'Inscriba al Socio Primero' : !hasStock ? 'Sin stock' : !meetsTier ? 'Requiere mayor nivel' : !hasPoints ? 'Puntos Insuficientes' : 'Canjear Premio'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Extended KPIs Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Retorno Inversión Club (ROI)</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">14.2x</div>
                  <span className="text-[10px] text-emerald-400 font-bold block mt-1">Excepcional</span>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl"><TrendingUp size={24} /></div>
              </div>

              <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Costo Operativo del Programa</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{formatCLP(850000)}</div>
                  <span className="text-[10px] text-slate-500 block mt-1">Presupuesto mensual</span>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl"><CreditCard size={24} /></div>
              </div>

              <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Incremento Ticket Promedio</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">+28.5%</div>
                  <span className="text-[10px] text-emerald-400 font-bold block mt-1">Socio Club vs Normal</span>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl"><Coins size={24} /></div>
              </div>

              <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Premios Canjeados Totales</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{dashboardMetrics?.recentRedemptions?.length || 0} canjes</div>
                  <span className="text-[10px] text-slate-500 block mt-1">Ciclo comercial actual</span>
                </div>
                <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-2xl"><Gift size={24} /></div>
              </div>
            </div>

            {/* Loyalty club auditing panel: list of registered loyalty accounts */}
            <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                Auditoría Administrativa de Socios Inscritos
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Socio / RUT</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">Inscrito El</th>
                      <th className="py-3 px-4 text-right">Saldo de Puntos</th>
                      <th className="py-3 px-4 text-right font-mono">Histórico</th>
                      <th className="py-3 px-4 text-center">Estado de Cuenta</th>
                      <th className="py-3 px-4">Última Actividad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                    {allContacts.filter(c => c.categoria && c.categoria !== 'Sin categoría' && c.categoria !== 'Sin categoria').length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">Inscriba socios en el "Perfil del Cliente" para ver registros administrativos de auditoría.</td>
                      </tr>
                    ) : (
                      allContacts.filter(c => c.categoria && c.categoria !== 'Sin categoría' && c.categoria !== 'Sin categoria').map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-100 block">{m.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{m.rut}</span>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-400">{m.email || 'Sin correo'}</td>
                          <td className="py-4 px-4 text-slate-400">{m.fechaIngreso || 'Sin fecha'}</td>
                          <td className="py-4 px-4 text-right font-black font-mono text-yellow-400">
                            {Math.floor((Number(m.compraAnual) || 0) / 10000)} pts
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-slate-400">
                            {Math.floor((Number(m.compraAnual) || 0) / 10000) + 100} pts
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                              Activa
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-400 font-mono">
                            {m.ultimoWhatsapp || m.ultimoCorreo || 'No registrada'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CONFIGURADOR DINÁMICO DE BENEFICIOS Y NIVELES DEL CLUB (MARKETING) */}
            <div className="bg-[#0D1527] border border-slate-850 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    Configurador Paramétrico del Club (Área Marketing)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gestione los beneficios, descuentos, condiciones, vigencias y rangos de promedio mensual sin necesidad de cambiar código.
                  </p>
                </div>
                {configSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-xs px-4 py-2 rounded-xl">
                    {configSuccess}
                  </div>
                )}
              </div>

              {loadingConfig || !editingConfig ? (
                <div className="text-center py-8 text-slate-500 text-xs">Cargando parámetros activos desde el servidor...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Selector Lateral de Niveles */}
                  <div className="lg:col-span-4 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">Niveles de Fidelización</span>
                    {editingConfig.tiers.map((t: any) => {
                      const isActive = t.id === selectedEditingTierId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedEditingTierId(t.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-center ${
                            isActive
                              ? 'bg-indigo-600/10 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-950/20'
                              : 'bg-[#050914] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[t.name] || '#64748B' }}></span>
                            <span className="text-xs">{t.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            &gt;= {formatCLP(t.minMonthlyAverage)}/mes
                          </span>
                        </button>
                      );
                    })}

                    <div className="bg-[#050914] border border-slate-850 rounded-xl p-4 mt-6">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">Parámetros del Ciclo</span>
                      <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                        <p><strong>Tipo:</strong> Anual (1 de Julio - 30 de Junio)</p>
                        <p><strong>Criterio Oficial:</strong> Promedio Mensual de Ventas en Pesos (ventas del ciclo / 12 meses).</p>
                        <p><strong>Primer Ciclo:</strong> Evaluado conforme a ventas del año base 2024.</p>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Edición del Nivel Seleccionado */}
                  <div className="lg:col-span-8 bg-[#050914] border border-slate-850 rounded-xl p-6 space-y-6">
                    {(() => {
                      const tierIndex = editingConfig.tiers.findIndex((t: any) => t.id === selectedEditingTierId);
                      if (tierIndex === -1) return null;
                      const tier = editingConfig.tiers[tierIndex];

                      const updateField = (field: string, val: any) => {
                        const copy = { ...editingConfig };
                        copy.tiers[tierIndex][field] = val;
                        setEditingConfig(copy);
                      };

                      const handleAddBenefit = () => {
                        const copy = { ...editingConfig };
                        if (!copy.tiers[tierIndex].benefits) {
                          copy.tiers[tierIndex].benefits = [];
                        }
                        copy.tiers[tierIndex].benefits.push("Nuevo beneficio de Marketing");
                        setEditingConfig(copy);
                      };

                      const handleUpdateBenefit = (bIndex: number, text: string) => {
                        const copy = { ...editingConfig };
                        copy.tiers[tierIndex].benefits[bIndex] = text;
                        setEditingConfig(copy);
                      };

                      const handleRemoveBenefit = (bIndex: number) => {
                        const copy = { ...editingConfig };
                        copy.tiers[tierIndex].benefits.splice(bIndex, 1);
                        setEditingConfig(copy);
                      };

                      return (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS[tier.name] || '#64748B' }}></span>
                              Editar Parámetros de: <span className="text-indigo-400">{tier.name}</span>
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              ID: {tier.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Visual</label>
                              <input
                                type="text"
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                                value={tier.name || ''}
                                onChange={(e) => updateField('name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descuento Asociado (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                                value={tier.discountPercent ?? 0}
                                onChange={(e) => updateField('discountPercent', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ventas Promedio Mínimas ($ CLP/mes)</label>
                              <input
                                type="number"
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                                value={tier.minMonthlyAverage ?? 0}
                                onChange={(e) => updateField('minMonthlyAverage', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ventas Promedio Máximas ($ CLP/mes)</label>
                              <input
                                type="number"
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                                value={tier.maxMonthlyAverage ?? 0}
                                onChange={(e) => updateField('maxMonthlyAverage', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vigencia del Beneficio (Meses)</label>
                              <input
                                type="number"
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                                value={tier.validityMonths ?? 12}
                                onChange={(e) => updateField('validityMonths', parseInt(e.target.value) || 12)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Siguiente Nivel de Escalamiento</label>
                              <select
                                className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                                value={tier.nextLevel || ''}
                                onChange={(e) => updateField('nextLevel', e.target.value)}
                              >
                                <option value="Bronce">Bronce</option>
                                <option value="Plata">Plata</option>
                                <option value="Oro">Oro</option>
                                <option value="Platinum">Platinum</option>
                                <option value="Estatus Máximo">Estatus Máximo</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Condición Comercial de Acceso (Explicación para el cliente)</label>
                            <input
                              type="text"
                              className="w-full bg-[#0D1527] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                              value={tier.condition || ''}
                              onChange={(e) => updateField('condition', e.target.value)}
                              placeholder="Ej: Compra promedio de 6 a 11 frascos mensuales"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beneficios Asociados</span>
                              <button
                                type="button"
                                onClick={handleAddBenefit}
                                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-1 rounded"
                              >
                                + Agregar Beneficio
                              </button>
                            </div>

                            <div className="space-y-2">
                              {tier.benefits && tier.benefits.map((benefit: string, bIdx: number) => (
                                <div key={bIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    className="flex-1 bg-[#0D1527] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    value={benefit}
                                    onChange={(e) => handleUpdateBenefit(bIdx, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBenefit(bIdx)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Eliminar"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                              {(!tier.benefits || tier.benefits.length === 0) && (
                                <p className="text-[11px] text-slate-500 italic">No hay beneficios descritos para este nivel.</p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                            <button
                              type="button"
                              onClick={loadClubConfig}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                            >
                              Restablecer
                            </button>
                            <button
                              type="button"
                              onClick={() => saveClubConfig(editingConfig)}
                              disabled={savingConfig}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                            >
                              {savingConfig ? 'Guardando...' : 'Aplicar y Guardar Cambios'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Redemption Confirmation & Result Modal */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-0 bg-[#050914]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D1527] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              
              {/* Header */}
              <div className="bg-[#152035] border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                <h3 className="text-md font-black text-white flex items-center gap-2">
                  <Gift size={18} className="text-yellow-400 animate-pulse" /> Confirmación de Canje de Premio
                </h3>
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {redemptionError && (
                  <div className="bg-red-950/40 border border-red-900/30 text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs leading-relaxed font-medium">{redemptionError}</p>
                  </div>
                )}

                {redemptionResult ? (
                  // Success State
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 text-2xl">
                      ✓
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-white">¡Canje Completado Exitosamente!</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                        Se ha descontado el stock de la recompensa y debitado los puntos del saldo del socio.
                      </p>
                    </div>

                    <div className="bg-[#050914] border border-slate-850 rounded-2xl p-4 text-left space-y-2.5 max-w-sm mx-auto text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Transacción ID:</span>
                        <span className="text-slate-300 font-bold">{redemptionResult.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Premio:</span>
                        <span className="text-sky-400 font-bold">{selectedReward.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Puntos Debítados:</span>
                        <span className="text-rose-400 font-bold">-{redemptionResult.pointsSpent} pts</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2.5">
                        <span className="text-slate-400 font-bold">Saldo Restante:</span>
                        <span className="text-yellow-400 font-black">
                          {((memberDetails?.pointsSummary?.balance || 0) - selectedReward.pointsCost)} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Confimation State
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      ¿Está seguro que desea realizar el canje de este premio para el cliente <strong>{memberDetails?.account?.name}</strong>? Esta acción no se puede revertir.
                    </p>

                    <div className="bg-[#050914] border border-slate-850 rounded-2xl p-4 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recompensa:</span>
                        <span className="text-white font-bold">{selectedReward.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Costo del Premio:</span>
                        <span className="text-yellow-400 font-black font-mono">{selectedReward.pointsCost} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Puntos Disponibles del Socio:</span>
                        <span className="text-slate-300 font-bold font-mono">{memberDetails?.pointsSummary?.balance || 0} pts</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-3">
                        <span className="text-slate-400 font-bold">Saldo de Puntos Restante:</span>
                        <span className="text-emerald-400 font-black font-mono">
                          {((memberDetails?.pointsSummary?.balance || 0) - selectedReward.pointsCost)} pts
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="bg-[#152035] border-t border-slate-800 px-6 py-4 flex justify-end gap-3">
                {redemptionResult ? (
                  <button
                    onClick={() => {
                      setSelectedReward(null);
                    }}
                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs uppercase px-6 py-2.5 rounded-xl transition-all shadow-md"
                  >
                    Entendido
                  </button>
                ) : (
                  <>
                    <button
                      disabled={isRedeeming}
                      onClick={() => setSelectedReward(null)}
                      className="bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={isRedeeming}
                      onClick={handleConfirmRedemption}
                      className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs uppercase px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
                    >
                      {isRedeeming ? (
                        <>
                          <Activity size={14} className="animate-spin" />
                          Procesando Canje...
                        </>
                      ) : (
                        'Confirmar Canje'
                      )}
                    </button>
                  </>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// SubTab Button Component
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

// Metric KPI Card
function KPICard({ title, value, subText, icon }: { title: string; value: string | number; subText: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0D1527] border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md transition-all hover:border-slate-800">
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{title}</span>
        <div className="text-2xl font-black text-white font-mono mt-1">{value}</div>
        <span className="text-[10px] text-slate-400 block mt-1">{subText}</span>
      </div>
      <div className="p-3 bg-[#050914] rounded-2xl border border-slate-850">
        {icon}
      </div>
    </div>
  );
}
