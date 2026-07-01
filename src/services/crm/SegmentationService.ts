
export class SegmentationService {
  /**
   * Categorizes customers based on sales volume within a commercial cycle.
   */
  public categorize(sales: number): string {
    if (sales === 0) return 'Prospecto';
    if (sales > 0 && sales < 100000) return 'Primera Compra';
    if (sales >= 100000 && sales < 500000) return 'Sin Categoría';
    if (sales >= 500000 && sales < 1000000) return 'Bronce';
    if (sales >= 1000000 && sales < 2000000) return 'Plata';
    if (sales >= 2000000 && sales < 5000000) return 'Oro';
    if (sales >= 5000000 && sales < 10000000) return 'Platinum';
    return 'Embajador';
  }

  public getBenefitsAndGoals(sales: number, currentState: string) {
    const category = this.categorize(sales);
    
    const benefitsData: Record<string, any> = {
      'Prospecto': { nextLevel: 'Primera Compra', target: 1, currentBenefits: [], nextBenefit: 'Descuento de bienvenida' },
      'Primera Compra': { nextLevel: 'Sin Categoría', target: 100000, currentBenefits: ['Descuento de bienvenida'], nextBenefit: 'Acceso a promociones básicas' },
      'Sin Categoría': { nextLevel: 'Bronce', target: 500000, currentBenefits: ['Promociones básicas'], nextBenefit: 'Envío gratis en compras > 50k' },
      'Bronce': { nextLevel: 'Plata', target: 1000000, currentBenefits: ['Envío gratis > 50k', 'Descuento 5%'], nextBenefit: 'Descuento 10%' },
      'Plata': { nextLevel: 'Oro', target: 2000000, currentBenefits: ['Envío gratis > 50k', 'Descuento 10%', 'Soporte prioritario'], nextBenefit: 'Línea de crédito comercial' },
      'Oro': { nextLevel: 'Platinum', target: 5000000, currentBenefits: ['Envío gratis', 'Descuento 15%', 'Soporte VIP', 'Línea de crédito'], nextBenefit: 'Asignación de ejecutivo exclusivo' },
      'Platinum': { nextLevel: 'Embajador', target: 10000000, currentBenefits: ['Ejecutivo exclusivo', 'Envío gratis express', 'Descuento 20%', 'Crédito premium'], nextBenefit: 'Participación en utilidades/Programa Partners' },
      'Embajador': { nextLevel: 'Max', target: 10000000, currentBenefits: ['Programa Partners', 'Condiciones exclusivas', 'Invitación a eventos'], nextBenefit: 'N/A' },
    };

    let mappedState = category;
    if (currentState.includes('Dormido')) {
      // Even if dormant, we base benefits on what they achieved or could achieve
      mappedState = category; 
    }

    const data = benefitsData[mappedState] || benefitsData['Sin Categoría'];
    const missing = Math.max(0, data.target - sales);

    return {
      category: mappedState,
      currentBenefits: data.currentBenefits,
      nextLevel: data.nextLevel,
      targetAmount: data.target,
      missingAmountToUpgrade: missing,
      nextBenefit: data.nextBenefit
    };
  }
}

