import { IEvaluationEngine, EvaluationInput } from './contracts';
import { OpportunityResult, RuleResult } from './types';
import { 
  InactiveCustomerRule, 
  TierUpgradeRule, 
  PurchaseDropRule, 
  HighValueCustomerRule, 
  LoyaltyEngagementRule 
} from './OpportunityRules';

/**
 * Motor de Detección de Oportunidades Comerciales de CIMASUR
 * Implementa la interfaz común de motores de inteligencia comercial (IEvaluationEngine).
 */
export class OpportunityEngine implements IEvaluationEngine {
  private rules = [
    new InactiveCustomerRule(),
    new TierUpgradeRule(),
    new PurchaseDropRule(),
    new HighValueCustomerRule(),
    new LoyaltyEngagementRule()
  ];

  /**
   * Ejecuta la evaluación de todas las reglas de negocio sobre el cliente
   * y combina los resultados para generar una oportunidad accionable unificada.
   */
  public async evaluate(input: EvaluationInput): Promise<OpportunityResult> {
    const { contactId, contextoComercial, fechaEvaluacion } = input;
    const ruleResults: { ruleName: string; result: RuleResult }[] = [];

    // Evaluar cada regla de negocio de forma desacoplada
    for (const rule of this.rules) {
      try {
        const result = rule.evaluate(contextoComercial);
        if (result) {
          ruleResults.push({ ruleName: rule.name, result });
        }
      } catch (err) {
        console.error(`Error evaluando la regla ${rule.name} para cliente ${contactId}:`, err);
      }
    }

    // Si no se activó ninguna regla de negocio, retornamos una oportunidad baja vacía
    if (ruleResults.length === 0) {
      return {
        score: 0,
        reason: 'No se detectaron alertas o desvíos comerciales. El socio veterinario mantiene un comportamiento regular y saludable en sus compras y beneficios.',
        confidence: 1.0,
        recommendedAction: 'WhatsApp',
        opportunityType: 'retention',
        priority: 'low',
        metadata: {
          evaluatedAt: fechaEvaluacion,
          reglasEvaluadas: this.rules.map(r => r.name),
          detalles: 'Cliente en estado óptimo.'
        }
      };
    }

    // Ordenar por severidad/puntaje delta para seleccionar la principal
    ruleResults.sort((a, b) => b.result.scoreDelta - a.result.scoreDelta);
    const primaryOpportunity = ruleResults[0];

    // El puntaje final es el máximo obtenido por la regla de mayor impacto
    const score = Math.min(100, primaryOpportunity.result.scoreDelta);

    // Calcular la prioridad del hallazgo
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (score >= 80) priority = 'critical';
    else if (score >= 50) priority = 'high';
    else if (score >= 25) priority = 'medium';

    // Clasificar tipo de oportunidad según la regla que gatilló con mayor puntaje
    let opportunityType: 'upgrade' | 'reactivation' | 'cross_sell' | 'retention' | 'vip' = 'retention';
    const primaryName = primaryOpportunity.ruleName;

    if (primaryName === 'InactiveCustomerRule') {
      opportunityType = 'reactivation';
    } else if (primaryName === 'TierUpgradeRule') {
      opportunityType = 'upgrade';
    } else if (primaryName === 'PurchaseDropRule') {
      opportunityType = 'retention';
    } else if (primaryName === 'HighValueCustomerRule') {
      opportunityType = 'vip';
    } else if (primaryName === 'LoyaltyEngagementRule') {
      opportunityType = 'cross_sell';
    }

    // Combinar los textos de justificación para que el comercial tenga una visualización holística
    const combinedReason = ruleResults.map(r => r.result.reason).join(' Adicionalmente, ');

    // Promediar la confianza de las reglas que se activaron
    const totalConfidence = ruleResults.reduce((sum, r) => sum + r.result.confidence, 0);
    const confidence = parseFloat((totalConfidence / ruleResults.length).toFixed(2));

    return {
      score,
      reason: combinedReason,
      confidence,
      recommendedAction: primaryOpportunity.result.recommendedAction || 'WhatsApp',
      opportunityType,
      priority,
      metadata: {
        evaluatedAt: fechaEvaluacion,
        primaryRule: primaryName,
        allTriggeredRules: ruleResults.map(r => r.ruleName),
        ruleDetails: ruleResults.reduce((acc, r) => {
          acc[r.ruleName] = r.result.metadata;
          return acc;
        }, {} as Record<string, any>)
      }
    };
  }
}
