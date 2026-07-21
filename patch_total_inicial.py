import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                                           <td className="p-4 text-center text-slate-300 font-bold font-mono text-sm">
                                             {traj.stockDisponible} u.
                                           </td>
                                           <td className="p-4 text-center text-slate-400 font-bold font-mono text-xs">
                                             {formatCurrency(traj.stockDisponible * (Number(lote.precioUnitNeto) || 0))}
                                           </td>"""

# Just making sure this doesn't fail due to white space, let me grep it first
