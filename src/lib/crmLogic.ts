
export interface ClientVentas {
  v2024: number;
  v2025: number;
  v2026: number; // Jun 2025 - May 2026
}

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
}

export function classifyClients(clients: ClubClient[]) {
  // Assuming 'clients' contains all contacts including both Club members and Intranet prospects
  // If 'clients' list has an 'isClubMember' property or similar, it would be easier.
  // Based on the prompt, 'Club' database vs 'Intranet' list.
  // I will assume for now that all contacts have an 'isClub' flag if possible, or I need to infer.
  
  const clubMembers = clients.filter(c => c.categoria && c.categoria.toLowerCase() !== 'sin categoría' && c.categoria.toLowerCase() !== '');
  const intranetProspects = clients.filter(c => (c.intranet || '').toLowerCase().startsWith('si'));

  const clientesARecuperar = clubMembers.filter(c => {
    const v2025 = c.ventas?.v2025 || 0;
    const v2026 = c.ventas?.v2026 || 0;
    return v2026 === 0 || (v2025 > 0 && v2026 <= 0.5 * v2025);
  });

  const veterinariosIntranet = intranetProspects.filter(p => {
    // STRICT CHECK: Ensure not already in Club
    const existsInClub = clubMembers.some(c => c.rut === p.rut || c.email === p.email);
    const vTotal = (p.ventas?.v2024 || 0) + (p.ventas?.v2025 || 0) + (p.ventas?.v2026 || 0);
    return !existsInClub && vTotal === 0;
  });

  const subitDeCategoria = clubMembers.filter(c => {
    const cat = c.categoria.toLowerCase();
    return ['sin categoría', 'bronce', 'plata', 'oro'].includes(cat);
  }).map(c => {
    // Calculation: 
    // Sin categoria meta: 6 frascos mensuales = 72 anuales.
    // Others: Compare with top tier floor.
    let metaFaltante = 0;
    const cat = c.categoria.toLowerCase();
    
    // Simplified logic
    if (cat === 'sin categoría') {
       // meta: 6 frascos/mes.
       // Assuming 1 frasco = 20,000 for this example logic
       const metaAnual = 6 * 12 * 20000;
       const v2026 = c.ventas?.v2026 || 0;
       metaFaltante = Math.max(0, Math.ceil((metaAnual - v2026) / 20000));
    }
    
    return { ...c, metaFaltante }; 
  });
  
  const zonaVIP = clubMembers.filter(c => c.categoria.toLowerCase() === 'platinum');

  return { clientesARecuperar, veterinariosIntranet, subitDeCategoria, zonaVIP };
}
