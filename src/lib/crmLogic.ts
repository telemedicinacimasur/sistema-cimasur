export interface ClientVentas {
  v2024: number;
  v2025: number; 
  v2026: number; 
}

export interface Benefit {
  categoria: string;
  descripcion: string;
}

export const CATEGORY_BENEFITS: Record<string, string> = {
  'sin categoría': 'Acceso general a catálogos online Cimasur y boletines. ¡Compra promedio de $57.000 CLP al mes para subir a Bronce!',
  'bronce': '5% descuento fijo en línea homeopática magistral. ¡Compra promedio de $230.000 CLP al mes para subir a Plata!',
  'plata': '10% descuento + despacho gratis > $100k. ¡Compra promedio de $550.000 CLP al mes para subir a Oro!',
  'oro': '15% descuento fijo + despacho prioritario. ¡Compra promedio de $1.000.000 CLP al mes para subir a Platinum!',
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
    const cat = c.categoria.toLowerCase();
    
    // Metas de promedio mensual expresadas en pesos mensuales
    let metaPesosMensuales = 57000; // Bronce
    if (cat === 'bronce') metaPesosMensuales = 230000; // Plata
    else if (cat === 'plata') metaPesosMensuales = 550000; // Oro
    else if (cat === 'oro') metaPesosMensuales = 1000000; // Platinum
    
    const v2026 = c.ventas?.v2026 || 0;
    const metaFaltante = Math.max(0, Math.ceil(metaPesosMensuales * 12 - v2026));
    
    return { ...c, metaFaltante }; 
  });
  
  const zonaVIP = clubMembers.filter(c => ['platinum'].includes(c.categoria.toLowerCase()));

  return { clientesARecuperar, veterinariosIntranet, subitDeCategoria, zonaVIP };
}
