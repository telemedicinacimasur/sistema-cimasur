import React, { useState, useEffect, useMemo } from 'react';
import { Target, Users, TrendingUp, DollarSign, Zap, CheckCircle, Mail, MessageSquare, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { SuggestedCampaign } from '../../../services/crm/CampaignStrategyService';
import { ClientService } from '../../../services/crm/ClientService';
import { localDB } from '../../../lib/auth';
import { Client } from '../../../services/crm/types';

interface CampaignSuggestionsPanelProps {
  suggestions: SuggestedCampaign[];
  onExecute: (campaign: SuggestedCampaign, channel: 'email' | 'whatsapp' | 'both') => void;
  onViewClient?: (id: string) => void;
}

export const CampaignSuggestionsPanel: React.FC<CampaignSuggestionsPanelProps> = ({ suggestions, onExecute, onViewClient }) => {
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  useEffect(() => {
    const loadAll = async () => {
      const data = await clientService.getAllClients();
      setClients(data || []);
    };
    loadAll();
  }, []);

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

  const getTargetClients = (category: string) => {
    return clients.filter(c => c.categoria === category);
  };

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
      {suggestions.map((camp) => {
        const matchedClients = getTargetClients(camp.targetCategory);
        const isExpanded = expandedCampaignId === camp.id;

        return (
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

            {/* Target Clients Collapsible Preview List */}
            <div className="border-t border-slate-800 bg-slate-950/20">
              <button
                onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                className="w-full px-6 py-3 text-left text-xs font-bold text-slate-400 hover:text-white flex justify-between items-center bg-slate-900/10 hover:bg-slate-900/30 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  👥 Ver destinatarios del segmento ({matchedClients.length} clientes)
                </span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isExpanded && (
                <div className="px-6 py-3 divide-y divide-slate-850 max-h-48 overflow-y-auto">
                  {matchedClients.length === 0 ? (
                    <div className="text-slate-500 text-xs py-2 italic">Ningún cliente se encuentra registrado en esta categoría.</div>
                  ) : (
                    matchedClients.map(client => (
                      <div key={client.id} className="py-2 flex justify-between items-center">
                        <div>
                          <div className="text-white text-xs font-bold">{client.name}</div>
                          <div className="text-[10px] text-slate-400">{client.clinicName || 'Clínica Veterinaria'}</div>
                        </div>
                        {onViewClient && (
                          <button
                            onClick={() => onViewClient(client.id)}
                            className="p-1 bg-slate-800 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-md border border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Abrir Ficha 360°"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
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
        );
      })}
    </div>
  );
};
