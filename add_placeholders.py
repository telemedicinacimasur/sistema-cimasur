import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

placeholder_comp = """
const ScreenshotPlaceholder = ({ title }: { title: string }) => (
  <div className="mt-4 mb-6 border-2 border-dashed border-[#1E293B] rounded-xl p-8 flex flex-col items-center justify-center bg-[#111A2E]/50 text-slate-500 hover:bg-[#1E293B]/50 transition-colors">
    <div className="bg-[#1E293B] p-3 rounded-full mb-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <p className="text-sm font-bold text-slate-400 mb-1">📸 Captura de Pantalla: {title}</p>
    <p className="text-xs text-slate-500 italic text-center max-w-sm">
      Espacio reservado para la inserción de la interfaz visual. Para actualizar, cargue la imagen correspondiente en los assets.
    </p>
  </div>
);
"""

text = re.sub(r'export default function ManualOperativo\(\) \{', placeholder_comp + '\nexport default function ManualOperativo() {', text)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

