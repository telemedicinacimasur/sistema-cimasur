import React, { useState, useEffect, useMemo } from 'react';
import { Database, Plus, Search, FileSpreadsheet, Upload, Download, ArrowLeft, Filter, Hexagon, Droplet, Activity, FlaskConical, TestTube, Layers, Edit, Box, Hash } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { cn, safe } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { exportTableToPDF } from '../../lib/pdfUtils';

type MainTab = 'SALINA CS' | 'ETANOL CS' | 'ADE CS' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES' | 'MATRIZ COMPLETA';
type SubModule = 'dashboard' | 'codigos' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES';

const BASE_CATEGORIES = [
  'TODOS',
  'Oftálmicos',
  'Esencias Florales',
  'Fórmula Magistral',
  'Productos Simples',
  'Nosodes Simples',
  'Complejos C100/C200',
  'Packs Especiales',
  'Producto Base'
];

const GENERIC_CATEGORIES = [
  'Oftálmicos',
  'Esencias Florales',
  'Fórmula Magistral',
  'Productos Simples',
  'Nosodes Simples',
  'Complejos C100/C200'
];

const PREFIX_MAP: Record<string, string> = {
  'SALINA CS': 'S',
  'ETANOL CS': 'E',
  'ADE CS': 'A',
  'NOSODES CLIENTES': 'NC',
  'GOTAS PURAS': 'GP',
  'ALTAS DILUCIONES': 'AD',
  'DILUCIONES CIMASUR': 'D'
};

const FormField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</label>
    {children}
  </div>
);

