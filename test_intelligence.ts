/**
 * Suite de Pruebas Unitarias para el Motor de Oportunidades y Reglas de CIMASUR (Fase 6)
 * Valida de forma determinista la exactitud matemática de los puntajes,
 * prioridades, acciones comerciales recomendadas y la resiliencia del agregador.
 */

import { OpportunityEngine } from './src/services/crm/OpportunityEngine';
import { EvaluationInput } from './src/services/crm/contracts';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMÁTICAS: INTELIGENCIA COMERCIAL (FASE 6)');
  console.log('================================================================\n');

  const engine = new OpportunityEngine();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` ✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(` ❌ [FAILED] ${message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // CASO 1: Cliente Inactivo Severo (Reactivación por Inactividad > 180 días)
  // ---------------------------------------------------------------------------
  try {
    const input: EvaluationInput = {
      contactId: 'cli_test_1',
      fechaEvaluacion: '2026-07-02',
      contextoComercial: {
        categoriaActual: 'Bronce',
        totalVentasCiclo: 500000,
        diasInactivo: 200,
        comprasAnteriores: { v2025: 500000, v2026: 500000 },
        inscritoLoyalty: true,
        puntosDisponibles: 100
      }
    };

    const output = await engine.evaluate(input);
    
    assert(output.score === 65, 'Caso 1: El score de reactivación para 200 días debe ser exactamente 65%');
    assert(output.opportunityType === 'reactivation', 'Caso 1: El tipo de oportunidad debe ser "reactivation"');
    assert(output.priority === 'high', 'Caso 1: La prioridad para score 65 debe ser "high"');
    assert(output.recommendedAction === 'Llamada', 'Caso 1: Acción recomendada debe ser "Llamada"');
  } catch (e: any) {
    console.error('Error en Caso 1:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 2: Cercanía a Upgrade de Nivel (Plata -> Oro)
  // ---------------------------------------------------------------------------
  try {
    const input: EvaluationInput = {
      contactId: 'cli_test_2',
      fechaEvaluacion: '2026-07-02',
      contextoComercial: {
        categoriaActual: 'Plata',
        totalVentasCiclo: 1600000, // Limite para Oro es 2M (80% completado)
        diasInactivo: 10,
        comprasAnteriores: { v2025: 1500000, v2026: 1600000 },
        inscritoLoyalty: true,
        puntosDisponibles: 200
      }
    };

    const output = await engine.evaluate(input);
    
    assert(output.opportunityType === 'upgrade', 'Caso 2: Debe priorizar "upgrade" (scoreDelta ~32 vs HighValue ~30)');
    assert(output.score === 32, 'Caso 2: El score de upgrade debe ser 32% (basado en progreso 80% * 40)');
    assert(output.recommendedAction === 'Campaña', 'Caso 2: Acción recomendada de Upgrade debe ser "Campaña"');
  } catch (e: any) {
    console.error('Error en Caso 2:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 3: Caída Severa de Ventas respecto a 2025 (Riesgo de Churn)
  // ---------------------------------------------------------------------------
  try {
    const input: EvaluationInput = {
      contactId: 'cli_test_3',
      fechaEvaluacion: '2026-07-02',
      contextoComercial: {
        categoriaActual: 'Sin Categoría',
        totalVentasCiclo: 100000, // 2026
        diasInactivo: 15,
        comprasAnteriores: { v2025: 1000000, v2026: 100000 }, // Caída del 90%
        inscritoLoyalty: false,
        puntosDisponibles: 0
      }
    };

    const output = await engine.evaluate(input);
    
    assert(output.opportunityType === 'retention', 'Caso 3: Debe catalogarse como oportunidad de retención');
    assert(output.score === 90, 'Caso 3: El score de caída severa debe limitarse a un máximo razonable o dar delta alto (90%)');
    assert(output.priority === 'critical', 'Caso 3: Prioridad de caída crítica de ventas debe ser "critical"');
    assert(output.recommendedAction === 'Llamada', 'Caso 3: Acción recomendada para retención crítica debe ser "Llamada"');
  } catch (e: any) {
    console.error('Error en Caso 3:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 4: Cliente Saludable / Sin Oportunidades Críticas
  // ---------------------------------------------------------------------------
  try {
    const input: EvaluationInput = {
      contactId: 'cli_test_4',
      fechaEvaluacion: '2026-07-02',
      contextoComercial: {
        categoriaActual: 'Sin Categoría',
        totalVentasCiclo: 50000,
        diasInactivo: 5,
        comprasAnteriores: { v2025: 40000, v2026: 50000 },
        inscritoLoyalty: true,
        puntosDisponibles: 20
      }
    };

    const output = await engine.evaluate(input);
    
    assert(output.score === 0, 'Caso 4: El score debe ser 0% para un cliente de comportamiento regular y sin desvíos');
    assert(output.priority === 'low', 'Caso 4: Prioridad debe ser "low"');
  } catch (e: any) {
    console.error('Error en Caso 4:', e);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 RESUMEN DE EJECUCIÓN: ${passed} pruebas aprobadas, ${failed} fallidas.`);
  console.log('================================================================');
}

// Ejecutamos la simulación de pruebas
runTests().catch(console.error);
