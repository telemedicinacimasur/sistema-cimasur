/**
 * Contrato común para los motores de inteligencia comercial de CIMASUR (Fase 6)
 * Permite que los distintos motores (Opportunity, Recommendation, Journey, IA)
 * expongan una interfaz consistente para consumo del frontend e integraciones.
 */

export interface ContextoComercial {
  categoriaActual?: string;
  totalVentasCiclo?: number;
  comprasAnteriores?: Record<string, number>;
  ultimoContactoDate?: string;
  ultimaCompraDate?: string;
  puntosDisponibles?: number;
  diasInactivo?: number;
  productosFrecuentes?: string[];
  [key: string]: any;
}

export interface EvaluationInput {
  contactId: string;
  contextoComercial: ContextoComercial;
  fechaEvaluacion: string; // Formato ISO Date
}

export interface EvaluationOutput {
  score: number;             // Puntaje o potencial (0-100)
  reason: string;            // Justificación técnica o comercial
  confidence: number;        // Confianza del motor (0.0 a 1.0)
  recommendedAction: string; // Acción comercial sugerida (e.g., 'Llamada', 'WhatsApp', 'Email', 'Campaña')
  metadata: {
    detalles?: string;
    productosSugeridos?: string[];
    plantillaSugerida?: string;
    proximoHito?: string;
    [key: string]: any;
  };
}

/**
 * Interfaz común que deben implementar todos los motores de evaluación comercial.
 */
export interface IEvaluationEngine {
  evaluate(input: EvaluationInput): Promise<EvaluationOutput> | EvaluationOutput;
}

/**
 * Entrada para el Motor de Recomendaciones Personalizadas
 */
export interface RecommendationInput {
  contactId: string;
  category: string;
  totalVentasCiclo: number;
  diasInactivo: number;
  loyaltyAccountEnrolled: boolean;
  pointsBalance: number;
  recentProducts?: string[];
}

/**
 * Estructura estándar de una recomendación de negocio
 */
export interface RecommendationOutput {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'promotion' | 'reward' | 'engagement';
  recommendedAction: 'WhatsApp' | 'Email' | 'Llamada' | 'Campaña';
  priority: 'Alta' | 'Media' | 'Baja';
  metadata?: {
    skus?: string[];
    potentialRevenue?: number;
    discountPercent?: number;
    rewardId?: string;
    [key: string]: any;
  };
}

/**
 * Interfaz para los proveedores del Motor de Recomendaciones (e.g., Rules-based, AI-based, etc.)
 */
export interface IRecommendationProvider {
  name: string;
  getRecommendations(input: RecommendationInput): Promise<RecommendationOutput[]> | RecommendationOutput[];
}

