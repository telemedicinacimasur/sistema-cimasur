export interface CommercialGoal {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'vendor' | 'category' | 'campaign' | 'segment';
  targetValue: number;
  currentValue: number;
  metric: 'revenue' | 'clients' | 'conversion' | 'roi';
  period: string; // e.g. "Julio 2026", "Q3 2026"
  targetName?: string; // e.g. "Vendedor Juan", "Categoría Oro"
}

export class GoalService {
  public evaluateGoals(processedCustomers: any[], currentSales: number, campaigns: any[]): CommercialGoal[] {
    // Generate simulated/structured goals based on real current data
    
    // Total Revenue Goal (Monthly)
    const monthlyRevenueTarget = currentSales > 0 ? Math.ceil(currentSales * 1.1) : 10000000;
    
    // Active Clients Goal (Quarterly)
    const activeCount = processedCustomers.filter(c => c.journeyState === 'Active').length;
    const quarterlyClientTarget = activeCount > 0 ? activeCount + 20 : 50;

    // Conversion Goal (Intranet)
    let totalIntranet = 0;
    let convertedIntranet = 0;
    for (const c of processedCustomers) {
      if (c.intranet === 'Si' || c.intranet === 'No') {
        totalIntranet++;
        if (c.intranet === 'Si' && c.categoria && c.categoria !== 'Sin compra') {
          convertedIntranet++;
        }
      }
    }
    const currentConversion = totalIntranet > 0 ? (convertedIntranet / totalIntranet) * 100 : 0;

    return [
      {
        id: 'goal_rev_monthly',
        type: 'monthly',
        targetValue: monthlyRevenueTarget,
        currentValue: currentSales,
        metric: 'revenue',
        period: 'Mes Actual'
      },
      {
        id: 'goal_cli_quarterly',
        type: 'quarterly',
        targetValue: quarterlyClientTarget,
        currentValue: activeCount,
        metric: 'clients',
        period: 'Trimestre Actual'
      },
      {
        id: 'goal_conv_segment',
        type: 'segment',
        targetValue: 80, // 80% target conversion
        currentValue: currentConversion,
        metric: 'conversion',
        period: 'Anual',
        targetName: 'Nuevos Intranet'
      }
    ];
  }
}