export default function CimasurInventoryManager() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<SubModule>('dashboard');
  const [activeTab, setActiveTab] = useState<MainTab>('SALINA CS');
  const [activeCategory, setActiveCategory] = useState<string>('Oftálmicos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [records, setRecords] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<any>({
      codigo_barras: '',
      nombre_producto: '',
      solucion: '',
      categoria_tipo: 'Oftálmicos',
      fecha: '',
      doctor: ''
  });

  const isBaseModule = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(activeTab);
  const isMatrixView = activeTab === 'MATRIZ COMPLETA';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allRecords = await localDB.getCollection('inventory_master');
    setRecords(allRecords);
  };

  const getFilteredRecords = () => {
    let filtered = records;
    if (activeTab !== 'MATRIZ COMPLETA') {
      filtered = filtered.filter(r => r.base_master === activeTab);
    } else {
      // In matrix view, we show all base masters
      filtered = filtered.filter(r => ['SALINA CS', 'ETANOL CS', 'ADE CS', 'DILUCIONES CIMASUR', 'GOTAS PURAS', 'ALTAS DILUCIONES', 'NOSODES CLIENTES'].includes(r.base_master));
    }

    // Fixed logic for category filtering: if it's "TODOS", don't filter.
    if (activeCategory !== 'TODOS') {
      filtered = filtered.filter(r => r.categoria_tipo === activeCategory);
    }
    
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        safe(r.codigo_barras).toLowerCase().includes(s) ||
        safe(r.nombre_producto).toLowerCase().includes(s) ||
        safe(r.solucion).toLowerCase().includes(s)
      );
    }

    return filtered.sort((a, b) => {
      const codeA = String(a.codigo_barras || '');
      const codeB = String(b.codigo_barras || '');
      
      const extractNum = (s: string) => {
        const match = s.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const numA = extractNum(codeA);
      const numB = extractNum(codeB);

      if (numA !== numB) return numA - numB;
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const generateCodeForCurrentForm = () => {
    let prefix = PREFIX_MAP[activeTab] || '';
    
    if (isBaseModule && GENERIC_CATEGORIES.includes(form.categoria_tipo)) {
      const existing = records.find(r => r.base_master === activeTab && r.categoria_tipo === form.categoria_tipo && r.codigo_barras);
      if (existing) {
        return existing.codigo_barras;
      }
    }

    const baseRecords = records.filter(r => r.base_master === activeTab);
    const nums: number[] = [];
    
    for (const r of baseRecords) {
        if (!r.codigo_barras) continue;
        const codeStr = String(r.codigo_barras);
        const match = codeStr.match(/\d+/);
        if (match) {
            nums.push(parseInt(match[0], 10));
        }
    }
    
    nums.sort((a,b) => a - b);
    
    let nextNum = 1;
    // Find first gap or last + 1
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
    
    if (activeTab === 'ALTAS DILUCIONES') {
        return `AD-${nextNum}`;
    }
    
    return prefix ? `${prefix}-${nextNum.toString().padStart(3, '0')}` : nextNum.toString();
  };

  useEffect(() => {
    if (showModal && !editingId) {
       setForm(prev => ({ ...prev, codigo_barras: generateCodeForCurrentForm() }));
    }
  }, [showModal, form.categoria_tipo, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_barras || !form.nombre_producto) {
      alert("Completar campos requeridos");
      return;
    }

    const currentBase = activeTab === 'MATRIZ COMPLETA' ? form.base_master : activeTab;
    
    // Validar duplicados
    const isGeneric = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(currentBase) && GENERIC_CATEGORIES.includes(form.categoria_tipo);
    const codeToCheck = form.codigo_barras.trim();
    
    // Si NO es genérico (debe ser único) o si intentan usar un código de otra cosa
    if (!isGeneric) {
       const existingWithCode = records.find(r => r.codigo_barras === codeToCheck && r.id !== editingId);
       if (existingWithCode) {
          const isExistingGeneric = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(existingWithCode.base_master) 
                                     && GENERIC_CATEGORIES.includes(existingWithCode.categoria_tipo);
          if (!isExistingGeneric) {
             alert(`¡Error! El código ${codeToCheck} ya está en uso por "${existingWithCode.nombre_producto}". Use otro correlativo.`);
             return;
          }
       }
    }

    const finalData = {
      ...form,
      base_master: currentBase,
      type: 'inventory',
      [editingId ? 'updatedAt' : 'createdAt']: new Date().toISOString(),
      [editingId ? 'ultimaModificacionPor' : 'creadoPor']: user?.displayName || 'Admin'
    };

    if (editingId) {
      await localDB.updateInCollection('inventory_master', editingId, finalData);
    } else {
      await localDB.saveToCollection('inventory_master', finalData);
    }
    
    setShowModal(false);
    setEditingId(null);
    setForm({ 
      codigo_barras: '', 
      nombre_producto: '', 
      solucion: '', 
      categoria_tipo: activeCategory === 'TODOS' ? 'Oftálmicos' : activeCategory, 
      fecha: '', 
      doctor: '',
      base_master: activeTab === 'MATRIZ COMPLETA' ? 'SALINA CS' : activeTab
    });
    loadData();
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      codigo_barras: r.codigo_barras || '',
      nombre_producto: r.nombre_producto || '',
      solucion: r.solucion || '',
      categoria_tipo: r.categoria_tipo || 'Oftálmicos',
      fecha: r.fecha || '',
      doctor: r.doctor || ''
    });
    setShowModal(true);
  };

  const getHeadersForTab = (tab: MainTab) => {
    switch(tab) {
      case 'MATRIZ COMPLETA': return ['CÓDIGO', 'PRODUCTO', 'SOLUCIÓN', 'CATEGORÍA', 'BASE MASTER'];
      case 'DILUCIONES CIMASUR': return ['CÓDIGO', 'IDENTIFICACIÓN', 'DILUCIONES / ACTUALIZACIÓN'];
      case 'GOTAS PURAS': return ['CÓDIGO GP', 'PRODUCTO', 'SOLUCIÓN'];
      case 'ALTAS DILUCIONES': return ['CÓDIGO', 'PRODUCTO', 'DILUCIÓN'];
      case 'NOSODES CLIENTES': return ['CÓDIGO NC', 'MUESTRA Y POTENCIA', 'FECHA', 'DOCTOR(A)'];
      default: return ['CÓDIGO BARRA', 'PRODUCTO', 'SOLUCIÓN', 'CATEGORÍA'];
    }
  };

  const getRowForTab = (r: any, tab: MainTab) => {
    switch(tab) {
      case 'MATRIZ COMPLETA':
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion), safe(r.categoria_tipo), safe(r.base_master)];
      case 'DILUCIONES CIMASUR': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'GOTAS PURAS': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'ALTAS DILUCIONES': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'NOSODES CLIENTES': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.fecha), safe(r.doctor)];
      default: 
         return [
          safe(r.codigo_barras),
          safe(r.nombre_producto),
          safe(r.solucion),
          isBaseModule ? safe(r.categoria_tipo) : '---'
        ];
    }
  };

  const exportExcel = () => {
    const data = getFilteredRecords().map(r => getRowForTab(r, activeTab));
    const headers = getHeadersForTab(activeTab);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `cimasur_inventario_${activeTab}_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const data = getFilteredRecords().map(r => getRowForTab(r, activeTab));
    const headers = getHeadersForTab(activeTab);
    exportTableToPDF(
      `INVENTARIO CIMASUR - ${activeTab}`,
      headers,
      data,
      `cimasur_inventario_${activeTab}`
    );
  };

  const exportTemplate = () => {
    const headers = getHeadersForTab(activeTab);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `plantilla_importacion_${activeTab}.xlsx`);
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let count = 0;
        for (const row of data as any[]) {
          const cd = safe(row['CÓDIGO'] || row['CÓDIGO BARRA'] || row['CODIGO GP'] || row['CÓDIGO NC'] || row['CODIGO'] || row['codigo'] || row['Código']);
          const nm = safe(row['IDENTIFICACIÓN'] || row['PRODUCTO'] || row['MUESTRA Y POTENCIA'] || row['NOMBRE'] || row['producto'] || row['Producto']);
          
          if (cd || nm) {
             await localDB.saveToCollection('inventory_master', {
               codigo_barras: cd,
               nombre_producto: nm,
               solucion: safe(row['DILUCIONES / ACTUALIZACIÓN'] || row['DILUCIONES - ACTUALIZACIÓN'] || row['SOLUCIÓN'] || row['SOLUCION'] || row['DILUCIÓN'] || row['DILUCION'] || row['DATOS'] || ''),
               categoria_tipo: safe(row['CATEGORÍA'] || row['CATEGORIA'] || activeCategory),
               fecha: safe(row['FECHA']),
               doctor: safe(row['DOCTOR(A)'] || row['DOCTOR'] || row['DR']),
               base_master: activeTab,
               type: 'inventory',
               createdAt: new Date().toISOString(),
               creadoPor: user?.displayName || 'Admin'
             });
             count++;
          }
        }
        alert(`Se importaron ${count} registros con éxito.`);
        loadData();
      } catch (err) {
        console.error(err);
        alert('Error al procesar el Excel. Revisa el formato.');
      }
      
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleModuleClick = (mod: SubModule) => {
    setActiveModule(mod);
    if (mod === 'codigos') {
      setActiveTab('SALINA CS');
      setActiveCategory('Oftálmicos');
    } else if (mod !== 'dashboard') {
      setActiveTab(mod as MainTab);
    }
  };

  const filtered = getFilteredRecords();
  const isGeneric = isBaseModule && GENERIC_CATEGORIES.includes(form.categoria_tipo);

  const modules = [
    { id: 'codigos' as SubModule, label: 'Códigos de Barra', desc: 'Módulo Maestro (Salina, Etanol, ADE)', icon: Hash, bg: 'bg-blue-50', text: 'text-blue-600' },
    { id: 'DILUCIONES CIMASUR' as SubModule, label: 'Diluciones Cimasur', desc: 'Catálogo base', icon: Droplet, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { id: 'GOTAS PURAS' as SubModule, label: 'Gotas Puras', desc: 'Códigos y productos', icon: Hexagon, bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { id: 'ALTAS DILUCIONES' as SubModule, label: 'Altas Diluciones', desc: 'C100/C200', icon: TestTube, bg: 'bg-purple-50', text: 'text-purple-600' },
    { id: 'NOSODES CLIENTES' as SubModule, label: 'Nosodes Clientes', desc: 'Muestras Médicas', icon: Activity, bg: 'bg-rose-50', text: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex items-center gap-4">
        {activeModule !== 'dashboard' && (
          <button 
            onClick={() => setActiveModule('dashboard')}
            className="p-2 bg-white border shadow-sm rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Database className="w-8 h-8 text-[#001736]" />
        <div>
          <h2 className="text-xl font-black text-[#001736] uppercase tracking-tighter">Gestión de Códigos y Diluciones</h2>
          <p className="text-sm text-slate-500 font-medium">
            {activeModule === 'dashboard' ? 'Submódulo maestro para administración de Excel, correlativos y catálogos.' : 'Bases correlativas y catálogos de diluciones'}
          </p>
        </div>
      </div>

      {activeModule === 'dashboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => handleModuleClick(mod.id)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", mod.bg, mod.text)}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="font-bold text-[#001736] mb-1">{mod.label}</h3>
                <p className="text-xs text-slate-500">{mod.desc}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {activeModule === 'codigos' && (
            <div className="flex gap-2 border-b overflow-x-auto no-scrollbar">
              {(['MATRIZ COMPLETA', 'SALINA CS', 'ETANOL CS', 'ADE CS'] as MainTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setActiveCategory('TODOS'); }}
                  className={cn(
                    "px-6 py-3 font-bold text-sm uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab 
                      ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                      : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {(isBaseModule || isMatrixView) && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveCategory('TODOS')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap",
                  activeCategory === 'TODOS' 
                    ? "bg-[#001736] text-white shadow-sm" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                TODOS
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por código, producto o solución..."
                className="w-full pl-10 pr-4 py-2 border-b border-slate-200 text-sm bg-transparent focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto flex-wrap">
              <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-sm" title="Importar Excel">
                <Upload className="w-4 h-4" /> Importar
                <input type="file" accept=".xlsx, .xls, .csv" onChange={importExcel} className="hidden" />
              </label>
              <button onClick={exportTemplate} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm" title="Descargar Plantilla">
                <Download className="w-4 h-4" /> Plantilla
              </button>
              <button onClick={exportExcel} className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-emerald-200 shadow-sm" title="Exportar Excel">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button onClick={exportPDF} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-red-200 shadow-sm" title="Exportar PDF">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button 
                onClick={() => { 
                    setEditingId(null); 
                    setForm({ 
                      codigo_barras: '', 
                      nombre_producto: '', 
                      solucion: '', 
                      categoria_tipo: activeCategory === 'TODOS' ? 'Oftálmicos' : activeCategory, 
                      fecha: '', 
                      doctor: '',
                      base_master: activeTab === 'MATRIZ COMPLETA' ? 'SALINA CS' : activeTab
                    });
                    setShowModal(true); 
                }} 
                className="flex items-center justify-center gap-2 bg-[#001736] hover:bg-[#002b5b] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ml-2"
              >
                <Plus className="w-4 h-4" /> Agregar Nuevo
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-slate-200">
                  <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {getHeadersForTab(activeTab).map((h, i) => (
                      <th key={i} className={`p-4 border-r border-slate-100 ${i === 0 ? 'w-32' : ''}`}>{h}</th>
                    ))}
                    <th className="p-4 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? (
                    filtered.map((r, i) => {
                      const rowVals = getRowForTab(r, activeTab);
                      return (
                      <tr key={r.id || i} className="hover:bg-blue-50/50 transition-colors">
                        {rowVals.map((val, idx) => (
                           <td key={idx} className={`p-4 text-xs ${idx === 0 ? 'font-mono font-bold text-[#002b5b]' : idx === 1 ? 'font-bold text-sm' : 'text-slate-600'} border-r border-slate-50`}>
                             {val || '---'}
                           </td>
                        ))}
                        <td className="p-4 text-center">
                          <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white shadow-sm border rounded-md hover:border-blue-200 transition-colors" title="Editar">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Box className="w-12 h-12 mb-4 text-slate-300" />
                          <p className="text-sm font-medium">No hay registros almacenados.</p>
                          <p className="text-xs mt-1">Has una búsqueda diferente o agrega un nuevo código.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-[#f8fafc] p-3 border-t text-[10px] uppercase font-black tracking-widest text-[#001736] flex justify-between">
              <span>Base: {activeTab} {isBaseModule && `> ${activeCategory}`}</span>
              <span>{filtered.length} registros</span>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#001736] text-white">
              <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Box className="w-5 h-5" />
                {editingId ? 'Editar Registro' : 'Agregar Nuevo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white font-bold text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {activeTab === 'MATRIZ COMPLETA' && (
                <FormField label="Base Master">
                  <select 
                    className="w-full border-b border-slate-200 p-2 text-sm font-bold outline-none"
                    value={form.base_master || 'SALINA CS'}
                    onChange={e => setForm({...form, base_master: e.target.value})}
                  >
                    {Object.keys(PREFIX_MAP).map(bm => <option key={bm} value={bm}>{bm}</option>)}
                  </select>
                </FormField>
              )}

              {(isBaseModule || activeTab === 'MATRIZ COMPLETA') && (
                <FormField label="Categoría">
                  <select 
                    className="w-full border-b border-slate-200 p-2 text-sm font-bold outline-none"
                    value={form.categoria_tipo}
                    onChange={e => setForm({...form, categoria_tipo: e.target.value})}
                  >
                    {BASE_CATEGORIES.filter(c => c !== 'TODOS').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label={getHeadersForTab(activeTab)[0] || "CÓDIGO"}>
                  <input
                    type="text"
                    required
                    className={cn(
                        "w-full border-b p-2 text-sm font-mono font-bold outline-none",
                        isGeneric && !editingId ? "border-amber-200 focus:border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 focus:border-[#001736] text-[#002b5b]"
                    )}
                    value={form.codigo_barras || ''}
                    onChange={e => setForm({...form, codigo_barras: e.target.value})}
                  />
                  {isGeneric && !editingId && <span className="text-[9px] text-amber-700 font-black uppercase mt-1">CÓDIGO COMPARTIDO (SE PUEDE MODIFICAR)</span>}
                  {!isGeneric && !editingId && <span className="text-[9px] text-blue-500 font-black uppercase mt-1">CÓDIGO ÚNICO CORRELATIVO</span>}
                </FormField>
              </div>

              <FormField label={getHeadersForTab(activeTab)[1] || "PRODUCTO"}>
                <input
                  type="text"
                  required
                  className="w-full border-b border-slate-200 focus:border-[#001736] p-2 text-sm font-bold text-slate-800 outline-none uppercase"
                  placeholder="Ej. Echinacea, Tumor Paladar, C-100"
                  value={form.nombre_producto || ''}
                  onChange={e => setForm({...form, nombre_producto: e.target.value})}
                />
              </FormField>

              {activeTab === 'NOSODES CLIENTES' ? (
                 <div className="grid grid-cols-2 gap-4">
                   <FormField label={getHeadersForTab(activeTab)[2] || "FECHA"}>
                     <input
                       type="date"
                       className="w-full border-b border-slate-200 focus:border-[#001736] p-2 text-sm text-slate-700 outline-none uppercase"
                       value={form.fecha || ''}
                       onChange={e => setForm({...form, fecha: e.target.value})}
                     />
                   </FormField>
                   <FormField label={getHeadersForTab(activeTab)[3] || "DOCTOR(A)"}>
                     <input
                       type="text"
                       className="w-full border-b border-slate-200 focus:border-[#001736] p-2 text-sm text-slate-700 outline-none uppercase"
                       placeholder="Ej. Dra. Marcela Farias"
                       value={form.doctor || ''}
                       onChange={e => setForm({...form, doctor: e.target.value})}
                     />
                   </FormField>
                 </div>
              ) : (
                <FormField label={getHeadersForTab(activeTab)[2] || "SOLUCIÓN"}>
                  <input
                    type="text"
                    className="w-full border-b border-slate-200 focus:border-[#001736] p-2 text-sm text-slate-700 outline-none uppercase"
                    placeholder="Ej. R3 1:3, 200CH, C30"
                    value={form.solucion || ''}
                    onChange={e => setForm({...form, solucion: e.target.value})}
                  />
                </FormField>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#001736] hover:bg-[#001736]/90 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors shadow-md">
                  {editingId ? 'Actualizar' : 'Guardar Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
