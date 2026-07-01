import { localDB } from '../../lib/auth';
import { SuggestedCampaign } from '../crm/CampaignStrategyService';

export interface Campaign {
  id: string;
  name: string;
  suggestedCampaignId?: string;
  segment: string;
  channel: 'email' | 'whatsapp' | 'both';
  status: 'draft' | 'ready' | 'executed' | 'cancelled';
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
    const data = await localDB.getCollection('campaigns');
    return data as Campaign[];
  }

  public async saveCampaign(campaign: Campaign): Promise<void> {
    await localDB.setDocument('campaigns', campaign.id, campaign);
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
    const campaigns = await this.getCampaignHistory();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign && (campaign.status === 'draft' || campaign.status === 'ready')) {
      campaign.status = 'executed';
      campaign.executedAt = new Date().toISOString();
      campaign.executedBy = user;
      campaign.metrics.sent = campaign.targetCount;
      // Simulated initial metrics
      campaign.metrics.opened = Math.floor(campaign.targetCount * 0.4);
      campaign.metrics.clicked = Math.floor(campaign.metrics.opened * 0.2);
      await this.saveCampaign(campaign);
    }
  }

  public async getCampaignMetrics(): Promise<any> {
    const campaigns = await this.getCampaignHistory();
    const totalSent = campaigns.reduce((sum, c) => sum + c.metrics.sent, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.metrics.opened, 0);
    const totalConverted = campaigns.reduce((sum, c) => sum + c.metrics.converted, 0);
    return {
      totalCampaigns: campaigns.length,
      totalSent,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      conversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
    };
  }
}
