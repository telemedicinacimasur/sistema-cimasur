export interface CommercialHealth {
  score: number; // 0-100
  activeClients: number;
  dormantClients: number;
  prospects: number;
  intranetConversionRate: number;
  monthlyGrowthRate: number;
  lossRiskRate: number;
  recoveryRate: number;
}

export interface CommercialRisk {
  id: string;
  type: 'churn' | 'revenue_drop' | 'no_campaign' | 'underutilized_benefits';
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  impact: number;
  affectedClients: number;
}

export interface StrategicOpportunity {
  id: string;
  type: 'upgrade' | 'new_market' | 'high_potential' | 'campaign_recommended';
  potentialRevenue: number;
  description: string;
  targetSegment: string;
}

export interface CommercialIntelligenceReport {
  health: CommercialHealth;
  risks: CommercialRisk[];
  opportunities: StrategicOpportunity[];
  timestamp: string;
}

export class CommercialIntelligenceService {
  public analyzePortfolio(processedCustomers: any[]): CommercialIntelligenceReport {
    // Basic counting
    let activeClients = 0;
    let dormantClients = 0;
    let prospects = 0;
    let totalIntranet = 0;
    let convertedIntranet = 0;

    for (const c of processedCustomers) {
      if (c.journeyState === 'Active') activeClients++;
      else if (c.journeyState === 'Dormant') dormantClients++;
      else if (c.journeyState === 'Prospect') prospects++;

      if (c.intranet === 'Si' || c.intranet === 'No') {
        totalIntranet++;
        if (c.intranet === 'Si' && c.categoria && c.categoria !== 'Sin compra') {
          convertedIntranet++;
        }
      }
    }

    const intranetConversionRate = totalIntranet > 0 ? (convertedIntranet / totalIntranet) * 100 : 0;
    
    // Simulate some rates based on current customer base
    const monthlyGrowthRate = activeClients > 0 ? 5.2 : 0; // Simulated 5.2%
    const lossRiskRate = activeClients > 0 ? (dormantClients / activeClients) * 100 : 0;
    const recoveryRate = dormantClients > 0 ? 12.5 : 0; // Simulated 12.5%

    // Health Score Calculation (Simplified weighted average)
    let score = 100;
    score -= (lossRiskRate * 0.5); // penalty for high churn risk
    score += (monthlyGrowthRate * 2); // bonus for growth
    score = Math.max(0, Math.min(100, Math.round(score)));

    const health: CommercialHealth = {
      score,
      activeClients,
      dormantClients,
      prospects,
      intranetConversionRate,
      monthlyGrowthRate,
      lossRiskRate,
      recoveryRate
    };

    // Detect Risks
    const risks: CommercialRisk[] = [];
    if (dormantClients > 0) {
      risks.push({
        id: `risk_${Date.now()}_1`,
        type: 'churn',
        severity: lossRiskRate > 20 ? 'High' : 'Medium',
        description: `Existen ${dormantClients} clientes inactivos con riesgo de abandono.`,
        impact: dormantClients * 500000, // Simulated impact
        affectedClients: dormantClients
      });
    }

    if (activeClients > 0 && activeClients < 10) {
       risks.push({
        id: `risk_${Date.now()}_2`,
        type: 'revenue_drop',
        severity: 'High',
        description: `Bajo volumen de clientes activos detectado.`,
        impact: 2000000,
        affectedClients: activeClients
      });
    }

    // Detect Strategic Opportunities
    const opportunities: StrategicOpportunity[] = [];
    if (prospects > 0) {
      opportunities.push({
        id: `strat_opp_${Date.now()}_1`,
        type: 'new_market',
        potentialRevenue: prospects * 1500000,
        description: `Convertir ${prospects} prospectos registrados en primera compra.`,
        targetSegment: 'Prospectos Intranet'
      });
    }

    return {
      health,
      risks,
      opportunities,
      timestamp: new Date().toISOString()
    };
  }
}
