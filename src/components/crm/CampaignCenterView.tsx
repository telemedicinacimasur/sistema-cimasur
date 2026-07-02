import React, { useState, useEffect } from 'react';
import { Zap, Activity } from 'lucide-react';
import { CampaignEngineService } from '../../services/automation/CampaignEngineService';
import { SuggestedCampaign } from '../../services/crm/CampaignStrategyService';
import { CampaignMetricsCards } from './campaigns/CampaignMetricsCards';
import { CampaignSuggestionsPanel } from './campaigns/CampaignSuggestionsPanel';
import { CampaignHistoryTable } from './campaigns/CampaignHistoryTable';
import { CampaignPreviewModal } from './campaigns/CampaignPreviewModal';

const campaignEngine = new CampaignEngineService();

export const CampaignCenterView: React.FC<{ dashboardData: any }> = ({ dashboardData }) => {
  const [activeSubView, setActiveSubView] = useState<'create' | 'history'>('create');
  const [campaignsHistory, setCampaignsHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [previewCampaign, setPreviewCampaign] = useState<SuggestedCampaign | null>(null);
  const [previewChannel, setPreviewChannel] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  
  // GrowthEngine delivers exactly what needs to be suggested
  const suggestedCampaigns = dashboardData?.suggestedCampaigns || [];

  useEffect(() => {
    loadCampaigns();
  }, [activeSubView]);

  const loadCampaigns = async () => {
    const history = await campaignEngine.getCampaignHistory();
    setCampaignsHistory(history || []);
    const m = await campaignEngine.getCampaignMetrics();
    setMetrics(m);
  };

  const handleExecuteRequest = (suggestion: SuggestedCampaign, channel: 'email' | 'whatsapp' | 'both') => {
    setPreviewCampaign(suggestion);
    setPreviewChannel(channel);
  };

  const confirmExecution = async (template: string) => {
    if (!previewCampaign || !previewChannel) return;
    
    // Motor de Ejecución ONLY
    const campaign = await campaignEngine.createFromSuggestion(previewCampaign, previewChannel, template);
    await campaignEngine.executeCampaign(campaign.id);
    
    alert(`Campaña "${previewCampaign.name}" enviada exitosamente a ${previewCampaign.clientCount} clientes.`);
    
    setPreviewCampaign(null);
    setPreviewChannel(null);
    loadCampaigns();
    window.dispatchEvent(new Event('campaign-executed'));
    setActiveSubView('history');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Zap className="text-amber-400" size={32} />
          Centro de Campañas Inteligentes
        </h1>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button 
            onClick={() => setActiveSubView('create')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeSubView === 'create' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Campañas Sugeridas
          </button>
          <button 
            onClick={() => setActiveSubView('history')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeSubView === 'history' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Historial y Rendimiento
          </button>
        </div>
      </div>

      {activeSubView === 'create' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-slate-300 mb-6">
            <Activity className="text-sky-400" size={20} />
            <h2 className="text-xl font-bold">Oportunidades Agrupadas y Listas para Ejecutar</h2>
          </div>
          
          <CampaignSuggestionsPanel 
            suggestions={suggestedCampaigns} 
            onExecute={handleExecuteRequest} 
          />
        </div>
      )}

      {activeSubView === 'history' && (
        <div className="space-y-6">
          <CampaignMetricsCards metrics={metrics} />
          <CampaignHistoryTable campaigns={campaignsHistory} />
        </div>
      )}

      {previewCampaign && previewChannel && (
        <CampaignPreviewModal 
          campaign={previewCampaign} 
          channel={previewChannel} 
          onClose={() => {
            setPreviewCampaign(null);
            setPreviewChannel(null);
          }}
          onConfirm={confirmExecution}
        />
      )}
    </div>
  );
};

