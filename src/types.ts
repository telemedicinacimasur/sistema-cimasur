export interface Client {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  region: string;
  type: string;
  categoria: string;
  intranet: 'Si' | 'No';
  compraAnual: number;
  historialUnificado: string;
  responsable: string;
  fechaIngreso: string;
  comoLlego: string;
  isGestionCustomer: boolean;
  // CRM + Intranet flags
  isCRM: boolean;
  isIntranet: boolean;
  // Commercial Intelligence
  frascosMensuales: number;
  metaFrascos: number;
  metaMonto: number;
  nextCategoria: string;
  diasSinCompra: number;
  proximaAccion: string;
  iaScore: number;
  interestScore?: number;
  beneficiosDisponibles: string[];
}

export interface ClientCommercialProfile extends Client {
  // Comercial
  ejecutivo: string;
  primeraCompra: string;
  ultimaCompra: string;
  diasDesdeUltimaCompra: number;
  totalCompras: number;
  ticketPromedio: number;
  frecuenciaCompra: number; // dias
  crecimientoPeriodo: number; // %
  tendencia: 'creciendo' | 'estable' | 'disminuyendo';

  // Económicos
  ventaMensual: number;
  ventaAnual: number;
  promedioAnual: number;
  proyeccionAnual: number;
  rentabilidad: number;

  // Productos
  frascosMensuales: number;
  frascosAnuales: number;
  promedioFrascos: number;
  productosMasComprados: string[];
  productosInteres: string[];

  // Categorización
  categoriaFacturacion: string;
  categoriaFrascos: string;
  siguienteCategoriaFacturacion: string;
  siguienteCategoriaFrascos: string;
  dineroFaltante: number;
  frascosFaltantes: number;
  progresoFacturacion: number;
  progresoFrascos: number;
  fechaEstimadaAscenso: string;
  beneficioSugeridoAscenso: string;

  // Scores & IA
  riesgoAbandono: number;
  scoreComercial: number;
  scoreInteresIntranet: number;
  potencialCrecimiento: number;
  probabilidadConversion: number;
  
  // Beneficios
  beneficiosAsignados: string[];
  beneficiosUtilizados: string[];
  beneficiosVencidos: string[];
  
  timeline: CommercialEvent[];
  aiRecommendation?: AIRecommendation;
}

export interface CommercialEvent {
  id: string;
  date: string;
  type: 'compra' | 'campana' | 'email' | 'whatsapp' | 'beneficio' | 'actividad_intranet' | 'oportunidad' | 'nota';
  description: string;
  metadata?: any;
}

export interface AIRecommendation {
  action: string;
  justification: string;
  priority: 'alta' | 'media' | 'baja';
  probabilidadExito: number; // 0-100
  beneficioSugerido?: string;
  fechaIdealContacto: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  status: 'draft' | 'scheduled' | 'sent';
  subject?: string;
  body: string; // Can contain HTML
  targetSegment: string;
  createdAt: string;
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    converted: number;
  };
}

export interface CampaignExecution {
  id: string;
  campaignId: string;
  clientId: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'converted';
  sentAt?: string;
  openedAt?: string;
}
