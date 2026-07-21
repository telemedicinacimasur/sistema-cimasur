import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                                  <th className="p-2 border-b border-[#1E293B]">Cliente</th>
                                  <th className="p-2 border-b border-[#1E293B]">Producto</th>
                                  <th className="p-2 border-b border-[#1E293B]">Solución</th>
                                  <th className="p-2 border-b border-[#1E293B]">Venc.</th>
                                  <th className="p-2 border-b border-[#1E293B] text-right">Precio</th>
                                  <th className="p-2 border-b border-[#1E293B] text-center">Acción</th>"""

new_code = """                                  <th className="p-2 border-b border-[#1E293B]">Cliente</th>
                                  <th className="p-2 border-b border-[#1E293B]">Producto</th>
                                  <th className="p-2 border-b border-[#1E293B] text-center">Stock</th>
                                  <th className="p-2 border-b border-[#1E293B]">Solución</th>
                                  <th className="p-2 border-b border-[#1E293B]">Venc.</th>
                                  <th className="p-2 border-b border-[#1E293B] text-right">Precio</th>
                                  <th className="p-2 border-b border-[#1E293B] text-center">Acción</th>"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
