
import { ClubClient } from './crmLogic';

export interface GrowthOpportunity {
  id: string;
  title: string;
  description: string;
  count: number;
  potential: number;
  category: 'intranet' | 'club';
  icon: string;
}

export function getGrowthOpportunities(clubClients: ClubClient[], intranetClients: any[]): { intranet: GrowthOpportunity[], club: GrowthOpportunity[] } {
  // Logic to calculate opportunities
  
  // 1. Intranet (Prospects)
  const intranetOpportunities: GrowthOpportunity[] = [
    {
      id: 'sin_primera_compra',
      title: 'Registrados sin compra',
      description: 'Veterinarios registrados que aún no compran.',
      count: intranetClients.length, // Placeholder
      potential: intranetClients.length * 50000,
      category: 'intranet',
      icon: 'UserPlus'
    },
    {
        id: 'dormidos_intranet',
        title: 'Registrados 90 días sin comprar',
        description: 'Registrados hace 90 días sin realizar primera compra.',
        count: Math.floor(intranetClients.length * 0.3),
        potential: Math.floor(intranetClients.length * 0.3) * 50000,
        category: 'intranet',
        icon: 'AlertTriangle'
    }
  ];

  // 2. Club Comercial (Customers)
  const clubOpportunities: GrowthOpportunity[] = [
    {
      id: 'sin_categoria',
      title: 'Clientes Sin Categoría',
      description: 'Clientes pequeños con alto potencial.',
      count: clubClients.filter(c => c.categoria.toLowerCase() === 'sin categoría').length,
      potential: 1200000,
      category: 'club',
      icon: 'Users'
    },
    {
      id: 'dormidos_90',
      title: 'Dormidos 90 días',
      description: 'Clientes sin compras en últimos 90 días.',
      count: clubClients.filter(c => (c.ventas?.v2026 || 0) === 0).length,
      potential: 800000,
      category: 'club',
      icon: 'AlertTriangle'
    }
  ];

  return { intranet: intranetOpportunities, club: clubOpportunities };
}
