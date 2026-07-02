import fs from 'fs';
import path from 'path';

export class SegmentationService {
  private config: any;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data', 'club_config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(raw);
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch (e) {
      console.error('Error loading club config in SegmentationService:', e);
      this.config = this.getDefaultConfig();
    }
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
    this.loadConfig(); // Ensure fresh load
    return this.config;
  }

  /**
   * Categorizes customers based on average monthly sales in pesos within a cycle.
   */
  public categorize(annualSales: number): string {
    const monthlyAverage = annualSales / 12;
    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    for (const t of tiers) {
      if (monthlyAverage >= t.minMonthlyAverage && monthlyAverage <= t.maxMonthlyAverage) {
        return t.name;
      }
    }
    return 'Sin categoría';
  }

  /**
   * Helper specifically for sorting or directly classifying based on monthly average.
   */
  public categorizeByMonthlyAverage(monthlyAverage: number): string {
    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    for (const t of tiers) {
      if (monthlyAverage >= t.minMonthlyAverage && monthlyAverage <= t.maxMonthlyAverage) {
        return t.name;
      }
    }
    return 'Sin categoría';
  }

  public getBenefitsAndGoals(annualSales: number, currentState: string) {
    this.loadConfig(); // Refresh active configuration from disk
    const category = this.categorize(annualSales);
    const monthlyAverage = annualSales / 12;

    const tiers = this.config.tiers || this.getDefaultConfig().tiers;
    const currentTierData = tiers.find((t: any) => t.name.toLowerCase() === category.toLowerCase()) || tiers[0];
    
    const nextTierName = currentTierData.nextLevel;
    const nextTierData = tiers.find((t: any) => t.name.toLowerCase() === nextTierName.toLowerCase());

    const currentBenefits = currentTierData.benefits || [];
    const nextBenefit = nextTierData ? (nextTierData.benefits ? nextTierData.benefits[0] : 'N/A') : 'N/A';
    
    // Target is defined as monthly average in the tier, so annual target is monthly average * 12
    const targetMonthlyAverage = nextTierData ? nextTierData.minMonthlyAverage : currentTierData.minMonthlyAverage;
    const targetAnnualSales = targetMonthlyAverage * 12;
    const missingAmountToUpgrade = Math.max(0, targetAnnualSales - annualSales);

    return {
      category: currentTierData.name,
      currentBenefits,
      nextLevel: nextTierName,
      targetAmount: targetAnnualSales, // Target annual sales
      targetMonthlyAverage,            // Target monthly average
      missingAmountToUpgrade,          // CLP missing to upgrade (annualized)
      nextBenefit,
      discountPercent: currentTierData.discountPercent,
      condition: currentTierData.condition,
      validityMonths: currentTierData.validityMonths
    };
  }
}
