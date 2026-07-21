import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                                   </tr>
                                 </tbody>
                              </table>
                            </div>
                            <div className="p-6 border-t border-[#1E293B]/40 bg-[#0D1627] flex justify-between items-center flex-wrap gap-4">"""

new_code = """                                   </tr>
                                   {/* Totals Row */}
                                   <tr className="bg-[#050914] border-t-2 border-[#1E293B]">
                                     <td colSpan={2} className="p-4 text-right text-slate-400 font-bold text-xs uppercase tracking-widest">
                                       Totales del Mes:
                                     </td>
                                     <td className="p-4 text-center font-black font-mono text-xs text-sky-400">
                                       {formatCurrency(activeLotesForMonth.reduce((acc, item) => acc + (item.traj.stockDisponible * (Number(item.lote.precioUnitNeto) || 0)), 0))}
                                     </td>
                                     <td className="p-4 text-center"></td>
                                     <td className="p-4 text-center font-black font-mono text-sm text-emerald-400">
                                       {formatCurrency(activeLotesForMonth.reduce((acc, item) => {
                                          const sales = Number(salesInputs[item.lote.id] || 0);
                                          return acc + (sales * (Number(item.lote.precioUnitNeto) || 0));
                                       }, 0))}
                                     </td>
                                     <td colSpan={2} className="p-4 text-center font-black font-mono text-xs text-slate-300">
                                       {activeLotesForMonth.reduce((acc, item) => acc + item.traj.frascosRestantes, 0)} u. (Saldo Final)
                                     </td>
                                   </tr>
                                 </tbody>
                              </table>
                            </div>
                            <div className="p-6 border-t border-[#1E293B]/40 bg-[#0D1627] flex justify-between items-center flex-wrap gap-4">"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
