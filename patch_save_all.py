import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """        for (const lote of lotesActivos) {
          const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
          if (selectedMonth < startMonth) continue; // Skip if not delivered yet"""

new_code = """        for (const lote of lotesActivos) {
          const mov = lote.movimientos?.[selectedMonth];
          if (mov && mov.hidden) continue;
          
          const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
          if (selectedMonth < startMonth) continue; // Skip if not delivered yet"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
