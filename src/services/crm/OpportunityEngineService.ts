
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
      // Filter out demo/mock clients
      if (!customer.rut || customer.rut.toLowerCase().includes('sin rut')) return;

      // Use the pre-calculated totalSales for the current cycle
      const totalSales = customer.totalSales || 0;
      const category = customer.categoria || 'Sin categoría';
      const name = customer.name || customer.nombre || 'Sin Nombre';
      
      // 1. Clientes Dormidos (90, 180, 365 días)
      if (customer.isClient && customer.lastPurchaseDate) {
        const lastDate = new Date(customer.lastPurchaseDate);
        const diffDays = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000);
        
        if (diffDays > 90) {
            opportunities.push({
              id: `dormant_${diffDays}_${customer.rut}`,
              type: 'dormant',
              customerId: customer.id,
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
          customerId: customer.id,
          customerName: name,
          potential: 100000,
          description: `Veterinario ${name} registrado sin primera compra.`
        });
      }

      // 3. Oportunidad de Upgrade (lógica más robusta)
      const currentAvg = customer.promedioMensual || (totalSales / 12);
      const config = this.segmentation.getConfig();
      const tiers = config.tiers || [];
      const currentTierIndex = tiers.findIndex((t: any) => t.name.toLowerCase() === category.toLowerCase());
      
      if (currentTierIndex !== -1 && currentTierIndex < tiers.length - 1) {
        const nextTier = tiers[currentTierIndex + 1];
        const thresholdMonthly = nextTier.minMonthlyAverage;
        
        if (currentAvg > (thresholdMonthly * 0.7) && currentAvg < thresholdMonthly) {
          const missingMonthly = thresholdMonthly - currentAvg;
          const missingAnnual = missingMonthly * 12;
          
          opportunities.push({
            id: `upgrade_${customer.rut}`,
            type: 'upgrade',
            customerId: customer.id,
            customerName: name,
            potential: missingAnnual,
            description: `Cliente ${name} está a $${Math.round(missingMonthly).toLocaleString('es-CL')} de promedio mensual para subir a categoría ${nextTier.name}.`
          });
        }
      }
    });

    return opportunities;
  }
}

