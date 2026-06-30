
import React from 'react';
import { ClubClient } from '../../lib/crmLogic';
import { TrendingUp, Users, AlertTriangle, ArrowUpCircle, Bell } from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';

export const DashboardView: React.FC<{ clients: ClubClient[], setActiveView: (view: string) => void }> = ({ clients, setActiveView }) => {
  const { benefits } = useBenefits();
  // Simple calculations for demo purposes
  const totalClients = clients.length;
  const activeClients = clients.filter(c => (c.ventas?.v2026 || 0) > 0).length;
  const criticalClients = clients.filter(c => (c.ventas?.v2026 || 0) === 0 && (c.ventas?.v2025 || 0) > 0).length;
  const growingClients = clients.filter(c => (c.ventas?.v2026 || 0) > (c.ventas?.v2025 || 0)).length;

  const metricCards = [
    { title: 'Ventas Ciclo', value: '$85.0M', icon: TrendingUp, color: 'text-emerald-400' },
    { title: 'Clientes Activos', value: activeClients.toString(), icon: Users, color: 'text-sky-400' },
    { title: 'Alertas Críticas', value: criticalClients.toString(), icon: AlertTriangle, color: 'text-red-400' },
    { title: 'Clientes Creciendo', value: growingClients.toString(), icon: ArrowUpCircle, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Panel Comercial Cimasur</h1>
      <div className="grid grid-cols-4 gap-4">
        {metricCards.map(m => (
          <div key={m.title} className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B] flex items-center gap-4">
             <div className={`p-3 rounded-xl bg-slate-800 ${m.color}`}><m.icon size={24} /></div>
             <div>
               <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{m.title}</div>
               <div className="text-2xl font-black text-white">{m.value}</div>
             </div>
          </div>
        ))}
      </div>
      
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
        <h2 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">Acciones de Hoy</h2>
        <div className="space-y-3">
           <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
             <span className="text-slate-300">{criticalClients} clientes requieren atención crítica por caída en ventas.</span>
             <button onClick={() => setActiveView('crm_club')} className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-600">Actuar</button>
           </div>
           <div className="flex items-center justify-between p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
             <span className="text-slate-300">Clientes cercanos a subir de nivel detectados.</span>
             <button onClick={() => setActiveView('crm_club')} className="text-xs bg-sky-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-sky-600">Actuar</button>
           </div>
        </div>
      </div>
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
        <h2 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">Beneficios por Categoría</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(benefits).map(([cat, desc]) => (
            <div key={cat} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700">
              <div className="text-sky-400 font-bold capitalize mb-1">{cat}</div>
              <div className="text-slate-400 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

