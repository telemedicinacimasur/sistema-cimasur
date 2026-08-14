import re

with open('src/views/admin/VentasConsignacionView.tsx', 'r') as f:
    code = f.read()

# Let's search for the Activos / Inactivos Tab Switcher section
target_start = "{/* Activos / Inactivos Tab Switcher */}"
target_end = "</tbody>\n                            </table>\n                          </div>"

start_idx = code.find(target_start)
if start_idx == -1:
    print("target_start not found")
    exit(1)

end_idx = code.find(target_end, start_idx)
if end_idx == -1:
    print("target_end not found")
    exit(1)
end_idx += len(target_end)

new_content = """{/* Activos / Inactivos Tab Switcher */}
                          <div className="p-3 bg-[#080E1A] border-b border-[#1E293B] flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setRegistroVentasStockTab('activos')}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  registroVentasStockTab === 'activos'
                                    ? "bg-emerald-500 text-[#050914] shadow-lg shadow-emerald-500/20"
                                    : "bg-[#050914] text-slate-400 hover:text-white border border-[#1E293B]"
                                )}
                              >
                                🟢 Activos ({activeItems.length} lotes | {totalActiveStockUnits} u.)
                              </button>
                              <button
                                type="button"
                                onClick={() => setRegistroVentasStockTab('inactivos')}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  registroVentasStockTab === 'inactivos'
                                    ? "bg-slate-700 text-white shadow-lg shadow-slate-700/20"
                                    : "bg-[#050914] text-slate-400 hover:text-white border border-[#1E293B]"
                                )}
                              >
                                ⚪ Inactivos / Rebajados ({inactiveItems.length} lotes | {devolucionesList.length} rebajas)
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {registroVentasStockTab === 'activos' 
                                ? 'Mostrando lotes con stock activo (> 0)' 
                                : 'Mostrando lotes sin stock y registro histórico de productos rebajados/devueltos'}
                            </div>
                          </div>

                          {/* Subtabs when in Inactivos */}
                          {registroVentasStockTab === 'inactivos' && (
                            <div className="p-2.5 bg-[#0D1627]/90 border-b border-[#1E293B] flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('lotes')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'lotes'
                                      ? "bg-slate-600 text-white shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <Package size={13} />
                                  Lotes Agotados ({inactiveItems.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('rebajas')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'rebajas'
                                      ? "bg-amber-500 text-[#050914] font-black shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <RotateCcw size={13} />
                                  Historial de Rebajas / Devoluciones ({devolucionesList.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('todo')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'todo'
                                      ? "bg-sky-500 text-[#050914] font-black shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <ListFilter size={13} />
                                  Vista Completa
                                </button>
                              </div>
                              <div className="text-[10px] text-amber-400/90 font-mono font-bold">
                                Total Rebajado: <span className="text-amber-300 font-black">{totalDevolvedUnits} u.</span> ({formatCurrency(totalDevolvedAmount)})
                              </div>
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            {/* IF INACTIVOS SUBTAB IS REBAJAS ONLY */}
                            {registroVentasStockTab === 'inactivos' && inactivosSubTab === 'rebajas' ? (
                              <table className="w-full text-left">
                                <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                  <tr>
                                    <th className="p-4 pl-6">Producto / Lote</th>
                                    <th className="p-4 text-center">F. Rebaja</th>
                                    <th className="p-4 text-center">Unidades Rebajadas</th>
                                    <th className="p-4 text-center">Valor Unitario</th>
                                    <th className="p-4 text-center">Total Rebajado</th>
                                    <th className="p-4">Motivo / Justificación</th>
                                    <th className="p-4 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                  {devolucionesList.length > 0 ? (
                                    devolucionesList.map((d: any) => {
                                      const totalMonto = (Number(d.unidades) || 0) * (Number(d.precioUnitNeto) || 0);
                                      return (
                                        <tr key={d.id} className="hover:bg-[#1E293B]/20 transition-colors">
                                          <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-200 flex items-center gap-2">
                                              {d.productoId}
                                              <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                                Rebaja
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                              <span className="text-emerald-400">Solución: {d.solucionLote || 'S/L'}</span>
                                              <span>•</span>
                                              <span>Venc: {formatDateToDDMMYYYY(d.fechaVencimiento)}</span>
                                            </div>
                                          </td>
                                          <td className="p-4 text-center text-slate-300 font-semibold font-mono text-xs">
                                            {formatDateToDDMMYYYY(d.fecha)}
                                          </td>
                                          <td className="p-4 text-center">
                                            <span className="font-black px-2.5 py-1 rounded-full font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                                              -{d.unidades} u.
                                            </span>
                                          </td>
                                          <td className="p-4 text-center font-mono font-bold text-slate-300">
                                            {formatCurrency(d.precioUnitNeto || 0)}
                                          </td>
                                          <td className="p-4 text-center font-mono font-black text-rose-400">
                                            -{formatCurrency(totalMonto)}
                                          </td>
                                          <td className="p-4 text-slate-300 text-xs">
                                            <span className="bg-[#050914] px-2.5 py-1 rounded-lg border border-[#1E293B] text-[11px] text-slate-300 block w-fit">
                                              {d.motivo || 'Devolución / Ajuste de stock'}
                                            </span>
                                          </td>
                                          <td className="p-4 text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteDevolucion(d.loteId, d.id)}
                                              title="Revertir / Eliminar esta rebaja"
                                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                                        No se han registrado rebajas ni devoluciones de productos para este cliente.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              /* STANDARD TABLE FOR ACTIVOS, INACTIVOS (LOTES) OR TODO */
                              <>
                                <table className="w-full text-left">
                                  <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                    <tr>
                                      <th className="p-4 pl-6">Producto</th>
                                      <th className="p-4 text-center">F. Venc.</th>
                                      <th className="p-4 text-center">Valor Unitario</th>
                                      <th className="p-4 text-center">
                                        Stock Disponible ({registroVentasStockTab === 'activos' ? `${totalActiveStockUnits} u.` : '0 u.'})
                                      </th>
                                      <th className="p-4 text-center">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1E293B]/10 text-xs">
                                    {registroVentasStockTab === 'activos' ? (
                                      activeItems.length > 0 ? (
                                        activeItems.map(({ lote, traj }) => (
                                          <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors">
                                            <td className="p-4 pl-6">
                                              <div className="font-bold text-slate-200">{lote.productoId}</div>
                                              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Solución: {lote.solucionLote || 'S/S'}</span>
                                            </td>
                                            <td className="p-4 text-center text-slate-400 font-semibold font-mono">{formatDateToDDMMYYYY(lote.fechaVencimiento)}</td>
                                            <td className="p-4 text-center font-mono font-bold text-amber-400">
                                              {formatCurrency(lote.precioUnitNeto || 0)}
                                            </td>
                                            <td className="p-4 text-center">
                                              <span className="font-black px-2.5 py-1 rounded-full font-mono text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/20 block w-fit mx-auto">
                                                {traj?.frascosRestantes || 0} u.
                                              </span>
                                              {(() => {
                                                const devUnits = (lote.devoluciones || []).reduce((sum: number, d: any) => sum + (Number(d.unidades) || 0), 0);
                                                if (devUnits > 0) {
                                                  return (
                                                    <span className="text-[10px] text-amber-400 font-semibold font-mono mt-1 block">
                                                      Rebajado: -{devUnits} u.
                                                    </span>
                                                  );
                                                }
                                                return null;
                                              })()}
                                            </td>
                                            <td className="p-4 text-center">
                                              <div className="flex items-center justify-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => openDevolucionModal(lote)}
                                                  title="Registrar devolución o rebaja de stock"
                                                  className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <RotateCcw size={12} /> Rebaja
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openEditLoteModal(lote)}
                                                  title="Editar producto"
                                                  className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-[#050914] border border-sky-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Edit2 size={12} /> Editar
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openDeleteLoteModal(lote)}
                                                  title="Eliminar producto"
                                                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Trash2 size={12} /> Eliminar
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                            No hay productos con stock activo para este cliente.
                                          </td>
                                        </tr>
                                      )
                                    ) : (
                                      inactiveItems.length > 0 ? (
                                        inactiveItems.map(({ lote, traj }) => {
                                          const devUnits = (lote.devoluciones || []).reduce((sum: number, d: any) => sum + (Number(d.unidades) || 0), 0);
                                          return (
                                            <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors opacity-90">
                                              <td className="p-4 pl-6">
                                                <div className="font-bold text-slate-400 line-through">{lote.productoId}</div>
                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Solución: {lote.solucionLote || 'S/S'}</span>
                                              </td>
                                              <td className="p-4 text-center text-slate-500 font-semibold font-mono">{formatDateToDDMMYYYY(lote.fechaVencimiento)}</td>
                                              <td className="p-4 text-center font-mono font-bold text-amber-400/70">
                                                {formatCurrency(lote.precioUnitNeto || 0)}
                                              </td>
                                              <td className="p-4 text-center">
                                                <span className="font-black px-2.5 py-1 rounded-full font-mono text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                  0 u. (Agotado)
                                                </span>
                                                {devUnits > 0 && (
                                                  <span className="text-[10px] text-amber-400 font-semibold font-mono mt-1 block">
                                                    Rebajado por dev.: -{devUnits} u.
                                                  </span>
                                                )}
                                              </td>
                                              <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => openDevolucionModal(lote)}
                                                    title="Registrar devolución o rebaja de stock"
                                                    className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <RotateCcw size={12} /> Rebaja
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => openEditLoteModal(lote)}
                                                    title="Editar producto"
                                                    className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-[#050914] border border-sky-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <Edit2 size={12} /> Editar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => openDeleteLoteModal(lote)}
                                                    title="Eliminar producto"
                                                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <Trash2 size={12} /> Eliminar
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                            No hay productos inactivos o sin stock para este cliente.
                                          </td>
                                        </tr>
                                      )
                                    )}
                                    {inventoryStatus.length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                          Este cliente no posee ningún producto registrado en consignación.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>

                                {/* IF INACTIVOS SUBTAB IS TODO, ALSO RENDER THE REBAJADOS TABLE BELOW */}
                                {registroVentasStockTab === 'inactivos' && inactivosSubTab === 'todo' && devolucionesList.length > 0 && (
                                  <div className="mt-6 border-t border-[#1E293B] pt-4">
                                    <div className="px-4 py-2 flex items-center justify-between bg-[#080E1A] rounded-xl mb-3 border border-[#1E293B]">
                                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                                        <RotateCcw size={14} />
                                        Historial Detallado de Rebajas y Devoluciones ({devolucionesList.length})
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono font-bold">
                                        Total Rebajado: {totalDevolvedUnits} u. ({formatCurrency(totalDevolvedAmount)})
                                      </div>
                                    </div>
                                    <table className="w-full text-left">
                                      <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                        <tr>
                                          <th className="p-3 pl-6">Producto / Lote</th>
                                          <th className="p-3 text-center">F. Rebaja</th>
                                          <th className="p-3 text-center">Unidades Rebajadas</th>
                                          <th className="p-3 text-center">Valor Unitario</th>
                                          <th className="p-3 text-center">Total</th>
                                          <th className="p-3">Motivo</th>
                                          <th className="p-3 text-center">Acción</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                        {devolucionesList.map((d: any) => {
                                          const totalMonto = (Number(d.unidades) || 0) * (Number(d.precioUnitNeto) || 0);
                                          return (
                                            <tr key={d.id} className="hover:bg-[#1E293B]/20 transition-colors">
                                              <td className="p-3 pl-6">
                                                <div className="font-bold text-slate-200 flex items-center gap-2">
                                                  {d.productoId}
                                                  <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded font-mono font-bold uppercase">
                                                    Rebaja
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                                  <span className="text-emerald-400">Solución: {d.solucionLote || 'S/L'}</span>
                                                  <span>•</span>
                                                  <span>Venc: {formatDateToDDMMYYYY(d.fechaVencimiento)}</span>
                                                </div>
                                              </td>
                                              <td className="p-3 text-center text-slate-300 font-semibold font-mono text-xs">
                                                {formatDateToDDMMYYYY(d.fecha)}
                                              </td>
                                              <td className="p-3 text-center">
                                                <span className="font-black px-2 py-0.5 rounded-full font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                                                  -{d.unidades} u.
                                                </span>
                                              </td>
                                              <td className="p-3 text-center font-mono font-bold text-slate-300">
                                                {formatCurrency(d.precioUnitNeto || 0)}
                                              </td>
                                              <td className="p-3 text-center font-mono font-black text-rose-400">
                                                -{formatCurrency(totalMonto)}
                                              </td>
                                              <td className="p-3 text-slate-300 text-xs">
                                                <span className="bg-[#050914] px-2 py-0.5 rounded-lg border border-[#1E293B] text-[10px] text-slate-300 block w-fit">
                                                  {d.motivo || 'Devolución / Ajuste de stock'}
                                                </span>
                                              </td>
                                              <td className="p-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteDevolucion(d.loteId, d.id)}
                                                  title="Revertir / Eliminar esta rebaja"
                                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            )}
                          </div>"""

code = code[:start_idx] + new_content + code[end_idx:]

with open('src/views/admin/VentasConsignacionView.tsx', 'w') as f:
    f.write(code)

print("Upgraded Stock and Inactivos view successfully!")
