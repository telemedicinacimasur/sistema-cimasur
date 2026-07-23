import { SuggestedCampaign } from '../crm/CampaignStrategyService';

export interface Campaign {
  id: string;
  name: string;
  suggestedCampaignId?: string;
  segment: string;
  channel: 'email' | 'whatsapp' | 'both';
  status: 'draft' | 'ready' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  scheduledDate?: string;
  targetCount: number;
  potentialRevenue: number;
  brechaEconomica?: number;
  template: string;
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    revenueGenerated: number;
    conversionRate: number;
    roi: number;
  };
  createdAt: string;
  executedAt?: string;
  executedBy?: string;
}

export class CampaignEngineService {
  public async getCampaignHistory(): Promise<Campaign[]> {
    const response = await fetch('/api/records/campaigns');
    if (!response.ok) return [];
    return await response.json();
  }

  public async saveCampaign(campaign: Campaign): Promise<void> {
    const campaigns = await this.getCampaignHistory();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    if (existingIndex >= 0) {
      await fetch(`/api/records/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
    } else {
      await fetch(`/api/records/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
    }
  }

  public async createFromSuggestion(suggestion: SuggestedCampaign, channel: 'email' | 'whatsapp' | 'both', template: string): Promise<Campaign> {
    const campaign: Campaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: suggestion.name,
      suggestedCampaignId: suggestion.id,
      segment: suggestion.targetCategory,
      channel,
      status: 'draft',
      targetCount: suggestion.clientCount,
      potentialRevenue: suggestion.potentialRevenue,
      brechaEconomica: suggestion.commercialGap,
      template,
      metrics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        revenueGenerated: 0,
        conversionRate: 0,
        roi: 0
      },
      createdAt: new Date().toISOString()
    };
    await this.saveCampaign(campaign);
    return campaign;
  }

  public async executeCampaign(campaignId: string, user: string = 'Sistema'): Promise<void> {
    try {
      const response = await fetch(`/api/automation/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      if (!response.ok) {
        throw new Error(`Failed to execute campaign: ${response.statusText}`);
      }
      
      // Wait a moment for the server to update the status to "running" or "scheduled" before dispatching
      setTimeout(() => {
        window.dispatchEvent(new Event('campaign-executed'));
        window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'crm_campaigns' } }));
      }, 500);

    } catch (error) {
      console.error('Error executing campaign:', error);
    }
  }

  public async getCampaignMetrics(): Promise<any> {
    const response = await fetch('/api/automation/metrics');
    return await response.json();
  }
}
