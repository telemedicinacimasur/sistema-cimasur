import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  if (isEditing) {
    return (
      <tr className="bg-[#15233C]/40">
        <td className="p-2 border-l-4 border-sky-500">
           <span className="text-[9px] text-slate-500 block truncate w-24">{item.clientName}</span>
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
            <input type="text" className="w-full bg-[#050914] text-white border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none" value={form.productoId} onChange={e => setForm({...form, productoId: e.target.value})} />
          ) : (
             <div className="text-white text-xs font-black">{item.productoId} <span className="ml-1 text-[8px] bg-emerald-500 text-[#050914] px-1 rounded-full uppercase">REP</span></div>
          )}
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
             <input type="text" className="w-full bg-[#050914] text-emerald-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none font-mono uppercase text-center" value={form.solucionLote} onChange={e => setForm({...form, solucionLote: e.target.value})} />
          ) : (
             <div className="text-emerald-400 font-mono text-[10px] text-center">{item.solucionLote || 'S/L'}</div>
          )}
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
            <input type="date" className="w-full bg-[#050914] text-rose-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none text-center" value={form.fechaVencimiento} onChange={e => setForm({...form, fechaVencimiento: e.target.value})} />
          ) : (
            <div className="text-rose-400 text-[10px] text-center font-bold">{item.sortDate}</div>
          )}
        </td>
        <td className="p-2">
          <input type="number" className="w-16 mx-auto block bg-[#050914] text-sky-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none text-center" value={form.unidadesIniciales} onChange={e => setForm({...form, unidadesIniciales: parseInt(e.target.value) || 0})} />
        </td>
        <td className="p-2 text-center w-24">
          <div className="flex gap-1 justify-center">
             <button onClick={handleSave} disabled={saving} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-[#050914] p-1 rounded transition-colors"><Save size={12} /></button>
             <button onClick={() => setIsEditing(false)} className="bg-slate-700/50 text-slate-400 hover:bg-slate-700 p-1 rounded transition-colors"><X size={12} /></button>
          </div>
        </td>
      </tr>
    );
  }"""

new_code = """  if (isEditing) {
    return (
      <tr className="bg-[#15233C]/40">
        <td className="p-2 border-l-4 border-sky-500">
           <span className="text-[9px] text-slate-500 block truncate w-24">{item.clientName}</span>
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
            <input type="text" className="w-full bg-[#050914] text-white border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none" value={form.productoId} onChange={e => setForm({...form, productoId: e.target.value})} />
          ) : (
             <div className="text-white text-xs font-black">{item.productoId} <span className="ml-1 text-[8px] bg-emerald-500 text-[#050914] px-1 rounded-full uppercase">REP</span></div>
          )}
        </td>
        <td className="p-2">
          <input type="number" className="w-16 mx-auto block bg-[#050914] text-sky-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none text-center" value={form.unidadesIniciales} onChange={e => setForm({...form, unidadesIniciales: parseInt(e.target.value) || 0})} />
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
             <input type="text" className="w-full bg-[#050914] text-emerald-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none font-mono uppercase text-center" value={form.solucionLote} onChange={e => setForm({...form, solucionLote: e.target.value})} />
          ) : (
             <div className="text-emerald-400 font-mono text-[10px] text-center">{item.solucionLote || 'S/L'}</div>
          )}
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
            <input type="date" className="w-full bg-[#050914] text-rose-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none text-center" value={form.fechaVencimiento} onChange={e => setForm({...form, fechaVencimiento: e.target.value})} />
          ) : (
            <div className="text-rose-400 text-[10px] text-center font-bold">{item.sortDate}</div>
          )}
        </td>
        <td className="p-2">
          {item.type === 'ORIGINAL' ? (
             <input type="number" step="0.01" className="w-20 mx-auto block bg-[#050914] text-amber-400 border border-[#1E293B]/60 rounded px-1.5 py-1 text-xs outline-none text-right font-black" value={form.precioUnitNeto} onChange={e => setForm({...form, precioUnitNeto: parseFloat(e.target.value) || 0})} />
          ) : (
             <div className="text-amber-400 text-xs text-right font-black">{formatCurrency(item.precioUnitNeto || 0)}</div>
          )}
        </td>
        <td className="p-2 text-center w-24">
          <div className="flex gap-1 justify-center">
             <button onClick={handleSave} disabled={saving} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-[#050914] p-1 rounded transition-colors"><Save size={12} /></button>
             <button onClick={() => setIsEditing(false)} className="bg-slate-700/50 text-slate-400 hover:bg-slate-700 p-1 rounded transition-colors"><X size={12} /></button>
          </div>
        </td>
      </tr>
    );
  }"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
