#!/bin/bash
sed -i 's/const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));/const cycleSales = sales.filter((s: any) => cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt));\n      const evaluationSales = sales.filter((s: any) => cycle.isInEvaluationPeriod(s.fecha || s.date || s.createdAt));/g' src/services/crm/IntegrationService.ts

sed -i 's/const promedioMensual = totalSales \/ 12;/const evaluationTotal = evaluationSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);\n      const promedioMensual = Math.max(totalSales \/ 12, evaluationTotal \/ 12);/g' src/services/crm/IntegrationService.ts

sed -i 's/const totalVal = parseFloat(vet.totalSales) || parseFloat(vet.montoAcumulado) || parseFloat(vet.compras) || 0;/const totalVal = parseFloat(vet.totalSales) || parseFloat(vet.montoAcumulado) || parseFloat(vet.compras) || parseFloat(vet.ventasHistoricas) || 0;/g' src/services/crm/IntegrationService.ts
