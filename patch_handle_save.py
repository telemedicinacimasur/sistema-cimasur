import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """        for (const lote of lotesActivos) {
          const mov = lote.movimientos?.[selectedMonth];
          if (mov && mov.hidden) continue;
          
          const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
          if (selectedMonth < startMonth) continue; // Skip if not delivered yet

          const currentSales = Number(salesInputs[lote.id] || 0);"""

new_code = """        for (const lote of lotesActivos) {
          const mov = lote.movimientos?.[selectedMonth];
          if (!mov || mov.hidden) continue; // ONLY save if it is already in the month!
          
          const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
          if (selectedMonth < startMonth) continue; // Skip if not delivered yet

          const currentSales = Number(salesInputs[lote.id] || 0);"""

target2 = """          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const mov = l.movimientos?.[selectedMonth];
              if (mov && mov.hidden) return;
              
              const startMonth = parseDateString(l.fechaEntrega).substring(0, 7);
              if (selectedMonth >= startMonth) {"""

new_code2 = """          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const mov = l.movimientos?.[selectedMonth];
              if (!mov || mov.hidden) return; // ONLY save if already in the month!
              
              const startMonth = parseDateString(l.fechaEntrega).substring(0, 7);
              if (selectedMonth >= startMonth) {"""

content = content.replace(target, new_code)
content = content.replace(target2, new_code2)

with open(file_path, 'w') as f:
    f.write(content)
