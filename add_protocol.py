import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

protocol = """
      {/* 8. Protocolo de Soporte Interno */}
      <div className="bg-[#111A2E] p-6 rounded-2xl border border-red-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">8. Protocolo Técnico y Primeros Auxilios</h2>
        </div>
        <div className="space-y-4 text-slate-300 text-sm">
          
          <div className="bg-[#152035] p-4 rounded-xl border border-[#1E293B]">
            <h4 className="text-[#38BDF8] font-bold mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> Arquitectura y Despliegue</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>La estructura y código fuente proviene directamente de AI Studio.</li>
              <li>El flujo de actualización consiste en hacer Push a GitHub y Render ejecuta el Deploy automático para reflejar los cambios en producción.</li>
              <li>La base de datos es Google Firebase Firestore.</li>
            </ul>
          </div>

          <div className="bg-[#152035] p-4 rounded-xl border border-[#1E293B]">
            <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Control Estricto de Lecturas Firestore (Uso Gratuito)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mantener la aplicación <strong>CERRADA</strong> y abrirla <strong>ÚNICAMENTE</strong> durante su uso operativo real.</li>
              <li>Monitorear de forma continua el límite de lecturas gratuitas (máximo 50.000 lecturas diarias) en: <em>Firebase Console &gt; Configuración &gt; Uso y Facturación &gt; Lecturas</em>.</li>
            </ul>
          </div>

          <div className="bg-[#152035] p-4 rounded-xl border border-[#1E293B]">
            <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><HelpCircle className="w-4 h-4"/> Soporte y Resolución de Errores (Primeros Auxilios)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ante cualquier error de sistema o pantalla roja, <strong>CERRAR INMEDIATAMENTE LA APLICACIÓN</strong>.</li>
              <li>Consultar directamente en el Chat de AI Studio o a Gemini adjuntando <strong>SIEMPRE</strong> capturas de pantalla completas del error.</li>
              <li><strong>No solicitar modificaciones adicionales</strong> de código sin antes consultar la causa raíz con la IA.</li>
            </ul>
          </div>
        </div>
      </div>
"""

# Find the end of the manual content wrapper
text = text.replace("    </div>\n  );\n}", protocol + "\n    </div>\n  );\n}")

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Protocol added")
