import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Shield, TrendingUp, AlertTriangle, Lightbulb, Users, Zap, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const ExecutiveDashboardView: React.FC<{ dashboardData: any }> = ({ dashboardData }) => {
  if (!dashboardData || !dashboardData.intelligence) {
    return <div className="p-8 text-center text-slate-400">Procesando inteligencia comercial...</div>;
  }

  const { intelligence, prediction, metrics } = dashboardData;
  const { health, risks, opportunities } = intelligence;

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="text-indigo-400" size={32} />
            Centro de Inteligencia Comercial
          </h1>
          <p className="text-slate-400 mt-1">Análisis estratégico, riesgos y oportunidades detectadas por IA</p>
        </div>
        <div className="bg-[#0D1527] border border-slate-700 px-6 py-3 rounded-2xl flex items-center gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Health Score</div>
            <div className="text-2xl font-black text-emerald-400">{health.score}/100</div>
          </div>
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1E293B"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#34D399"
                strokeWidth="4"
                strokeDasharray={`${health.score}, 100`}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Venta Actual" value={formatCurrency(metrics.totalRevenue)} icon={<TrendingUp />} trend="+5.2%" positive />
        <MetricCard title="Proyección (Trimestre)" value={formatCurrency(prediction.expectedRevenue)} icon={<Zap />} trend="Optimista" positive />
        <MetricCard title="Clientes Activos" value={health.activeClients} icon={<Users />} trend={`${health.monthlyGrowthRate}%`} positive />
        <MetricCard title="Riesgo Abandono" value={health.dormantClients} icon={<AlertTriangle />} trend={`${health.lossRiskRate.toFixed(1)}%`} positive={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={24} />
            <h2 className="text-xl font-bold text-white">Riesgos Detectados</h2>
          </div>
          <div className="p-6 space-y-4">
            {risks.length === 0 ? (
              <div className="text-slate-400 text-sm">No se detectaron riesgos críticos.</div>
            ) : (
              risks.map((r: any) => (
                <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-white">{r.description}</div>
                    <span className={`px-2 py-1 text-xs font-bold rounded border ${r.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {r.severity}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 flex justify-between">
                    <span>Impacto potencial: <span className="text-white font-bold">{formatCurrency(r.impact)}</span></span>
                    <span>Afecta: {r.affectedClients} clientes</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <Lightbulb className="text-sky-400" size={24} />
            <h2 className="text-xl font-bold text-white">Oportunidades Estratégicas</h2>
          </div>
          <div className="p-6 space-y-4">
            {opportunities.length === 0 ? (
              <div className="text-slate-400 text-sm">Procesando nuevas oportunidades...</div>
            ) : (
              opportunities.map((o: any) => (
                <div key={o.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-white">{o.description}</div>
                    <span className="px-2 py-1 text-xs font-bold rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Oportunidad
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 flex justify-between">
                    <span>Retorno potencial: <span className="text-emerald-400 font-bold">{formatCurrency(o.potentialRevenue)}</span></span>
                    <span>Segmento: {o.targetSegment}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target className="text-indigo-400" size={24} />
            <h2 className="text-xl font-bold text-white">Metas y Predicciones</h2>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 uppercase">Cierre Trimestre (Proyectado)</div>
            <div className="text-3xl font-black text-white">{formatCurrency(prediction.expectedRevenue)}</div>
            <div className="text-sm text-sky-400 font-bold">Confianza: {prediction.confidence}%</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 uppercase">Brecha por Recuperar</div>
            <div className="text-3xl font-black text-amber-400">{formatCurrency(prediction.projectedGap)}</div>
            <div className="text-sm text-slate-500">Requiere ~{prediction.campaignNeeds} campañas efectivas</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 uppercase">Conversión Intranet</div>
            <div className="text-3xl font-black text-white">{health.intranetConversionRate.toFixed(1)}%</div>
            <div className="text-sm text-emerald-400 font-bold">De cuentas registradas a activas</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, trend: string, positive: boolean }> = ({ title, value, icon, trend, positive }) => (
  <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800">
    <div className="flex justify-between items-start mb-4">
      <div className="text-slate-400">{icon}</div>
      <div className={`flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <div className="text-3xl font-black text-white mb-1">{value}</div>
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
  </div>
);
