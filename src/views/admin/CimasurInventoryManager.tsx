import React, { useState, useEffect, useMemo } from 'react';
import { Database, Plus, Search, FileSpreadsheet, Upload, Download, ArrowLeft, Filter, Hexagon, Droplet, Activity, FlaskConical, TestTube, Layers, Edit, Box, Hash, AlertCircle } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { cn, safe } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { exportTableToPDF } from '../../lib/pdfUtils';

type MainTab = 'SALINA CS' | 'ETANOL CS' | 'ADE CS' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES' | 'FÓRMULAS MAGISTRALES' | 'EC DR. CONEJEROS' | 'MATRIZ COMPLETA';
type SubModule = 'dashboard' | 'codigos' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES' | 'FÓRMULAS MAGISTRALES' | 'EC DR. CONEJEROS';

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
  'DILUCIONES CIMASUR': 'D',
  'FÓRMULAS MAGISTRALES': 'FM',
  'EC DR. CONEJEROS': 'EC'
};

const FormField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
    {children}
  </div>
);

export default function CimasurInventoryManager() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<SubModule>('dashboard');
  const [activeTab, setActiveTab] = useState<MainTab>('SALINA CS');
  const [activeCategory, setActiveCategory] = useState<string>('Oftálmicos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('menor_mayor');
  
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
      const nameA = String(a.nombre_producto || '');
      const nameB = String(b.nombre_producto || '');
      
      const extractNum = (s: string) => {
        const match = s.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const numA = extractNum(codeA);
      const numB = extractNum(codeB);

      if (sortOrder === 'menor_mayor') {
        if (numA !== numB) return numA - numB;
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortOrder === 'mayor_menor') {
        if (numA !== numB) return numB - numA;
        return codeB.localeCompare(codeA, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortOrder === 'a_z') {
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      } else if (sortOrder === 'z_a') {
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      } else if (sortOrder === 'mas_reciente') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      } else if (sortOrder === 'mas_antiguo') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      return 0;
    });
  };

  const generateCodeForCurrentForm = () => {
    let prefix = PREFIX_MAP[activeTab] || '';
    
    if (isBaseModule || activeTab === 'MATRIZ COMPLETA') {
      if (GENERIC_CATEGORIES.includes(form.categoria_tipo)) {
        const existing = records.find(r => r.base_master === activeTab && r.categoria_tipo === form.categoria_tipo && r.codigo_barras);
        if (existing) {
          return existing.codigo_barras;
        }
        return 'CÓDIGO ÚNICO';
      }
    }

    const baseRecords = records.filter(r => r.base_master === activeTab);
    const nums: number[] = [];
    
    for (const r of baseRecords) {
        if (!r.codigo_barras || r.codigo_barras === 'CÓDIGO ÚNICO') continue;
        const codeStr = String(r.codigo_barras);
        const match = codeStr.match(/\d+/);
        if (match) {
            nums.push(parseInt(match[0], 10));
        }
    }
    
    let nextNum = 1;
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
    
    if (activeTab === 'ALTAS DILUCIONES') {
        return `AD${nextNum.toString().padStart(2, '0')}`;
    }
    
    if (activeTab === 'GOTAS PURAS') {
        return nextNum.toString();
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
      case 'GOTAS PURAS': return ['CÓDIGO', 'PRODUCTO']; // Removed SOLUCIÓN
      case 'ALTAS DILUCIONES': return ['CÓDIGO', 'PRODUCTO', 'DILUCIÓN'];
      case 'NOSODES CLIENTES': return ['CÓDIGO NC', 'MUESTRA Y POTENCIA', 'FECHA', 'DOCTOR(A)'];
      case 'FÓRMULAS MAGISTRALES': return ['CÓDIGO FM', 'FÓRMULA', 'OBSERVACIÓN'];
      case 'EC DR. CONEJEROS': return ['CÓDIGO EC', 'PRODUCTO', 'DILUCIÓN'];
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
        return [safe(r.codigo_barras), safe(r.nombre_producto)]; // Removed SOLUCIÓN
      case 'ALTAS DILUCIONES': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'NOSODES CLIENTES': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.fecha), safe(r.doctor)];
      case 'FÓRMULAS MAGISTRALES':
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'EC DR. CONEJEROS':
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
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
        
        let validRows: any[] = [];
        let duplicates = 0;
        let emptyMissing = 0;

        for (const row of data as any[]) {
          const cd = safe(row['CÓDIGO'] || row['CÓDIGO BARRA'] || row['CODIGO GP'] || row['CÓDIGO NC'] || row['CODIGO FM'] || row['CÓDIGO EC'] || row['CODIGO'] || row['codigo'] || row['Código']);
          const nm = safe(row['IDENTIFICACIÓN'] || row['PRODUCTO'] || row['MUESTRA Y POTENCIA'] || row['NOMBRE'] || row['FÓRMULA'] || row['producto'] || row['Producto']);
          
          if (!cd || !nm) {
            emptyMissing++;
            continue;
          }

          const isGeneric = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(activeTab) && GENERIC_CATEGORIES.includes(safe(row['CATEGORÍA'] || activeCategory));

          if (!isGeneric) {
            const hasDuplicateInRecords = records.some(r => r.codigo_barras === cd.trim());
            const hasDuplicateInCurrentImport = validRows.some(r => r.cd === cd.trim());
            
            if (hasDuplicateInRecords || hasDuplicateInCurrentImport) {
               duplicates++;
               continue;
            }
          }

          validRows.push({
            cd: cd.trim(),
            nm: nm.trim(),
            sol: safe(row['DILUCIONES / ACTUALIZACIÓN'] || row['DILUCIONES - ACTUALIZACIÓN'] || row['SOLUCIÓN'] || row['SOLUCION'] || row['OBSERVACIÓN'] || row['DILUCIÓN'] || row['DILUCION'] || row['DATOS'] || ''),
            cat: safe(row['CATEGORÍA'] || row['CATEGORIA'] || activeCategory),
            fec: safe(row['FECHA']),
            doc: safe(row['DOCTOR(A)'] || row['DOCTOR'] || row['DR'])
          });
        }

        validRows.sort((a,b) => {
          const matchA = a.cd.match(/\d+/);
          const matchB = b.cd.match(/\d+/);
          const numA = matchA ? parseInt(matchA[0], 10) : 0;
          const numB = matchB ? parseInt(matchB[0], 10) : 0;
          return numA - numB;
        });

        for (const r of validRows) {
           await localDB.saveToCollection('inventory_master', {
             codigo_barras: r.cd,
             nombre_producto: r.nm,
             solucion: r.sol,
             categoria_tipo: r.cat,
             fecha: r.fec,
             doctor: r.doc,
             base_master: activeTab,
             type: 'inventory',
             createdAt: new Date().toISOString(),
             creadoPor: user?.displayName || 'Admin'
           });
        }
        
        let msg = `Se importaron ${validRows.length} registros (ordenados de menor a mayor).`;
        if (duplicates > 0) msg += `\nSe omitieron ${duplicates} duplicados.`;
        if (emptyMissing > 0) msg += `\nSe detectaron ${emptyMissing} filas inválidas o con datos vacíos.`;
        
        alert(msg);
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
    { id: 'codigos' as SubModule, label: 'Códigos de Barra', desc: 'Módulo Maestro (Salina, Etanol, ADE)', icon: Hash, bg: 'bg-[#1E293B]', text: 'text-[#38BDF8]' },
    { id: 'DILUCIONES CIMASUR' as SubModule, label: 'Diluciones Cimasur', desc: 'Catálogo base', icon: Droplet, bg: 'bg-[#1E293B]', text: 'text-emerald-400' },
    { id: 'GOTAS PURAS' as SubModule, label: 'Gotas Puras', desc: 'Códigos y productos', icon: Hexagon, bg: 'bg-[#1E293B]', text: 'text-indigo-400' },
    { id: 'ALTAS DILUCIONES' as SubModule, label: 'Altas Diluciones', desc: 'C100/C200', icon: TestTube, bg: 'bg-[#1E293B]', text: 'text-purple-400' },
    { id: 'NOSODES CLIENTES' as SubModule, label: 'Nosodes Clientes', desc: 'Muestras Médicas', icon: Activity, bg: 'bg-[#1E293B]', text: 'text-rose-400' },
    { id: 'FÓRMULAS MAGISTRALES' as SubModule, label: 'Fórmulas Magistrales Generales', desc: 'FM', icon: Layers, bg: 'bg-[#1E293B]', text: 'text-amber-400' },
    { id: 'EC DR. CONEJEROS' as SubModule, label: 'Fórmulas EC', desc: 'Dr. Eduardo Conejeros', icon: FlaskConical, bg: 'bg-[#1E293B]', text: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex items-center gap-4">
        {activeModule !== 'dashboard' && (
          <button 
            onClick={() => setActiveModule('dashboard')}
            className="p-2 bg-[#152035] border shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-2xl text-slate-400 hover:text-[#38BDF8] hover:border-[#38BDF8]/50 hover:bg-[#152035] transition-all"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Database className="w-8 h-8 text-white" />
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Gestión de Códigos y Diluciones</h2>
          <p className="text-sm text-slate-400 font-medium">
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
                className="bg-[#152035] p-6 rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-2xl", mod.bg, mod.text)}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">{mod.label}</h3>
                <p className="text-xs text-slate-400">{mod.desc}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-30 bg-[#0D1527]/90 backdrop-blur-md pt-2 pb-4 -mx-2 px-2 shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-[#1E293B] mb-4">
            {activeModule === 'codigos' && (
              <div className="flex gap-2 border-b border-[#1E293B] overflow-x-auto no-scrollbar mb-4 pb-2">
                {(['MATRIZ COMPLETA', 'SALINA CS', 'ETANOL CS', 'ADE CS'] as MainTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setActiveCategory('TODOS'); }}
                    className={cn(
                      "px-6 py-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-all whitespace-nowrap rounded-t-xl",
                      activeTab === tab 
                        ? "border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10" 
                        : "border-[#1E293B] text-slate-400 hover:text-slate-300 hover:bg-[#111A2E]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {(isBaseModule || isMatrixView) && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setActiveCategory('TODOS')}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap flex items-center justify-center",
                    activeCategory === 'TODOS' 
                      ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]" 
                      : "bg-[#111A2E] text-slate-400 hover:bg-[#1E293B] border border-[#1E293B]"
                  )}
                >
                  TODOS
                </button>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1E293B]">
              <div className="flex gap-4 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por código, producto o solución..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[#152035] border-b border-[#1E293B] focus:outline-none focus:border-[#38BDF8] text-white transition-colors"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="pl-4 pr-8 py-2 text-sm border-b border-[#1E293B] outline-none text-slate-300 font-medium bg-[#111A2E]"
                  >
                    <option value="menor_mayor">N° Menor a Mayor</option>
                    <option value="mayor_menor">N° Mayor a Menor</option>
                    <option value="a_z">A - Z (Producto)</option>
                    <option value="z_a">Z - A (Producto)</option>
                    <option value="mas_reciente">Más reciente</option>
                    <option value="mas_antiguo">Más antiguo</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <label className="flex items-center justify-center gap-2 bg-[#111A2E] hover:bg-[#1E293B] text-slate-200 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors cursor-pointer border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Importar Excel">
                  <Upload className="w-4 h-4" /> Importar
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={importExcel} className="hidden" />
                </label>
                <button onClick={exportTemplate} className="flex items-center justify-center gap-2 bg-[#111A2E] hover:bg-[#1E293B] text-slate-200 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Descargar Plantilla">
                  <Download className="w-4 h-4" /> Plantilla
                </button>
                <button onClick={exportExcel} className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Exportar Excel">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={exportPDF} className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Exportar PDF">
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
                  className="flex items-center justify-center gap-2 bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] border border-[#38BDF8]/50 px-5 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)] ml-2"
                >
                  <Plus className="w-4 h-4" /> Agregar Nuevo
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="bg-[#152035] border border-[#1E293B] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#111A2E] border-b border-[#1E293B]">
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {getHeadersForTab(activeTab).map((h, i) => (
                      <th key={i} className={`p-4 border-r border-[#1E293B] ${i === 0 ? 'w-32' : ''}`}>{h}</th>
                    ))}
                    <th className="p-4 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length > 0 ? (
                    filtered.map((r, i) => {
                      const rowVals = getRowForTab(r, activeTab);
                      return (
                      <tr key={r.id || i} className="hover:bg-[#1E293B] group transition-all duration-300">
                        {rowVals.map((val, idx) => (
                           <td key={idx} className={`p-4 text-xs ${idx === 0 ? 'font-mono font-bold text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]' : idx === 1 ? 'font-bold text-sm' : 'text-slate-300'} border-r border-[#1E293B]`}>
                             {val || '---'}
                           </td>
                        ))}
                        <td className="p-4 text-center">
                          <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-[#38BDF8] bg-[#152035] shadow-[0_4px_20px_rgba(0,0,0,0.4)] border rounded-md hover:border-[#38BDF8]/50 transition-colors" title="Editar">
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
            <div className="bg-[#111A2E] p-3 border-t text-[10px] uppercase font-black tracking-widest text-white flex justify-between">
              <span>Base: {activeTab} {isBaseModule && `> ${activeCategory}`}</span>
              <span>{filtered.length} registros</span>
            </div>
          </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-[#0D1527]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#152035] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] ">
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
                    className="w-full border-b border-[#1E293B] p-2 text-sm font-bold outline-none"
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
                    className="w-full border-b border-[#1E293B] p-2 text-sm font-bold outline-none"
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
                        isGeneric && !editingId ? "border-amber-200 focus:border-amber-500 bg-amber-50 text-amber-900" : "border-[#1E293B] focus:border-[#001736] text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                    )}
                    value={form.codigo_barras || ''}
                    onChange={e => setForm({...form, codigo_barras: e.target.value})}
                  />
                  {isGeneric && !editingId && <span className="text-[9px] text-amber-700 font-black uppercase mt-1">CÓDIGO COMPARTIDO (SE PUEDE MODIFICAR)</span>}
                  {!isGeneric && !editingId && <span className="text-[9px] text-[#38BDF8] font-black uppercase mt-1">CÓDIGO ÚNICO CORRELATIVO</span>}
                </FormField>
              </div>

              <FormField label={getHeadersForTab(activeTab)[1] || "PRODUCTO"}>
                <input
                  type="text"
                  required
                  className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm font-bold text-white outline-none uppercase"
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
                       className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                       value={form.fecha || ''}
                       onChange={e => setForm({...form, fecha: e.target.value})}
                     />
                   </FormField>
                   <FormField label={getHeadersForTab(activeTab)[3] || "DOCTOR(A)"}>
                     <input
                       type="text"
                       className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                       placeholder="Ej. Dra. Marcela Farias"
                       value={form.doctor || ''}
                       onChange={e => setForm({...form, doctor: e.target.value})}
                     />
                   </FormField>
                 </div>
              ) : activeTab !== 'GOTAS PURAS' ? (
                <FormField label={getHeadersForTab(activeTab)[2] || "SOLUCIÓN"}>
                  <input
                    type="text"
                    className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                    placeholder="Ej. R3 1:3, 200CH, C30"
                    value={form.solucion || ''}
                    onChange={e => setForm({...form, solucion: e.target.value})}
                  />
                </FormField>
              ) : null}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-[#111A2E] hover:bg-[#1E293B] text-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] hover:bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]/90  rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-md">
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
