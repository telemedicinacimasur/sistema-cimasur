import { CycleManagerService } from './CycleManagerService';
import { SegmentationService } from './SegmentationService';

export class IntegrationService {
  /**
   * Cruza datos de Intranet (veterinarios) con Ventas (Administración) usando RUT.
   * Calibra e integra todos los indicadores comerciales clave.
   */
  public integrate(intranetData: any[], salesData: any[]) {
    // 1. Agrupar ventas reales por RUT para búsqueda rápida
    const salesByRut = (salesData || []).reduce((acc, sale) => {
      const rut = sale.rut;
      if (!rut) return acc;
      if (!acc[rut]) {
        acc[rut] = { 
          total: 0, 
          sales: [], 
          name: sale.name || sale.nombre || 'Desconocido', 
          email: sale.email 
        };
      }
      acc[rut].sales.push(sale);
      acc[rut].total += (parseFloat(sale.total) || 0);
      return acc;
    }, {} as Record<string, any>);

    const integratedMap = new Map();
    const cycle = new CycleManagerService();
    const segmentation = new SegmentationService();

    // 2. Procesar contactos de Intranet
    (intranetData || []).forEach(vet => {
      const rut = vet.rut;
      let sales = [];
      
      // Obtener ventas reales asociadas al RUT
      if (rut && salesByRut[rut]) {
        sales = [...salesByRut[rut].sales];
      }
      
      // Fallback: si no hay ventas en la colección de ventas, usar ventas del propio contacto
      if (sales.length === 0) {
        if (Array.isArray(vet.ventas) && vet.ventas.length > 0) {
          sales = [...vet.ventas];
        } else if (Array.isArray(vet.sales) && vet.sales.length > 0) {
          sales = [...vet.sales];
        } else {
          // Reconstruir desde los campos directos totalSales o montoAcumulado del contacto
          const totalVal = parseFloat(vet.totalSales) || parseFloat(vet.montoAcumulado) || parseFloat(vet.compras) || parseFloat(vet.ventasHistoricas) || 0;
          if (totalVal > 0) {
            sales = [{
              id: `v_sale_${vet.id || vet.rut}`,
              fecha: vet.lastPurchaseDate || vet.ultimaCompraDate || vet.ultimaCompra || new Date().toISOString().split('T')[0],
              total: totalVal,
              rut: vet.rut || '',
              name: vet.name || vet.nombre || 'Socio Veterinario',
              productos: vet.productosFrecuentes || vet.productosComprados || []
            }];
          }
        }
      }

      // Filtrar ventas del ciclo activo
      const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const evaluationSales = sales.filter((s: any) => cycle.isInEvaluationPeriod(s.fecha || s.date || s.createdAt));
      const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      
      // Filtrar ventas históricas (fuera de este ciclo o acumulados del contacto)
      const historicalSalesList = sales.filter((s: any) => !cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const historicalSalesValFromList = historicalSalesList.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      const contactHistoricalVal = parseFloat(vet.ventasHistoricas) || parseFloat(vet.montoHistorico) || 0;
      const historicalSalesVal = historicalSalesValFromList || contactHistoricalVal;

      // Última compra
      const lastPurchaseDate = sales.length > 0 
        ? new Date(Math.max(...sales.map((s: any) => new Date(s.fecha || s.date || 0).getTime()))).toISOString().split('T')[0]
        : vet.lastPurchaseDate || vet.ultimaCompraDate || vet.ultimaCompra || null;
        
      // Frecuencia, ticket promedio y productos comprados
      const frecuencia = vet.frecuencia || sales.length || (totalSales > 0 ? 1 : 0);
      const ticketPromedio = parseFloat(vet.ticketPromedio) || (frecuencia > 0 ? totalSales / frecuencia : 0);
      
      const productosComprados = Array.isArray(vet.productosComprados) && vet.productosComprados.length > 0 
        ? vet.productosComprados 
        : Array.isArray(vet.productosFrecuentes) && vet.productosFrecuentes.length > 0
          ? vet.productosFrecuentes
          : sales.flatMap(s => s.productos || s.items || []);

      const ejecutivoComercial = vet.ejecutivoComercial || vet.ejecutivo || 'Sin Asignar';
      const estadoComercial = vet.estadoComercial || vet.estado || (sales.length > 0 ? 'Activo' : 'Inactivo');
      
      // Promedio mensual (REGLAMENTO: promedio = ventas del ciclo / 12)
      const evaluationTotal = evaluationSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      const promedioMensual = Math.max(totalSales / 12, evaluationTotal / 12);

      // Categoría dinámica según promedio mensual
      const category = segmentation.categorizeByMonthlyAverage(promedioMensual);

      integratedMap.set(rut, {
        ...vet,
        id: vet.id || vet.rut,
        isClient: sales.length > 0,
        sales,
        cycleSales,
        totalSales,
        promedioMensual,
        ventasHistoricas: historicalSalesVal,
        lastPurchaseDate,
        ultimaCompra: lastPurchaseDate,
        frecuencia,
        ticketPromedio,
        productosComprados,
        montoAcumulado: totalSales + historicalSalesVal,
        ejecutivoComercial,
        estadoComercial,
        categoria: category,
        journeyState: category
      });
    });

    // 3. Procesar Ventas sin contacto en Intranet
    Object.keys(salesByRut).forEach(rut => {
      if (!integratedMap.has(rut)) {
        const salesInfo = salesByRut[rut];
        const sales = salesInfo.sales;

        const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
      const evaluationSales = sales.filter((s: any) => cycle.isInEvaluationPeriod(s.fecha || s.date || s.createdAt));
        const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
        
        const historicalSalesList = sales.filter((s: any) => !cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));
        const historicalSalesVal = historicalSalesList.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);

        const lastPurchaseDate = sales.length > 0 
          ? new Date(Math.max(...sales.map((s: any) => new Date(s.fecha || s.date || 0).getTime()))).toISOString().split('T')[0]
          : null;

        const frecuencia = sales.length;
        const ticketPromedio = frecuencia > 0 ? totalSales / frecuencia : 0;
        const productosComprados = sales.flatMap(s => s.productos || s.items || []);
        
        const evaluationTotal = evaluationSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
      const promedioMensual = Math.max(totalSales / 12, evaluationTotal / 12);
        const category = segmentation.categorizeByMonthlyAverage(promedioMensual);

        integratedMap.set(rut, {
          rut: rut,
          id: rut,
          name: salesInfo.name,
          email: salesInfo.email,
          isClient: true,
          sales,
          cycleSales,
          totalSales,
          promedioMensual,
          ventasHistoricas: historicalSalesVal,
          lastPurchaseDate,
          ultimaCompra: lastPurchaseDate,
          frecuencia,
          ticketPromedio,
          productosComprados,
          montoAcumulado: totalSales + historicalSalesVal,
          ejecutivoComercial: 'Sin Asignar',
          estadoComercial: 'Activo',
          categoria: category,
          journeyState: category
        });
      }
    });

    return Array.from(integratedMap.values());
  }
}
