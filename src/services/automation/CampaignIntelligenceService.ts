
import { Opportunity } from './OpportunityEngineService';

export interface CampaignParameters {
  segment: string[];
  subject: string;
  message: string;
}

export class CampaignIntelligenceService {
  /**
   * Prepares campaign parameters automatically.
   */
  public prepareCampaign(opportunity: Opportunity): CampaignParameters {
    return { 
      segment: [opportunity.customerId], 
      subject: `Oportunidad Comercial: ${opportunity.type}`,
      message: `Estimado/a, hemos detectado una oportunidad para mejorar su perfil comercial: ${opportunity.description}`
    };
  }
}
