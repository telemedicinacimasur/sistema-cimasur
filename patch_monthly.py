import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target1 = """                                    <th className="p-4 text-center">$ Total Inicial</th>"""
new_code1 = """                                    <th className="p-4 text-center">Precio Unit.</th>"""

target2 = """                                           <td className="p-4 text-center text-slate-400 font-bold font-mono text-xs">
                                             {formatCurrency(traj.stockDisponible * (Number(lote.precioUnitNeto) || 0))}
                                           </td>"""
new_code2 = """                                           <td className="p-4 text-center text-slate-400 font-bold font-mono text-xs">
                                             {formatCurrency(Number(lote.precioUnitNeto) || 0)}
                                           </td>"""

target3 = """                                   {/* Totals Row */}
                                   <tr className="bg-[#050914] border-t-2 border-[#1E293B]">
                                     <td colSpan={2} className="p-4 text-right text-slate-400 font-bold text-xs uppercase tracking-widest">
                                       Totales del Mes:
                                     </td>
                                     <td className="p-4 text-center font-black font-mono text-xs text-sky-400">
                                       {formatCurrency(filteredLotes.reduce((acc, item) => acc + (item.traj.stockDisponible * (Number(item.lote.precioUnitNeto) || 0)), 0))}
                                     </td>"""

new_code3 = """                                   {/* Totals Row */}
                                   <tr className="bg-[#050914] border-t-2 border-[#1E293B]">
                                     <td colSpan={2} className="p-4 text-right text-slate-400 font-bold text-xs uppercase tracking-widest">
                                       Totales del Mes:
                                     </td>
                                     <td className="p-4 text-center font-black font-mono text-[9px] text-slate-500 uppercase">
                                       {/* unit price sum not meaningful */}
                                     </td>"""

content = content.replace(target1, new_code1)
content = content.replace(target2, new_code2)
content = content.replace(target3, new_code3)

with open(file_path, 'w') as f:
    f.write(content)
