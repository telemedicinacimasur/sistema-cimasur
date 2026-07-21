import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                      {/* Filters inside fixed data admin */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          className="bg-[#050914] text-white border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-sky-500"
                          value={adminFilterProducto}
                          onChange={(e) => setAdminFilterProducto(e.target.value)}
                        />
                      </div>"""

new_code = """                      {/* Filters inside fixed data admin */}
                      <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                        <div className="w-64">
                          <ClientAutocomplete
                            clientes={clientes}
                            value={adminFilterCliente}
                            onChange={setAdminFilterCliente}
                            placeholder="Buscar y filtrar por cliente..."
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          className="bg-[#050914] text-white border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-sky-500 w-64"
                          value={adminFilterProducto}
                          onChange={(e) => setAdminFilterProducto(e.target.value)}
                        />
                        {(adminFilterCliente || adminFilterProducto) && (
                           <button
                             onClick={() => { setAdminFilterCliente(''); setAdminFilterProducto(''); }}
                             className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                           >
                             Limpiar Filtros
                           </button>
                        )}
                      </div>"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
