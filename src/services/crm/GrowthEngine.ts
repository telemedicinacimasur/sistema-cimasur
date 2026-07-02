import { CycleManagerService } from './CycleManagerService';
import { CustomerJourneyService } from './CustomerJourneyService';
import { SegmentationService } from './SegmentationService';
import { OpportunityEngineService, Opportunity } from './OpportunityEngineService';
import { RecommendationEngineService } from './RecommendationEngineService';
import { DashboardService } from './DashboardService';
import { ReportingService } from './ReportingService';
import { CampaignStrategyService } from './CampaignStrategyService';
import { CommercialIntelligenceService } from './CommercialIntelligenceService';
import { PredictionService } from './PredictionService';
import { GoalService } from './GoalService';

export class GrowthEngine {
  private cycle = new CycleManagerService();
  private journey = new CustomerJourneyService();
  private segmentation = new SegmentationService();
  private opportunities = new OpportunityEngineService();
  private recommendations = new RecommendationEngineService();
  private dashboard = new DashboardService();
  private reporting = new ReportingService();
  private campaignStrategy = new CampaignStrategyService();
  private commercialIntelligence = new CommercialIntelligenceService();
  private prediction = new PredictionService();
  private goals = new GoalService();

  public process(integratedData: any[]) {
    // 1. Customer Journey & Segmentation (assign state to each customer)
    const processedCustomers = integratedData.map(customer => {
      const sales = customer.sales || [];
      const cycleSales = sales.filter((s: any) => this.cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      
      const journeyState = this.journey.determineState(customer, totalSales);
      
      // Calculate benefits
      const benefits = this.segmentation.getBenefitsAndGoals(totalSales, journeyState);
      
      return {
        ...customer,
        totalSales,
        cycleSales,
        journeyState,
        benefits
      };
    });

    // 2. Detect Opportunities based on journey state & behavior
    const detectedOpportunities = this.opportunities.detectOpportunities(processedCustomers);

    // 3. Recommend Actions & Campaigns
    const opportunitiesWithRecommendations = detectedOpportunities.map(opp => {
      return {
        ...opp,
        recommendation: this.recommendations.getRecommendationForOpportunity(opp)
      };
    });
    
    // Generate suggested campaigns
    const suggestedCampaigns = this.campaignStrategy.suggestCampaigns(opportunitiesWithRecommendations);

    // 4. Calculate Dashboard Metrics
    const metrics = this.dashboard.calculateMetrics(processedCustomers, opportunitiesWithRecommendations);

    // 5. Commercial Intelligence & Predictions
    const intelligence = this.commercialIntelligence.analyzePortfolio(processedCustomers);
    const prediction = this.prediction.generatePredictions(processedCustomers, metrics.totalRevenue);
    const goals = this.goals.evaluateGoals(processedCustomers, metrics.totalRevenue, []);

    return {
      status: "SUCCESS",
      cycle: this.cycle.getCurrentCycle(),
      metrics,
      opportunities: opportunitiesWithRecommendations,
      suggestedCampaigns,
      intelligence,
      prediction,
      goals
    };
  }
}


