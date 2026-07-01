
import { SegmentationService } from './SegmentationService';

export interface Opportunity {
  id: string;
  type: 'dormant' | 'upgrade' | 'reactivation' | 'first_purchase';
  customerId: string;
  customerName: string;
  potential: number;
  description: string;
}

export class OpportunityEngineService {
  private segmentation = new SegmentationService();

  public detectOpportunities(customers: any[]): Opportunity[] {
    const opportunities: Opportunity[] = [];
    const now = new Date();
    
    customers.forEach(customer => {
      // Use the pre-calculated totalSales for the current cycle
      const totalSales = customer.totalSales || 0;
      const category = this.segmentation.categorize(totalSales);
      const name = customer.name || customer.nombre || 'Sin Nombre';
      
      // 1. Clientes Dormidos (90, 180, 365 días)
      if (customer.isClient && customer.lastPurchaseDate) {
        const lastDate = new Date(customer.lastPurchaseDate);
        const diffDays = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000);
        
        if (diffDays > 90) {
            opportunities.push({
              id: `dormant_${diffDays}_${customer.rut}`,
              type: 'dormant',
              customerId: customer.rut,
              customerName: name,
              potential: totalSales * 0.3,
              description: `Cliente ${name} inactivo hace ${Math.floor(diffDays)} días.`
            });
        }
      }

      // 2. Prospectos sin primera compra
      if (!customer.isClient) {
        opportunities.push({
          id: `first_purchase_${customer.rut}`,
          type: 'first_purchase',
          customerId: customer.rut,
          customerName: name,
          potential: 100000,
          description: `Veterinario ${name} registrado sin primera compra.`
        });
      }

      // 3. Oportunidad de Upgrade (lógica más robusta)
      const nextCategoryThresholds: Record<string, number> = {
        'Primera Compra': 100000,
        'Sin Categoría': 500000,
        'Bronce': 1000000,
        'Plata': 2000000,
        'Oro': 5000000,
        'Platinum': 10000000
      };

      const threshold = nextCategoryThresholds[category] || nextCategoryThresholds['Sin Categoría'];
      if (threshold && totalSales > (threshold * 0.7) && totalSales < threshold) {
        opportunities.push({
          id: `upgrade_${customer.rut}`,
          type: 'upgrade',
          customerId: customer.rut,
          customerName: name,
          potential: threshold - totalSales,
          description: `Cliente ${name} está a $${(threshold - totalSales).toLocaleString('es-CL')} de subir de categoría.`
        });
      }
    });

    return opportunities;
  }
}

