const fs = require('fs');
let c = fs.readFileSync('src/views/AdminView.tsx', 'utf8');

c = c.replace(/function DTEManager[\s\S]+?\n\}(?=\n*\nexport default function AdminView)/, `function DTEManager({ records, setRecords }: { records: any[], setRecords: (data: any[]) => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    nroDto: '',
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    rut: '',
    direccion: '',
    ciudad: '',
    email: '',
    montoNeto: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const iva = (Number(form.montoNeto) || 0) * 0.19;
  const total = (Number(form.montoNeto) || 0) + iva;

  const filteredRecords = records.filter(r => {
    let match = true;
    if (dateFrom && r.fecha < dateFrom) match = false;
    if (dateTo && r.fecha > dateTo) match = false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = String(r.nroDto || '') + ' ' + String(r.nombre || '') + ' ' + String(r.rut || '');
      if (!text.toLowerCase().includes(s)) match = false;
    }
    return match;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await localDB.updateInCollection('dte_records', editingId, { ...form, iva, total });
      await addAuditLog(user, \`Actualizó DTE N° \${form.nroDto}\`, 'Administración');
      setEditingId(null);
      alert('DTE Actualizado');
    } else {
      await localDB.saveToCollection('dte_records', { ...form, iva, total });
      await addAuditLog(user, \`Registró DTE N° \${form.nroDto}\`, 'Administración');
      alert('DTE Registrado Admin');
    }
    setForm({...form, nroDto: '', nombre: '', rut: '', montoNeto: 0});
    const updated = await localDB.getCollection('dte_records');
    setRecords(updated);
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      anio: r.anio || '',
      mes: r.mes || '',
      nroDto: r.nroDto || '',
      fecha: r.fecha || '',
      nombre: r.nombre || '',
      rut: r.rut || '',
      direccion: r.direccion || '',
      ciudad: r.ciudad || '',
      email: r.email || '',
      montoNeto: r.montoNeto || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadExcelTemplate = () => {
    const headers = ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, \`DTE\`);
    XLSX.writeFile(wb, 'plantilla_importacion_dte.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        const currentRecords = await localDB.getCollection('dte_records');

        for (const row of data) {
          const doc = safe(row['N° Dcto'] || row['nroDto'] || row['N° Documento']);
          if (!doc) continue;
          if (currentRecords.some(r => safe(r.nroDto) === doc)) continue;

          const neto = parseFloat(safe(row['Neto'] || row['montoNeto']).replace(/[^0-9.-]+/g, '')) || 0;
          const rIva = neto * 0.19;
          const rTotal = neto + rIva;

          const newDte = {
            anio: safe(row['Año']) || new Date().getFullYear().toString(),
            mes: safe(row['Mes']) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            fecha: parseExcelDate(row['Fecha']),
            nroDto: doc,
            nombre: safe(row['Razón Social'] || row['Nombre']),
            rut: safe(row['RUT']),
            direccion: safe(row['Dirección']),
            ciudad: safe(row['Ciudad']),
            email: safe(row['Email']),
            montoNeto: neto,
            iva: rIva,
            total: rTotal
          };

          await localDB.saveToCollection('dte_records', newDte);
          importedCount++;
        }

        if (importedCount > 0) {
          const updated = await localDB.getCollection('dte_records');
          setRecords(updated);
          await addAuditLog(user, \`Importó \${importedCount} registros DTE\`, 'Administración');
          alert(\`Importación completada. \${importedCount} registros nuevos añadidos.\`);
        } else {
          alert('No se encontraron registros nuevos para importar (o faltaba el N° de Documento).');
        }
      } catch (err) {
        console.error(err);
        alert('Error al procesar el archivo Excel.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getExportData = () => {
    return filteredRecords.map(r => [
      r.anio || '',
      r.mes || '',
      formatDate(r.fecha) || '',
      r.nroDto || '',
      r.nombre || '',
      r.rut || '',
      r.direccion || '',
      r.ciudad || '',
      r.email || '',
      formatCurrency(r.montoNeto || 0),
      formatCurrency((r.montoNeto || 0) * 0.19),
      formatCurrency((r.montoNeto || 0) * 1.19)
    ]);
  };
  
  const getExcelExportData = () => {
    return filteredRecords.map(r => [
      r.anio || '',
      r.mes || '',
      formatDateForExcel(r.fecha) || '',
      r.nroDto || '',
      r.nombre || '',
      r.rut || '',
      r.direccion || '',
      r.ciudad || '',
      r.email || '',
      r.montoNeto || 0,
      (r.montoNeto || 0) * 0.19,
      (r.montoNeto || 0) * 1.19
    ]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0b2447] p-4 text-white font-bold flex flex-wrap gap-4 items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-5 h-5" /> {editingId ? 'Editando Registro DTE' : 'Registro Administrativo de DTE'}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={downloadExcelTemplate}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded ml-2">Uso Interno - No SII</span>
          </div>
        </div>
        <form className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6" onSubmit={handleSubmit}>
          <div className="md:col-span-1 space-y-4">
             <FormField label="Año"><input className="w-full border-b p-2 text-sm" value={form.anio || ''} onChange={e => setForm({...form, anio: e.target.value})} /></FormField>
             <FormField label="Mes"><input className="w-full border-b p-2 text-sm" value={form.mes || ''} onChange={e => setForm({...form, mes: e.target.value})} /></FormField>
             <FormField label="N° Documento"><input className="w-full border-b p-2 text-sm font-bold" value={form.nroDto || ''} onChange={e => setForm({...form, nroDto: e.target.value})} required /></FormField>
             <FormField label="Fecha"><input type="date" className="w-full border-b p-2 text-sm" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-2 space-y-4">
             <FormField label="Nombre / Razón Social"><input className="w-full border-b p-2 text-sm font-bold" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} required /></FormField>
             <div className="grid grid-cols-2 gap-4">
                <FormField label="RUT"><input className="w-full border-b p-2 text-sm" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} onBlur={(e) => {
                  const rut = e.target.value;
                  const found = records.find(r => r.rut === rut);
                  if (found) {
                    setForm(prev => ({
                      ...prev,
                      nombre: found.nombre || prev.nombre,
                      email: found.email || prev.email,
                      direccion: found.direccion || prev.direccion,
                      ciudad: found.ciudad || prev.ciudad,
                    }));
                  }
                }} required /></FormField>
                <FormField label="Email"><input type="email" className="w-full border-b p-2 text-sm" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></FormField>
             </div>
             <FormField label="Dirección"><input className="w-full border-b p-2 text-sm" value={form.direccion || ''} onChange={e => setForm({...form, direccion: e.target.value})} /></FormField>
             <FormField label="Ciudad"><input className="w-full border-b p-2 text-sm" value={form.ciudad || ''} onChange={e => setForm({...form, ciudad: e.target.value})} /></FormField>
          </div>
          <div className="md:col-span-1 space-y-6">
             <FormField label="Monto Neto ($)">
               <input type="number" className="w-full border-b border-blue-200 p-4 text-xl font-black bg-blue-50/50 rounded-t outline-none focus:bg-blue-50" value={form.montoNeto || ''} onChange={e => setForm({...form, montoNeto: parseInt(e.target.value) || 0})} />
             </FormField>
             <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                   <span>IVA (19%)</span>
                   <span>{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-[#001736]">
                   <span>TOTAL B/F</span>
                   <span>{formatCurrency(total)}</span>
                </div>
             </div>
             <button type="submit" className={cn(
               "w-full py-4 rounded-xl font-black shadow-xl hover:translate-y-[-2px] transition-all",
               editingId ? "bg-amber-600 text-white" : "bg-[#001736] text-white"
             )}>
               {editingId ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR DTE'}
             </button>
             {editingId && (
               <button type="button" onClick={() => setEditingId(null)} className="w-full text-slate-400 text-[10px] font-bold uppercase mt-2">Cancelar Edición</button>
             )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-wrap justify-between items-center font-black text-[10px] text-slate-400 uppercase tracking-widest gap-4">
          <span>Consulta de Registros DTE</span>
          <div className="flex items-center gap-2 flex-wrap text-normal normal-case">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Desde:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-600" 
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</span>
                <input 
                  type="date" 
                  className="text-xs border rounded p-1 text-slate-600" 
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  placeholder="Buscar..."
                  className="text-xs border rounded p-1 w-28 text-slate-600" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            <button 
               onClick={() => {
                 exportTableToPDF('Reporte: DTE', ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto', 'IVA', 'Total'], getExportData(), 'reporte_dte', 'l');
               }}
               className="text-white bg-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1"
               title="Descargar PDF"
            >
              <Download className="w-3 h-3" /> PDF
            </button>
            <button 
               onClick={() => {
                 exportTableToExcel('Reporte: DTE', ['Año', 'Mes', 'Fecha', 'N° Dcto', 'Razón Social', 'RUT', 'Dirección', 'Ciudad', 'Email', 'Neto', 'IVA', 'Total'], getExcelExportData(), 'reporte_dte');
               }}
               className="text-white bg-emerald-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-emerald-700 flex flex-row items-center gap-1"
               title="Descargar Excel"
            >
              <FileSpreadsheet className="w-3 h-3" /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b font-black text-slate-500 uppercase">
                <th className="p-4">Fecha</th>
                <th className="p-4">N° Dcto</th>
                <th className="p-4">Razón Social</th>
                <th className="p-4">RUT</th>
                <th className="p-4 text-right">Neto</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500">{formatDate(r.fecha)}</td>
                  <td className="p-4 font-bold text-[#001736]">{r.nroDto}</td>
                  <td className="p-4">{r.nombre}</td>
                  <td className="p-4 font-mono text-slate-400">{r.rut}</td>
                  <td className="p-4 text-right">{formatCurrency(r.montoNeto)}</td>
                  <td className="p-4 text-right font-black text-blue-900">{formatCurrency(r.total)}</td>
                    <td className="p-4 text-center">
                      <RecordActions
                        onView={() => {
                          const dteData = [
                            { label: 'N° Documento', value: r.nroDto },
                            { label: 'Fecha', value: formatDate(r.fecha) },
                            { label: 'Cliente', value: r.nombre },
                            { label: 'RUT', value: r.rut },
                            { label: 'Total', value: formatCurrency(r.total) }
                          ];
                          viewExpedienteInNewTab('Ficha: DTE', dteData, \`dte_\${r.nroDto}\`);
                        }}
                        onEdit={() => handleEdit(r)}
                        onDelete={async () => {
                          if (true) {
                            try {
                              await localDB.deleteFromCollection('dte_records', r.id);
                              const updated = await localDB.getCollection('dte_records');
                              setRecords(updated);
                              alert('DTE eliminado correctamente');
                            } catch (err) {
                              alert('Error al eliminar DTE');
                            }
                          }
                        }}
                      />
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`
);

fs.writeFileSync('src/views/AdminView.tsx', c);
console.log('done replacing');
