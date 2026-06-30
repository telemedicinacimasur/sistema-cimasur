
export interface ClientVentas {
  v2025: number; // Activo actual (2025)
  v2026: number; // Meta/Proyección (2026 para 2027)
}

export interface Benefit {
  categoria: string;
  descripcion: string;
}

export const CATEGORY_BENEFITS: Record<string, string> = {
  'sin categoría': 'Acceso a lista de precios estándar. ¡Compra 6 frascos al mes para subir a Bronce!',
  'bronce': '5% descuento en línea homeopática. ¡Sube a Plata para obtener 10%!',
  'plata': '10% descuento + despacho gratis. ¡Sube a Oro para obtener 15%!',
  'oro': '15% descuento fijo + prioridad en despacho.',
  'platinum': '20% descuento + capacitación exclusiva + atención preferencial.'
};

export interface ClubClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut: string;
  categoria: string;
  ventas?: ClientVentas;
  clinica?: string;
  intranet?: string;
  metaFaltante?: number;
}

export function classifyClients(clients: ClubClient[]) {
  const clubMembers = clients.filter(c => c.categoria && c.categoria.toLowerCase() !== 'sin categoría' && c.categoria.toLowerCase() !== '');
  const intranetProspects = clients.filter(c => (c.intranet || '').toLowerCase().startsWith('si'));

  const clientesARecuperar = clubMembers.filter(c => {
    const v2025 = c.ventas?.v2025 || 0;
    const v2026 = c.ventas?.v2026 || 0;
    // Bajaron un 50% o más comparado con 2025, o llegaron a 0 en 2026
    return v2026 === 0 || (v2025 > 0 && v2026 <= 0.5 * v2025);
  });

  const veterinariosIntranet = intranetProspects.filter(p => {
    const existsInClub = clubMembers.some(c => c.rut === p.rut || c.email === p.email);
    const v2025 = p.ventas?.v2025 || 0;
    const v2026 = p.ventas?.v2026 || 0;
    return !existsInClub && v2025 === 0 && v2026 === 0;
  });

  const subitDeCategoria = clubMembers.filter(c => {
    const cat = c.categoria.toLowerCase();
    return ['sin categoría', 'bronce', 'plata', 'oro'].includes(cat);
  }).map(c => {
    let metaFaltante = 0;
    const cat = c.categoria.toLowerCase();
    
    // Simplificación de metas basada en frascos (1 frasco = 20k)
    const metaFrascos = cat === 'sin categoría' ? 72 : 120; // 6*12 vs 10*12
    const v2026 = c.ventas?.v2026 || 0;
    metaFaltante = Math.max(0, Math.ceil((metaFrascos * 20000 - v2026) / 20000));
    
    return { ...c, metaFaltante }; 
  });
  
  const zonaVIP = clubMembers.filter(c => c.categoria.toLowerCase() === 'platinum');

  return { clientesARecuperar, veterinariosIntranet, subitDeCategoria, zonaVIP };
}
