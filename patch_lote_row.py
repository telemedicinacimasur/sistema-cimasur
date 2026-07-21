import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

new_comp = """function LoteFixedDataRow({ item, isFIFO, onRefresh }: { item: any, isFIFO: boolean, onRefresh: () => void | Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    productoId: item.productoId || '',
    solucionLote: item.solucionLote || '',
    fechaVencimiento: item.fechaVencimiento || '',
    unidadesIniciales: Number(item.displayUnidades) || 100,
    precioUnitNeto: Number(item.precioUnitNeto) || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const units = Number(form.unidadesIniciales);
      const price = Number(form.precioUnitNeto);
      const totalVal = units * price;
      
      if (isFirebaseReady()) {
        const db = getDb();
        const docRef = doc(db, 'crm_consignacion_lotes', item.id);
        
        if (item.type === 'ORIGINAL') {
          await setDoc(docRef, {
            productoId: form.productoId.toUpperCase().trim(),
            solucionLote: form.solucionLote.toUpperCase().trim() || 'S/L',
            fechaVencimiento: form.fechaVencimiento,
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal
          }, { merge: true });
        } else if (item.type === 'REP') {
          // Edit specific reposicion
          const loteDoc = await getDoc(docRef);
          if (loteDoc.exists()) {
            const data = loteDoc.data();
            const repos = data.reposiciones || [];
            if (repos[item.repIndex]) {
               repos[item.repIndex].unidades = units;
               // Wait, repositions don't have separate prices and dates in this structure?
               // The user said "Edite los datos originales de cada producto en consignacion"
               await setDoc(docRef, { reposiciones: repos }, { merge: true });
            }
          }
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const index = allLotes.findIndex((l: any) => l.id === item.id);
          if (index !== -1) {
            if (item.type === 'ORIGINAL') {
                allLotes[index].productoId = form.productoId.toUpperCase().trim();
                allLotes[index].solucionLote = form.solucionLote.toUpperCase().trim() || 'S/L';
                allLotes[index].fechaVencimiento = form.fechaVencimiento;
                allLotes[index].unidadesIniciales = units;
                allLotes[index].precioUnitNeto = price;
                allLotes[index].totalVentaOriginal = totalVal;
            } else if (item.type === 'REP') {
                const repos = allLotes[index].reposiciones || [];
                if (repos[item.repIndex]) {
                   repos[item.repIndex].unidades = units;
                }
            }
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }
      setIsEditing(false);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar datos: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    try {
      setSaving(true);
      if (isFirebaseReady()) {
        const db = getDb();
        const docRef = doc(db, 'crm_consignacion_lotes', item.id);
        
        if (item.type === 'ORIGINAL') {
           // Si elimina el original, sugerimos eliminar todo o las reps tb mueren. 
           await deleteDoc(docRef);
        } else if (item.type === 'REP') {
           const loteDoc = await getDoc(docRef);
           if (loteDoc.exists()) {
             const data = loteDoc.data();
             let repos = data.reposiciones || [];
             repos.splice(item.repIndex, 1);
             await setDoc(docRef, { reposiciones: repos }, { merge: true });
           }
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          if (item.type === 'ORIGINAL') {
             allLotes = allLotes.filter((l: any) => l.id !== item.id);
          } else if (item.type === 'REP') {
             const index = allLotes.findIndex((l: any) => l.id === item.id);
             if (index !== -1) {
                let repos = allLotes[index].reposiciones || [];
                repos.splice(item.repIndex, 1);
                allLotes[index].reposiciones = repos;
             }
          }
          localStorage.setItem(key, JSON.stringify(allLotes));
        }
      }
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Error al eliminar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
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
  }

  return (
    <tr className={cn("hover:bg-[#1E293B]/60 transition-colors group", isFIFO ? "bg-rose-500/5" : "")}>
      <td className="p-2">
         <span className="text-[9px] text-slate-400 block truncate w-24 font-bold">{item.clientName}</span>
      </td>
      <td className="p-2">
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
      <td className="p-2 text-emerald-400 font-mono text-[10px]">{item.solucionLote || 'S/L'}</td>
      <td className="p-2 font-bold text-rose-400 text-[10px]">{item.sortDate}</td>
      <td className="p-2 text-right font-black text-amber-400 text-xs">{formatCurrency(item.precioUnitNeto || 0)}</td>
      <td className="p-2 text-center w-20">
         <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Edit2 size={12} /></button>
            <button onClick={handleDelete} disabled={saving} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Trash2 size={12} /></button>
         </div>
      </td>
    </tr>
  );
}

"""

target = "function LoteFixedDataEditor({"
content = content.replace(target, new_comp + target)
with open(file_path, 'w') as f:
    f.write(content)
