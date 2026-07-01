
import { Opportunity } from './OpportunityEngineService';

export interface Recommendation {
  action: 'Campaña' | 'Llamada' | 'WhatsApp';
  message: string;
  priority: 'Alta' | 'Media' | 'Baja';
}

export class RecommendationEngineService {
  /**
   * Recommends actions based on detected opportunities.
   */
  public getRecommendationForOpportunity(opportunity: Opportunity): Recommendation {
    switch (opportunity.type) {
      case 'upgrade':
        return {
          action: 'Campaña',
          message: `Oportunidad de crecimiento: el cliente ${opportunity.customerName} puede subir de categoría.`,
          priority: 'Alta'
        };
      case 'dormant':
        return {
          action: 'Llamada',
          message: `Reactiva al cliente ${opportunity.customerName} que lleva tiempo sin comprar.`,
          priority: 'Alta'
        };
      case 'first_purchase':
        return {
            action: 'WhatsApp',
            message: `Convierte al prospecto ${opportunity.customerName} con su primera oferta.`,
            priority: 'Alta'
        }
      default:
        return {
          action: 'WhatsApp',
          message: 'Enviar mensaje de seguimiento estándar.',
          priority: 'Baja'
        };
    }
  }
}
