import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add PDF Viewer
pdf_viewer = r'''      {/* Barra de Búsqueda y Filtros de Navegación */}'''
pdf_viewer_repl = r'''      {showPdfViewer && (
        <div className="bg-[#152035] rounded-2xl border border-[#1E293B] overflow-hidden shadow-2xl h-[800px] flex flex-col">
          <div className="bg-[#111A2E] p-3 border-b border-[#1E293B] flex justify-between items-center">
             <h4 className="text-white font-bold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#38BDF8]"/> Visor de Documento PDF</h4>
             <button onClick={() => setShowPdfViewer(false)} className="text-slate-400 hover:text-white font-bold text-xs">Cerrar Visor</button>
          </div>
          <div className="flex-1 bg-slate-800 flex items-center justify-center p-4">
            <iframe src="/Manual_Operativo_CIMASUR.pdf" className="w-full h-full rounded border border-slate-700 bg-white" title="Manual PDF" />
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros de Navegación */}'''

text = text.replace(pdf_viewer, pdf_viewer_repl)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Phase 2 done")
