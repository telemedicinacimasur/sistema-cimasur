export class IntegrationService {
  /**
   * Cruza datos de Intranet (veterinarios) con Ventas (Administración) usando RUT.
   */
  public integrate(intranetData: any[], salesData: any[]) {
    // Agrupar ventas por RUT para búsqueda rápida
    const salesByRut = salesData.reduce((acc, sale) => {
      const rut = sale.rut;
      if (!rut) return acc;
      if (!acc[rut]) acc[rut] = { total: 0, sales: [], name: sale.name || sale.nombre || 'Desconocido', email: sale.email };
      acc[rut].sales.push(sale);
      acc[rut].total += (parseFloat(sale.total) || 0);
      return acc;
    }, {} as Record<string, any>);

    const integratedMap = new Map();

    // 1. Procesar Intranet
    intranetData.forEach(vet => {
      const rut = vet.rut;
      const salesInfo = rut && salesByRut[rut] ? salesByRut[rut] : { total: 0, sales: [] };
      integratedMap.set(rut, {
        ...vet,
        isClient: salesInfo.sales.length > 0,
        sales: salesInfo.sales,
        lastPurchaseDate: salesInfo.sales.length > 0 
          ? new Date(Math.max(...salesInfo.sales.map((s: any) => new Date(s.fecha || s.date || 0).getTime())))
          : null
      });
    });

    // 2. Procesar Ventas sin Intranet
    Object.keys(salesByRut).forEach(rut => {
      if (!integratedMap.has(rut)) {
        const salesInfo = salesByRut[rut];
        integratedMap.set(rut, {
          rut: rut,
          name: salesInfo.name,
          email: salesInfo.email,
          isClient: true,
          sales: salesInfo.sales,
          lastPurchaseDate: salesInfo.sales.length > 0 
            ? new Date(Math.max(...salesInfo.sales.map((s: any) => new Date(s.fecha || s.date || 0).getTime())))
            : null
        });
      }
    });

    return Array.from(integratedMap.values());
  }
}

