import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """      <td className="p-2">
        <div className={cn("font-black text-xs", isFIFO ? "text-rose-400" : "text-white")}>
          {item.productoId}
          {isFIFO && <span className="ml-2 text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Prioridad FIFO</span>}
          {item.type === 'REP' && <span className="ml-2 text-[8px] bg-emerald-500 text-[#050914] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">REP</span>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[9px] text-slate-500 font-bold uppercase">
            {item.type === 'ORIGINAL' ? 'Stock Original:' : `Reposición (${item.fechaRep}):`}
          </span>
          <span className="text-[9px] text-sky-400 font-mono font-black">{item.displayUnidades}u</span>
        </div>
      </td>
      <td className="p-2 text-emerald-400 font-mono text-[10px]">{item.solucionLote || 'S/L'}</td>"""

new_code = """      <td className="p-2">
        <div className={cn("font-black text-xs", isFIFO ? "text-rose-400" : "text-white")}>
          {item.productoId}
          {isFIFO && <span className="ml-2 text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Prioridad FIFO</span>}
          {item.type === 'REP' && <span className="ml-2 text-[8px] bg-emerald-500 text-[#050914] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">REP</span>}
        </div>
      </td>
      <td className="p-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-sky-400 font-mono font-black bg-sky-500/10 px-2 py-0.5 rounded">
            {item.displayUnidades} u.
          </span>
          <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
            {item.type === 'ORIGINAL' ? 'Original' : `Rep (${item.fechaRep})`}
          </span>
        </div>
      </td>
      <td className="p-2 text-emerald-400 font-mono text-[10px]">{item.solucionLote || 'S/L'}</td>"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
