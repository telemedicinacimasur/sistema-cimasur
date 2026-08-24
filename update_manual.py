import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove export functions
text = re.sub(r'const getMarkdown = \(\) => \{[\s\S]*?const handlePrint = \(\) => \{\n    window\.print\(\);\n  \};', 
r'''const [showPdfViewer, setShowPdfViewer] = useState(false);

  const handleDownloadPDF = () => {
    // Attempting to download a static PDF or trigger print
    const link = document.createElement('a');
    link.href = '/Manual_Operativo_CIMASUR.pdf';
    link.download = 'Manual_Operativo_CIMASUR.pdf';
    link.target = '_blank';
    link.click();
  };''', text)

# Update buttons
buttons_old = r'''<div className="flex flex-wrap items-center gap-2">[\s\S]*?</button>\n        </div>'''
buttons_new = r'''<div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPdfViewer(!showPdfViewer)}
            className="px-3.5 py-2 bg-[#152035] hover:bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Ver Manual en PDF"
          >
            <BookOpen className="w-4 h-4" />
            <span>{showPdfViewer ? 'Ocultar PDF' : '👁️ Ver Manual PDF'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 bg-[#152035] hover:bg-[#1E293B] text-emerald-400 border border-emerald-500/40 hover:border-emerald-500 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Descargar archivo PDF"
          >
            <Download className="w-4 h-4" />
            <span>📥 Descargar PDF</span>
          </button>
        </div>'''
text = re.sub(buttons_old, buttons_new, text)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Phase 1 done")
