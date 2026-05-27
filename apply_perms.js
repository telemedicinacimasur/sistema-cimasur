const fs = require('fs');

const views = [
  { file: 'src/views/LabView.tsx', role: 'lab' },
  { file: 'src/views/CRMView.tsx', role: 'crm' },
  { file: 'src/views/SchoolView.tsx', role: 'school' },
  { file: 'src/views/GestionView.tsx', role: 'gestion' },
  { file: 'src/views/AdminView.tsx', role: 'manager' }, 
  { file: 'src/views/PizarraView.tsx', role: 'crm' }
];

for (const v of views) {
  if (!fs.existsSync(v.file)) continue;
  let code = fs.readFileSync(v.file, 'utf8');

  // Inject permissions if not already there
  if (!code.includes('const canEdit =') && code.includes('const { user } = useAuth();')) {
     code = code.replace(
       'const { user } = useAuth();',
       `const { user } = useAuth();\n  const canEdit = user?.roles?.includes('admin') || user?.permissions?.['${v.role}']?.edit !== false;\n  const canDelete = user?.roles?.includes('admin') || user?.permissions?.['${v.role}']?.delete !== false;`
     );
  }

  // To wrap forms safely: find `<form ` and `</form>`, wrap them in `<div className="relative group">` -> `{!canEdit && <div className="absolute inset-x-0 -inset-y-2 z-40 bg-[#0F172A]/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl flex-col gap-2 opacity-100 transition-opacity"><span className="bg-slate-900 border border-slate-700 text-sky-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl shadow-xl">🛡️ MODO LECTOR ACTIVO</span><span className="text-[9px] text-slate-400 font-bold uppercase">Formulario bloqueado</span></div>}\n<form ` and `</form></div>`
  
  // Actually, regular expressions for balanced tags are hard, but we can just do a simple replacement if the form is formatted predictably.
  // BUT wait! Some forms might be conditionally rendered `{cond && <form>...</form>}`.
  
  // A much simpler and robust approach is to render a style tag at the top of the component that uses pointer-events-none on forms and hides trash icons.
  
  fs.writeFileSync(v.file, code);
}
