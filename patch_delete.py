import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    try {
      setSaving(true);"""

new_code = """  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    
    try {
      setSaving(true);"""

target2 = """      <td className="p-2 text-center w-20">
         <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Edit2 size={12} /></button>
            <button onClick={handleDelete} disabled={saving} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Trash2 size={12} /></button>
         </div>
      </td>"""

new_code2 = """      <td className="p-2 text-center w-20">
         <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {!isDeleting ? (
              <>
                <button onClick={() => setIsEditing(true)} className="bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Edit2 size={12} /></button>
                <button onClick={handleDelete} disabled={saving} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Trash2 size={12} /></button>
              </>
            ) : (
              <div className="flex items-center gap-1 bg-rose-500/10 p-1 rounded border border-rose-500/30">
                 <button onClick={handleDelete} className="text-[9px] font-black uppercase text-rose-400 px-1 hover:text-white">Confirmar</button>
                 <button onClick={() => setIsDeleting(false)} className="text-[9px] font-black uppercase text-slate-400 px-1 hover:text-white">X</button>
              </div>
            )}
         </div>
      </td>"""

content = content.replace(target, new_code)
content = content.replace(target2, new_code2)

with open(file_path, 'w') as f:
    f.write(content)
