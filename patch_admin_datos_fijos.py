import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '<div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">' in line:
        start_idx = i
        break

if start_idx != -1:
    braces = 0
    in_jsx = False
    for i in range(start_idx, len(lines)):
        braces += lines[i].count('{') - lines[i].count('}')
        if '{todosLosLotes.filter(lote => {' in lines[i]:
            in_jsx = True
        
        # We need to find where this div closes. Let's just count div tags
        pass

# Let's use simple find and replace by strings
content = "".join(lines)

target = """                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                        {todosLosLotes.filter(lote => {
                          if (adminFilterCliente && lote.clienteId !== adminFilterCliente) return false;
                          if (adminFilterProducto && !lote.productoId.toLowerCase().includes(adminFilterProducto.toLowerCase())) return false;
                          return true;
                        }).length > 0 ? (
                          todosLosLotes.filter(lote => {
                            if (adminFilterCliente && lote.clienteId !== adminFilterCliente) return false;
                            if (adminFilterProducto && !lote.productoId.toLowerCase().includes(adminFilterProducto.toLowerCase())) return false;
                            return true;
                          }).map(lote => {
                            const clientName = clientes.find(c => c.id === lote.clienteId)?.name || 'Cliente';
                            return (
                              <div key={lote.id} className="relative border-l-4 border-sky-500 pl-2">
                                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                                <div className="mb-1 flex items-center gap-2">
                                  {lote.reposiciones && lote.reposiciones.length > 0 && (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                      <RefreshCw size={8} /> Con Reposiciones
                                    </span>
                                  )}
                                </div>
                                <LoteFixedDataEditor 
                                  lote={lote} 
                                  uniqueProducts={uniqueProducts} 
                                  onRefresh={async () => {
                                    if (declaracionCliente) await loadLotes(declaracionCliente);
                                    await loadTodosLosLotes();
                                  }} 
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-slate-500 font-semibold text-xs">
                            No se encontraron lotes para los filtros seleccionados.
                          </div>
                        )}
                      </div>"""

new_code = """                      {(() => {
                        const filteredLotes = todosLosLotes.filter(lote => {
                          if (adminFilterCliente && lote.clienteId !== adminFilterCliente) return false;
                          if (adminFilterProducto && !lote.productoId.toLowerCase().includes(adminFilterProducto.toLowerCase())) return false;
                          return true;
                        });

                        const flattenedItems: any[] = [];
                        filteredLotes.forEach(l => {
                          const cName = clientes.find(c => c.id === l.clienteId)?.name || 'Cliente';
                          // Lote original
                          flattenedItems.push({
                            ...l,
                            displayId: l.id,
                            type: 'ORIGINAL',
                            sortDate: l.fechaVencimiento,
                            displayUnidades: l.unidadesIniciales,
                            clientName: cName
                          });
                          
                          // Reposiciones como filas separadas
                          l.reposiciones?.forEach((rep: any, idx: number) => {
                            flattenedItems.push({
                              ...l,
                              displayId: `${l.id}_rep_${idx}`,
                              type: 'REP',
                              sortDate: l.fechaVencimiento,
                              displayUnidades: rep.unidades,
                              fechaRep: rep.fecha,
                              clientName: cName,
                              repIndex: idx
                            });
                          });
                        });

                        const sortedItems = [...flattenedItems].sort((a, b) => {
                          const nameA = (a.productoId || "").toString().toLowerCase();
                          const nameB = (b.productoId || "").toString().toLowerCase();
                          if (nameA !== nameB) return nameA.localeCompare(nameB);
                          return (a.sortDate || "").localeCompare(b.sortDate || "");
                        });

                        const earliestMap: Record<string, string> = {};
                        sortedItems.forEach(item => {
                          if (!earliestMap[item.productoId]) {
                            earliestMap[item.productoId] = item.displayId;
                          }
                        });

                        if (sortedItems.length === 0) {
                          return (
                            <div className="text-center py-8 text-slate-500 font-semibold text-xs">
                              No se encontraron lotes para los filtros seleccionados.
                            </div>
                          );
                        }

                        return (
                          <div className="max-h-[450px] overflow-y-auto border border-[#1E293B] rounded-xl bg-[#050914] shadow-inner">
                            <table className="w-full text-left text-[10px]">
                              <thead className="bg-[#0D1627] text-slate-400 uppercase font-black text-[9px] sticky top-0 z-10 shadow-sm">
                                <tr>
                                  <th className="p-2 border-b border-[#1E293B]">Cliente</th>
                                  <th className="p-2 border-b border-[#1E293B]">Producto</th>
                                  <th className="p-2 border-b border-[#1E293B]">Solución</th>
                                  <th className="p-2 border-b border-[#1E293B]">Venc.</th>
                                  <th className="p-2 border-b border-[#1E293B] text-right">Precio</th>
                                  <th className="p-2 border-b border-[#1E293B] text-center">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1E293B]">
                                {sortedItems.map(l => {
                                  const isFIFO = earliestMap[l.productoId] === l.displayId;
                                  return (
                                    <LoteFixedDataRow 
                                      key={l.displayId} 
                                      item={l} 
                                      isFIFO={isFIFO} 
                                      onRefresh={async () => {
                                        if (declaracionCliente) await loadLotes(declaracionCliente);
                                        await loadTodosLosLotes();
                                      }}
                                    />
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
