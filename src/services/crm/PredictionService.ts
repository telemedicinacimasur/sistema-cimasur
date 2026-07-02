export interface CommercialPrediction {
  expectedRevenue: number;
  expectedActiveClients: number;
  projectedGap: number;
  churnRiskCount: number;
  campaignNeeds: number; // estimated number of campaigns needed to reach target
  confidence: number; // 0-100
  period: string; // e.g. "Q3 2026"
}

export class PredictionService {
  public generatePredictions(processedCustomers: any[], currentSales: number): CommercialPrediction {
    // These would normally use ML or historical regression.
    // For this engine, we generate structured simulated projections based on current data.
    
    const activeCount = processedCustomers.filter(c => c.journeyState === 'Active').length;
    const dormantCount = processedCustomers.filter(c => c.journeyState === 'Dormant').length;
    
    // Project next quarter based on a theoretical 15% growth if campaigns execute, or flat if not.
    const expectedRevenue = currentSales * 1.15; 
    const projectedGap = expectedRevenue - currentSales;
    
    // Assume 10% of dormant will churn entirely
    const churnRiskCount = Math.floor(dormantCount * 0.1) || (dormantCount > 0 ? 1 : 0);
    
    // We expect active clients to grow by converting 5% of prospects
    const prospectCount = processedCustomers.filter(c => c.journeyState === 'Prospect').length;
    const expectedActiveClients = activeCount + Math.floor(prospectCount * 0.05);

    // Rough rule: 1 campaign per $10M of projected gap
    const campaignNeeds = Math.max(1, Math.ceil(projectedGap / 10000000));

    return {
      expectedRevenue,
      expectedActiveClients,
      projectedGap,
      churnRiskCount,
      campaignNeeds,
      confidence: 85, // 85% confidence score
      period: 'Próximo Trimestre'
    };
  }
}
