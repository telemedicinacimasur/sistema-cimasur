import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                                           <td className="p-4 text-center text-slate-300 font-bold font-mono text-sm">
                                             {traj.stockDisponible} u.
                                           </td>
                                           <td className="p-4 text-center bg-sky-500/5">"""

new_code = """                                           <td className="p-4 text-center text-slate-300 font-bold font-mono text-sm">
                                             {traj.stockDisponible} u.
                                           </td>
                                           <td className="p-4 text-center text-slate-400 font-bold font-mono text-xs">
                                             {formatCurrency(traj.stockDisponible * (Number(lote.precioUnitNeto) || 0))}
                                           </td>
                                           <td className="p-4 text-center bg-sky-500/5">"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
