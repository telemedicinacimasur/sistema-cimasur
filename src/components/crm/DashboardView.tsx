
import React, { useMemo, useState, useEffect } from 'react';
import { ArrowUpCircle, AlertTriangle, UserPlus, Bell, TrendingUp, BarChart3, Users, DollarSign, Activity, Zap, CheckCircle2, ShoppingCart, Eye } from 'lucide-react';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';

export const DashboardView: React.FC<{ 
  setActiveView: (view: string) => void,
  onViewClient?: (id: string) => void 
}> = ({ setActiveView, onViewClient }) => {
  const [data, setData] = useState<any>(null);
  
  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);
  
  useEffect(() => {
    fetch('/api/crm/dashboard-data')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);
  
  if (!data) return <div className="p-6 text-white text-center font-bold">Cargando tablero comercial...</div>;

  const { nearUpgrade, atRisk, highIntranetPotential, metrics } = data;

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  return (
    <div className="p-6 space-y-10">
      
      {/* KPI Overview */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Ventas Mes" value={formatCurrency(metrics?.monthlySales || 0)} icon={<DollarSign className="text-emerald-400" />} />
        <MetricCard title="Conversión" value={formatPercent(metrics?.avgConversion || 0)} icon={<TrendingUp className="text-sky-400" />} />
        <MetricCard title="Campañas Activas" value={metrics?.activeCampaigns || 0} icon={<Zap className="text-purple-400" />} />
        <MetricCard title="Nuevos Clientes" value={metrics?.newClientsThisMonth || 0} icon={<UserPlus className="text-pink-400" />} />
      </section>

      {/* Main Row: Actionable Lists */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ArrowUpCircle className="text-emerald-400" size={18}/> Próximos Ascensos</h3>
            <div className="space-y-3">
              {nearUpgrade.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-200 font-medium">{p.name}</span>
                  <button onClick={() => onViewClient?.(p.id)} className="text-sky-400 hover:text-sky-300 font-bold">Ver</button>
                </div>
              ))}
            </div>
         </div>
         
         <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-400" size={18}/> Clientes en Riesgo</h3>
            <div className="space-y-3">
              {atRisk.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-200 font-medium">{p.name}</span>
                  <button onClick={() => onViewClient?.(p.id)} className="text-sky-400 hover:text-sky-300 font-bold">Ver</button>
                </div>
              ))}
            </div>
         </div>

         <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Zap className="text-purple-400" size={18}/> Alta Intención (Intranet)</h3>
            <div className="space-y-3">
              {highIntranetPotential.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-200 font-medium">{p.name}</span>
                  <button onClick={() => onViewClient?.(p.id)} className="text-sky-400 hover:text-sky-300 font-bold">Ver</button>
                </div>
              ))}
            </div>
         </div>
      </section>

    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-[#0D1527] p-5 rounded-2xl border border-slate-800 hover:border-sky-500/30 transition-all">
    <div className="flex justify-between items-start mb-2 text-slate-400">
      <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      {icon}
    </div>
    <div className="text-2xl font-black text-white">{value}</div>
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



