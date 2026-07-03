import { OpportunityEngine } from './OpportunityEngine';
import { IntegrationService } from './IntegrationService';
import { CycleManagerService } from './CycleManagerService';
import { CustomerJourneyService } from './CustomerJourneyService';
import { SegmentationService } from './SegmentationService';
import { EvaluationInput } from './contracts';
import { OpportunityResult } from './types';
import { ClientService } from './ClientService';
import { localDB } from '../../lib/auth';

export class OpportunityService {
  private readRecords: any;
  private writeRecords: any;
  private opportunityEngine: OpportunityEngine;
  private clientService: ClientService;

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
    this.opportunityEngine = new OpportunityEngine();
    this.clientService = new ClientService(
      (col) => localDB.getCollection(col),
      (col, item) => localDB.saveToCollection(col, item),
      (col, id, updates) => localDB.updateInCollection(col, id, updates)
    );
  }

  /**
   * Obtiene todos los datos integrados de clientes desde la tubería comercial.
   */
  private async getProcessedCustomers(): Promise<any[]> {
    const salesData = await this.readRecords('sales');
    const intranetData = await this.clientService.getAllClients();
    const loyaltyAccounts = await this.readRecords('loyalty_accounts') || [];
    
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
      const category = segmentation.categorize(totalSales);
      
      const loyaltyAccount = loyaltyAccounts.find((a: any) => a.contactId === customer.id || a.contactId === customer.rut);
      
      return {
        ...customer,
        id: customer.id || customer.rut,
        totalSales,
        journeyState,
        category,
        loyaltyAccount
      };
    });
  }

  /**
   * Evalúa las oportunidades comerciales para un cliente específico.
   */
  public async evaluateClient(contactId: string): Promise<OpportunityResult> {
    const customers = await this.getProcessedCustomers();
    const customer = customers.find(c => c.id === contactId || c.rut === contactId);

    if (!customer) {
      throw new Error(`Socio veterinario con ID ${contactId} no encontrado.`);
    }

    // Calcular días inactivos
    let diasInactivo = 0;
    if (customer.lastPurchaseDate) {
      const now = new Date();
      const lastDate = new Date(customer.lastPurchaseDate);
      diasInactivo = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)));
    } else {
      diasInactivo = 999; // Nunca ha comprado
    }

    const input: EvaluationInput = {
      contactId,
      fechaEvaluacion: new Date().toISOString().split('T')[0],
      contextoComercial: {
        categoriaActual: customer.category || 'Sin Categoría',
        totalVentasCiclo: customer.totalSales || 0,
        comprasAnteriores: {
          v2025: customer.ventas?.v2025 || 0,
          v2026: customer.ventas?.v2026 || 0
        },
        ultimoContactoDate: customer.lastContactDate || '',
        ultimaCompraDate: customer.lastPurchaseDate || '',
        puntosDisponibles: customer.loyaltyAccount?.pointsBalance || 0,
        inscritoLoyalty: !!customer.loyaltyAccount,
        diasInactivo,
        productosFrecuentes: customer.productosFrecuentes || []
      }
    };

    return this.opportunityEngine.evaluate(input);
  }

  /**
   * Evalúa masivamente a todos los clientes e identifica cuáles tienen oportunidades activas.
   * Retorna una lista completa de oportunidades calculadas para el dashboard.
   */
  public async evaluateAll(): Promise<any[]> {
    const customers = await this.getProcessedCustomers();
    const results: any[] = [];

    for (const customer of customers) {
      try {
        const evaluation = await this.evaluateClient(customer.id);
        
        // Guardamos solo si el score de oportunidad es mayor a cero (hay algo relevante)
        if (evaluation.score > 0) {
          results.push({
            id: `opp_${customer.id}`,
            contactId: customer.id,
            customerName: customer.name || customer.nombre || 'Veterinario',
            email: customer.email || '',
            rut: customer.rut || '',
            clinic: customer.clinica || 'Socio Clínico',
            ...evaluation
          });
        }
      } catch (err) {
        console.error(`Error evaluando oportunidades para cliente ${customer.id}:`, err);
      }
    }

    // Persistir las oportunidades activas en records para auditoría o consumo de otros sistemas
    await this.writeRecords('active_opportunities', results);
    return results;
  }
}
