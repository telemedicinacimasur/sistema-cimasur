import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Change the title to 11
text = text.replace("4. Módulo de Laboratorio (12 Submódulos Operativos)", "4. Módulo de Laboratorio (11 Submódulos Operativos)")
text = text.replace("los 12 submódulos de Laboratorio", "los 11 submódulos de Laboratorio")
text = text.replace("4. Módulo de Laboratorio (12 Submódulos)", "4. Módulo de Laboratorio (11 Submódulos)")

# Remove 4.12 from the HTML section
# It's an inner div inside the Laboratorio module
regex_412_html = r'<div className="bg-\[\#111A2E\] p-5 rounded-xl border border-\[\#1E293B\] shadow-sm hover:border-slate-600 transition-colors">\s*<h3 className="text-sm font-black text-white text-pink-400 uppercase flex items-center gap-2">\s*<Stethoscope className="w-4 h-4" /> 4\.12\. Fichas Especializadas / Dr\. Conejero \(Módulo EC\)\s*</h3>\s*<ul className="list-disc pl-5 mt-3 space-y-1 text-slate-400 text-sm">\s*<li><strong>Propósito:</strong> Protocolos técnicos especiales, combinaciones individualizadas y notas de formulación clínica\.</li>\s*</ul>\s*</div>'
text = re.sub(regex_412_html, '', text)

# Also remove from getManualHTML
regex_412_string = r'### 4\.12 Fichas Especializadas / Dr\. Conejero \(Módulo EC\)\n- \*\*Propósito:\*\* Protocolos técnicos especiales, combinaciones individualizadas y notas de formulación clínica\.'
text = re.sub(regex_412_string, '', text)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

