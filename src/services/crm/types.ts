import { EvaluationOutput } from './contracts';

export type OpportunityType = 'upgrade' | 'reactivation' | 'cross_sell' | 'retention' | 'vip';
export type OpportunityPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Client {
  id: string;
  name: string; // Razón Social
  nombreFantasia?: string;
  rut: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  region?: string;
  telefono?: string;
  email: string;
  sitioWeb?: string;
  ejecutivoComercial?: string;
  estado: 'Activo' | 'Inactivo';
  observaciones?: string;
  
  fechaIngreso: string;
  accesoAprobado: 'Si' | 'No';
  historialUnificado: string;
  responsable: string;
  
  // Tab fields
  contactos?: {
    nombre: string;
    cargo: string;
    telefono: string;
    celular: string;
    email: string;
    esPrincipal: boolean;
  }[];
  veterinarios?: {
    nombre: string;
    especialidad: string;
    email: string;
    telefono: string;
  }[];
  ventas?: any[];
  clubComercial?: {
    categoria: string;
    beneficios: {
      bronce: any[];
      plata: any[];
      oro: any[];
      platinum: any[];
    };
    puntos: number;
    estado: 'Inscrito' | 'Sin categoría';
    
    // New fields
    manualMonthlyFrascos?: number;
    yearlyData?: { 
      year: number; 
      annualAmount: number; 
      monthlyAmount: number; 
      monthlyFrascos: number; 
    }[];
  };
  oportunidades?: any[];
  campanas?: any[];
  iaComercial?: any;
  bitacora?: any[];
  documentos?: any[];
  
  [key: string]: any;
}

export interface OpportunityResult extends EvaluationOutput {
  opportunityType: OpportunityType;
  priority: OpportunityPriority;
  nextReviewDate?: string;
}

export interface RuleResult {
  scoreDelta: number;
  reason: string;
  confidence: number;
  recommendedAction?: string;
  metadata?: Record<string, any>;
}

export interface IOpportunityRule {
  name: string;
  evaluate(context: any): RuleResult | null;
}
