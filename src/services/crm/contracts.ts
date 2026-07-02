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
