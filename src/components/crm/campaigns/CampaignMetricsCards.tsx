import React from 'react';
import { History, Send, PlaySquare, CheckCircle, Mail, MousePointer2, MessageSquare, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

export const CampaignMetricsCards: React.FC<{ metrics: any }> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <MetricCard title="Enviados" value={metrics?.totalSent || 0} icon={<Send className="text-blue-400"/>} />
      <MetricCard title="Entregados" value={metrics?.totalDelivered || 0} icon={<Mail className="text-sky-400"/>} />
      <MetricCard title="Apertura" value={`${metrics?.openRate?.toFixed(1) || 0}%`} icon={<PlaySquare className="text-amber-400"/>} />
      <MetricCard title="Clics" value={metrics?.totalClicks || 0} icon={<MousePointer2 className="text-purple-400"/>} />
      <MetricCard title="Respuestas" value={metrics?.totalReplies || 0} icon={<MessageSquare className="text-pink-400"/>} />
      <MetricCard title="Conversión" value={`${metrics?.conversionRate?.toFixed(1) || 0}%`} icon={<CheckCircle className="text-emerald-400"/>} />
      <MetricCard title="Rebotes" value={metrics?.totalBounces || 0} icon={<AlertTriangle className="text-red-400"/>} />
      <MetricCard title="Venta Atribuida" value={`$${(metrics?.attributedSales || 0).toLocaleString()}`} icon={<DollarSign className="text-emerald-400"/>} />
      <MetricCard title="ROI" value={`${metrics?.roi?.toFixed(1) || 0}%`} icon={<TrendingUp className="text-sky-400"/>} />
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-[#0D1527] p-4 rounded-2xl border border-slate-800 hover:border-sky-500/30 transition-all">
    <div className="flex justify-between items-start mb-2 text-slate-400">
      <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      {icon}
    </div>
    <div className="text-xl font-black text-white">{value}</div>
  </div>
);
