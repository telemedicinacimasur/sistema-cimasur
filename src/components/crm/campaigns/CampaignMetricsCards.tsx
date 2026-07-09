import React from 'react';
import { History, Send, PlaySquare, CheckCircle } from 'lucide-react';

export const CampaignMetricsCards: React.FC<{ metrics: any }> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard title="Campañas" value={metrics?.totalCampaigns || 0} icon={<History className="text-sky-400"/>} />
      <MetricCard title="Enviados" value={metrics?.totalSent || 0} icon={<Send className="text-blue-400"/>} />
      <MetricCard title="Apertura" value={`${metrics?.openRate?.toFixed(1) || 0}%`} icon={<PlaySquare className="text-amber-400"/>} />
      <MetricCard title="Conversión" value={`${metrics?.conversionRate?.toFixed(1) || 0}%`} icon={<CheckCircle className="text-emerald-400"/>} />
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 hover:border-sky-500/30 transition-all">
    <div className="flex justify-between items-start mb-4 text-slate-400">
      <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      {icon}
    </div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
);
