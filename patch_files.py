import sys

def patch_club_comercial():
    file_path = 'src/components/crm/ClubComercialView.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_benefits_logic = [
        '                          {configBenefits[cat] && configBenefits[cat].map((benefit, bIdx) => (\n',
        '                            <div key={bIdx} className="bg-[#0D1527] p-2 rounded-lg border border-slate-800/80 flex items-center gap-2 group">\n',
        '                              <input \n',
        '                                type="text"\n',
        '                                value={benefit}\n',
        '                                onChange={(e) => {\n',
        '                                  const newBenefits = { ...configBenefits };\n',
        '                                  newBenefits[cat][bIdx] = e.target.value;\n',
        '                                  setConfigBenefits(newBenefits);\n',
        '                                }}\n',
        '                                className="w-full bg-[#152035] border border-slate-700 p-2 rounded text-xs text-white outline-none focus:border-sky-500"\n',
        '                              />\n',
        '                              <button \n',
        '                                type="button"\n',
        '                                onClick={() => {\n',
        '                                  const newBenefits = { ...configBenefits };\n',
        '                                  newBenefits[cat] = (newBenefits[cat] || []).filter((_, i) => i !== bIdx);\n',
        '                                  setConfigBenefits(newBenefits);\n',
        '                                }}\n',
        '                                className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"\n',
        '                              >\n',
        '                                <Trash2 size={12} />\n',
        '                              </button>\n',
        '                            </div>\n',
        '                          ))}\n',
        '                          <div className="flex gap-2">\n',
        '                            <input \n',
        '                              type="text"\n',
        '                              placeholder="Escribe y presiona Enter para añadir beneficio..."\n',
        '                              className="flex-1 bg-[#050914] border border-slate-800 border-dashed p-2 rounded text-xs text-slate-400 outline-none focus:border-sky-500"\n',
        '                              onKeyDown={(e) => {\n',
        '                                if (e.key === "Enter" && e.currentTarget.value.trim()) {\n',
        '                                  const val = e.currentTarget.value.trim();\n',
        '                                  setConfigBenefits(prev => ({...prev, [cat]: [...(prev[cat] || []), val]}));\n',
        '                                  e.currentTarget.value = "";\n',
        '                                  e.preventDefault();\n',
        '                                }\n',
        '                              }}\n',
        '                            />\n',
        '                          </div>\n'
    ]
    # Replace lines 538 to 566 (inclusive, 0-indexed: 537 to 566)
    lines[537:566] = new_benefits_logic
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Patched ClubComercialView.tsx")

def patch_crm_view():
    file_path = 'src/views/CRMView.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Use exact match for the problematic select value
    target = "value={CATEGORIAS.includes(r.categoria) ? r.categoria : 'Sin categoría'}"
    # Python strings can handle the UTF-8 í easily
    replacement = "value={(() => { const current = r.categoria || 'Sin categoría'; return CATEGORIAS.find(c => c.toLowerCase() === current.toLowerCase()) || 'Sin categoría'; })()}"
    
    if target in content:
        content = content.replace(target, replacement)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched CRMView.tsx")
    else:
        print("Target not found in CRMView.tsx - checking with alternative encoding")
        # Try a more flexible match
        import re
        content = re.sub(r"value=\{CATEGORIAS\.includes\(r\.categoria\)\s*\?\s*r\.categoria\s*:\s*'Sin categor[^']*'\}", replacement, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched CRMView.tsx with regex")

if __name__ == "__main__":
    patch_club_comercial()
    patch_crm_view()
