import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 text-center">Stock Disponible</th>
                                    <th className="p-4 text-center bg-sky-500/5 text-sky-400 w-44">und vendida</th>
                                    <th className="p-4 text-center">$ vendido</th>
                                    <th className="p-4 text-center">Frascos Restantes en Stock</th>
                                    <th className="p-4 pr-6 text-center w-80">Reposición</th>"""

new_code = """                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 text-center">Stock Inicial</th>
                                    <th className="p-4 text-center">$ Total Inicial</th>
                                    <th className="p-4 text-center bg-sky-500/5 text-sky-400 w-44">und vendida</th>
                                    <th className="p-4 text-center">$ Vendido</th>
                                    <th className="p-4 text-center">Frascos Restantes</th>
                                    <th className="p-4 pr-6 text-center w-80">Reposición</th>"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
