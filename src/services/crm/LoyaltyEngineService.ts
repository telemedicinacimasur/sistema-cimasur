import { IntegrationService } from './IntegrationService';
import { GrowthEngine } from './GrowthEngine';
import { PointsEngine } from './PointsEngine';
import { CatalogService } from './CatalogService';
import { RedemptionService } from './RedemptionService';
import { CycleManagerService } from './CycleManagerService';
import { CustomerJourneyService } from './CustomerJourneyService';
import { SegmentationService } from './SegmentationService';

export interface LoyaltyAccount {
  id: string;
  contactId: string;
  rut: string;
  name: string;
  email: string;
  joinedAt: string;
  pointsBalance: number;
  lifetimePoints: number;
  status: 'active' | 'suspended';
  lastActivityAt: string;
  activityLogs: { timestamp: string; description: string }[];
}

export class LoyaltyEngineService {
  private readRecords: any;
  private writeRecords: any;
  private pointsEngine: PointsEngine;
  private catalogService: CatalogService;
  private redemptionService: RedemptionService;

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
    this.pointsEngine = new PointsEngine(readRecords, writeRecords);
    this.catalogService = new CatalogService(readRecords, writeRecords);
    this.redemptionService = new RedemptionService(readRecords, writeRecords);
  }

  /**
   * Helper to load integrated and processed customer information directly from the GrowthEngine pipeline.
   */
  private async getProcessedCustomers(): Promise<any[]> {
    const salesData = await this.readRecords('sales');
    const intranetData = await this.readRecords('intranet_clients');
    
    const integration = new IntegrationService();
    const cycle = new CycleManagerService();
    const journey = new CustomerJourneyService();
    const segmentation = new SegmentationService();
    
    const integratedData = integration.integrate(intranetData, salesData);
    
    return integratedData.map(customer => {
      const sales = customer.sales || [];
      const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      const journeyState = journey.determineState(customer, totalSales);
      const benefits = segmentation.getBenefitsAndGoals(totalSales, journeyState);
      
      return {
        ...customer,
        id: customer.id || customer.rut,
        totalSales,
        cycleSales,
        journeyState,
        benefits
      };
    });
  }

  /**
   * Enrolls a contact into the Loyalty Club.
   * Awards retroactive welcome points based on past purchases in the current cycle.
   */
  public async enroll(contactId: string, email?: string): Promise<LoyaltyAccount> {
    const accounts: LoyaltyAccount[] = await this.readRecords('loyalty_accounts');
    
    // Check if already enrolled
    const existing = accounts.find(a => a.contactId === contactId);
    if (existing) {
      return existing;
    }

    // Find the client in the database (or via Growth Engine output)
    const customers = await this.getProcessedCustomers();
    // Search by contactId/id, email, or rut
    const client = customers.find(c => c.id === contactId || c.email === email || c.rut === contactId);
    
    if (!client) {
      throw new Error(`No se encontró registro del cliente para realizar la inscripción al Club.`);
    }

    const now = new Date().toISOString();
    const newAccount: LoyaltyAccount = {
      id: client.id || contactId,
      contactId: client.id || contactId,
      rut: client.rut || '',
      name: client.name || 'Cliente',
      email: client.email || email || '',
      joinedAt: now,
      pointsBalance: 0,
      lifetimePoints: 0,
      status: 'active',
      lastActivityAt: now,
      activityLogs: [
        {
          timestamp: now,
          description: 'Inscripción exitosa al Club Comercial CIMASUR.'
        }
      ]
    };

    accounts.push(newAccount);
    await this.writeRecords('loyalty_accounts', accounts);

    // Retroactive points calculation:
    // Award 100 Welcome Points as a gift
    await this.pointsEngine.accumulate(
      newAccount.contactId,
      100000, // 100,000 CLP equivalent = 100 base welcome points (at 1.0x)
      'Bronce', // Fixed tier for gift calculation so they get exactly 100 points
      'welcome_bonus',
      `enroll_welcome_${newAccount.contactId}`
    );

    // Plus award points for their current totalSales from the GrowthEngine
    const currentSalesVal = parseFloat(client.totalSales) || 0;
    if (currentSalesVal > 0) {
      await this.pointsEngine.accumulate(
        newAccount.contactId,
        currentSalesVal,
        client.journeyState || 'Sin categoría',
        'historical_retroactive',
        `enroll_retroactive_${newAccount.contactId}`
      );
    }

    // Reload account with updated pre-aggregated balances
    const updatedAccounts: LoyaltyAccount[] = await this.readRecords('loyalty_accounts');
    return updatedAccounts.find(a => a.contactId === newAccount.contactId) || newAccount;
  }

  /**
   * Retrieves a member's complete loyalty details including tiers, transactions, benefits, and next level goals.
   */
  public async getMemberDetails(contactId: string): Promise<any> {
    const accounts: LoyaltyAccount[] = await this.readRecords('loyalty_accounts');
    const account = accounts.find(a => a.contactId === contactId);
    
    if (!account) {
      return { enrolled: false, message: 'Cliente no inscrito en el Club Comercial.' };
    }

    // Get current tier from the GrowthEngine
    const customers = await this.getProcessedCustomers();
    const client = customers.find(c => c.id === contactId || c.rut === account.rut);
    
    const segmentation = new SegmentationService();
    const totalSales = client ? (parseFloat(client.totalSales) || 0) : 0;
    
    // Get benefits and tier dynamically!
    const goalsAndBenefits = segmentation.getBenefitsAndGoals(totalSales, client ? client.journeyState : 'Nuevos');
    const tier = goalsAndBenefits.category;

    // Get points figures
    const { balance, expired, lifetime } = await this.pointsEngine.getContactBalance(contactId);

    // Get transaction lists
    const allTxs = await this.readRecords('points_transactions');
    const transactions = allTxs
      .filter((t: any) => t.contactId === contactId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allRedemptions = await this.readRecords('redemptions');
    const redemptions = allRedemptions
      .filter((r: any) => r.contactId === contactId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const progress = {
      currentTier: tier,
      nextTier: goalsAndBenefits.nextLevel,
      targetSales: goalsAndBenefits.targetAmount,
      salesNeeded: goalsAndBenefits.missingAmountToUpgrade,
      progressPercentage: goalsAndBenefits.targetAmount > 0 
        ? Math.min(100, Math.floor((totalSales / goalsAndBenefits.targetAmount) * 100)) 
        : 100
    };

    const activeBenefits = goalsAndBenefits.currentBenefits;

    return {
      enrolled: true,
      account: {
        ...account,
        pointsBalance: balance,
        lifetimePoints: lifetime
      },
      tier,
      totalSales,
      pointsSummary: {
        balance,
        expired,
        lifetime
      },
      progress,
      activeBenefits,
      transactions: transactions.slice(0, 50), // Return last 50 for performance
      redemptions: redemptions.slice(0, 50)
    };
  }

  /**
   * Compiles the executive dashboard KPIs for the Loyalty module.
   */
  public async getDashboardMetrics(): Promise<any> {
    const accounts: LoyaltyAccount[] = await this.readRecords('loyalty_accounts');
    const allTx = await this.readRecords('points_transactions');
    const allRedemptions = await this.readRecords('redemptions');

    const totalMembers = accounts.length;
    
    // Sum active balances
    const totalPointsActive = accounts.reduce((sum, a) => sum + (a.pointsBalance || 0), 0);

    // Sum redemptions
    const totalPointsUsed = Math.abs(
      allTx
        .filter((t: any) => t.type === 'redemption')
        .reduce((sum: number, t: any) => sum + t.amount, 0)
    );

    // Aggregate expired points
    let totalPointsExpired = 0;
    for (const member of accounts) {
      const { expired } = await this.pointsEngine.getContactBalance(member.contactId);
      totalPointsExpired += expired;
    }

    // Redemption transaction rate
    const totalRedemptionCount = allRedemptions.length;
    const totalTxCount = allTx.length;
    const redemptionRate = totalTxCount > 0 ? (totalRedemptionCount / totalTxCount) * 100 : 0;

    // Calculate members by tier distribution (reusing GrowthEngine outputs)
    const customers = await this.getProcessedCustomers();
    const enrolledIds = new Set(accounts.map(a => a.contactId));
    
    const membersByTier: Record<string, number> = {
      'Sin categoría': 0,
      'Bronce': 0,
      'Plata': 0,
      'Oro': 0,
      'Platinum': 0
    };

    // Calculate Club Economic Value (Sum of sales of enrolled members vs total sales)
    let clubEconomicValue = 0;
    let nonClubEconomicValue = 0;

    for (const cust of customers) {
      const isEnrolled = enrolledIds.has(cust.id) || enrolledIds.has(cust.rut);
      const salesVal = parseFloat(cust.totalSales) || 0;
      
      if (isEnrolled) {
        clubEconomicValue += salesVal;
        const tierName = cust.journeyState || 'Sin categoría';
        if (membersByTier[tierName] !== undefined) {
          membersByTier[tierName]++;
        } else {
          membersByTier['Sin categoría']++;
        }
      } else {
        nonClubEconomicValue += salesVal;
      }
    }

    const totalSalesPortfolio = clubEconomicValue + nonClubEconomicValue;
    const penetrationRate = totalSalesPortfolio > 0 ? (clubEconomicValue / totalSalesPortfolio) * 100 : 0;

    return {
      kpis: {
        totalMembers,
        totalPointsActive,
        totalPointsUsed,
        totalPointsExpired,
        redemptionRate: parseFloat(redemptionRate.toFixed(1)),
        clubEconomicValue,
        nonClubEconomicValue,
        penetrationRate: parseFloat(penetrationRate.toFixed(1))
      },
      membersByTier,
      recentRedemptions: allRedemptions.slice(-5).reverse() // Last 5 redemptions
    };
  }
}
