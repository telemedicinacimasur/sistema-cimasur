import { EmailConnectorService } from './EmailConnectorService';
import { WhatsAppConnectorService } from './WhatsAppConnectorService';

// Backend logic for automation.
// Note: This must only be imported by server.ts, not frontend.
export class ServerAutomation {
  private readRecords: any;
  private writeRecords: any;

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
  }

  public async executeCampaign(campaignId: string, user: string): Promise<void> {
    const campaigns = await this.readRecords('campaigns');
    const campaignIndex = campaigns.findIndex((c: any) => c.id === campaignId);
    if (campaignIndex === -1) return;

    let campaign = campaigns[campaignIndex];
    if (campaign.status !== 'draft' && campaign.status !== 'ready') return;

    campaign.status = 'scheduled';
    campaign.executedBy = user;
    campaign.updatedAt = new Date().toISOString();
    await this.writeRecords('campaigns', campaigns);

    // Run async execution
    this.runCampaignAsync(campaignId).catch(console.error);
  }

  private async runCampaignAsync(campaignId: string): Promise<void> {
    try {
      await this.updateCampaignStatus(campaignId, 'running');
      let campaigns = await this.readRecords('campaigns');
      let campaign = campaigns.find((c: any) => c.id === campaignId);
      if (!campaign) return;

      let totalSent = 0;
      if (campaign.channel === 'email' || campaign.channel === 'both') {
        const result = await EmailConnectorService.sendBatch(campaign.template, campaign.targetCount);
        totalSent += result.success;
      }
      if (campaign.channel === 'whatsapp' || campaign.channel === 'both') {
        const result = await WhatsAppConnectorService.sendBatch(campaign.template, campaign.targetCount);
        totalSent += result.success;
      }

      campaigns = await this.readRecords('campaigns');
      const campaignIndex = campaigns.findIndex((c: any) => c.id === campaignId);
      if (campaignIndex !== -1) {
        campaign = campaigns[campaignIndex];
        campaign.metrics = campaign.metrics || {};
        campaign.metrics.sent = totalSent;
        const openMultiplier = campaign.channel === 'whatsapp' ? 0.85 : (campaign.channel === 'both' ? 0.6 : 0.35);
        campaign.metrics.opened = Math.floor(totalSent * openMultiplier);
        campaign.metrics.clicked = Math.floor(campaign.metrics.opened * 0.15);
        campaign.metrics.converted = Math.floor(campaign.metrics.clicked * 0.1);
        const avgRevenuePerClient = campaign.potentialRevenue / (campaign.targetCount || 1);
        campaign.metrics.revenueGenerated = Math.floor(campaign.metrics.converted * avgRevenuePerClient);
        campaign.metrics.conversionRate = totalSent > 0 ? (campaign.metrics.converted / totalSent) * 100 : 0;
        campaign.metrics.roi = campaign.metrics.revenueGenerated;
        
        campaigns[campaignIndex] = campaign;
        await this.writeRecords('campaigns', campaigns);
      }

      await this.updateCampaignStatus(campaignId, 'completed');
    } catch (error) {
      console.error(`Error executing campaign ${campaignId}:`, error);
      await this.updateCampaignStatus(campaignId, 'error');
    }
  }

  private async updateCampaignStatus(campaignId: string, status: string): Promise<void> {
    const campaigns = await this.readRecords('campaigns');
    const campaignIndex = campaigns.findIndex((c: any) => c.id === campaignId);
    if (campaignIndex !== -1) {
      campaigns[campaignIndex].status = status;
      campaigns[campaignIndex].updatedAt = new Date().toISOString();
      if (status === 'completed') {
        campaigns[campaignIndex].executedAt = new Date().toISOString();
      }
      await this.writeRecords('campaigns', campaigns);
    }
  }
}
