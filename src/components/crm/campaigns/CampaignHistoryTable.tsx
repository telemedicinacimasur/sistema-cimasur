import React from 'react';
import { Target, Mail, MessageSquare } from 'lucide-react';
import { Campaign } from '../../../services/automation/CampaignEngineService';

export const CampaignHistoryTable: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  return (
    <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-xs">
          <tr>
            <th className="px-6 py-4">Fecha</th>
            <th className="px-6 py-4">Campaña y Objetivo</th>
            <th className="px-6 py-4 text-center">Canal</th>
            <th className="px-6 py-4 text-center">Estado</th>
            <th className="px-6 py-4 text-right">Potencial / Brecha</th>
            <th className="px-6 py-4 text-right">Métricas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {campaigns.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                No hay registro histórico de campañas ejecutadas.
              </td>
            </tr>
          ) : (
            campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-white mb-1 group-hover:text-sky-400 transition-colors">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Target size={12}/> {c.segment} • {c.targetCount} Clientes</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex p-2 bg-slate-800 rounded-lg border border-slate-700">
                    {c.channel === 'email' || c.channel === 'both' ? <Mail className="text-sky-400" size={16} /> : null}
                    {c.channel === 'whatsapp' || c.channel === 'both' ? <MessageSquare className="text-emerald-400 ml-1" size={16} /> : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    c.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {c.status === 'executed' ? 'Enviada' : 'Borrador'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-mono text-emerald-400 font-bold">${(c.brechaEconomica || c.potentialRevenue || 0).toLocaleString('es-CL')}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Env:</span> {c.metrics?.sent || 0}
                  </div>
                  <div className="text-xs text-emerald-400 font-bold">
                    <span className="text-slate-500 font-normal">Ape:</span> {c.metrics?.opened || 0} ({(c.metrics?.sent > 0 ? ((c.metrics?.opened/c.metrics?.sent)*100).toFixed(0) : 0)}%)
                  </div>
                  <div className="text-xs text-sky-400 font-bold">
                    <span className="text-slate-500 font-normal">ROI:</span> ${(c.metrics?.roi || 0).toLocaleString('es-CL')}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
