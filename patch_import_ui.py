import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '{/* Dropdown Form 3: Importar Productos */}' in line:
        start_idx = i
        break

if start_idx != -1:
    braces = 0
    in_jsx = False
    for i in range(start_idx+1, len(lines)):
        if '{showImportForm && (' in lines[i]:
            in_jsx = True
        
        braces += lines[i].count('{') - lines[i].count('}')
        if in_jsx and braces == 0:
            end_idx = i
            break

new_ui = """                      {/* Dropdown Form 3: Importar Productos */}
                      {showImportForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-purple-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Upload size={14} /> Importación de Productos desde Excel
                          </h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cliente Destinatario</label>
                              <ClientAutocomplete
                                clientes={clientes}
                                value={importClienteId}
                                onChange={setImportClienteId}
                                placeholder="Escriba para buscar cliente..."
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cargar Archivo Excel (.xlsx)</label>
                              <div 
                                className={cn(
                                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                                  importFile ? "border-emerald-500 bg-emerald-500/10" : "border-purple-500/30 bg-[#050914] hover:bg-purple-500/5 hover:border-purple-500"
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files[0];
                                  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                                    setImportFile(file);
                                  } else {
                                    alert('Por favor, suba un archivo Excel (.xlsx o .xls)');
                                  }
                                }}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.xlsx,.xls';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) setImportFile(file);
                                  };
                                  input.click();
                                }}
                              >
                                {importFile ? (
                                  <div>
                                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <Check size={24} />
                                    </div>
                                    <span className="text-xs text-emerald-400 font-bold block">{importFile.name}</span>
                                    <span className="text-[10px] text-slate-500 mt-1 block">{(importFile.size / 1024).toFixed(2)} KB</span>
                                  </div>
                                ) : (
                                  <div>
                                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce-slow" />
                                    <span className="text-xs text-slate-300 font-bold block">Arrastre aquí su archivo Excel o haga clic para seleccionar</span>
                                    <span className="text-[10px] text-slate-500 mt-1 block">Formato: .xlsx. Columnas: Producto | Solución | Vencimiento | Unidades | Precio</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImportForm(false);
                                  setImportFile(null);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (importFile) {
                                    handleImportExcel(importFile, importClienteId);
                                  } else {
                                    alert('Debe cargar un archivo Excel primero.');
                                  }
                                }}
                                disabled={!importFile}
                                className={cn(
                                  "px-5 py-2 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all",
                                  importFile ? "bg-purple-500 hover:bg-purple-600 text-[#050914] shadow-purple-500/10" : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                )}
                              >
                                Importar Excel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
"""

lines[start_idx:end_idx+1] = [new_ui]

with open(file_path, 'w') as f:
    f.writelines(lines)
