
import React from 'react';
import { ClubClient } from '../../lib/crmLogic';
import { TrendingUp, Users, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Bell, Mail } from 'lucide-react';

export const DashboardView: React.FC<{ clients: ClubClient[] }> = ({ clients }) => {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => (c.ventas?.v2026 || 0) > 0).length;
  
  const metricCards = [
    { title: 'Ventas Ciclo', value: '$85.0M', icon: TrendingUp, color: 'text-emerald-400' },
    { title: 'Clientes Activos', value: activeClients.toString(), icon: Users, color: 'text-sky-400' },
    { title: 'Alertas Críticas', value: '12', icon: AlertTriangle, color: 'text-red-400' },
    { title: 'Campañas Pendientes', value: '2', icon: Bell, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Panel Comercial Cimasur</h1>
      <div className="grid grid-cols-4 gap-4">
        {metricCards.map(m => (
          <div key={m.title} className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B] flex items-center gap-4">
             <div className={`p-3 rounded-xl bg-slate-800 ${m.color}`}><m.icon size={24} /></div>
             <div>
               <div className="text-slate-400 text-xs font-bold uppercase">{m.title}</div>
               <div className="text-2xl font-black text-white">{m.value}</div>
             </div>
          </div>
        ))}
      </div>
      
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
        <h2 className="font-bold text-white mb-4">ACCIONES DE HOY</h2>
        <div className="space-y-3">
           <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
             <span>12 clientes están por perder categoría.</span>
             <button className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg font-bold">Actuar</button>
           </div>
           <div className="flex items-center justify-between p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
             <span>8 clientes pueden subir de categoría.</span>
             <button className="text-xs bg-sky-500 text-white px-3 py-1 rounded-lg font-bold">Actuar</button>
           </div>
        </div>
      </div>
    </div>
  );
};

