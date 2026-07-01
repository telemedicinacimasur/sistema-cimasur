import React from 'react';
import { Target, Users, TrendingUp, DollarSign, Zap, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { SuggestedCampaign } from '../../../services/crm/CampaignStrategyService';

interface CampaignSuggestionsPanelProps {
  suggestions: SuggestedCampaign[];
  onExecute: (campaign: SuggestedCampaign, channel: 'email' | 'whatsapp' | 'both') => void;
}

export const CampaignSuggestionsPanel: React.FC<CampaignSuggestionsPanelProps> = ({ suggestions, onExecute }) => {
  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

  if (suggestions.length === 0) {
    return (
      <div className="bg-[#0D1527] border border-slate-800 p-12 rounded-2xl text-center">
        <CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">No hay oportunidades pendientes</h3>
        <p className="text-slate-400">El Growth Engine no ha detectado nuevas brechas comerciales por ahora.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {suggestions.map((camp) => (
        <div key={camp.id} className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden hover:border-sky-500/30 transition-all flex flex-col group">
          <div className="p-6 border-b border-slate-800 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white group-hover:text-sky-400 transition-colors">{camp.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  camp.priority === 'Alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  camp.priority === 'Media' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  Prioridad {camp.priority}
                </span>
              </div>
              <p className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                <Target size={14} className="text-slate-500"/> Categoría Objetivo: <strong className="text-white">{camp.targetCategory}</strong>
              </p>
              <p className="text-slate-400 text-sm">
                Sugerencia: {camp.recommendedAction}
              </p>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-3 gap-4 bg-slate-900/30">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={14}/> Impacto</div>
              <div className="text-2xl font-bold text-white">{camp.clientCount} <span className="text-sm font-normal text-slate-400">clientes</span></div>
            </div>
            {camp.commercialGap > 0 ? (
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={14}/> Brecha Económica</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(camp.commercialGap)}</div>
              </div>
            ) : (
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={14}/> Venta Potencial</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(camp.potentialRevenue)}</div>
              </div>
            )}
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={14}/> ROI Estimado</div>
              <div className="text-2xl font-bold text-sky-400">{formatCurrency(camp.expectedROI)}</div>
            </div>
          </div>
          
          <div className="p-6 mt-auto bg-slate-900 border-t border-slate-800 flex gap-3">
            <button 
              onClick={() => onExecute(camp, 'email')}
              className="flex-1 bg-slate-800 hover:bg-sky-600 border border-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Mail size={18} /> Ejecutar Email
            </button>
            <button 
              onClick={() => onExecute(camp, 'whatsapp')}
              className="flex-1 bg-slate-800 hover:bg-green-600 border border-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare size={18} /> Ejecutar WhatsApp
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
