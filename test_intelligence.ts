/**
 * Suite de Pruebas Unitarias para el Motor de Oportunidades y Reglas de CIMASUR (Fase 6)
 * Valida de forma determinista la exactitud matemática de los puntajes,
 * prioridades, acciones comerciales recomendadas y la resiliencia del agregador.
 */

import { OpportunityEngine } from './src/services/crm/OpportunityEngine';
import { EvaluationInput } from './src/services/crm/contracts';
import { SegmentationService } from './src/services/crm/SegmentationService';
import { CycleManagerService } from './src/services/crm/CycleManagerService';
import * as fs from 'fs';
import * as path from 'path';

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

  // ---------------------------------------------------------------------------
  // CASO 5: Validación del cálculo de categorías por promedio mensual
  // ---------------------------------------------------------------------------
  try {
    console.log('\n--- CASO 5: VALIDACIÓN DE CÁLCULO POR PROMEDIO MENSUAL ---');
    const seg = new SegmentationService();
    
    // Con un promedio mensual de $150,000 CLP (venta anual = $1,800,000 CLP), debe ser Bronce ($120.000 - $239.999)
    const catBronce = seg.categorize(1800000);
    assert(catBronce === 'Bronce', `Ventas anuales de $1,800,000 (promedio $150,000/mes) debe ser Bronce. Retornado: ${catBronce}`);
    
    // Con un promedio mensual de $300,000 CLP (venta anual = $3,600,000 CLP), debe ser Plata ($240.000 - $399.999)
    const catPlata = seg.categorize(3600000);
    assert(catPlata === 'Plata', `Ventas anuales de $3,600,000 (promedio $300,000/mes) debe ser Plata. Retornado: ${catPlata}`);
    
    // Con un promedio mensual de $500,000 CLP (venta anual = $6,000,000 CLP), debe ser Oro ($400.000 - $799.999)
    const catOro = seg.categorize(6000000);
    assert(catOro === 'Oro', `Ventas anuales de $6,000,000 (promedio $500,000/mes) debe ser Oro. Retornado: ${catOro}`);

    // Con un promedio mensual de $1,000,000 CLP (venta anual = $12,000,000 CLP), debe ser Platinum ($800.000 - $1.599.999)
    const catPlat = seg.categorize(12000000);
    assert(catPlat === 'Platinum', `Ventas anuales de $12,000,000 (promedio $1,000,000/mes) debe ser Platinum. Retornado: ${catPlat}`);

    // Con un promedio mensual de $2,000,000 CLP (venta anual = $24,000,000 CLP), debe ser Embajador ($1.600.000+)
    const catEmb = seg.categorize(24000000);
    assert(catEmb === 'Embajador', `Ventas anuales de $24,000,000 (promedio $2,000,000/mes) debe ser Embajador. Retornado: ${catEmb}`);
  } catch (e: any) {
    console.error('Error en Caso 5:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 6: Validación de la parametrización dinámica de beneficios (Marketing)
  // ---------------------------------------------------------------------------
  try {
    console.log('\n--- CASO 6: VALIDACIÓN DE PARAMETRIZACIÓN DINÁMICA DE BENEFICIOS ---');
    const configPath = path.join(process.cwd(), 'data', 'club_config.json');
    const originalConfigRaw = fs.readFileSync(configPath, 'utf-8');
    const originalConfig = JSON.parse(originalConfigRaw);
    
    // Modificamos temporalmente el descuento y beneficios de la categoría Plata
    const tempConfig = JSON.parse(originalConfigRaw);
    const plataTier = tempConfig.tiers.find((t: any) => t.id === 'plata');
    if (plataTier) {
      plataTier.discountPercent = 99; // Descuento de prueba
      plataTier.benefits = ['Beneficio de prueba súper exclusivo de Marketing'];
    }
    
    // Escribimos la configuración temporal
    fs.writeFileSync(configPath, JSON.stringify(tempConfig, null, 2));
    
    // Instanciamos un nuevo servicio y validamos que lea la nueva configuración
    const segDynamic = new SegmentationService();
    const info = segDynamic.getBenefitsAndGoals(3600000, 'Nuevos'); // $3,600,000 CLP anualizado -> Plata
    
    assert(info.discountPercent === 99, `El descuento de Plata debe haber cambiado dinámicamente a 99%. Retornado: ${info.discountPercent}`);
    assert(info.currentBenefits.includes('Beneficio de prueba súper exclusivo de Marketing'), 'El beneficio de Plata debe contener el beneficio dinámico de prueba.');
    
    // Restauramos la configuración original
    fs.writeFileSync(configPath, originalConfigRaw);
    
    // Verificamos que al reinstanciar o actualizar retorne los beneficios originales
    const segRestored = new SegmentationService();
    const infoRestored = segRestored.getBenefitsAndGoals(3600000, 'Nuevos');
    assert(infoRestored.discountPercent === 10, `El descuento de Plata debe haber retornado a su valor original (10%). Retornado: ${infoRestored.discountPercent}`);
  } catch (e: any) {
    console.error('Error en Caso 6:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 7: Validación de inicio de programa con la línea base 2024
  // ---------------------------------------------------------------------------
  try {
    console.log('\n--- CASO 7: VALIDACIÓN DE LÍNEA BASE HISTÓRICA 2024 ---');
    const seg = new SegmentationService();
    const config = seg.getConfig();
    const baseYear = config.evaluationCycle?.firstCycleBaseYear;
    assert(baseYear === 2024, `La línea base histórica inicial configurada para el lanzamiento debe ser el año 2024. Retornado: ${baseYear}`);
  } catch (e: any) {
    console.error('Error en Caso 7:', e);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CASO 8: Validación de recálculo correcto al cambiar de ciclo anual
  // ---------------------------------------------------------------------------
  try {
    console.log('\n--- CASO 8: VALIDACIÓN DE CAMBIO DE CICLO ANUAL ---');
    const cycleManager = new CycleManagerService();
    const currentCycleString = cycleManager.getCurrentCycle();
    
    // Validamos que el formato retornado sea consistente (ej: "Ciclo 2026-2027" o similar)
    assert(/^Ciclo \d{4}-\d{4}$/.test(currentCycleString), `El ciclo retornado debe tener formato 'Ciclo YYYY-YYYY'. Retornado: '${currentCycleString}'`);
    
    // Validamos el cálculo de pertenencia al ciclo para fechas clave del ciclo actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const isJulyFirstInCurrentCycle = cycleManager.isInCurrentCycle(new Date(currentYear, 6, 1)); // 1 de Julio de este año
    assert(isJulyFirstInCurrentCycle === true, `El 1 de Julio del año actual debe caer dentro del ciclo de evaluación.`);
    
    const isOutDateInCurrentCycle = cycleManager.isInCurrentCycle(new Date(currentYear - 2, 0, 1)); // Hace 2 años
    assert(isOutDateInCurrentCycle === false, `Una fecha de hace dos años no debe pertenecer al ciclo de evaluación activo.`);
  } catch (e: any) {
    console.error('Error en Caso 8:', e);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 RESUMEN DE EJECUCIÓN: ${passed} pruebas aprobadas, ${failed} fallidas.`);
  console.log('================================================================');
}

// Ejecutamos la simulación de pruebas
runTests().catch(console.error);
