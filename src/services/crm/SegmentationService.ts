export class SegmentationService {
  private config: any;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig() {
    return {
      evaluationCycle: {
        type: "annual",
        startMonth: 6,
        startDay: 1,
        firstCycleBaseYear: 2024,
        description: "Ciclo anual que inicia cada 1 de Julio y termina el 30 de Junio del año siguiente. El primer ciclo del programa se inició utilizando las ventas consolidadas del año 2024."
      },
      tiers: [
        {
          id: "sin_categoria",
          name: "Sin categoría",
          minMonthlyAverage: 0,
          maxMonthlyAverage: 56999,
          benefits: [
            "Acceso general a catálogos online Cimasur",
            "Boletín técnico mensual por correo electrónico"
          ],
          discountPercent: 0,
          condition: "Compra promedio inferior a $57.000 CLP al mes",
          validityMonths: 12,
          nextLevel: "Bronce"
        },
        {
          id: "bronce",
          name: "Bronce",
          minMonthlyAverage: 57000,
          maxMonthlyAverage: 229999,
          benefits: [
            "5% descuento fijo en la línea homeopática magistral",
            "Invitación a webinars y capacitaciones gratis",
            "Soporte clínico estándar vía WhatsApp"
          ],
          discountPercent: 5,
          condition: "Compra promedio de $57.000 a $229.999 CLP al mes",
          validityMonths: 12,
          nextLevel: "Plata"
        },
        {
          id: "plata",
          name: "Plata",
          minMonthlyAverage: 230000,
          maxMonthlyAverage: 549999,
          benefits: [
            "10% descuento fijo en la línea homeopática",
            "Despacho gratis por compras superiores a $100k",
            "Soporte clínico prioritario vía WhatsApp",
            "3 muestras gratuitas de fórmulas nuevas al año"
          ],
          discountPercent: 10,
          condition: "Compra promedio de $230.000 a $549.999 CLP al mes",
          validityMonths: 12,
          nextLevel: "Oro"
        },
        {
          id: "oro",
          name: "Oro",
          minMonthlyAverage: 550000,
          maxMonthlyAverage: 999999,
          benefits: [
            "15% descuento fijo en todo el vademécum",
            "Prioridad absoluta en despacho (entrega en < 24 hrs en RM)",
            "Línea de crédito comercial básica autorizada",
            "Atención personalizada con ejecutivo técnico"
          ],
          discountPercent: 15,
          condition: "Compra promedio de $550.000 a $999.999 CLP al mes",
          validityMonths: 12,
          nextLevel: "Platinum"
        },
        {
          id: "platinum",
          name: "Platinum",
          minMonthlyAverage: 1000000,
          maxMonthlyAverage: 999999999,
          benefits: [
            "20% descuento fijo de distribuidor preferente",
            "Despacho gratuito express a nivel nacional sin mínimo",
            "Línea de crédito comercial premium extendida",
            "Capacitación clínica magistral exclusiva para su centro médico",
            "Devoluciones y cambios garantizados sin costo"
          ],
          discountPercent: 20,
          condition: "Compra promedio igual o superior a $1.000.000 CLP al mes",
          validityMonths: 12,
          nextLevel: "Estatus Máximo"
        }
      ]
    };
  }

  public getConfig() {
    return this.config;
  }

  /**
   * Categorizes customers based on average monthly sales in frascos (2025 historical data).
   * 1 Frasco = 10,000 CLP.
   */
  public categorize(annualSales2025: number): string {
    if (annualSales2025 <= 0) return 'Sin Compra';
    
    const monthlyAverageCLP = annualSales2025 / 12;
    const monthlyAverageFrascos = monthlyAverageCLP / 7000;
    
    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    // Sort tiers by minMonthlyAverage to ensure correct order
    const sortedTiers = [...tiers].sort((a, b) => a.minMonthlyAverage - b.minMonthlyAverage);
    
    for (const t of sortedTiers) {
      if (monthlyAverageFrascos >= t.minMonthlyAverage && monthlyAverageFrascos <= t.maxMonthlyAverage) {
        return t.name;
      }
    }
    return 'Sin categoría';
  }

  /**
   * Helper to compute 2025 annual sales from a sales array and then categorize.
   */
  public categorizeFromSales(sales: any[]): string {
    const total2025 = sales
      .filter(s => new Date(s.fecha).getFullYear() === 2025)
      .reduce((acc, s) => acc + (s.total || 0), 0);
    return this.categorize(total2025);
  }

  /**
   * Helper specifically for sorting or directly classifying based on monthly average frascos.
   */
  public categorizeByMonthlyAverage(monthlyAverageFrascos: number): string {
    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    // Sort tiers by minMonthlyAverage to ensure correct order
    const sortedTiers = [...tiers].sort((a, b) => a.minMonthlyAverage - b.minMonthlyAverage);
    
    for (const t of sortedTiers) {
      if (monthlyAverageFrascos >= t.minMonthlyAverage && monthlyAverageFrascos <= t.maxMonthlyAverage) {
        return t.name;
      }
    }
    return 'Sin categoría';
  }

  public getBenefitsAndGoals(annualSales: number, currentState: string, averageMonthlyFrascos: number = 0) {
    
    // Si pasamos un promedio mensual explícito en frascos, usamos ese.
    // De lo contrario, calculamos usando annualSales / 12 / 7000.
    const monthlyAverageFrascos = averageMonthlyFrascos > 0 ? averageMonthlyFrascos : (annualSales / 12 / 7000);
    const category = this.categorizeByMonthlyAverage(monthlyAverageFrascos);
    
    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    const currentTierData = tiers.find((t: any) => t.name.toLowerCase() === category.toLowerCase()) || tiers[0];
    
    const nextTierName = currentTierData.nextLevel;
    const nextTierData = tiers.find((t: any) => t.name.toLowerCase() === nextTierName.toLowerCase());

    const currentBenefits = currentTierData.benefits || [];
    const nextBenefit = nextTierData ? (nextTierData.benefits ? nextTierData.benefits[0] : 'N/A') : 'N/A';
    
    // Target is defined as monthly average in frascos
    const targetMonthlyAverageFrascos = nextTierData ? nextTierData.minMonthlyAverage : currentTierData.minMonthlyAverage;
    const targetAnnualSales = targetMonthlyAverageFrascos * 7000 * 12;
    const missingAmountToUpgrade = Math.max(0, targetAnnualSales - annualSales);

    return {
      category: currentTierData.name,
      currentBenefits,
      nextLevel: nextTierName,
      targetAmount: targetAnnualSales, // Target annual sales in CLP
      targetMonthlyAverageFrascos,            // Target monthly average in Frascos
      missingAmountToUpgrade,          // CLP missing to upgrade (annualized)
      nextBenefit,
      discountPercent: currentTierData.discountPercent,
      condition: currentTierData.condition,
      validityMonths: currentTierData.validityMonths
    };
  }
}
