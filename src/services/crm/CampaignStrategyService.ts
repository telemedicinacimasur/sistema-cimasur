export interface SuggestedCampaign {
  id: string;
  name: string;
  campaignType: string;
  targetCategory: string;
  priority: 'Alta' | 'Media' | 'Baja';
  channel: ('email' | 'whatsapp')[];
  clientCount: number;
  potentialRevenue: number;
  commercialGap: number;
  expectedROI: number;
  recommendedAction: string;
  segment: string;
  opportunities: any[];
}

export class CampaignStrategyService {
  public suggestCampaigns(opportunities: any[]): SuggestedCampaign[] {
    const campaigns = new Map<string, SuggestedCampaign>();

    opportunities.forEach(opp => {
      let campaignId = '';
      let name = '';
      let campaignType = opp.type;
      let targetCategory = '';
      let priority: 'Alta' | 'Media' | 'Baja' = 'Media';
      let channel: ('email' | 'whatsapp')[] = ['email', 'whatsapp'];
      let recommendedAction = opp.recommendation?.action || 'Contactar para reactivación o ascenso';

      if (opp.type === 'first_purchase') {
        campaignId = 'camp_first_purchase';
        name = 'Campaña Primera Compra';
        targetCategory = 'Primera Compra';
        priority = 'Alta';
        recommendedAction = 'Enviar beneficio de bienvenida para primera compra';
      } else if (opp.type === 'upgrade') {
        if (opp.description.includes('Bronce')) {
          campaignId = 'camp_upgrade_bronce';
          name = 'Campaña Ascenso Bronce';
          targetCategory = 'Bronce';
        } else if (opp.description.includes('Plata')) {
          campaignId = 'camp_upgrade_plata';
          name = 'Campaña Ascenso Plata';
          targetCategory = 'Plata';
        } else if (opp.description.includes('Oro')) {
          campaignId = 'camp_upgrade_oro';
          name = 'Campaña Ascenso Oro';
          targetCategory = 'Oro';
        } else if (opp.description.includes('Platinum')) {
          campaignId = 'camp_upgrade_platinum';
          name = 'Campaña Ascenso Platinum';
          targetCategory = 'Platinum';
        } else {
          campaignId = 'camp_upgrade_general';
          name = 'Campaña Ascenso General';
          targetCategory = 'Superior';
        }
        priority = 'Media';
        recommendedAction = `Mostrar beneficios de nivel ${targetCategory} y monto faltante`;
      } else if (opp.type === 'dormant') {
        if (opp.id.includes('dormant_365')) {
           campaignId = 'camp_dormant_365';
           name = 'Recuperación Especial (365 días)';
           priority = 'Alta';
           recommendedAction = 'Ofrecer incentivo máximo de recuperación';
        } else if (opp.id.includes('dormant_180')) {
           campaignId = 'camp_dormant_180';
           name = 'Recuperación (180 días)';
           priority = 'Media';
           recommendedAction = 'Encuesta de satisfacción y oferta especial';
        } else if (opp.id.includes('dormant_90')) {
           campaignId = 'camp_dormant_90';
           name = 'Reactivación (90 días)';
           priority = 'Alta';
           recommendedAction = 'Recordatorio de compra con catálogo nuevo';
        } else {
           campaignId = 'camp_dormant_general';
           name = 'Reactivación General';
           priority = 'Media';
        }
      } else if (opp.type === 'prospect') {
        campaignId = 'camp_activation';
        name = 'Campaña Activación Prospectos';
        targetCategory = 'Sin Categoría';
        priority = 'Media';
        recommendedAction = 'Presentación de propuesta de valor y catálogo';
      } else {
        campaignId = 'camp_general';
        name = 'Campaña General';
      }

      if (!campaigns.has(campaignId)) {
        campaigns.set(campaignId, {
          id: campaignId,
          name,
          campaignType,
          targetCategory,
          priority,
          channel,
          clientCount: 0,
          potentialRevenue: 0,
          commercialGap: 0,
          expectedROI: 0,
          recommendedAction,
          segment: opp.type,
          opportunities: []
        });
      }

      const camp = campaigns.get(campaignId)!;
      camp.clientCount++;
      camp.potentialRevenue += opp.potential;
      if (opp.type === 'upgrade') {
        camp.commercialGap += opp.potential;
      }
      camp.expectedROI = camp.potentialRevenue * 0.15; // 15% estimated ROI standard
      camp.opportunities.push(opp);
    });

    return Array.from(campaigns.values()).sort((a, b) => {
      const priorities = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      if (priorities[a.priority] !== priorities[b.priority]) {
        return priorities[b.priority] - priorities[a.priority];
      }
      return b.potentialRevenue - a.potentialRevenue;
    });
  }
}
