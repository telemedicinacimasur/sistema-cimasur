import React, { useMemo } from 'react';
import { AlertTriangle, UserPlus, Zap, Eye, Users, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CommercialDashboardProps {
  dashboardData: any;
  onViewClient?: (id: string) => void;
  onDesignInEditor?: (clientData: any, reason: string) => void;
}

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ 
  dashboardData, 
  onViewClient,
  onDesignInEditor
}) => {
  const opportunities: any[] = useMemo(() => dashboardData?.opportunities || [], [dashboardData]);
  const metrics = dashboardData?.metrics;

  // Derived Alerts
  const alerts = {
    leadsIntranet: metrics?.journeyCounts?.['Prospecto'] || 0,
    upgradeCandidates: (metrics?.nearUpgradeCounts?.bronce || 0) + 
                      (metrics?.nearUpgradeCounts?.plata || 0) + 
                      (metrics?.nearUpgradeCounts?.oro || 0),
    inactiveAlerts: metrics?.dormantCounts?.total || 0,
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Management Alerts Block */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertCard 
          title="Leads de Intranet sin Compra" 
          value={alerts.leadsIntranet} 
          icon={<Users size={20} className="text-sky-400" />} 
          color="sky"
        />
        <AlertCard 
          title="Próximos a Subir de Nivel" 
          value={alerts.upgradeCandidates} 
          icon={<AlertTriangle size={20} className="text-amber-400" />} 
          color="amber"
        />
        <AlertCard 
          title="Socios Inactivos en Alerta" 
          value={alerts.inactiveAlerts} 
          icon={<Bell size={20} className="text-rose-400" />} 
          color="rose"
        />
      </section>

      {/* Action Center Block */}
      <section>
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} /> Centro de Acción Directa
        </h2>
        
        {opportunities.length === 0 ? (
          <div className="bg-[#0D1527] p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
            No hay acciones comerciales sugeridas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp, idx) => (
              <ActionCard 
                key={opp.id || idx} 
                opp={opp} 
                onViewClient={onViewClient}
                onDesignInEditor={onDesignInEditor}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const AlertCard: React.FC<{ title: string, value: number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <div className={cn("p-5 rounded-2xl border bg-[#0D1527]", color === 'sky' ? 'border-sky-900/50' : color === 'amber' ? 'border-amber-900/50' : 'border-rose-900/50')}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</div>
      {icon}
    </div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
);

const ActionCard: React.FC<{ opp: any, onViewClient?: (id: string) => void, onDesignInEditor?: (client: any, reason: string) => void }> = ({ opp, onViewClient, onDesignInEditor }) => (
  <div className="bg-[#0D1527] p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-sky-500/50 transition-all group">
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-white font-black text-base">{opp.customerName}</h3>
          <div className="text-slate-500 text-xs font-mono">{opp.rut || 'Sin RUT'}</div>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
          {opp.category || 'Sin Cat'}
        </div>
      </div>
      <p className="text-slate-300 text-xs mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800 italic">
        "{opp.description}"
      </p>
    </div>
    <div className="flex gap-2">
      {onViewClient && (
        <button 
          onClick={() => onViewClient(opp.customerName)}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Eye size={14} /> Ver
        </button>
      )}
      <button 
        onClick={() => onDesignInEditor?.(opp, opp.description)}
        className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-900/20"
      >
        <Zap size={14} /> Actuar
      </button>
    </div>
  </div>
);
