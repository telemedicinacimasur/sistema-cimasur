import { IOpportunityRule, RuleResult } from './types';

/**
 * Regla 1: Cliente Inactivo (Reactivación)
 * Evalúa si el cliente tiene días de inactividad comercial (>90, >180, >365 días)
 */
export class InactiveCustomerRule implements IOpportunityRule {
  public name = 'InactiveCustomerRule';

  public evaluate(context: any): RuleResult | null {
    const diasInactivo = context.diasInactivo ?? 0;
    if (diasInactivo <= 90) return null;

    let scoreDelta = 20;
    let priority = 'medium';
    let recommendedAction = 'WhatsApp';
    let reason = '';

    if (diasInactivo > 365) {
      scoreDelta = 85;
      recommendedAction = 'Llamada';
      reason = `Inactividad crítica: El cliente lleva más de un año sin compras (${diasInactivo} días). Se requiere contacto de reactivación urgente.`;
    } else if (diasInactivo > 180) {
      scoreDelta = 65;
      recommendedAction = 'Llamada';
      reason = `Inactividad severa: El cliente no ha comprado en más de 6 meses (${diasInactivo} días).`;
    } else {
      scoreDelta = 40;
      recommendedAction = 'WhatsApp';
      reason = `Inactividad moderada: El cliente lleva más de 90 días inactivo (${diasInactivo} días).`;
    }

    return {
      scoreDelta,
      reason,
      confidence: 0.9,
      recommendedAction,
      metadata: {
        diasInactivo,
        urgencia: diasInactivo > 180 ? 'Alta' : 'Media'
      }
    };
  }
}

/**
 * Regla 2: Oportunidad de Upgrade de Categoría
 * Detecta si un cliente está cerca de cruzar el límite para su siguiente nivel
 */
export class TierUpgradeRule implements IOpportunityRule {
  public name = 'TierUpgradeRule';

  public evaluate(context: any): RuleResult | null {
    const totalSales = context.totalVentasCiclo ?? 0;
    const currentTier = context.categoriaActual || 'Sin Categoría';

    // Definición de umbrales en CLP
    const thresholds: Record<string, { threshold: number; next: string }> = {
      'Primera Compra': { threshold: 100000, next: 'Sin Categoría' },
      'Sin Categoría': { threshold: 500000, next: 'Bronce' },
      'Bronce': { threshold: 1000000, next: 'Plata' },
      'Plata': { threshold: 2000000, next: 'Oro' },
      'Oro': { threshold: 5000000, next: 'Platinum' },
      'Platinum': { threshold: 10000000, next: 'Embajador' }
    };

    const target = thresholds[currentTier];
    if (!target) return null;

    const limit = target.threshold;
    const progress = totalSales / limit;

    // Si ha completado entre el 70% y el 99.9% del umbral del nivel
    if (progress >= 0.7 && progress < 1.0) {
      const rest = limit - totalSales;
      const scoreDelta = Math.round(progress * 40); // Más cerca, mayor puntaje
      return {
        scoreDelta,
        reason: `Cercano a subir de categoría: El cliente se encuentra al ${(progress * 100).toFixed(0)}% del límite para ascender a la categoría ${target.next}. Falta $${rest.toLocaleString('es-CL')} CLP en compras.`,
        confidence: 0.95,
        recommendedAction: 'Campaña',
        metadata: {
          currentTier,
          nextTier: target.next,
          limit,
          missingAmount: rest
        }
      };
    }

    return null;
  }
}

/**
 * Regla 3: Caída Severa de Compras (Retención / Riesgo de Churn)
 * Detecta si las compras actuales (e.g. 2026) han disminuido significativamente respecto a periodos anteriores (e.g. 2025)
 */
export class PurchaseDropRule implements IOpportunityRule {
  public name = 'PurchaseDropRule';

  public evaluate(context: any): RuleResult | null {
    const compras2025 = context.comprasAnteriores?.v2025 ?? 0;
    const compras2026 = context.totalVentasCiclo ?? 0;

    if (compras2025 < 300000) return null; // Ignorar clientes que eran muy pequeños el año anterior

    const dropRatio = (compras2025 - compras2026) / compras2025;

    // Si las ventas han caído más del 30% habiendo avanzado el año o basado en periodos
    if (dropRatio >= 0.3) {
      const scoreDelta = Math.min(90, Math.round(dropRatio * 100));
      return {
        scoreDelta,
        reason: `Caída crítica de compras: El cliente registra un descenso del ${(dropRatio * 100).toFixed(1)}% en sus compras comparado con el año anterior (2025: $${compras2025.toLocaleString('es-CL')} CLP, 2026: $${compras2026.toLocaleString('es-CL')} CLP).`,
        confidence: 0.85,
        recommendedAction: 'Llamada',
        metadata: {
          compras2025,
          compras2026,
          dropRatio
        }
      };
    }

    return null;
  }
}

/**
 * Regla 4: Cuenta de Alto Potencial (VIP)
 * Detecta clientes con alto volumen transaccional o pertenecientes a categorías premium
 */
export class HighValueCustomerRule implements IOpportunityRule {
  public name = 'HighValueCustomerRule';

  public evaluate(context: any): RuleResult | null {
    const tier = context.categoriaActual || 'Sin Categoría';
    const totalSales = context.totalVentasCiclo ?? 0;

    const isPremiumTier = ['Oro', 'Platinum', 'Embajador'].includes(tier);
    const isHighSales = totalSales >= 2000000;

    if (isPremiumTier || isHighSales) {
      return {
        scoreDelta: 30,
        reason: `Cliente VIP detectado: El cliente es un socio de alto valor en categoría '${tier}' con compras acumuladas de $${totalSales.toLocaleString('es-CL')} CLP. Requiere fidelización continua.`,
        confidence: 0.99,
        recommendedAction: 'Llamada',
        metadata: {
          isPremiumTier,
          totalSales,
          tier
        }
      };
    }

    return null;
  }
}

/**
 * Regla 5: Enganche con Programa de Fidelización (Loyalty Engagement)
 * Evalúa si el cliente tiene puntos acumulados altos sin canjes o no se ha inscrito
 */
export class LoyaltyEngagementRule implements IOpportunityRule {
  public name = 'LoyaltyEngagementRule';

  public evaluate(context: any): RuleResult | null {
    const pointsBalance = context.puntosDisponibles ?? 0;
    const isLoyaltyEnrolled = context.inscritoLoyalty ?? false;

    // Caso 1: No inscrito en el programa pero con compras significativas
    if (!isLoyaltyEnrolled && (context.totalVentasCiclo ?? 0) > 100000) {
      return {
        scoreDelta: 25,
        reason: `Invitación al Club de Fidelización: El cliente cuenta con compras acumuladas pero aún no se ha inscrito en el Club Oficial de CIMASUR.`,
        confidence: 0.85,
        recommendedAction: 'WhatsApp',
        metadata: {
          invitacionPuntosRetroactivos: true,
          sales: context.totalVentasCiclo
        }
      };
    }

    // Caso 2: Puntos acumulados elevados sin canje
    if (isLoyaltyEnrolled && pointsBalance >= 1000) {
      return {
        scoreDelta: 35,
        reason: `Oportunidad de Canje: El cliente posee un balance elevado de ${pointsBalance} puntos listos para canjear por premios del catálogo.`,
        confidence: 0.9,
        recommendedAction: 'Campaña',
        metadata: {
          pointsBalance,
          puntosParaCanje: true
        }
      };
    }

    return null;
  }
}
