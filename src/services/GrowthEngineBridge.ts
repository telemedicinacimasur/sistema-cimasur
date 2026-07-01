
import { DataFetcherService } from './DataFetcherService';
import { IntegrationService } from './crm/IntegrationService';
import { GrowthEngine } from './crm/GrowthEngine';
import { CampaignEngineService, Campaign } from './automation/CampaignEngineService';

export class GrowthEngineBridge {
  private fetcher = new DataFetcherService();
  private integration = new IntegrationService();
  private engine = new GrowthEngine();
  public campaigns = new CampaignEngineService();

  public async getDashboardSummary() {
    try {
      const salesData = await this.fetcher.getSalesData();
      const intranetData = await this.fetcher.getIntranetData();
      
      // Integrate
      const integratedData = this.integration.integrate(intranetData, salesData);
      
      // Run Full Growth Engine
      const result = this.engine.process(integratedData);
      
      return result;
    } catch (e) {
      console.error('Error fetching data in GrowthEngineBridge', e);
      return {
        status: "NO_DATA",
        reason: "Datos insuficientes o error de conexión.",
        next_step: "Verificar conexión con la Base de Datos",
        safe_render: true
      };
    }
  }
}

