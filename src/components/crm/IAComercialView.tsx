import React from 'react';
import { Bot, Zap, TrendingUp } from 'lucide-react';

export const IAComercialView: React.FC = () => (
  <div className="p-8 space-y-6">
    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="text-sky-400" /> IA Comercial - Recomendaciones</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
        <h3 className="text-white font-bold mb-2">Acción recomendada</h3>
        <p className="text-slate-400 text-sm">Priorizar contacto con clientes en categoría 'Sin Categoría' que tienen potencial de crecimiento.</p>
      </div>
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
        <h3 className="text-white font-bold mb-2">Campaña sugerida</h3>
        <p className="text-slate-400 text-sm">Campaña de reactivación enfocada en línea de Echinac A para clientes dormidos.</p>
      </div>
    </div>
  </div>
);
