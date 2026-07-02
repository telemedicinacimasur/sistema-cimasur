import { IRecommendationProvider, RecommendationInput, RecommendationOutput } from './contracts';

/**
 * Proveedor de Recomendaciones basado en Reglas de Negocio de CIMASUR
 */
export class RuleBasedRecommendationProvider implements IRecommendationProvider {
  public name = 'RuleBasedRecommendationProvider';

  public getRecommendations(input: RecommendationInput): RecommendationOutput[] {
    const recommendations: RecommendationOutput[] = [];
    const { contactId, category, totalVentasCiclo, diasInactivo, loyaltyAccountEnrolled, pointsBalance, recentProducts = [] } = input;

    // 1. Recomendaciones para Prospectos / Clientes sin primera compra (Foco: Primera Compra + Vademécum de regalo)
    if (totalVentasCiclo === 0 || category === 'Sin compra' || category === 'Sin Categoría' && totalVentasCiclo === 0) {
      recommendations.push({
        id: `rec_first_purchase_${contactId}`,
        title: 'Campaña de Conversión: Bienvenido a la Intranet',
        description: 'Ofrece un 15% de descuento especial de bienvenida y un Vademécum Físico Gratuito de regalo por su primer pedido sobre 30 unidades. Incluye Despacho Gratuito a su clínica.',
        type: 'promotion',
        recommendedAction: 'WhatsApp',
        priority: 'Alta',
        metadata: {
          discountPercent: 15,
          vademecumGift: true,
          skus: ['Arnica CS Salina', 'Kit Modulador Digestivo']
        }
      });
    }

    // 2. Recomendaciones de Productos Cruzados y Frecuentes
    // Si ya compra Arnica CS, sugiramos complementar con Kit Osteoarticular o Kit Modulador Digestivo
    const hasArnica = recentProducts.some(p => p.toLowerCase().includes('arnica'));
    const hasDigestive = recentProducts.some(p => p.toLowerCase().includes('digestivo') || p.toLowerCase().includes('muces'));

    if (totalVentasCiclo > 0) {
      if (hasArnica && !hasDigestive) {
        recommendations.push({
          id: `rec_cross_sell_digestivo_${contactId}`,
          title: 'Sugerencia de Kit Modulador Digestivo',
          description: 'El cliente preescribe habitualmente Arnica CS. Recomienda complementar sus tratamientos con el Kit Modulador Digestivo, ideal para soporte integral gastrointestinal.',
          type: 'product',
          recommendedAction: 'Campaña',
          priority: 'Media',
          metadata: {
            skus: ['Kit Modulador Digestivo', 'Muces CS Salina'],
            potentialRevenue: 45000
          }
        });
      } else if (!hasArnica) {
        // Recomendar Arnica CS que es el bestseller
        recommendations.push({
          id: `rec_best_seller_arnica_${contactId}`,
          title: 'Arnica CS Salina - Modulador Inflamatorio Estelar',
          description: 'Recomienda incorporar Arnica CS Salina, nuestro bestseller veterinario para modulación de dolor e inflamación postquirúrgica y traumatológica.',
          type: 'product',
          recommendedAction: 'WhatsApp',
          priority: 'Alta',
          metadata: {
            skus: ['Arnica CS Salina'],
            potentialRevenue: 28000
          }
        });
      }
    }

    // 3. Recomendaciones de Fidelización y Recompensas (Loyalty Rewards)
    if (loyaltyAccountEnrolled) {
      if (pointsBalance >= 1500) {
        recommendations.push({
          id: `rec_loyalty_redeem_high_${contactId}`,
          title: 'Promover Canje de Kit Osteoarticular',
          description: `El cliente tiene un excelente balance acumulado de ${pointsBalance} puntos. Sugiérele canjearlos hoy por un Kit Osteoarticular de regalo o una Gift Card de Descuento Especial.`,
          type: 'reward',
          recommendedAction: 'Llamada',
          priority: 'Alta',
          metadata: {
            rewardId: 'kit_osteo',
            pointsRequired: 1200,
            pointsBalance
          }
        });
      } else if (pointsBalance >= 500) {
        recommendations.push({
          id: `rec_loyalty_redeem_med_${contactId}`,
          title: 'Invitación a Canje de Fórmulas Homeopáticas',
          description: `Tiene ${pointsBalance} puntos acumulados. Anímale a canjearlos por Fórmulas Diluidas unitarias (Arnica CS, Acqua Maris) o Esencias Florales de regalo antes del cierre del ciclo.`,
          type: 'reward',
          recommendedAction: 'WhatsApp',
          priority: 'Media',
          metadata: {
            rewardId: 'formula_unitaria',
            pointsRequired: 400,
            pointsBalance
          }
        });
      }
    } else if (totalVentasCiclo > 100000) {
      // No inscrito pero califica
      recommendations.push({
        id: `rec_loyalty_enroll_${contactId}`,
        title: 'Inscripción Proactiva al Club de Fidelización',
        description: 'Inscribe al cliente en el Club de Fidelización CIMASUR para otorgarle puntos retroactivos por sus compras y motivar recompra en el próximo trimestre.',
        type: 'engagement',
        recommendedAction: 'WhatsApp',
        priority: 'Alta',
        metadata: {
          pointsToRewardRetroactive: Math.floor(totalVentasCiclo / 1000)
        }
      });
    }

    // 4. Recomendaciones de Reactivación para clientes inactivos
    if (diasInactivo > 90) {
      recommendations.push({
        id: `rec_reactivation_promo_${contactId}`,
        title: 'Oferta Exclusiva de Reactivación',
        description: `El socio clínico registra ${diasInactivo} días sin compras. Ofrece un cupón de 10% de descuento en su próxima compra de Arnica CS o Acqua Maris para recuperar la cuenta.`,
        type: 'promotion',
        recommendedAction: 'Llamada',
        priority: 'Alta',
        metadata: {
          discountPercent: 10,
          skus: ['Arnica CS Salina', 'Acqua Maris CS Salina'],
          diasInactivo
        }
      });
    }

    // 5. Soporte VIP y Asesoría Clínica para cuentas Premium
    if (['Oro', 'Platinum', 'Embajador'].includes(category)) {
      recommendations.push({
        id: `rec_vip_advisor_${contactId}`,
        title: 'Agendar Sesión de Asesoría Médica Homeopática',
        description: `Como miembro distinguido de la categoría ${category}, invítalo a una sesión personalizada de Vademécum clínico uno a uno con nuestro farmacéutico jefe.`,
        type: 'engagement',
        recommendedAction: 'Llamada',
        priority: 'Alta',
        metadata: {
          asesoriaGratis: true,
          perkName: 'Asesoría de Alta Especialidad'
        }
      });
    }

    return recommendations;
  }
}
