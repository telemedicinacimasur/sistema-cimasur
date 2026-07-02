
import { Opportunity } from './OpportunityEngineService';

export interface DashboardSummary {
  journeyCounts: Record<string, number>;
  dormantCounts: {
    d90: number;
    d180: number;
    d365: number;
    total: number;
  };
  nearUpgradeCounts: {
    bronce: number;
    plata: number;
    oro: number;
    platinum: number;
  };
  totalOpportunities: number;
  potentialRevenue: number;
  brechaComercial: number;
  activeClients: number;
  averageTicket: number;
  intranetConversionRate: number;
  totalRevenue: number;
}

export class DashboardService {
  /**
   * Consolidates processed data for the dashboard.
   */
  public calculateMetrics(customers: any[], opportunities: any[]): DashboardSummary {
    const journeyCounts: Record<string, number> = {
      'Prospecto': 0,
      'Primera Compra': 0,
      'Sin Categoría': 0,
      'Bronce': 0,
      'Plata': 0,
      'Oro': 0,
      'Platinum': 0,
      'Embajador': 0
    };

    const dormantCounts = {
      d90: 0,
      d180: 0,
      d365: 0,
      total: 0
    };

    const nearUpgradeCounts = {
      bronce: 0,
      plata: 0,
      oro: 0,
      platinum: 0
    };

    let brechaComercial = 0;
    let activeClients = 0;
    let totalSalesVolume = 0;
    let totalPurchasesCount = 0;
    let totalIntranetUsers = 0;
    let convertedIntranetUsers = 0;

    customers.forEach(customer => {
      const state = customer.journeyState || 'Sin Categoría';
      if (journeyCounts[state] !== undefined) {
        journeyCounts[state]++;
      }
      
      if (state.includes('Dormido (90d)')) { dormantCounts.d90++; dormantCounts.total++; }
      if (state.includes('Dormido (180d)')) { dormantCounts.d180++; dormantCounts.total++; }
      if (state.includes('Dormido (365d)')) { dormantCounts.d365++; dormantCounts.total++; }

      if (customer.isClient && !state.includes('Dormido')) {
        activeClients++;
      }

      if (customer.sales && customer.sales.length > 0) {
        totalPurchasesCount += customer.sales.length;
        totalSalesVolume += customer.totalSales || 0;
      }

      // Check conversion if came from intranet (indicated by having intranet properties, usually they all have RUT in this context)
      if (customer.accesoAprobado) {
        totalIntranetUsers++;
        if (customer.isClient) convertedIntranetUsers++;
      }
    });

    const potentialRevenue = opportunities.reduce((sum, o) => sum + o.potential, 0);

    // Brecha Comercial: sum of how far customers are from next tier if they are near (upgrade opportunities)
    const upgradeOpps = opportunities.filter(o => o.type === 'upgrade');
    brechaComercial = upgradeOpps.reduce((sum, o) => sum + o.potential, 0);

    upgradeOpps.forEach(opp => {
       if (opp.description.includes('Bronce')) nearUpgradeCounts.bronce++;
       else if (opp.description.includes('Plata')) nearUpgradeCounts.plata++;
       else if (opp.description.includes('Oro')) nearUpgradeCounts.oro++;
       else if (opp.description.includes('Platinum')) nearUpgradeCounts.platinum++;
    });

    const averageTicket = totalPurchasesCount > 0 ? totalSalesVolume / totalPurchasesCount : 0;
    const intranetConversionRate = totalIntranetUsers > 0 ? (convertedIntranetUsers / totalIntranetUsers) * 100 : 0;

    return {
      journeyCounts,
      dormantCounts,
      nearUpgradeCounts,
      totalOpportunities: opportunities.length,
      potentialRevenue,
      brechaComercial,
      activeClients,
      averageTicket,
      intranetConversionRate,
      totalRevenue: totalSalesVolume
    };
  }
}


