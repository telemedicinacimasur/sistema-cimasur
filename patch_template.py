import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                      {/* Dropdown Form 3: Importar Productos */}
                      {showImportForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-purple-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Upload size={14} /> Importación de Productos desde Excel
                          </h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">"""

new_code = """                      {/* Dropdown Form 3: Importar Productos */}
                      {showImportForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-purple-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                              <Upload size={14} /> Importación de Productos desde Excel
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                const header = ["Producto", "Solución/Lote", "Fecha Venc. (AAAA-MM-DD)", "Unidades Iniciales", "Precio Unitario"];
                                const demoRow = ["OZO-100", "L-45", "2027-12-31", 100, 25.50];
                                const ws = XLSX.utils.aoa_to_sheet([header, demoRow]);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
                                XLSX.writeFile(wb, "plantilla_importacion.xlsx");
                              }}
                              className="text-[10px] text-purple-400 font-bold uppercase underline hover:text-purple-300"
                            >
                              Descargar Plantilla Excel
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
