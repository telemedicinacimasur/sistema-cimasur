import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Modules
modules = [
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">1. Visión General y Arquitectura del Sistema</h2>', '1. Visión General y Arquitectura del Sistema'),
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">2. Módulo Comercial CRM</h2>', '2. Módulo Comercial CRM'),
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">3. Módulo de Gestión</h2>', '3. Módulo de Gestión'),
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">5. Módulo de Administración</h2>', '5. Módulo de Administración'),
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">6. Módulo Escuela CIMASUR</h2>', '6. Módulo Escuela CIMASUR'),
    (r'<h2 className="text-xl font-bold text-white uppercase tracking-wide">7. Estándar de Paginación y Rendimiento Global</h2>', '7. Estándar de Paginación y Rendimiento Global'),
]

for old, title in modules:
    replacement = old + f'\n              <ScreenshotPlaceholder title="{title}" />'
    text = text.replace(old, replacement)

# Lab Submodules
submodules = [
    (r'<h3 className="text-sm font-black text-white text-\[#38BDF8\] uppercase flex items-center gap-2">\s*<ClipboardCheck className="w-4 h-4" /> 4.1. Seguimiento de Pedidos \(Courier & Trazabilidad\)\s*</h3>', '4.1. Seguimiento de Pedidos (Courier & Trazabilidad)'),
    (r'<h3 className="text-sm font-black text-white text-emerald-400 uppercase flex items-center gap-2">\s*<Package className="w-4 h-4" /> 4.2. Stock de Insumo Diario\s*</h3>', '4.2. Stock de Insumo Diario'),
    (r'<h3 className="text-sm font-black text-white text-violet-400 uppercase flex items-center gap-2">\s*<FlaskConical className="w-4 h-4" /> 4.3. Elaboración Gotas y Diluciones\s*</h3>', '4.3. Elaboración Gotas y Diluciones'),
    (r'<h3 className="text-sm font-black text-white text-orange-400 uppercase flex items-center gap-2">\s*<Beaker className="w-4 h-4" /> 4.4. Formulación Magistral\s*</h3>', '4.4. Formulación Magistral'),
    (r'<h3 className="text-sm font-black text-white text-pink-400 uppercase flex items-center gap-2">\s*<CheckCircle2 className="w-4 h-4" /> 4.5. Evaluación Gotas Puras\s*</h3>', '4.5. Evaluación Gotas Puras'),
    (r'<h3 className="text-sm font-black text-white text-teal-400 uppercase flex items-center gap-2">\s*<Microscope className="w-4 h-4" /> 4.6. Ingreso Nosodes\s*</h3>', '4.6. Ingreso Nosodes'),
    (r'<h3 className="text-sm font-black text-white text-cyan-400 uppercase flex items-center gap-2">\s*<Droplets className="w-4 h-4" /> 4.7. Ficha Tinturas Madres\s*</h3>', '4.7. Ficha Tinturas Madres'),
    (r'<h3 className="text-sm font-black text-white text-indigo-400 uppercase flex items-center gap-2">\s*<Layers className="w-4 h-4" /> 4.8. Preparación Gotas Puras\s*</h3>', '4.8. Preparación Gotas Puras'),
    (r'<h3 className="text-sm font-black text-white text-rose-400 uppercase flex items-center gap-2">\s*<Table className="w-4 h-4" /> 4.9. Registro de Insumos laboratorio T.M. y otros\s*</h3>', '4.9. Registro de Insumos laboratorio T.M. y otros'),
    (r'<h3 className="text-sm font-black text-white text-amber-400 uppercase flex items-center gap-2">\s*<BookOpen className="w-4 h-4" /> 4.10. Vademécum Técnico\s*</h3>', '4.10. Vademécum Técnico'),
    (r'<h3 className="text-sm font-black text-white text-slate-300 uppercase flex items-center gap-2">\s*<Settings className="w-4 h-4" /> 4.11. Mantención de Equipos\s*</h3>', '4.11. Mantención de Equipos'),
]

for regex, title in submodules:
    match = re.search(regex, text)
    if match:
        replacement = match.group(0) + f'\n                  <ScreenshotPlaceholder title="{title}" />'
        text = text.replace(match.group(0), replacement)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

