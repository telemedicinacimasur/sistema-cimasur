import { Opportunity } from './OpportunityEngineService';
import { RecommendationInput, RecommendationOutput, IRecommendationProvider } from './contracts';
import { RuleBasedRecommendationProvider } from './RuleBasedRecommendationProvider';
import { IntegrationService } from './IntegrationService';
import { CycleManagerService } from './CycleManagerService';
import { CustomerJourneyService } from './CustomerJourneyService';
import { SegmentationService } from './SegmentationService';

export interface Recommendation {
  action: 'Campaña' | 'Llamada' | 'WhatsApp';
  message: string;
  priority: 'Alta' | 'Media' | 'Baja';
}

/**
 * Servicio del Motor de Recomendaciones de CIMASUR (Fase 6)
 * Coordina múltiples proveedores de recomendaciones (Rules-based, IA, etc.)
 * y entrega recomendaciones personalizadas de productos, promociones, canjes y fidelización.
 */
export class RecommendationEngineService {
  private readRecords: any;
  private writeRecords: any;
  private providers: IRecommendationProvider[] = [];

  constructor(readRecords?: any, writeRecords?: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
    
    // Registrar el proveedor por defecto basado en reglas de negocio
    this.providers.push(new RuleBasedRecommendationProvider());
  }

  /**
   * Método heredado (Fase 5 Backwards Compatibility)
   * Recomienda acciones simples basadas en oportunidades detectadas por el flujo anterior.
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
          message: `Convierte al prospecto ${opportunity.customerName} con su primera oferta de bienvenida.`,
          priority: 'Alta'
        };
      default:
        return {
          action: 'WhatsApp',
          message: 'Enviar mensaje de seguimiento estándar.',
          priority: 'Baja'
        };
    }
  }

  /**
   * Registra un nuevo proveedor de recomendaciones (por ejemplo, para cambiar a IA en el futuro)
   */
  public registerProvider(provider: IRecommendationProvider): void {
    this.providers.push(provider);
  }

  /**
   * Obtiene datos consolidados del cliente para alimentar la entrada de recomendaciones
   */
  private async getProcessedCustomer(contactId: string): Promise<any | null> {
    if (!this.readRecords) return null;

    try {
      const salesData = await this.readRecords('sales');
      const intranetData = await this.readRecords('intranet_clients');
      const loyaltyAccounts = await this.readRecords('loyalty_accounts') || [];
      
      const integration = new IntegrationService();
      const cycle = new CycleManagerService();
      const journey = new CustomerJourneyService();
      const segmentation = new SegmentationService();
      
      const integratedData = integration.integrate(intranetData, salesData);
      const customer = integratedData.find((c: any) => c.id === contactId || c.rut === contactId);
      
      if (!customer) return null;

      const sales = customer.sales || [];
      const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      const journeyState = journey.determineState(customer, totalSales);
      const category = segmentation.categorize(totalSales);
      
      const loyaltyAccount = loyaltyAccounts.find((a: any) => a.contactId === customer.id || a.contactId === customer.rut);
      
      // Productos comprados recientemente
      const recentProducts = sales.slice(0, 5).map((s: any) => s.producto || s.product || '').filter(Boolean);

      return {
        ...customer,
        totalSales,
        journeyState,
        category,
        loyaltyAccount,
        recentProducts
      };
    } catch (e) {
      console.error(`Error procesando cliente ${contactId} para recomendaciones:`, e);
      return null;
    }
  }

  /**
   * Genera recomendaciones personalizadas para un cliente utilizando todos los proveedores registrados.
   */
  public async getRecommendationsForClient(contactId: string): Promise<RecommendationOutput[]> {
    const customer = await this.getProcessedCustomer(contactId);
    
    // Si no hay acceso a DB o cliente no encontrado, retornamos un fallback vacío
    if (!customer) {
      return [];
    }

    // Calcular días inactivos
    let diasInactivo = 0;
    if (customer.lastPurchaseDate) {
      const now = new Date();
      const lastDate = new Date(customer.lastPurchaseDate);
      diasInactivo = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)));
    } else {
      diasInactivo = 999;
    }

    const input: RecommendationInput = {
      contactId,
      category: customer.category || 'Sin Categoría',
      totalVentasCiclo: customer.totalSales || 0,
      diasInactivo,
      loyaltyAccountEnrolled: !!customer.loyaltyAccount,
      pointsBalance: customer.loyaltyAccount?.pointsBalance || 0,
      recentProducts: customer.recentProducts || []
    };

    let allRecommendations: RecommendationOutput[] = [];

    // Combinar recomendaciones de todos los proveedores registrados
    for (const provider of this.providers) {
      try {
        const recs = await provider.getRecommendations(input);
        allRecommendations = [...allRecommendations, ...recs];
      } catch (err) {
        console.error(`Error en el proveedor de recomendaciones ${provider.name}:`, err);
      }
    }

    // Ordenar por prioridad (Alta -> Media -> Baja)
    const priorityWeight = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
    allRecommendations.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    return allRecommendations;
  }
}
