import { IntegrationService } from './IntegrationService';
import { CycleManagerService } from './CycleManagerService';
import { SegmentationService } from './SegmentationService';
import { ClientService } from './ClientService';
import { localDB } from '../../lib/auth';

export interface TimelineEvent {
  id: string;
  date: string; // Formato YYYY-MM-DD o ISO
  type: 'sale' | 'contact' | 'campaign' | 'points' | 'redemption' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  icon: string; // Nombre del icono de Lucide a usar en frontend
  meta?: Record<string, any>;
}

/**
 * Servicio del Customer Journey de CIMASUR (Fase 6)
 * Modela el estado del cliente en el embudo comercial y consolida
 * una línea de tiempo histórica y unificada de todas las interacciones.
 */
export class CustomerJourneyService {
  private readRecords: any;
  private writeRecords: any;
  private clientService: ClientService;

  constructor(readRecords?: any, writeRecords?: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
    this.clientService = new ClientService(
      (col) => localDB.getCollection(col),
      (col, item) => localDB.saveToCollection(col, item),
      (col, id, updates) => localDB.updateInCollection(col, id, updates)
    );
  }

  /**
   * Identifica la etapa actual del cliente en el viaje comercial (Fase 5 Core)
   */
  public determineState(customer: any, totalSales: number): string {
    if (!customer.isClient) return 'Prospecto';
    if (customer.isClient && totalSales === 0) return 'Prospecto';
    
    // Si ha estado inactivo más de lo razonable
    if (customer.lastPurchaseDate) {
      const now = new Date();
      const lastDate = new Date(customer.lastPurchaseDate);
      const diffDays = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (diffDays > 365) return 'Dormido (365d)';
      if (diffDays > 180) return 'Dormido (180d)';
      if (diffDays > 90) return 'Dormido (90d)';
    }

    const segmentation = new SegmentationService();
    return segmentation.categorize(totalSales);
  }

  /**
   * Consolida la cronología completa de interacciones (Customer Journey Timeline)
   * Unifica transacciones, contacto directo, campañas, puntos y recomendaciones.
   */
  public async getCustomerTimeline(contactId: string): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];
    if (!this.readRecords) return timeline;

    try {
      // 1. Cargar datos del cliente e historial de ventas
      const salesData = await this.readRecords('sales') || [];
      const intranetData = await this.clientService.getAllClients();
      const integration = new IntegrationService();
      const integratedData = integration.integrate(intranetData, salesData);
      
      const customer = integratedData.find((c: any) => c.id === contactId || c.rut === contactId);
      if (!customer) return timeline;

      // --- VENTAS ---
      const customerSales = customer.sales || [];
      customerSales.forEach((s: any, idx: number) => {
        const dateStr = s.fecha || s.date || s.createdAt || new Date().toISOString();
        const docNum = s.numero || s.id || `DOC-${idx}`;
        const cleanDate = dateStr.split('T')[0];
        timeline.push({
          id: `sale_${docNum}_${idx}`,
          date: cleanDate,
          type: 'sale',
          title: `Venta Confirmada: #${docNum}`,
          description: `Compra de ${s.producto || s.product || 'Fórmulas'} por un total de $${(parseFloat(s.total) || 0).toLocaleString('es-CL')} CLP.`,
          icon: 'ShoppingBag',
          meta: { total: s.total, producto: s.producto }
        });
      });

      // --- BITÁCORA DE CONTACTOS / LLAMADAS ---
      const contacts = await this.readRecords('contacts') || [];
      const clientContacts = contacts.filter((c: any) => c.clientId === contactId || c.clientRut === customer.rut);
      clientContacts.forEach((c: any, idx: number) => {
        const dateStr = c.date || c.createdAt || new Date().toISOString();
        const cleanDate = dateStr.split('T')[0];
        timeline.push({
          id: `contact_${c.id || idx}`,
          date: cleanDate,
          type: 'contact',
          title: `Contacto Directo: ${c.type || 'Llamada'}`,
          description: `Gestión comercial: ${c.notes || c.details || 'Seguimiento de fidelización.'}. Agente: ${c.agent || 'Sistema'}.`,
          icon: 'PhoneCall',
          meta: { notes: c.notes, status: c.status }
        });
      });

      // --- CAMPAÑAS ---
      const campaigns = await this.readRecords('campaigns') || [];
      campaigns.forEach((camp: any) => {
        // Verificar si este cliente participó en la campaña
        const wasSent = camp.recipients?.some((r: any) => r.id === contactId || r.rut === customer.rut || r.email === customer.email);
        if (wasSent) {
          const dateStr = camp.executedAt || camp.createdAt || new Date().toISOString();
          const cleanDate = dateStr.split('T')[0];
          timeline.push({
            id: `campaign_${camp.id}`,
            date: cleanDate,
            type: 'campaign',
            title: `Campaña Enviada: ${camp.name}`,
            description: `Participación en campaña '${camp.name}' mediante canal '${camp.channel || 'Email'}'.`,
            icon: 'Megaphone',
            meta: { campaignName: camp.name, channel: camp.channel }
          });
        }
      });

      // --- PUNTOS Y CANJES ---
      const loyaltyAccounts = await this.readRecords('loyalty_accounts') || [];
      const loyaltyAccount = loyaltyAccounts.find((a: any) => a.contactId === contactId || a.contactId === customer.rut);
      if (loyaltyAccount) {
        // Log de inscripción
        if (loyaltyAccount.joinedAt) {
          timeline.push({
            id: `loyalty_enroll_${contactId}`,
            date: loyaltyAccount.joinedAt.split('T')[0],
            type: 'points',
            title: 'Inscripción al Club de Fidelización',
            description: `Bienvenido al Club CIMASUR. Cuenta activada con éxito.`,
            icon: 'UserCheck',
            meta: { joinedAt: loyaltyAccount.joinedAt }
          });
        }

        // Historial de logs de actividad
        const logs = loyaltyAccount.activityLogs || [];
        logs.forEach((log: any, idx: number) => {
          const dateStr = log.timestamp || new Date().toISOString();
          const cleanDate = dateStr.split('T')[0];
          const isRedemption = log.description.toLowerCase().includes('canje') || log.description.toLowerCase().includes('redeem');
          timeline.push({
            id: `loyalty_log_${idx}_${contactId}`,
            date: cleanDate,
            type: isRedemption ? 'redemption' : 'points',
            title: isRedemption ? 'Premio Canjeado' : 'Transacción de Puntos',
            description: log.description,
            icon: isRedemption ? 'Gift' : 'Award',
            meta: { details: log.description }
          });
        });
      }

      // Ordenar línea de tiempo descendente por fecha (más reciente primero)
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error(`Error compilando el Customer Journey para cliente ${contactId}:`, e);
    }

    return timeline;
  }
}
