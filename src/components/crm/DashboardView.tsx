
import React, { useMemo } from 'react';
import { ArrowUpCircle, AlertTriangle, UserPlus, Bell, TrendingUp, BarChart3, Users, DollarSign, Activity, Zap, CheckCircle2, ShoppingCart, Eye } from 'lucide-react';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';

export const DashboardView: React.FC<{ 
  dashboardData: any, 
  setActiveView: (view: string) => void,
  onViewClient?: (id: string) => void 
}> = ({ dashboardData, setActiveView, onViewClient }) => {
  const isNoData = dashboardData?.status === "NO_DATA";
  
  const opportunities: any[] = useMemo(() => dashboardData?.opportunities || [], [dashboardData]);
  const metrics = dashboardData?.metrics;
  const cycle = dashboardData?.cycle || 'Ciclo Actual';

  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  const handleViewClientByName = async (name: string) => {
    if (!onViewClient) return;
    const clients = await clientService.getAllClients();
    const match = clients.find(c => 
      c.name.toLowerCase().trim() === name.toLowerCase().trim() ||
      c.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(c.name.toLowerCase())
    );
    if (match) {
      onViewClient(match.id);
    } else {
      alert(`No se encontró un socio comercial registrado con el nombre "${name}".`);
    }
  };

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  if (isNoData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Activity size={48} className="text-slate-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Esperando datos del Growth Engine</h2>
        <p className="text-slate-400">No hay información suficiente para el análisis comercial.</p>
        <p className="text-sm text-slate-500">{dashboardData.next_step}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="text-sky-500" /> Centro de Operaciones Comerciales
        </h1>
        <div className="px-4 py-2 bg-sky-950/40 border border-sky-800 rounded-full text-sky-400 font-bold text-sm">
          {cycle}
        </div>
      </div>
      
      {/* Metrics Section: Main Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Venta Potencial" 
          value={metrics?.potentialRevenue ? formatCurrency(metrics.potentialRevenue) : '$0'} 
          icon={<DollarSign size={20} className="text-emerald-400" />} 
          highlight
          onClick={() => setActiveView('campanas')}
        />
        <MetricCard 
          title="Brecha Comercial" 
          value={metrics?.brechaComercial ? formatCurrency(metrics.brechaComercial) : '$0'} 
          icon={<TrendingUp size={20} className="text-purple-400" />} 
          onClick={() => setActiveView('campanas')}
        />
        <MetricCard 
          title="Ticket Promedio" 
          value={metrics?.averageTicket ? formatCurrency(metrics.averageTicket) : '$0'} 
          icon={<ShoppingCart size={20} className="text-blue-400" />} 
        />
        <MetricCard 
          title="Clientes Activos" 
          value={metrics?.activeClients || 0} 
          icon={<CheckCircle2 size={20} className="text-emerald-400" />} 
          onClick={() => setActiveView('clientes')}
        />
      </section>

      {/* CRM Funnel Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniMetricCard title="Prospectos sin compra" value={metrics?.journeyCounts?.['Prospecto'] || 0} />
        <MiniMetricCard title="Primera compra" value={metrics?.journeyCounts?.['Primera Compra'] || 0} />
        <MiniMetricCard title="Sin Categoría" value={metrics?.journeyCounts?.['Sin Categoría'] || 0} />
        <MiniMetricCard title="Dormidos" value={metrics?.dormantCounts?.total || 0} textClass="text-amber-400" />
        <MiniMetricCard title="Conversión Intranet" value={metrics?.intranetConversionRate ? formatPercent(metrics.intranetConversionRate) : '0%'} />
      </section>

      {/* Upgrade Opportunities Row */}
      <section>
         <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <ArrowUpCircle size={16} /> Próximos a Subir de Categoría
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniMetricCard title="Cerca de Bronce" value={metrics?.nearUpgradeCounts?.bronce || 0} />
          <MiniMetricCard title="Cerca de Plata" value={metrics?.nearUpgradeCounts?.plata || 0} />
          <MiniMetricCard title="Cerca de Oro" value={metrics?.nearUpgradeCounts?.oro || 0} />
          <MiniMetricCard title="Cerca de Platinum" value={metrics?.nearUpgradeCounts?.platinum || 0} />
        </div>
      </section>

      {/* Oportunidades Section */}
      <section>
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
          <h2 className="text-xl font-bold text-slate-200">⚡ Acciones Comerciales Sugeridas</h2>
          <span className="text-sm text-slate-500 font-mono">{opportunities.length} detectadas</span>
        </div>
        
        {opportunities.length === 0 ? (
           <div className="text-slate-500 text-center py-8">No se encontraron oportunidades en este momento.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {opportunities.slice(0, 9).map((opp, idx) => (
              <OpportunityCard 
                key={opp.id || idx} 
                opp={opp} 
                setActiveView={setActiveView} 
                formatCurrency={formatCurrency} 
                onViewClient={handleViewClientByName}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, highlight?: boolean, onClick?: () => void }> = ({ title, value, icon, highlight, onClick }) => (
  <div 
    onClick={onClick}
    className={`p-6 rounded-2xl border transition-all ${onClick ? 'cursor-pointer hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-900/10' : ''} ${highlight ? 'bg-sky-950/20 border-sky-800' : 'bg-[#0D1527] border-slate-800'}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</div>
      {icon}
    </div>
    <div className={`text-3xl font-black ${highlight ? 'text-sky-400' : 'text-white'}`}>{value}</div>
  </div>
);

const MiniMetricCard: React.FC<{ title: string, value: string | number, textClass?: string }> = ({ title, value, textClass = 'text-white' }) => (
  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 leading-tight">{title}</div>
    <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
  </div>
);

const OpportunityCard: React.FC<{ 
  opp: any, 
  setActiveView: any, 
  formatCurrency: any,
  onViewClient?: (name: string) => void 
}> = ({ opp, setActiveView, formatCurrency, onViewClient }) => (
  <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-sky-500/50 transition-all group">
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-lg leading-tight">{opp.customerName}</h3>
            {onViewClient && (
              <button 
                onClick={() => onViewClient(opp.customerName)}
                className="p-1 bg-slate-900 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-lg border border-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Abrir Ficha Cliente 360°"
              >
                <Eye size={12} />
              </button>
            )}
          </div>
          <p className="text-slate-400 text-xs line-clamp-2">{opp.description}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
           {opp.type === 'first_purchase' ? <UserPlus size={18} className="text-blue-400" /> :
            opp.type === 'upgrade' ? <TrendingUp size={18} className="text-purple-400" /> :
            opp.type === 'dormant' ? <AlertTriangle size={18} className="text-amber-400" /> :
            <Bell size={18} />
           }
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
        <div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Acción</div>
          <div className="text-sm font-bold text-slate-200 truncate">{opp.recommendation?.action || 'Contactar'}</div>
        </div>
        <div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Potencial</div>
          <div className="text-sm font-black text-emerald-400">{formatCurrency(opp.potential)}</div>
        </div>
      </div>
    </div>
    <button 
      onClick={() => setActiveView('campanas')} 
      className="w-full flex items-center justify-center gap-2 text-sm bg-slate-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-sky-600 transition-colors group-hover:shadow-lg group-hover:shadow-sky-900/20"
    >
      <Zap size={16} />
      Ejecutar Campaña
    </button>
  </div>
);



