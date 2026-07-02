import React, { useState } from 'react';
import { X, Mail, MessageSquare, Target, Users, Zap, PlaySquare, TrendingUp, DollarSign } from 'lucide-react';
import { SuggestedCampaign } from '../../../services/crm/CampaignStrategyService';
import { TemplateManagerService } from '../../../services/automation/TemplateManagerService';

interface CampaignPreviewModalProps {
  campaign: SuggestedCampaign | null;
  channel: 'email' | 'whatsapp' | 'both' | null;
  onClose: () => void;
  onConfirm: (template: string) => void;
}

export const CampaignPreviewModal: React.FC<CampaignPreviewModalProps> = ({ campaign, channel, onClose, onConfirm }) => {
  const [template, setTemplate] = useState('');
  const [parsedTemplate, setParsedTemplate] = useState('');
  
  React.useEffect(() => {
    if (campaign && channel) {
      const generatedTemplate = TemplateManagerService.generateTemplate(campaign, channel);
      setTemplate(generatedTemplate);
      
      // Simulate parser with example data
      const nextCategoryMap: Record<string, string> = {
        'Bronce': 'Plata',
        'Plata': 'Oro',
        'Oro': 'Diamante',
        'Diamante': 'Diamante',
        'Zafiro': 'Rubí' // example
      };
      
      const exampleVariables = {
        customerName: 'Juan Pérez',
        currentCategory: campaign.targetCategory,
        nextCategory: nextCategoryMap[campaign.targetCategory] || 'Superior',
        commercialGap: TemplateManagerService.formatCurrency(campaign.commercialGap),
        potentialRevenue: TemplateManagerService.formatCurrency(campaign.potentialRevenue),
        benefit: campaign.recommendedAction,
        channel: channel
      };
      
      setParsedTemplate(TemplateManagerService.parseTemplate(generatedTemplate, exampleVariables));
    }
  }, [campaign, channel]);

  if (!campaign || !channel) return null;

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1527] border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${channel === 'email' ? 'bg-sky-500/20 text-sky-400' : channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {channel === 'email' ? <Mail size={24} /> : channel === 'whatsapp' ? <MessageSquare size={24} /> : <Zap size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Vista Previa de Campaña</h2>
              <p className="text-slate-400 text-sm">Validación antes de ejecución</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">Campaña</div>
              <div className="text-white font-bold truncate" title={campaign.name}>{campaign.name}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Target size={12}/> Categoría Actual</div>
              <div className="text-white font-bold">{campaign.targetCategory}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Users size={12}/> Destinatarios</div>
              <div className="text-white font-bold">{campaign.clientCount}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">Canal</div>
              <div className="text-white font-bold capitalize">{channel}</div>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp size={12}/> Brecha Comercial</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(campaign.commercialGap)}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Venta Potencial</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(campaign.potentialRevenue)}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Zap size={12}/> ROI Esperado</div>
              <div className="text-sky-400 font-bold">{formatCurrency(campaign.expectedROI)}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">Beneficio Objetivo</div>
              <div className="text-white font-bold truncate text-sm" title={campaign.recommendedAction}>{campaign.recommendedAction}</div>
            </div>
          </div>

          {/* Plantillas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                Plantilla Dinámica (Editable)
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-sky-500 min-h-[250px]"
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  
                  const nextCategoryMap: Record<string, string> = {
                    'Bronce': 'Plata',
                    'Plata': 'Oro',
                    'Oro': 'Diamante',
                    'Diamante': 'Diamante'
                  };
                  
                  const exampleVariables = {
                    customerName: 'Juan Pérez',
                    currentCategory: campaign.targetCategory,
                    nextCategory: nextCategoryMap[campaign.targetCategory] || 'Superior',
                    commercialGap: TemplateManagerService.formatCurrency(campaign.commercialGap),
                    potentialRevenue: TemplateManagerService.formatCurrency(campaign.potentialRevenue),
                    benefit: campaign.recommendedAction,
                    channel: channel
                  };
                  
                  setParsedTemplate(TemplateManagerService.parseTemplate(e.target.value, exampleVariables));
                }}
              />
              <p className="text-xs text-slate-500">
                Usa variables como {'{{customerName}}'}, {'{{currentCategory}}'}, {'{{commercialGap}}'}
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                Vista Previa Simulada (Ejemplo)
              </label>
              <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-slate-300 min-h-[250px] whitespace-pre-wrap font-mono text-sm">
                {parsedTemplate}
              </div>
              <p className="text-xs text-slate-500">
                Así verá el mensaje cada uno de los {campaign.clientCount} clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 mt-auto">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(template)}
            className={`px-6 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 transition-colors ${
              channel === 'email' ? 'bg-sky-600 hover:bg-sky-500' : 
              channel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-500' : 
              'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            <PlaySquare size={18} />
            Confirmar y Ejecutar
          </button>
        </div>
      </div>
    </div>
  );
};
