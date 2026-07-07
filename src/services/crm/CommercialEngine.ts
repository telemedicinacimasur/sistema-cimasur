import { Client, ClientCommercialProfile, CommercialEvent, AIRecommendation } from '../../types';

export class CommercialEngine {
  
  static calculateClientProfile(client: Client, events: CommercialEvent[] = []): ClientCommercialProfile {
    const ventaAnual = client.compraAnual || 0;
    const ventaMensual = ventaAnual / 12;
    const frascosAnuales = (client.frascosMensuales || 0) * 12;
    const frascosMensuales = client.frascosMensuales || 0;
    
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Categorization logic
    const categoriaFacturacion = this.getFacturacionCategoria(ventaAnual);
    const categoriaFrascos = this.getFrascosCategoria(frascosMensuales);
    const siguienteCatFact = this.getSiguienteCategoriaFacturacion(categoriaFacturacion);
    const siguienteCatFrascos = this.getSiguienteCategoriaFrascos(categoriaFrascos);
    
    // Progress calculation
    const metaMonto = client.metaMonto || 100000;
    const metaFrascos = client.metaFrascos || 20;
    
    return {
      ...client,
      ejecutivo: client.responsable || 'Sin Asignar',
      primeraCompra: client.fechaIngreso || 'N/A',
      ultimaCompra: sortedEvents.length > 0 ? sortedEvents[0].date : 'N/A',
      diasDesdeUltimaCompra: client.diasSinCompra || 0,
      totalCompras: sortedEvents.filter(e => e.type === 'compra').length,
      ticketPromedio: ventaAnual / (sortedEvents.filter(e => e.type === 'compra').length || 1),
      frecuenciaCompra: 30,
      crecimientoPeriodo: 5,
      tendencia: 'creciendo',
      
      ventaMensual,
      ventaAnual,
      promedioAnual: ventaAnual,
      proyeccionAnual: ventaAnual * 1.05,
      rentabilidad: 0.3,
      
      frascosMensuales,
      frascosAnuales,
      promedioFrascos: frascosMensuales,
      productosMasComprados: ['Producto A', 'Producto B'],
      productosInteres: [],
      
      categoriaFacturacion,
      categoriaFrascos,
      siguienteCategoriaFacturacion: siguienteCatFact,
      siguienteCategoriaFrascos: siguienteCatFrascos,
      dineroFaltante: Math.max(0, metaMonto - ventaAnual),
      frascosFaltantes: Math.max(0, metaFrascos - frascosMensuales),
      progresoFacturacion: Math.min(100, (ventaAnual / metaMonto) * 100),
      progresoFrascos: Math.min(100, (frascosMensuales / metaFrascos) * 100),
      fechaEstimadaAscenso: '2026-12-01',
      beneficioSugeridoAscenso: 'Envío Gratis',
      
      riesgoAbandono: (client.diasSinCompra || 0) > 60 ? 80 : 20,
      scoreComercial: 70,
      scoreInteresIntranet: client.interestScore || 0,
      potencialCrecimiento: 60,
      probabilidadConversion: client.isIntranet && !client.isCRM ? 75 : 50,
      
      beneficiosAsignados: client.beneficiosDisponibles || [],
      beneficiosUtilizados: sortedEvents.filter(e => e.type === 'beneficio').map(e => e.description),
      beneficiosVencidos: [],
      
      timeline: sortedEvents,
      aiRecommendation: this.generateAIRecommendationRaw(client, frascosMensuales, ventaAnual)
    };
  }

  static getFacturacionCategoria(venta: number): string {
    if (venta > 500000) return 'Platinum';
    if (venta > 200000) return 'Oro';
    if (venta > 100000) return 'Plata';
    return 'Bronce';
  }

  static getFrascosCategoria(frascos: number): string {
    if (frascos > 40) return 'Platinum';
    if (frascos > 20) return 'Oro';
    if (frascos > 10) return 'Plata';
    return 'Bronce';
  }

  static getSiguienteCategoriaFacturacion(cat: string): string {
    const cats = ['Bronce', 'Plata', 'Oro', 'Platinum'];
    const idx = cats.indexOf(cat);
    return idx < cats.length - 1 ? cats[idx + 1] : cat;
  }
  
  static getSiguienteCategoriaFrascos(cat: string): string {
    const cats = ['Bronce', 'Plata', 'Oro', 'Platinum'];
    const idx = cats.indexOf(cat);
    return idx < cats.length - 1 ? cats[idx + 1] : cat;
  }

  static generateAIRecommendationRaw(client: Client, frascos: number, venta: number): AIRecommendation {
    if ((client.diasSinCompra || 0) > 60) {
      return {
        action: 'Contactar de urgencia',
        justification: `El cliente lleva ${client.diasSinCompra} días sin comprar y está en alto riesgo de abandono.`,
        priority: 'alta',
        probabilidadExito: 60,
        beneficioSugerido: 'Descuento especial',
        fechaIdealContacto: '2026-07-08'
      };
    }
    
    if (frascos < (client.metaFrascos || 20) && frascos > (client.metaFrascos || 20) - 3) {
      return {
        action: 'Ofrecer beneficio de envío gratis',
        justification: `El cliente está muy cerca de alcanzar la categoría superior por frascos.`,
        priority: 'alta',
        probabilidadExito: 85,
        beneficioSugerido: 'Envío Gratis',
        fechaIdealContacto: '2026-07-10'
      };
    }
    
    return {
      action: 'Seguimiento comercial estándar',
      justification: 'Cliente sin alertas críticas.',
      priority: 'media',
      probabilidadExito: 40,
      fechaIdealContacto: '2026-07-15'
    };
  }

  // Dashboard helpers
  static getClientsNearUpgrade(profiles: ClientCommercialProfile[]) {
    return profiles.filter(p => p.progresoFacturacion > 80 || p.progresoFrascos > 80);
  }

  static getClientsAtRisk(profiles: ClientCommercialProfile[]) {
    return profiles.filter(p => p.riesgoAbandono > 70);
  }

  static getClientsIntranetHighPotential(profiles: ClientCommercialProfile[]) {
    return profiles.filter(p => p.isIntranet && p.scoreInteresIntranet > 70);
  }
}
