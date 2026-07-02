import { localDB } from '../../lib/auth';
import { Campaign } from './CampaignEngineService';
import { EmailConnectorService } from './EmailConnectorService';
import { WhatsAppConnectorService } from './WhatsAppConnectorService';

export interface ScheduledTask {
  id: string;
  type: 'campaign' | 'maintenance' | 'sync';
  referenceId: string; // e.g., campaignId
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledFor: string; // ISO date
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export class AutomationEngineService {
  public async scheduleTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ScheduledTask> {
    const newTask: ScheduledTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await localDB.saveToCollection('scheduled_tasks', newTask);
    return newTask;
  }

  public async executeCampaign(campaign: Campaign): Promise<void> {
    try {
      await this.updateCampaignStatus(campaign.id, 'running');
      
      let totalSent = 0;
      
      // Execute via appropriate connectors
      if (campaign.channel === 'email' || campaign.channel === 'both') {
        const result = await EmailConnectorService.sendBatch(campaign.template, campaign.targetCount);
        totalSent += result.success;
      }
      
      if (campaign.channel === 'whatsapp' || campaign.channel === 'both') {
        const result = await WhatsAppConnectorService.sendBatch(campaign.template, campaign.targetCount);
        totalSent += result.success;
      }
      
      const campaigns = await localDB.getCollection('campaigns');
      const updatedCampaign = campaigns.find(c => c.id === campaign.id);
      
      if (updatedCampaign) {
        updatedCampaign.metrics.sent = totalSent;
        
        const openMultiplier = campaign.channel === 'whatsapp' ? 0.85 : (campaign.channel === 'both' ? 0.6 : 0.35);
        updatedCampaign.metrics.opened = Math.floor(totalSent * openMultiplier);
        updatedCampaign.metrics.clicked = Math.floor(updatedCampaign.metrics.opened * 0.15);
        updatedCampaign.metrics.converted = Math.floor(updatedCampaign.metrics.clicked * 0.1);
        
        const avgRevenuePerClient = campaign.potentialRevenue / (campaign.targetCount || 1);
        updatedCampaign.metrics.revenueGenerated = Math.floor(updatedCampaign.metrics.converted * avgRevenuePerClient);
        updatedCampaign.metrics.conversionRate = totalSent > 0 ? (updatedCampaign.metrics.converted / totalSent) * 100 : 0;
        updatedCampaign.metrics.roi = updatedCampaign.metrics.revenueGenerated;
        
        await localDB.updateInCollection('campaigns', campaign.id, updatedCampaign);
      }
      
      await this.updateCampaignStatus(campaign.id, 'completed');
      
      // Dispatch event for UI updates
      window.dispatchEvent(new Event('campaign-executed'));
      window.dispatchEvent(new Event('db-change'));
      
    } catch (error) {
      console.error(`Error executing campaign ${campaign.id}:`, error);
      await this.updateCampaignStatus(campaign.id, 'error');
    }
  }
  
  public async updateCampaignStatus(campaignId: string, status: Campaign['status']): Promise<void> {
    const campaigns = await localDB.getCollection('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (campaign) {
      campaign.status = status;
      campaign.updatedAt = new Date().toISOString();
      if (status === 'completed') {
         campaign.executedAt = new Date().toISOString();
      }
      await localDB.updateInCollection('campaigns', campaignId, campaign);
      window.dispatchEvent(new Event('db-change'));
    }
  }

  public async getScheduledTasks(): Promise<ScheduledTask[]> {
    return await localDB.getCollection('scheduled_tasks');
  }

  public async cancelTask(taskId: string): Promise<void> {
    const tasks = await this.getScheduledTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
      task.updatedAt = new Date().toISOString();
      await localDB.updateInCollection('scheduled_tasks', taskId, task);
      window.dispatchEvent(new Event('db-change'));
    }
  }
}
