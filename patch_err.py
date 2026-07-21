import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = 'alert("No se encontraron registros válidos. Formato: Producto | Solución | Fecha (AAAA-MM-DD) | Unidades | Precio");'
new_code = 'alert("No se encontraron registros válidos. Formato: Producto | Solución/Lote | Fecha Venc. (AAAA-MM-DD) | Unidades Iniciales | Precio Unitario");'

content = content.replace(target, new_code)

with open(file_path, 'w') as f:
    f.write(content)
