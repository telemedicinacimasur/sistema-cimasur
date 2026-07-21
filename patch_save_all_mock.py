import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const startMonth = parseDateString(l.fechaEntrega).substring(0, 7);
              if (selectedMonth >= startMonth) {"""

new_code = """          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const mov = l.movimientos?.[selectedMonth];
              if (mov && mov.hidden) return;
              
              const startMonth = parseDateString(l.fechaEntrega).substring(0, 7);
              if (selectedMonth >= startMonth) {"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
