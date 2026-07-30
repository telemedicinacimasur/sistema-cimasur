import React, { useState, useEffect, useMemo } from 'react';
import { Database, Plus, Search, FileSpreadsheet, Upload, Download, ArrowLeft, Filter, Hexagon, Droplet, Activity, FlaskConical, TestTube, Layers, Edit, Box, Hash, AlertCircle, Trash2, History, RefreshCw, Sliders, CheckCircle2, Edit3 } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { cn, safe } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { exportTableToPDF } from '../../lib/pdfUtils';

type MainTab = 'SALINA CS' | 'ETANOL CS' | 'ADE CS' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES' | 'FÓRMULAS MAGISTRALES' | 'EC DR. CONEJEROS' | 'MATRIZ COMPLETA';
type SubModule = 'dashboard' | 'codigos' | 'DILUCIONES CIMASUR' | 'GOTAS PURAS' | 'ALTAS DILUCIONES' | 'NOSODES CLIENTES' | 'FÓRMULAS MAGISTRALES' | 'EC DR. CONEJEROS';

const BASE_CATEGORIES = [
  "TODOS",
  "Complejo Base",
  "Complejo Avanzado",
  "Especialidad",
  "Sales de Schussler",
  "Exóticos",
  "Productos Simple",
  "Nosode Simple",
  "Paquetes Terapeuticos (KIT)",
  "Esencias florales",
  "Oftálmica",
  "Fórmula Magistral"
];

const GENERIC_CATEGORIES = [
  'Oftálmicos',
  'Esencias Florales',
  'Fórmula Magistral',
  'Productos Simples',
  'Nosodes Simples',
  'Oftálmico',
  'Esencia Floral',
  'Producto Simple',
  'Nosode Simple',
  'Oftálmica',
  'Esencias florales',
  'PROD. SIMPLE',
  'NOSODE SIMPLE',
  'FÓRMULAS MAGISTRALES',
  'Fórmulas Magistrales'
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

// Date Helpers to handle uniform "fecha corta" format (DD/MM/YYYY) and native HTML date inputs (YYYY-MM-DD)
const convertToInputDate = (dateVal: any): string => {
  if (!dateVal) return '';
  const valStr = String(dateVal).trim();
  if (!valStr) return '';

  // If already YYYY-MM-DD
  const ymdRegex = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/;
  const matchYmd = valStr.match(ymdRegex);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = matchYmd[2].padStart(2, '0');
    const day = matchYmd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/;
  const matchDmy = valStr.match(dmyRegex);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    const year = matchDmy[3];
    return `${year}-${month}-${day}`;
  }

  // If Excel number
  const num = Number(valStr);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    }
  }

  // Try standard parse
  const parsed = new Date(valStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return '';
};

const formatShortDate = (dateVal: any): string => {
  if (!dateVal) return '';
  const valStr = String(dateVal).trim();
  if (!valStr) return '';

  // If already DD/MM/YYYY or DD-MM-YYYY
  const dmyRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/;
  const matchDmy = valStr.match(dmyRegex);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    const year = matchDmy[3];
    return `${day}/${month}/${year}`;
  }

  // If YYYY-MM-DD or YYYY/MM/DD
  const ymdRegex = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/;
  const matchYmd = valStr.match(ymdRegex);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = matchYmd[2].padStart(2, '0');
    const day = matchYmd[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // If Excel number
  const num = Number(valStr);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // Try standard parse
  const parsed = new Date(valStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return valStr;
};

const normalizeCategory = (cat: any): string => {
  if (!cat) return "Oftálmica";
  const c = String(cat).trim().toUpperCase();
  if (!c) return "Oftálmica";

  if (c === "BASE" || c === "COMPLEJO BASE" || c.includes("COMPLEJO BASE") || c.includes("CS BASE")) {
    return "Complejo Base";
  }
  if (c === "AVANZADO" || c === "COMPLEJO AVANZADO" || c.includes("COMPLEJO AVANZADO") || c.includes("CS AVANZADO")) {
    return "Complejo Avanzado";
  }
  if (c.includes("ESPECIALIDAD")) {
    return "Especialidad";
  }
  if (c.includes("SCHUSSLER") || c.includes("SCHÜSSLER")) {
    return "Sales de Schussler";
  }
  if (c.includes("EXOTIC") || c.includes("EXÓTIC")) {
    return "Exóticos";
  }
  if (c.includes("PRODUCTO SIMPLE") || c.includes("PRODUCTOS SIMPLE") || c.includes("PRODUCTOS SIMPLES") || c.includes("PROD. SIMPLE") || c === "SIMPLE") {
    return "Productos Simple";
  }
  if (c.includes("NOSODE") || c.includes("NOSODES")) {
    return "Nosode Simple";
  }
  if (c.includes("MAGISTRAL") || c.includes("MAGISTRALES") || c.includes("FORMULA MAGISTRAL") || c.includes("FÓRMULA MAGISTRAL")) {
    return "Fórmula Magistral";
  }
  if (c.includes("TERAPEUTICO") || c.includes("TERAPÉUTICO") || c.includes("KIT")) {
    return "Paquetes Terapeuticos (KIT)";
  }
  if (c.includes("FLORAL") || c.includes("FLORALES") || c.includes("ESENCIAS")) {
    return "Esencias florales";
  }
  if (c.includes("OFTALM") || c.includes("OFTÁLM")) {
    return "Oftálmica";
  }

  // Exact or close match fallback
  const match = BASE_CATEGORIES.find(bc => bc.toUpperCase() === c);
  if (match) return match;

  // Case-insensitive secondary check
  const fuzzyMatch = BASE_CATEGORIES.find(bc => bc.toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').includes(c.toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')));
  if (fuzzyMatch) return fuzzyMatch;

  return "Oftálmica";
};

const checkIsGeneric = (base: string, cat: string) => {
  const isBase = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(base);
  return isBase && GENERIC_CATEGORIES.includes(cat);
};

export default function CimasurInventoryManager() {
  const { user } = useAuth();
  
  const userRoles = user?.roles || [user?.role || 'viewer'];
  const hasFullAccess = userRoles.includes('admin');
  const adminPerm = user?.permissions?.['manager'] || user?.permissions?.['admin'];
  const isReadonly = !hasFullAccess && adminPerm?.readonly === true;
  const canEdit = hasFullAccess || (!isReadonly && (adminPerm ? adminPerm.edit !== false : true));
  const canDelete = hasFullAccess || (!isReadonly && (adminPerm ? adminPerm.delete !== false : true));
  
  const [activeModule, setActiveModule] = useState<SubModule>('dashboard');
  const [activeTab, setActiveTab] = useState<MainTab>('SALINA CS');
  const [activeCategory, setActiveCategory] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('menor_mayor');
  
  const [records, setRecords] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBarcodeGeneric, setIsBarcodeGeneric] = useState(false);
  
  const [form, setForm] = useState<any>({
      codigo_barras: '',
      nombre_producto: '',
      solucion: '',
      gp: '',
      categoria_tipo: 'Oftálmica',
      fecha: '',
      doctor: '',
      precio: 0
  });

  const isBaseModule = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(activeTab);
  const isMatrixView = activeTab === 'MATRIZ COMPLETA';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importReport, setImportReport] = useState<{
    successCount: number;
    duplicates: { codigo: string; nombre: string; type: 'system' | 'file'; existingProduct?: string }[];
    emptyCodesCount: number;
    emptyRowsCount: number;
    totalProcessed: number;
    accionDuplicados?: 'importados_en_rojo' | 'omitidos' | 'actualizados_por_codigo';
  } | null>(null);

  const [updateReport, setUpdateReport] = useState<{
    updatedCount: number;
    notFoundCount: number;
    updatedItems: { codigo: string; nombre: string; prevPrecio?: number; newPrecio?: number }[];
    notFoundItems: { codigo: string; nombre: string }[];
    totalProcessed: number;
  } | null>(null);

  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({
    fieldToEdit: 'precio', // 'precio', 'precio_porcentaje', 'categoria_tipo', 'doctor', 'solucion', 'fecha'
    newValue: '',
    percentage: 0,
  });

  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    uniqueRows: any[];
    duplicateRows: any[];
    duplicateItems: { codigo: string; nombre: string; type: 'system' | 'file'; existingProduct?: string }[];
    emptyCodesCount: number;
    emptyRowsCount: number;
    totalProcessed: number;
  } | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadImportLogs = async () => {
    try {
      const logs = await localDB.getCollection('import_history');
      // Sort by date descending
      const sorted = [...logs].sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setImportLogs(sorted);
    } catch (err) {
      console.error("Error al cargar historial de importaciones:", err);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
    setIsBarcodeGeneric(false);
  }, [activeTab, activeModule, activeCategory]);

  useEffect(() => {
    loadData();
    loadImportLogs();
  }, []);

  const repairGenericRecords = async (allRecords: any[]) => {
    let changed = false;
    const nonGenericBases = [
      'DILUCIONES CIMASUR',
      'GOTAS PURAS',
      'ALTAS DILUCIONES',
      'NOSODES CLIENTES',
      'FÓRMULAS MAGISTRALES',
      'EC DR. CONEJEROS'
    ];

    const copy = [...allRecords];

    for (const base of nonGenericBases) {
      const baseRecords = copy.filter(r => r.base_master === base);
      const genericRecords = baseRecords.filter(r => {
        const code = String(r.codigo_barras || '').trim().toUpperCase();
        return !code || code === 'GENÉRICO' || code === 'GENERICO' || code === 'CÓDIGO ÚNICO';
      });

      if (genericRecords.length > 0) {
        const nums: number[] = [];
        for (const r of baseRecords) {
          const code = String(r.codigo_barras || '').trim().toUpperCase();
          if (code && code !== 'GENÉRICO' && code !== 'GENERICO' && code !== 'CÓDIGO ÚNICO') {
            const match = code.match(/\d+/);
            if (match) {
              nums.push(parseInt(match[0], 10));
            }
          }
        }

        let nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        const prefix = PREFIX_MAP[base] || '';

        const formatCodeLocal = (n: number) => {
          return prefix ? `${prefix}-${n.toString().padStart(4, '0')}` : n.toString();
        };

        for (const r of genericRecords) {
          const newCode = formatCodeLocal(nextNum);
          const updatedItem = { ...r, codigo_barras: newCode };
          await localDB.saveToCollection('inventory_master', updatedItem);
          
          const idx = copy.findIndex(item => item.id === r.id);
          if (idx >= 0) {
            copy[idx] = updatedItem;
          }
          
          nextNum++;
          changed = true;
        }
      }
    }

    const baseModules = ['SALINA CS', 'ETANOL CS', 'ADE CS'];
    for (const base of baseModules) {
      const baseRecords = copy.filter(r => r.base_master === base);
      const genericRecords = baseRecords.filter(r => {
        const code = String(r.codigo_barras || '').trim().toUpperCase();
        const isGenCode = !code || code === 'GENÉRICO' || code === 'GENERICO';
        const isGenCat = GENERIC_CATEGORIES.includes(normalizeCategory(r.categoria_tipo));
        return isGenCode && !isGenCat;
      });

      if (genericRecords.length > 0) {
        const nums: number[] = [];
        for (const r of baseRecords) {
          const code = String(r.codigo_barras || '').trim();
          if (code && code !== 'GENÉRICO' && code !== 'GENERICO') {
            const match = code.match(/\d+/);
            if (match) {
              nums.push(parseInt(match[0], 10));
            }
          }
        }

        let nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 8221312003200;
        const prefix = PREFIX_MAP[base] || '';

        for (const r of genericRecords) {
          const newCode = nextNum > 999999 
            ? nextNum.toString() 
            : (prefix ? `${prefix}-${nextNum.toString().padStart(4, '0')}` : nextNum.toString());
            
          const updatedItem = { ...r, codigo_barras: newCode };
          await localDB.saveToCollection('inventory_master', updatedItem);
          
          const idx = copy.findIndex(item => item.id === r.id);
          if (idx >= 0) {
            copy[idx] = updatedItem;
          }
          
          nextNum++;
          changed = true;
        }
      }
    }

    if (changed) {
      return await localDB.getCollection('inventory_master');
    }
    return allRecords;
  };

  const loadData = async () => {
    const allRecords = await localDB.getCollection('inventory_master');
    const repaired = await repairGenericRecords(allRecords);
    const mapped = repaired.map((r: any) => {
      return {
        ...r,
        categoria_tipo: normalizeCategory(r.categoria_tipo)
      };
    });
    setRecords(mapped);
  };

  const getFilteredRecords = () => {
    let filtered = records;
    if (activeTab !== 'MATRIZ COMPLETA') {
      filtered = filtered.filter(r => r.base_master === activeTab);
    } else {
      // In matrix view, we show only SALINA CS, ETANOL CS, ADE CS
      filtered = filtered.filter(r => ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(r.base_master));
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
        safe(r.solucion).toLowerCase().includes(s) ||
        safe(r.gp).toLowerCase().includes(s)
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

  const getCodeStats = () => {
    const currentBase = activeTab === 'MATRIZ COMPLETA' ? form.base_master || 'SALINA CS' : activeTab;
    let prefix = PREFIX_MAP[currentBase] || '';
    
    const baseRecords = records.filter(r => r.base_master === currentBase);
    const nums: number[] = [];
    
    for (const r of baseRecords) {
        if (!r.codigo_barras || r.codigo_barras === 'CÓDIGO ÚNICO') continue;
        const codeStr = String(r.codigo_barras);
        const match = codeStr.match(/\d+/);
        if (match) {
            nums.push(parseInt(match[0], 10));
        }
    }
    
    const sortedNums = [...nums].sort((a,b) => a - b);
    const missing: number[] = [];
    let nextNum = 1;
    
    if (sortedNums.length > 0) {
       nextNum = sortedNums[sortedNums.length - 1] + 1;
       // Find gaps up to nextNum
       const numSet = new Set(sortedNums);
       for (let i = 1; i < nextNum; i++) {
          if (!numSet.has(i)) {
             missing.push(i);
          }
       }
    }
    
    const formatCode = (n: number) => {
       const isBase = ['SALINA CS', 'ETANOL CS', 'ADE CS'].includes(currentBase);
       if (isBase) {
          if (n > 999999) return n.toString();
          return prefix ? `${prefix}-${n.toString().padStart(4, '0')}` : n.toString();
       }
       return prefix ? `${prefix}-${n.toString().padStart(4, '0')}` : n.toString();
    };

    return { nextCode: formatCode(nextNum), missingCodes: missing.map(formatCode).slice(0, 10) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_barras || !form.codigo_barras.trim()) {
      alert("¡Alerta de código vacío! El código de barras no puede estar en blanco. Por favor, asigne o genere uno automáticamente.");
      return;
    }
    if (!form.nombre_producto || !form.nombre_producto.trim()) {
      alert("¡Alerta de campo vacío! El nombre del producto o fórmula está vacío. Por favor completarlo para guardar.");
      return;
    }

    const currentBase = activeTab === 'MATRIZ COMPLETA' ? form.base_master : activeTab;
    
    // Validar duplicados
    const codeToCheck = form.codigo_barras.trim();
    const isGenericCode = codeToCheck.toUpperCase() === 'GENÉRICO' || codeToCheck.toUpperCase() === 'GENERICO';
    
    // Si NO es genérico (debe ser único)
    if (!isGenericCode) {
       const existingWithCode = records.find(r => {
          if (r.base_master !== currentBase) return false;
         if (!r.codigo_barras) return false;
         const existingCode = String(r.codigo_barras).trim().toUpperCase();
         if (existingCode === 'GENÉRICO' || existingCode === 'GENERICO') return false;
         return existingCode === codeToCheck.toUpperCase() && r.id !== editingId;
       });
       if (existingWithCode) {
          alert(`¡Error! El código ${codeToCheck} ya está en uso por "${existingWithCode.nombre_producto}". Use otro correlativo.`);
          return;
       }
    }

    const finalData = {
      ...form,
      codigo_barras: isGenericCode ? 'GENÉRICO' : form.codigo_barras,
      categoria_tipo: normalizeCategory(form.categoria_tipo),
      fecha: convertToInputDate(form.fecha),
      base_master: currentBase,
      type: 'inventory',
      precio: form.precio !== undefined ? Number(form.precio) : 0,
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
      gp: '',
      categoria_tipo: activeCategory === 'TODOS' ? 'Oftálmica' : activeCategory, 
      fecha: '', 
      doctor: '',
      base_master: activeTab === 'MATRIZ COMPLETA' ? 'SALINA CS' : activeTab,
      precio: 0
    });
    loadData();
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    const isGen = r.codigo_barras && (String(r.codigo_barras).trim().toUpperCase() === 'GENÉRICO' || String(r.codigo_barras).trim().toUpperCase() === 'GENERICO');
    setIsBarcodeGeneric(!!isGen);
    setForm({
      codigo_barras: r.codigo_barras || '',
      nombre_producto: r.nombre_producto || '',
      solucion: r.solucion || '',
      gp: r.gp || '',
      categoria_tipo: r.categoria_tipo || 'Oftálmica',
      fecha: convertToInputDate(r.fecha),
      doctor: r.doctor || '',
      precio: r.precio !== undefined ? Number(r.precio) : 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Está seguro de que desea eliminar el registro "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await localDB.deleteFromCollection('inventory_master', id);
        alert('Registro eliminado con éxito.');
        await loadData();
      } catch (err) {
        console.error("Error al eliminar el registro de la matriz:", err);
        alert('Error al intentar eliminar el registro.');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Está seguro de que desea eliminar los ${selectedIds.length} registros seleccionados de ${activeTab.replace(' CS', '')}? Esta acción no se puede deshacer.`)) {
      try {
        await localDB.deleteBatchFromCollection('inventory_master', selectedIds);
        alert(`Se eliminaron ${selectedIds.length} registros con éxito.`);
        setSelectedIds([]);
        await loadData();
      } catch (err) {
        console.error("Error al eliminar registros seleccionados:", err);
        alert('Hubo un error al intentar eliminar algunos registros.');
      }
    }
  };

  const handleSelectDuplicates = () => {
    const currentRecords = getFilteredRecords();

    // Función para calcular la completitud e importancia de la información de un registro
    const getRecordScore = (r: any) => {
      let score = 0;
      if (r.nombre_producto && String(r.nombre_producto).trim()) score += 10;
      if (r.solucion && String(r.solucion).trim()) score += 5 + Math.min(String(r.solucion).trim().length, 30);
      if (r.gp && String(r.gp).trim()) score += 3;
      if (r.doctor && String(r.doctor).trim()) score += 3;
      if (r.fecha && String(r.fecha).trim()) score += 2;
      if (r.precio && Number(r.precio) > 0) score += 2;
      if (r.categoria_tipo && String(r.categoria_tipo).trim()) score += 2;
      if (r.es_duplicado !== true) score += 100; // Priorizar mantener el registro principal no marcado
      return score;
    };

    // Agrupar registros por su identificador único (código de barras o nombre)
    const groups: Record<string, any[]> = {};

    currentRecords.forEach(r => {
      const code = (r.codigo_barras || '').trim().toUpperCase();
      const isGeneric = !code || code === 'GENÉRICO' || code === 'GENERICO';
      
      let groupKey = '';
      if (!isGeneric) {
        groupKey = `CODE::${code}`;
      } else {
        const name = (r.nombre_producto || '').trim().toUpperCase();
        if (name) {
          groupKey = `NAME::${name}`;
        }
      }

      if (groupKey) {
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(r);
      } else if (r.es_duplicado === true) {
        const fallbackKey = `DUPFLAG::${r.id}`;
        groups[fallbackKey] = [r];
      }
    });

    const duplicateIdsToDelete: string[] = [];
    let totalDuplicateGroups = 0;

    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        totalDuplicateGroups++;
        // Ordenar de mayor a menor completitud
        group.sort((a, b) => {
          const scoreA = getRecordScore(a);
          const scoreB = getRecordScore(b);
          if (scoreB !== scoreA) {
            return scoreB - scoreA; // Registro más completo primero
          }
          // En caso de empate, conservar el más antiguo
          return (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || '');
        });

        // El índice 0 es el registro PRINCIPAL (se conserva).
        // Los registros a partir del índice 1 son los duplicados sobrantes (se marcan para eliminar).
        const excessDuplicates = group.slice(1);
        excessDuplicates.forEach(dup => {
          duplicateIdsToDelete.push(dup.id);
        });
      }
    });

    if (duplicateIdsToDelete.length === 0) {
      alert('¡No se encontraron registros duplicados redundantes en los ítems actualmente visibles!');
      return;
    }

    setSelectedIds(duplicateIdsToDelete);
    alert(`¡Detección Inteligente Completada!\n\nSe detectaron ${totalDuplicateGroups} grupos de ítems duplicados.\nSe han seleccionado ${duplicateIdsToDelete.length} copia(s) redundante(s) (con menor cantidad de información) para eliminar, garantizando que SIEMPRE quede 1 registro principal conservado en la lista.\n\nPuedes eliminarlos haciendo clic en el botón "Eliminar Seleccionados".`);
  };

  const handleDeleteAllFiltered = async () => {
    const currentFiltered = getFilteredRecords();
    if (currentFiltered.length === 0) return;
    if (confirm(`¡ADVERTENCIA CRÍTICA! ¿Está completamente seguro de que desea eliminar TODOS los ${currentFiltered.length} registros visibles del módulo/tab ${activeTab.replace(' CS', '')}? Esta acción no se me puede deshacer.`)) {
      try {
        const idsToDelete = currentFiltered.map(r => r.id);
        await localDB.deleteBatchFromCollection('inventory_master', idsToDelete);
        alert(`Se eliminaron todos los ${currentFiltered.length} registros con éxito.`);
        setSelectedIds([]);
        await loadData();
      } catch (err) {
        console.error("Error al eliminar todos los registros filtrados:", err);
        alert('Hubo un error al intentar eliminar todos los registros.');
      }
    }
  };

  const getHeadersForTab = (tab: MainTab) => {
    switch(tab) {
      case 'MATRIZ COMPLETA': return ['CÓDIGO', 'PRODUCTO', 'SOLUCIÓN', 'CATEGORÍA', 'BASE MASTER', 'PRECIO'];
      case 'DILUCIONES CIMASUR': return ['CÓDIGO', 'IDENTIFICACIÓN', 'DILUCIONES / ACTUALIZACIÓN'];
      case 'GOTAS PURAS': return ['CÓDIGO', 'PRODUCTO']; // Removed SOLUCIÓN
      case 'ALTAS DILUCIONES': return ['CÓDIGO', 'PRODUCTO', 'DILUCIÓN'];
      case 'NOSODES CLIENTES': return ['CÓDIGO NC', 'G.P', 'NOMBRE NOSODE', 'FECHA', 'DOCTOR(A)'];
      case 'FÓRMULAS MAGISTRALES': return ['CÓDIGO FM', 'G.P', 'NOMBRE PRODUCTO', 'FECHA', 'DOCTOR(A)'];
      case 'EC DR. CONEJEROS': return ['CÓDIGO EC', 'G.P', 'PRODUCTO', 'FECHA ELABORACIÓN'];
      default: return ['CÓDIGO BARRA', 'PRODUCTO', 'SOLUCIÓN', 'CATEGORÍA', 'PRECIO'];
    }
  };

  const getRowForTab = (r: any, tab: MainTab) => {
    const formatPrice = (val: any) => {
      if (val === undefined || val === null || val === '') return '---';
      const num = Number(val);
      if (isNaN(num)) return val;
      return `$${num.toLocaleString('es-CL')}`;
    };

    switch(tab) {
      case 'MATRIZ COMPLETA':
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion), safe(r.categoria_tipo), safe(r.base_master), formatPrice(r.precio)];
      case 'DILUCIONES CIMASUR': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'GOTAS PURAS': 
        return [safe(r.codigo_barras), safe(r.nombre_producto)]; // Removed SOLUCIÓN
      case 'ALTAS DILUCIONES': 
        return [safe(r.codigo_barras), safe(r.nombre_producto), safe(r.solucion)];
      case 'NOSODES CLIENTES': 
        return [safe(r.codigo_barras), safe(r.gp), safe(r.nombre_producto), formatShortDate(r.fecha), safe(r.doctor)];
      case 'FÓRMULAS MAGISTRALES':
        return [safe(r.codigo_barras), safe(r.solucion), safe(r.nombre_producto), formatShortDate(r.fecha), safe(r.doctor)];
      case 'EC DR. CONEJEROS':
        return [safe(r.codigo_barras), safe(r.gp), safe(r.nombre_producto), formatShortDate(r.fecha) || safe(r.solucion)];
      default: 
         return [
          safe(r.codigo_barras),
          safe(r.nombre_producto),
          safe(r.solucion),
          isBaseModule ? safe(r.categoria_tipo) : '---',
          formatPrice(r.precio)
        ];
    }
  };

  const exportExcel = () => {
    const data = getFilteredRecords().map(r => getRowForTab(r, activeTab));
    const headers = getHeadersForTab(activeTab);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `cimasur_inventario_${activeTab.replace(' CS', '')}_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const data = getFilteredRecords().map(r => getRowForTab(r, activeTab));
    const headers = getHeadersForTab(activeTab);
    exportTableToPDF(
      `INVENTARIO CIMASUR - ${activeTab.replace(' CS', '')}`,
      headers,
      data,
      `cimasur_inventario_${activeTab.replace(' CS', '')}`,
      'p'
    );
  };

  const exportTemplate = () => {
    const headers = getHeadersForTab(activeTab);
    
    // Generate helpful sample rows based on activeTab
    const getSampleRowsForTab = (tab: MainTab): any[][] => {
      switch(tab) {
        case 'SALINA CS':
        case 'ETANOL CS':
        case 'ADE CS':
          return [
            ['S-0001', 'Arnica Montana', 'C200', 'Complejo Base', '5000'],
            ['S-0002', 'Calendula', '10X', 'Complejo Avanzado', '6000']
          ];
        case 'DILUCIONES CIMASUR':
          return [
            ['D-0001', 'Arnica Montana', 'C200 - 10-02-2026'],
            ['D-0002', 'Nux Vomica', 'C30 - Actualizado']
          ];
        case 'GOTAS PURAS':
          return [
            ['GP-0001', 'Hypericum Perforatum'],
            ['GP-0002', 'Bryonia Alba']
          ];
        case 'ALTAS DILUCIONES':
          return [
            ['AD-0001', 'Sulphur', 'C1000'],
            ['AD-0002', 'Lycopodium', 'C200']
          ];
        case 'NOSODES CLIENTES':
          return [
            ['NC-0001', 'GP', 'Muestra Sangre 200CH', '15/03/2026', 'Dr. Eduardo Conejeros'],
            ['NC-0002', 'R3', 'Muestra Saliva 100CH', '20/03/2026', 'Dra. Marcela Farias']
          ];
        case 'FÓRMULAS MAGISTRALES':
          return [
            ['FM-0001', 'GP', 'Fórmula Antigripal', '10/04/2026', 'Dra. Marcela Farias'],
            ['FM-0002', 'R3', 'Fórmula Depurativa', '12/04/2026', 'Dr. Eduardo Conejeros']
          ];
        case 'EC DR. CONEJEROS':
          return [
            ['EC-0001', 'GP', 'Fórmula Antiacné', '29/07/2026'],
            ['EC-0002', 'R3', 'Fórmula Inmuno', '30/07/2026']
          ];
        default:
          return [
            ['S-0001', 'Arnica Montana', 'C200', 'Complejo Base', '5000']
          ];
      }
    };

    const samples = getSampleRowsForTab(activeTab);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `plantilla_importacion_${activeTab.replace(' CS', '')}.xlsx`);
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
        let duplicateRows: any[] = [];
        let duplicateItems: { codigo: string; nombre: string; type: 'system' | 'file'; existingProduct?: string }[] = [];
        let emptyCodesCount = 0;
        let emptyRowsCount = 0;
        let totalProcessed = 0;

        for (const row of data as any[]) {
          totalProcessed++;
          const cd = safe(
            row['CÓDIGO'] || 
            row['CÓDIGO BARRA'] || 
            row['CODIGO GP'] || 
            row['CÓDIGO NC'] || 
            row['CODIGO FM'] || 
            row['CÓDIGO EC'] || 
            row['CODIGO'] || 
            row['codigo'] || 
            row['Código'] || 
            row['CÓDIGO EC'] || 
            row['Código EC'] || 
            row['CÓDIGO FM'] || 
            row['Código FM'] || 
            row['CÓDIGO NC'] || 
            row['Código NC'] || 
            row['CÓDIGO GP'] || 
            row['Código GP'] || 
            row['Correlativo'] || 
            row['CORRELATIVO'] ||
            row['Código de barra'] ||
            row['Código de Barra']
          );
          const nm = safe(
            row['IDENTIFICACIÓN'] || 
            row['PRODUCTO'] || 
            row['NOMBRE PRODUCTO'] || 
            row['MUESTRA Y POTENCIA'] || 
            row['NOMBRE'] || 
            row['FÓRMULA'] || 
            row['producto'] || 
            row['Producto'] ||
            row['IDENTIFICACION'] ||
            row['MUESTRA'] ||
            row['Muestra']
          );
          
          // Skip ONLY if both fields are completely empty to avoid importing blank spreadsheet rows
          if (!cd.trim() && !nm.trim()) {
            emptyRowsCount++;
            continue;
          }

          if (!cd.trim() && nm.trim()) {
            emptyCodesCount++;
          }

          let solVal = '';
          let gpVal = '';
          
          if (activeTab === 'EC DR. CONEJEROS' || activeTab === 'NOSODES CLIENTES') {
            gpVal = safe(row['G.P'] || row['GP'] || '');
            solVal = safe(row['DILUCIÓN'] || row['DILUCION'] || row['SOLUCIÓN'] || row['SOLUCION'] || '');
          } else if (activeTab === 'FÓRMULAS MAGISTRALES') {
            solVal = safe(row['G.P'] || row['GP'] || row['SOLUCIÓN'] || row['SOLUCION'] || '');
          } else {
            solVal = safe(row['DILUCIONES / ACTUALIZACIÓN'] || row['DILUCIONES - ACTUALIZACIÓN'] || row['SOLUCIÓN'] || row['SOLUCION'] || row['OBSERVACIÓN'] || row['DILUCIÓN'] || row['DILUCION'] || row['DATOS'] || '');
          }

          let importedCat = normalizeCategory(row['CATEGORÍA'] || row['CATEGORIA'] || activeCategory);

          const pr = row['PRECIO'] || row['Precio'] || row['precio'] || row['VALOR'] || row['valor'];

          const rowData = {
            cd: cd.trim(),
            nm: nm.trim(),
            sol: solVal,
            gp: gpVal,
            cat: importedCat,
            fec: convertToInputDate(row['FECHA'] || row['FECHA ELABORACIÓN'] || row['FECHA ELABORACION'] || row['DILUCIÓN'] || row['DILUCION'] || row['SOLUCIÓN'] || row['SOLUCION']),
            doc: safe(row['DOCTOR(A)'] || row['DOCTOR'] || row['DR']),
            precio: pr !== undefined ? Number(pr) : 0,
            es_duplicado: false
          };

          const isGeneric = cd.trim().toUpperCase() === 'GENÉRICO' || cd.trim().toUpperCase() === 'GENERICO';

          if (!isGeneric && cd.trim()) {
            const systemDup = records.find(r => {
              if (r.base_master !== activeTab) return false;
              if (!r.codigo_barras) return false;
              const existingCode = String(r.codigo_barras).trim().toUpperCase();
              if (existingCode === 'GENÉRICO' || existingCode === 'GENERICO') return false;
              return existingCode === cd.trim().toUpperCase();
            });
            const fileDup = validRows.find(r => {
              if (!r.cd) return false;
              const existingCode = String(r.cd).trim().toUpperCase();
              if (existingCode === 'GENÉRICO' || existingCode === 'GENERICO') return false;
              return existingCode === cd.trim().toUpperCase();
            });
            
            if (systemDup) {
               duplicateItems.push({
                 codigo: cd.trim(),
                 nombre: nm.trim(),
                 type: 'system',
                 existingProduct: systemDup.nombre_producto
               });
               duplicateRows.push({ ...rowData, es_duplicado: true });
               continue;
            } else if (fileDup) {
               duplicateItems.push({
                 codigo: cd.trim(),
                 nombre: nm.trim(),
                 type: 'file',
                 existingProduct: fileDup.nm
               });
               duplicateRows.push({ ...rowData, es_duplicado: true });
               continue;
            }
          }

          validRows.push(rowData);
        }

        validRows.sort((a,b) => {
          const matchA = String(a.cd || '').match(/\d+/);
          const matchB = String(b.cd || '').match(/\d+/);
          const numA = matchA ? parseInt(matchA[0], 10) : 0;
          const numB = matchB ? parseInt(matchB[0], 10) : 0;
          return numA - numB;
        });

        if (duplicateItems.length > 0) {
          setPendingImport({
            fileName: file.name,
            uniqueRows: validRows,
            duplicateRows,
            duplicateItems,
            emptyCodesCount,
            emptyRowsCount,
            totalProcessed
          });
        } else {
          const itemsToSave = validRows.map(r => ({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`,
            codigo_barras: r.cd,
            nombre_producto: r.nm,
            solucion: r.sol,
            gp: r.gp || '',
            categoria_tipo: r.cat,
            fecha: r.fec,
            doctor: r.doc,
            base_master: activeTab,
            precio: r.precio,
            type: 'inventory',
            createdAt: new Date().toISOString(),
            creadoPor: user?.displayName || 'Admin'
          }));
          await localDB.saveToCollectionBulk('inventory_master', itemsToSave);

          // Save report history log
          const reportLog = {
            id: `import_${Date.now()}`,
            fecha: new Date().toISOString(),
            nombre_archivo: file.name,
            modulo: activeTab,
            total_procesados: totalProcessed,
            exitosos: validRows.length,
            duplicados_count: 0,
            duplicados_detalle: [],
            accion_duplicados: 'omitidos',
            empty_codes: emptyCodesCount,
            empty_rows: emptyRowsCount
          };
          await localDB.saveToCollection('import_history', reportLog);
          await loadImportLogs();
          
          setImportReport({
            successCount: validRows.length,
            duplicates: [],
            emptyCodesCount,
            emptyRowsCount,
            totalProcessed,
            accionDuplicados: 'omitidos'
          });

          loadData();
        }
      } catch (err) {
        console.error(err);
        alert('Error al procesar el Excel. Revisa el formato.');
      }
      
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const updateExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        let updatedCount = 0;
        let notFoundCount = 0;
        let totalProcessed = 0;
        const updatedItemsList: { codigo: string; nombre: string; prevPrecio?: number; newPrecio?: number }[] = [];
        const notFoundItemsList: { codigo: string; nombre: string }[] = [];
        const itemsToSaveBulk: any[] = [];

        const allRecords = await localDB.getCollection('inventory_master');

        for (const row of data as any[]) {
          totalProcessed++;
          const cd = safe(
            row['CÓDIGO'] || 
            row['CÓDIGO BARRA'] || 
            row['CODIGO GP'] || 
            row['CÓDIGO NC'] || 
            row['CODIGO FM'] || 
            row['CÓDIGO EC'] || 
            row['CODIGO'] || 
            row['codigo'] || 
            row['Código'] || 
            row['CÓDIGO EC'] || 
            row['Código EC'] || 
            row['CÓDIGO FM'] || 
            row['Código FM'] || 
            row['CÓDIGO NC'] || 
            row['Código NC'] || 
            row['CÓDIGO GP'] || 
            row['Código GP'] || 
            row['Correlativo'] || 
            row['CORRELATIVO'] ||
            row['Código de barra'] ||
            row['Código de Barra']
          ).trim();

          const nm = safe(
            row['IDENTIFICACIÓN'] || 
            row['PRODUCTO'] || 
            row['NOMBRE PRODUCTO'] || 
            row['MUESTRA Y POTENCIA'] || 
            row['NOMBRE'] || 
            row['FÓRMULA'] || 
            row['producto'] || 
            row['Producto'] ||
            row['IDENTIFICACION'] ||
            row['MUESTRA'] ||
            row['Muestra']
          ).trim();

          if (!cd && !nm) continue;

          let solVal = '';
          let gpVal = '';
          if (activeTab === 'EC DR. CONEJEROS' || activeTab === 'NOSODES CLIENTES') {
            gpVal = safe(row['G.P'] || row['GP'] || '');
            solVal = safe(row['DILUCIÓN'] || row['DILUCION'] || row['SOLUCIÓN'] || row['SOLUCION'] || '');
          } else if (activeTab === 'FÓRMULAS MAGISTRALES') {
            solVal = safe(row['G.P'] || row['GP'] || row['SOLUCIÓN'] || row['SOLUCION'] || '');
          } else {
            solVal = safe(row['DILUCIONES / ACTUALIZACIÓN'] || row['DILUCIONES - ACTUALIZACIÓN'] || row['SOLUCIÓN'] || row['SOLUCION'] || row['OBSERVACIÓN'] || row['DILUCIÓN'] || row['DILUCION'] || row['DATOS'] || '');
          }

          const rawCat = row['CATEGORÍA'] || row['CATEGORIA'];
          const importedCat = rawCat ? normalizeCategory(rawCat) : undefined;
          const pr = row['PRECIO'] !== undefined ? row['PRECIO'] : (row['Precio'] !== undefined ? row['Precio'] : (row['precio'] !== undefined ? row['precio'] : (row['VALOR'] !== undefined ? row['VALOR'] : row['valor'])));
          const doc = safe(row['DOCTOR(A)'] || row['DOCTOR'] || row['DR']);
          const fecRaw = row['FECHA'] || row['FECHA ELABORACIÓN'] || row['FECHA ELABORACION'] || row['DILUCIÓN'] || row['DILUCION'] || row['SOLUCIÓN'] || row['SOLUCION'];
          const fec = fecRaw ? convertToInputDate(fecRaw) : undefined;

          let target = allRecords.find((r: any) => {
            if (activeTab !== 'MATRIZ COMPLETA' && r.base_master !== activeTab) return false;
            if (cd && cd.toUpperCase() !== 'GENÉRICO' && cd.toUpperCase() !== 'GENERICO') {
              return String(r.codigo_barras || '').trim().toUpperCase() === cd.toUpperCase();
            }
            if (nm) {
              return String(r.nombre_producto || '').trim().toUpperCase() === nm.toUpperCase();
            }
            return false;
          });

          if (target) {
            const updated = {
              ...target,
              nombre_producto: nm || target.nombre_producto,
              solucion: solVal || target.solucion,
              gp: gpVal || target.gp,
              categoria_tipo: importedCat || target.categoria_tipo,
              precio: pr !== undefined && pr !== '' && !isNaN(Number(pr)) ? Number(pr) : target.precio,
              doctor: doc || target.doctor,
              fecha: fec || target.fecha,
              updatedAt: new Date().toISOString(),
              actualizadoPor: user?.displayName || 'Admin'
            };
            itemsToSaveBulk.push(updated);
            updatedCount++;
            updatedItemsList.push({ 
              codigo: cd || target.codigo_barras, 
              nombre: nm || target.nombre_producto, 
              prevPrecio: target.precio, 
              newPrecio: updated.precio 
            });
          } else {
            notFoundCount++;
            notFoundItemsList.push({ codigo: cd || '---', nombre: nm || 'Sin nombre' });
          }
        }

        if (itemsToSaveBulk.length > 0) {
          await localDB.saveToCollectionBulk('inventory_master', itemsToSaveBulk);
          loadData();
        }

        setUpdateReport({
          updatedCount,
          notFoundCount,
          updatedItems: updatedItemsList,
          notFoundItems: notFoundItemsList,
          totalProcessed
        });

      } catch (err) {
        console.error(err);
        alert('Error al procesar el Excel para actualización masiva.');
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const executePendingImport = async (action: 'omit' | 'red' | 'update') => {
    if (!pendingImport) return;
    try {
      let rowsToSave: any[] = [];
      let updatedCount = 0;

      if (action === 'update') {
        const allRecords = await localDB.getCollection('inventory_master');
        const itemsToUpdate: any[] = [];

        for (const dupRow of pendingImport.duplicateRows) {
          const cd = String(dupRow.cd || '').trim().toUpperCase();
          const target = allRecords.find((r: any) => {
            if (r.base_master !== activeTab) return false;
            return String(r.codigo_barras || '').trim().toUpperCase() === cd;
          });

          if (target) {
            const updated = {
              ...target,
              nombre_producto: dupRow.nm || target.nombre_producto,
              solucion: dupRow.sol || target.solucion,
              gp: dupRow.gp || target.gp,
              categoria_tipo: dupRow.cat || target.categoria_tipo,
              precio: dupRow.precio !== undefined && dupRow.precio !== 0 ? dupRow.precio : target.precio,
              doctor: dupRow.doc || target.doctor,
              fecha: dupRow.fec || target.fecha,
              updatedAt: new Date().toISOString(),
              actualizadoPor: user?.displayName || 'Admin'
            };
            itemsToUpdate.push(updated);
            updatedCount++;
          } else {
            rowsToSave.push(dupRow);
          }
        }

        if (itemsToUpdate.length > 0) {
          await localDB.saveToCollectionBulk('inventory_master', itemsToUpdate);
        }

        rowsToSave = [...rowsToSave, ...pendingImport.uniqueRows];
      } else if (action === 'red') {
        rowsToSave = [...pendingImport.uniqueRows, ...pendingImport.duplicateRows];
      } else {
        rowsToSave = pendingImport.uniqueRows;
      }

      if (rowsToSave.length > 0) {
        const itemsToSave = rowsToSave.map(r => ({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`,
          codigo_barras: r.cd,
          nombre_producto: r.nm,
          solucion: r.sol,
          gp: r.gp || '',
          categoria_tipo: r.cat,
          fecha: r.fec,
          doctor: r.doc,
          base_master: activeTab,
          precio: r.precio,
          type: 'inventory',
          es_duplicado: action === 'red' ? !!r.es_duplicado : false,
          createdAt: new Date().toISOString(),
          creadoPor: user?.displayName || 'Admin'
        }));
        await localDB.saveToCollectionBulk('inventory_master', itemsToSave);
      }

      const reportLog = {
        id: `import_${Date.now()}`,
        fecha: new Date().toISOString(),
        nombre_archivo: pendingImport.fileName,
        modulo: activeTab,
        total_procesados: pendingImport.totalProcessed,
        exitosos: rowsToSave.length + updatedCount,
        duplicados_count: pendingImport.duplicateItems.length,
        duplicados_detalle: pendingImport.duplicateItems,
        accion_duplicados: action === 'update' ? 'actualizados_por_codigo' : (action === 'red' ? 'importados_en_rojo' : 'omitidos'),
        empty_codes: pendingImport.emptyCodesCount,
        empty_rows: pendingImport.emptyRowsCount
      };

      await localDB.saveToCollection('import_history', reportLog);
      await loadImportLogs();

      setImportReport({
        successCount: rowsToSave.length + updatedCount,
        duplicates: pendingImport.duplicateItems,
        emptyCodesCount: pendingImport.emptyCodesCount,
        emptyRowsCount: pendingImport.emptyRowsCount,
        totalProcessed: pendingImport.totalProcessed,
        accionDuplicados: reportLog.accion_duplicados as any
      });

      setPendingImport(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al ejecutar la importación. Intente nuevamente.');
    }
  };

  const handleApplyBatchEdit = async () => {
    if (selectedIds.length === 0) return;
    try {
      const allRecords = await localDB.getCollection('inventory_master');
      const updatedList: any[] = [];

      for (const id of selectedIds) {
        const item = allRecords.find((r: any) => r.id === id);
        if (!item) continue;

        let newItem = { ...item };
        if (batchEditForm.fieldToEdit === 'precio') {
          const val = Number(batchEditForm.newValue);
          if (!isNaN(val)) newItem.precio = val;
        } else if (batchEditForm.fieldToEdit === 'precio_porcentaje') {
          const pct = Number(batchEditForm.percentage);
          if (!isNaN(pct)) {
            const currentPr = Number(item.precio || 0);
            newItem.precio = Math.max(0, Math.round(currentPr * (1 + pct / 100)));
          }
        } else if (batchEditForm.fieldToEdit === 'categoria_tipo') {
          if (batchEditForm.newValue) newItem.categoria_tipo = normalizeCategory(batchEditForm.newValue);
        } else if (batchEditForm.fieldToEdit === 'doctor') {
          newItem.doctor = batchEditForm.newValue;
        } else if (batchEditForm.fieldToEdit === 'solucion') {
          newItem.solucion = batchEditForm.newValue;
        } else if (batchEditForm.fieldToEdit === 'fecha') {
          newItem.fecha = batchEditForm.newValue;
        }

        newItem.updatedAt = new Date().toISOString();
        newItem.actualizadoPor = user?.displayName || 'Admin';
        updatedList.push(newItem);
      }

      if (updatedList.length > 0) {
        await localDB.saveToCollectionBulk('inventory_master', updatedList);
        await loadData();
        alert(`¡Se actualizaron exitosamente ${updatedList.length} registros!`);
        setShowBatchEditModal(false);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error(err);
      alert('Error al aplicar la edición masiva.');
    }
  };

  const handleModuleClick = (mod: SubModule) => {
    setActiveModule(mod);
    if (mod === 'codigos') {
      setActiveTab('SALINA CS');
      setActiveCategory('TODOS');
    } else if (mod !== 'dashboard') {
      setActiveTab(mod as MainTab);
    }
  };

  const filtered = getFilteredRecords();

  const modules = [
    { id: 'codigos' as SubModule, label: 'Códigos de Barra', desc: 'Módulo Maestro (Salina, Etanol, ADE)', icon: Hash, bg: 'bg-[#1E293B]', text: 'text-[#38BDF8]' },
    { id: 'DILUCIONES CIMASUR' as SubModule, label: 'Diluciones Cimasur', desc: 'Catálogo base', icon: Droplet, bg: 'bg-[#1E293B]', text: 'text-emerald-400' },
    { id: 'GOTAS PURAS' as SubModule, label: 'Gotas Puras', desc: 'Códigos y productos', icon: Hexagon, bg: 'bg-[#1E293B]', text: 'text-indigo-400' },
    { id: 'ALTAS DILUCIONES' as SubModule, label: 'Altas Diluciones', desc: 'C100/C200', icon: TestTube, bg: 'bg-[#1E293B]', text: 'text-purple-400' },
    { id: 'NOSODES CLIENTES' as SubModule, label: 'Nosodes Clientes', desc: 'Muestras Médicas', icon: Activity, bg: 'bg-[#1E293B]', text: 'text-rose-400' },
    { id: 'FÓRMULAS MAGISTRALES' as SubModule, label: 'Fórmulas Magistrales Generales', desc: 'FM', icon: Layers, bg: 'bg-[#1E293B]', text: 'text-amber-400' },
    { id: 'EC DR. CONEJEROS' as SubModule, label: 'Fórmulas EC', desc: 'Dr. Eduardo Conejeros', icon: FlaskConical, bg: 'bg-[#1E293B]', text: 'text-orange-400' },
  ];

  const currentModuleInfo = modules.find(m => m.id === activeModule);
  const headerTitle = activeModule === 'dashboard' 
    ? 'Gestión de Códigos y Diluciones' 
    : (currentModuleInfo?.label || 'Gestión de Códigos y Diluciones');
  const headerDesc = activeModule === 'dashboard' 
    ? 'Gestión de Códigos y Diluciones.' 
    : (currentModuleInfo?.desc || 'Bases correlativas y catálogos de diluciones');

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
        <Database className="w-8 h-8 text-[#0B2545]" />
        <div>
          <h2 className="text-xl font-black text-[#0B2545] uppercase tracking-tighter">{headerTitle}</h2>
          <p className="text-sm text-[#153B68] font-semibold">
            {headerDesc}
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
                    {tab.replace(' CS', '')}
                  </button>
                ))}
              </div>
            )}

            {(isBaseModule || isMatrixView) && (
              <div className="flex flex-wrap gap-2 mb-4 p-2 bg-[#111a2e]/90 rounded-2xl border border-[#1E293B] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                {BASE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center cursor-pointer",
                      activeCategory === cat 
                        ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]" 
                        : "bg-[#152035] text-slate-400 hover:bg-[#1E293B] border border-[#1E293B]/40 hover:text-white"
                    )}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
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
                {canEdit && (
                  <>
                    <label className="flex items-center justify-center gap-2 bg-[#111A2E] hover:bg-[#1E293B] text-slate-200 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors cursor-pointer border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Importar Excel con opción de actualización o creación">
                      <Upload className="w-4 h-4" /> Importar
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={importExcel} className="hidden" />
                    </label>
                    <label className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors cursor-pointer border border-amber-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Actualizar precios, nombres o datos masivamente mediante Excel">
                      <RefreshCw className="w-4 h-4 text-amber-400" /> Actualizar por Excel
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={updateExcel} className="hidden" />
                    </label>
                    <button onClick={exportTemplate} className="flex items-center justify-center gap-2 bg-[#111A2E] hover:bg-[#1E293B] text-slate-200 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Descargar Plantilla">
                      <Download className="w-4 h-4" /> Plantilla
                    </button>
                  </>
                )}
                <button onClick={exportExcel} className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Exportar Excel">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={exportPDF} className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Exportar PDF">
                  <Download className="w-4 h-4" /> PDF
                </button>
                {canEdit && (
                  <button onClick={() => { loadImportLogs(); setShowHistoryModal(true); }} className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-blue-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Ver Historial de Importaciones">
                    <History className="w-4 h-4" /> Historial
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleSelectDuplicates} className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-4 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-colors border border-amber-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" title="Detectar y seleccionar automáticamente registros duplicados">
                    <Trash2 className="w-4 h-4" /> Detectar Duplicados
                  </button>
                )}
                {canEdit && (
                  <button 
                    onClick={() => { 
                        setEditingId(null); 
                        const currentBase = activeTab === 'MATRIZ COMPLETA' ? 'SALINA CS' : activeTab;
                        const initialCat = activeCategory === 'TODOS' ? 'Oftálmica' : activeCategory;
                        const nextIsGeneric = checkIsGeneric(currentBase, initialCat);
                        setIsBarcodeGeneric(nextIsGeneric);
                        setForm({ 
                          codigo_barras: nextIsGeneric ? 'GENÉRICO' : '', 
                          nombre_producto: '', 
                          solucion: '', 
                          categoria_tipo: initialCat, 
                          fecha: '', 
                          doctor: '',
                          base_master: currentBase,
                          precio: 0
                        });
                        setShowModal(true); 
                    }} 
                    className="flex items-center justify-center gap-2 bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] border border-[#38BDF8]/50 px-5 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)] ml-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar Nuevo
                  </button>
                )}
              </div>
            </div>

            {/* Acciones Masivas Sub-Bar */}
            {canDelete && selectedIds.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-red-950/20 border border-red-500/20 rounded-2xl shadow-inner animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <div>
                    <span className="text-xs font-black text-red-200 uppercase tracking-widest block leading-none">Acciones Masivas</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                      {selectedIds.length} seleccionados de {filtered.length} visibles
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatchEditForm({ fieldToEdit: 'precio', newValue: '', percentage: 0 });
                        setShowBatchEditModal(true);
                      }}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Edición Masiva ({selectedIds.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.length === 0}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5",
                      selectedIds.length > 0
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                        : "bg-red-500/10 text-red-500/30 border border-red-500/10 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Seleccionados ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAllFiltered}
                    disabled={filtered.length === 0}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5",
                      filtered.length > 0
                        ? "bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30"
                        : "bg-[#152035] text-slate-500 border border-[#1E293B]/60 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Todo ({filtered.length})
                  </button>
                </div>
              </div>
            )}
          </div>
 
          <div className="flex flex-col flex-1 min-h-0">
            <div className="bg-[#152035] border border-[#1E293B] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto max-h-[550px] scrollbar-thin">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-[#111A2E] border-b border-[#1E293B]">
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#111A2E]">
                    <th className="p-4 w-12 text-center border-r border-[#1E293B] bg-[#111A2E] sticky top-0">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-opacity-25 cursor-pointer w-4 h-4"
                        checked={filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => {
                              const newIds = [...prev];
                              filtered.forEach(r => {
                                if (!newIds.includes(r.id)) newIds.push(r.id);
                              });
                              return newIds;
                            });
                          } else {
                            setSelectedIds(prev => prev.filter(id => !filtered.some(r => r.id === id)));
                          }
                        }}
                      />
                    </th>
                    {getHeadersForTab(activeTab).map((h, i) => (
                      <th 
                        key={i} 
                        className={cn(
                          "p-4 border-r border-[#1E293B] bg-[#111A2E] sticky top-0 text-left",
                          h === 'G.P' && "w-20 text-center",
                          i === 0 && "min-w-[180px] whitespace-nowrap font-mono",
                          (h === 'PRODUCTO' || h === 'NOMBRE PRODUCTO' || h === 'IDENTIFICACIÓN' || h === 'MUESTRA Y POTENCIA' || h === 'NOMBRE NOSODE') && "w-full min-w-[320px] md:min-w-[420px]",
                          (h === 'SOLUCIÓN' || h === 'SOLUCION') && "min-w-[200px] text-center whitespace-nowrap px-6",
                          (h === 'BASE MASTER') && "min-w-[180px] text-center whitespace-nowrap px-6",
                          (h === 'CATEGORÍA' || h === 'CATEGORIA') && "min-w-[160px] text-center whitespace-nowrap px-4",
                          (h === 'FECHA' || h === 'FECHA ELABORACIÓN' || h === 'DILUCIÓN' || h === 'DILUCIONES / ACTUALIZACIÓN') && "w-48 text-center",
                          (h === 'DOCTOR(A)' || h === 'DOCTOR') && "min-w-[220px] w-64 text-center whitespace-nowrap",
                          h === 'PRECIO' && "w-32 text-center"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                    <th className="p-5 w-24 text-center bg-[#111A2E] sticky top-0">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length > 0 ? (
                    filtered.map((r, i) => {
                      const rowVals = getRowForTab(r, activeTab);
                      const isDup = !!r.es_duplicado;
                      return (
                      <tr key={r.id || i} className={cn(
                        "hover:bg-[#1E293B] group transition-all duration-300",
                        isDup && "bg-red-500/10 hover:bg-red-500/20 border-l-2 border-red-500"
                      )}>
                        <td className="p-4 text-center border-r border-[#1E293B] w-12 bg-transparent">
                          <input 
                            type="checkbox"
                            className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-opacity-25 cursor-pointer w-4 h-4"
                            checked={selectedIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, r.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== r.id));
                              }
                            }}
                          />
                        </td>
                        {rowVals.map((val, idx) => {
                          const headers = getHeadersForTab(activeTab);
                          const headerName = headers[idx] || '';
                          const isSolucionHeader = headerName === 'SOLUCIÓN' || headerName === 'SOLUCION';
                          const isBaseMasterHeader = headerName === 'BASE MASTER';
                          const isCategoriaHeader = headerName === 'CATEGORÍA' || headerName === 'CATEGORIA';
                          const isPrice = (isBaseModule || isMatrixView) && idx === rowVals.length - 1;
                          const isProductName = (activeTab === 'FÓRMULAS MAGISTRALES' || activeTab === 'EC DR. CONEJEROS' || activeTab === 'NOSODES CLIENTES') ? idx === 2 : idx === 1;
                          const isGP = (activeTab === 'FÓRMULAS MAGISTRALES' || activeTab === 'EC DR. CONEJEROS' || activeTab === 'NOSODES CLIENTES') && idx === 1;
                          const isDoctor = (activeTab === 'NOSODES CLIENTES' || activeTab === 'FÓRMULAS MAGISTRALES') && idx === 4;
                          return (
                            <td key={idx} className={cn(
                              "p-4 text-xs border-r border-[#1E293B]",
                              idx === 0 
                                ? (isDup ? 'font-mono font-bold text-red-400 whitespace-nowrap' : 'font-mono font-bold text-[#38BDF8] whitespace-nowrap drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]') 
                                : isProductName 
                                ? (isDup ? 'font-bold text-sm text-red-200' : 'font-bold text-sm text-white') 
                                : isSolucionHeader
                                ? (isDup ? 'text-red-300 font-bold text-center min-w-[200px] px-6 text-xs' : 'text-slate-100 font-bold text-center min-w-[200px] px-6 text-xs')
                                : isBaseMasterHeader
                                ? (isDup ? 'text-red-300 font-bold text-center min-w-[180px] px-6 text-xs' : 'text-sky-300 font-bold text-center min-w-[180px] px-6 text-xs')
                                : isCategoriaHeader
                                ? (isDup ? 'text-red-300 text-center min-w-[160px] px-4' : 'text-slate-200 text-center min-w-[160px] px-4')
                                : isGP
                                ? (isDup ? 'text-red-300 text-center w-20' : 'text-slate-300 text-center w-20')
                                : isDoctor
                                ? (isDup ? 'text-red-300 text-sm whitespace-nowrap font-medium' : 'text-slate-200 text-sm whitespace-nowrap font-medium')
                                : isPrice 
                                ? 'font-mono font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] font-black'
                                : (isDup ? 'text-red-300/80' : 'text-slate-300')
                            )}>
                              {val || '---'}
                            </td>
                          );
                        })}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-[#38BDF8] bg-[#152035] shadow-[0_4px_20px_rgba(0,0,0,0.4)] border rounded-md hover:border-[#38BDF8]/50 transition-all cursor-pointer" title="Editar">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(r.id, r.nombre_producto)} className="p-1.5 text-slate-400 hover:text-red-500 bg-[#152035] shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-red-500/10 rounded-md hover:border-red-500/50 transition-all cursor-pointer" title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={getHeadersForTab(activeTab).length + 2} className="p-12 text-center">
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
              <span>Base: {activeTab.replace(' CS', '')} {isBaseModule && `> ${activeCategory}`}</span>
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
                    onChange={e => {
                      const newBase = e.target.value;
                      setForm(prev => {
                        const updates: any = { base_master: newBase };
                        if (!editingId) {
                          const nextIsGeneric = checkIsGeneric(newBase, prev.categoria_tipo);
                          setIsBarcodeGeneric(nextIsGeneric);
                          updates.codigo_barras = nextIsGeneric ? 'GENÉRICO' : (prev.codigo_barras === 'GENÉRICO' ? '' : prev.codigo_barras);
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                  >
                    {Object.keys(PREFIX_MAP).map(bm => <option key={bm} value={bm}>{bm.replace(' CS', '')}</option>)}
                  </select>
                </FormField>
              )}

              {(isBaseModule || activeTab === 'MATRIZ COMPLETA') && (
                <FormField label="Categoría">
                  <select 
                    className="w-full bg-[#152035] border-b border-[#1E293B] focus:border-[#38BDF8] p-2 text-sm font-bold text-white outline-none cursor-pointer"
                    value={form.categoria_tipo || 'Oftálmica'}
                    onChange={e => {
                      const newCat = e.target.value;
                      setForm(prev => {
                        const updates: any = { categoria_tipo: newCat };
                        if (!editingId) {
                          const nextIsGeneric = checkIsGeneric(prev.base_master || activeTab, newCat);
                          setIsBarcodeGeneric(nextIsGeneric);
                          updates.codigo_barras = nextIsGeneric ? 'GENÉRICO' : (prev.codigo_barras === 'GENÉRICO' ? '' : prev.codigo_barras);
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                  >
                    {BASE_CATEGORIES.filter(c => c !== 'TODOS').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
              )}

              {(isBaseModule || activeTab === 'MATRIZ COMPLETA') && (
                <FormField label="Precio ($)">
                  <input
                    type="number"
                    className="w-full bg-[#152035] border-b border-[#1E293B] focus:border-[#38BDF8] p-2 text-sm font-bold text-white outline-none"
                    placeholder="Ej. 15000"
                    value={form.precio !== undefined ? form.precio : ''}
                    onChange={e => setForm({...form, precio: e.target.value === '' ? '' : Number(e.target.value)})}
                  />
                </FormField>
              )}

              <div className="flex flex-col gap-1">
                {/* Checkbox para alternar código genérico */}
                {isBaseModule && (
                  <div className="flex items-center gap-2 mb-2 bg-[#1A253E] p-2.5 rounded-xl border border-amber-500/20">
                    <input
                      type="checkbox"
                      id="checkbox-es-generico"
                      checked={isBarcodeGeneric}
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsBarcodeGeneric(checked);
                        setForm(prev => ({
                          ...prev,
                          codigo_barras: checked ? 'GENÉRICO' : (prev.codigo_barras === 'GENÉRICO' ? '' : prev.codigo_barras)
                        }));
                      }}
                      className="w-4 h-4 rounded border-[#1E293B] text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                    />
                    <label htmlFor="checkbox-es-generico" className="text-[10px] font-black uppercase text-amber-400 cursor-pointer select-none tracking-wider">
                      ¿CÓDIGO GENÉRICO FIJO? (MARCAR SÓLO PARA FAMILIAS SIN CORRELATIVO)
                    </label>
                  </div>
                )}

                <FormField label={getHeadersForTab(activeTab)[0] || "CÓDIGO"}>
                  <input
                    type="text"
                    required
                    readOnly={isBarcodeGeneric}
                    className={cn(
                        "w-full border-b p-2 text-sm font-mono font-bold outline-none",
                        isBarcodeGeneric ? "border-amber-200 bg-amber-500/10 text-amber-500 cursor-not-allowed" : "border-[#1E293B] focus:border-[#001736] text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                    )}
                    value={isBarcodeGeneric ? 'GENÉRICO' : (form.codigo_barras || '')}
                    onChange={e => setForm({...form, codigo_barras: e.target.value})}
                  />
                  {isBarcodeGeneric && <span className="text-[10px] text-amber-500 font-black uppercase mt-1">GENÉRICO FIJO (NO CORRELATIVO)</span>}
                  {!isBarcodeGeneric && !editingId && <span className="text-[9px] text-[#38BDF8] font-black uppercase mt-1">CÓDIGO ÚNICO CORRELATIVO</span>}
                </FormField>
                
                {!editingId && !isBarcodeGeneric && (() => {
                   const stats = getCodeStats();
                   return (
                     <div className="mt-2 bg-[#0F172A] p-3 rounded-xl border border-[#1E293B]">
                        <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase">Sugerencias de Códigos:</h4>
                        <div className="flex flex-wrap gap-2">
                           <button 
                               type="button" 
                               onClick={() => setForm(prev => ({ ...prev, codigo_barras: stats.nextCode }))}
                               className="text-xs font-mono font-bold bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/30 hover:bg-sky-500/40 transition-colors"
                           >
                              SIGUIENTE: {stats.nextCode}
                           </button>
                           {stats.missingCodes.map(code => (
                              <button 
                                  key={code} 
                                  type="button" 
                                  onClick={() => setForm(prev => ({ ...prev, codigo_barras: code }))}
                                  className="text-xs font-mono font-bold bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/30 transition-colors"
                              >
                                  RECUPERAR: {code}
                              </button>
                           ))}
                        </div>
                     </div>
                   );
                })()}
              </div>

              <FormField label={['FÓRMULAS MAGISTRALES', 'EC DR. CONEJEROS', 'NOSODES CLIENTES'].includes(activeTab) ? getHeadersForTab(activeTab)[2] || "PRODUCTO" : getHeadersForTab(activeTab)[1] || "PRODUCTO"}>
                <input
                  type="text"
                  required
                  className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm font-bold text-white outline-none uppercase"
                  placeholder={activeTab === 'FÓRMULAS MAGISTRALES' ? "Ej. Echinacea, Tumor Paladar" : "Ej. Echinacea, Tumor Paladar, C-100"}
                  value={form.nombre_producto || ''}
                  onChange={e => setForm({...form, nombre_producto: e.target.value})}
                />
              </FormField>

              {(activeTab === 'FÓRMULAS MAGISTRALES' || activeTab === 'EC DR. CONEJEROS' || activeTab === 'NOSODES CLIENTES') && (
                <FormField label="G.P">
                  <input
                    type="text"
                    className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                    placeholder="Ej. G.P, R3, etc."
                    value={activeTab === 'FÓRMULAS MAGISTRALES' ? (form.solucion || '') : (form.gp || '')}
                    onChange={e => {
                      if (activeTab === 'FÓRMULAS MAGISTRALES') {
                        setForm({...form, solucion: e.target.value});
                      } else {
                        setForm({...form, gp: e.target.value});
                      }
                    }}
                  />
                </FormField>
              )}

              {['NOSODES CLIENTES', 'FÓRMULAS MAGISTRALES', 'EC DR. CONEJEROS'].includes(activeTab) ? (
                activeTab === 'EC DR. CONEJEROS' ? (
                  <FormField label="FECHA ELABORACIÓN">
                    <input
                      type="date"
                      className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                      value={form.fecha || ''}
                      onChange={e => setForm({...form, fecha: e.target.value})}
                    />
                  </FormField>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="FECHA">
                      <input
                        type="date"
                        className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                        value={form.fecha || ''}
                        onChange={e => setForm({...form, fecha: e.target.value})}
                      />
                    </FormField>
                    <FormField label="DOCTOR(A)">
                      <input
                        type="text"
                        className="w-full border-b border-[#1E293B] focus:border-[#001736] p-2 text-sm text-slate-200 outline-none uppercase"
                        placeholder="Ej. Dra. Marcela Farias"
                        value={form.doctor || ''}
                        onChange={e => setForm({...form, doctor: e.target.value})}
                      />
                    </FormField>
                  </div>
                )
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

      {/* Modal de Reporte de Importación */}
      {importReport && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.6)]">
            <div className="p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#1E3A5F] text-white">
              <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Reporte de Importación de Inventario
              </h3>
              <button onClick={() => setImportReport(null)} className="text-white/50 hover:text-white font-bold text-xl leading-none">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Resumen de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#1E293B]">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Procesado</div>
                  <div className="text-2xl font-black text-slate-200 mt-1">{importReport.totalProcessed}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Líneas en el archivo</div>
                </div>

                <div className="bg-[#0F172A] p-4 rounded-2xl border border-emerald-500/20">
                  <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Importado con Éxito</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">+{importReport.successCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Agregados al inventario</div>
                </div>

                <div className="bg-[#0F172A] p-4 rounded-2xl border border-amber-500/20">
                  <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    {importReport.accionDuplicados === 'importados_en_rojo' ? 'Duplicados Incluidos' : 'Duplicados Omitidos'}
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{importReport.duplicates.length}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {importReport.accionDuplicados === 'importados_en_rojo' ? 'Agregados en rojo' : 'Filtrados del archivo'}
                  </div>
                </div>

                <div className="bg-[#0F172A] p-4 rounded-2xl border border-blue-500/20">
                  <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Sin Código / Correlativos</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{importReport.emptyCodesCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Se asignó código auto.</div>
                </div>
              </div>

              {/* Advertencias / Información útil */}
              {(importReport.emptyCodesCount > 0 || importReport.emptyRowsCount > 0) && (
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-blue-500/10 space-y-2">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Notas de la importación:
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                    {importReport.emptyCodesCount > 0 && (
                      <li>
                        Se detectaron <strong>{importReport.emptyCodesCount} registros sin código</strong> en el archivo Excel. Para asegurar que puedan identificarse, el sistema los guardó y les asignará automáticamente un código correlativo único y seguro del módulo correspondiente.
                      </li>
                    )}
                    {importReport.emptyRowsCount > 0 && (
                      <li>
                        Se omitieron <strong>{importReport.emptyRowsCount} filas vacías</strong> detectadas en el archivo para evitar crear registros en blanco.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Sección de Duplicados */}
              <div>
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-widest mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                  {importReport.accionDuplicados === 'importados_en_rojo' 
                    ? `Duplicados Importados en Rojo (${importReport.duplicates.length})` 
                    : `Duplicados Omitidos (${importReport.duplicates.length})`}
                </h4>
                
                {importReport.duplicates.length === 0 ? (
                  <div className="bg-[#0F172A] p-6 rounded-2xl border border-[#1E293B] text-center text-sm text-slate-400">
                    🎉 ¡Excelente! No se encontraron códigos duplicados ni inconvenientes en la importación.
                  </div>
                ) : (
                  <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300 border-collapse">
                        <thead className="bg-[#1A263F] text-[10px] font-black uppercase tracking-wider text-slate-300 sticky top-0">
                          <tr>
                            <th className="p-3">Código</th>
                            <th className="p-3">Producto en Excel</th>
                            <th className="p-3 text-amber-400">Estado / Ubicación</th>
                            <th className="p-3">Producto Coincidente</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                          {importReport.duplicates.map((dup, idx) => (
                            <tr key={idx} className="hover:bg-[#152035]/50 transition-colors">
                              <td className="p-3 font-mono font-bold text-amber-400">{dup.codigo}</td>
                              <td className="p-3 font-bold">{dup.nombre || '---'}</td>
                              <td className="p-3 font-sans">
                                <span className={cn(
                                  "px-2 py-1 rounded-md text-[10px] font-black uppercase",
                                  importReport.accionDuplicados === 'importados_en_rojo'
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : dup.type === 'system' 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                )}>
                                  {importReport.accionDuplicados === 'importados_en_rojo'
                                    ? 'Importado (Rojo)'
                                    : dup.type === 'system'
                                    ? 'Omitido (Ya en sistema)'
                                    : 'Omitido (Repetido en Excel)'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 italic font-medium">{dup.existingProduct || '---'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[#1E293B] bg-[#0F172A] flex justify-end">
              <button 
                onClick={() => setImportReport(null)}
                className="px-6 py-3 bg-[#1E3A5F] hover:bg-[#1D3557] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-md"
              >
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choice Modal for Pending Import with Duplicates */}
      {pendingImport && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] max-w-3xl w-full overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-[#1E293B] bg-amber-500/10 flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold uppercase tracking-widest text-sm text-amber-400">
                  ¡Códigos Duplicados / Coincidentes Detectados!
                </h3>
                <p className="text-xs text-slate-400 mt-1">Archivo: <span className="font-mono font-bold text-slate-300">{pendingImport.fileName}</span></p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-slate-300 text-sm leading-relaxed">
                Se han encontrado <strong className="text-amber-400">{pendingImport.duplicateItems.length} códigos coincidentes</strong> entre el archivo Excel y la base de datos de <strong className="text-sky-400">{activeTab}</strong>. Elija cómo desea proceder:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Opción 1: Actualizar Datos de Existentes */}
                <button
                  type="button"
                  onClick={() => executePendingImport('update')}
                  className="bg-[#111A2E] hover:bg-[#1C2C4E] p-5 rounded-2xl border-2 border-emerald-500/40 text-left transition-all hover:border-emerald-400 cursor-pointer group flex flex-col justify-between h-48 shadow-lg shadow-emerald-500/5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-wider">Opción 1: Actualizar Datos</h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Sugerido</span>
                    </div>
                    <p className="text-xs text-slate-300 group-hover:text-white leading-relaxed">
                      Actualizar precios, nombres, soluciones, doctor y datos de los <strong className="text-emerald-400">{pendingImport.duplicateItems.length} productos existentes</strong> con la información del Excel, e importar los <strong className="text-white">{pendingImport.uniqueRows.length} nuevos</strong>.
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4 uppercase">
                    Actualizar y Guardar →
                  </span>
                </button>

                {/* Opción 2: Omitir duplicados */}
                <button
                  type="button"
                  onClick={() => executePendingImport('omit')}
                  className="bg-[#111A2E] hover:bg-[#1C2C4E] p-5 rounded-2xl border border-[#1E293B] text-left transition-all hover:border-sky-500/40 cursor-pointer group flex flex-col justify-between h-48"
                >
                  <div>
                    <h4 className="font-bold text-sky-400 uppercase text-xs tracking-wider mb-2">Opción 2: Omitir duplicados</h4>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                      Importar únicamente los <strong className="text-white">{pendingImport.uniqueRows.length} registros nuevos</strong>. Las {pendingImport.duplicateItems.length} filas con código repetido se ignorarán sin modificar el sistema.
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-sky-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4 uppercase">
                    Proceder con Únicos →
                  </span>
                </button>

                {/* Opción 3: Forzar todo (marcar en rojo) */}
                <button
                  type="button"
                  onClick={() => executePendingImport('red')}
                  className="bg-[#111A2E] hover:bg-[#1C2C4E] p-5 rounded-2xl border border-red-500/20 text-left transition-all hover:border-red-500/50 cursor-pointer group flex flex-col justify-between h-48"
                >
                  <div>
                    <h4 className="font-bold text-red-400 uppercase text-xs tracking-wider mb-2">Opción 3: Incluir Todo (Rojo)</h4>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                      Forzar la creación de todos los <strong className="text-white">{pendingImport.uniqueRows.length + pendingImport.duplicateRows.length} registros</strong>. Los duplicados se agregarán como nuevos y se resaltarán <strong className="text-red-400">en rojo</strong>.
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-red-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4 uppercase">
                    Crear Duplicados →
                  </span>
                </button>
              </div>

              {/* Lista compacta de duplicados para revisión rápida */}
              <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-4">
                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Vista previa de coincidencia por código:</h5>
                <div className="max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-thin text-xs">
                  {pendingImport.duplicateItems.slice(0, 5).map((dup, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-300 py-1 border-b border-[#1E293B]/60 font-mono">
                      <span>{dup.codigo} - {dup.nombre}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-black">
                        {dup.type === 'system' ? 'Existe en Sistema' : 'Repetido en Archivo'}
                      </span>
                    </div>
                  ))}
                  {pendingImport.duplicateItems.length > 5 && (
                    <div className="text-[10px] text-slate-400 italic text-center mt-2">
                      ...y otros {pendingImport.duplicateItems.length - 5} productos más.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#1E293B] bg-[#0F172A] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancelar Importación
              </button>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {pendingImport.totalProcessed} Líneas procesadas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reporte de Actualización Masiva por Excel */}
      {updateReport && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-[#1E293B] flex justify-between items-center bg-amber-500/20 text-amber-300">
              <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                Reporte de Actualización Masiva de Datos
              </h3>
              <button onClick={() => setUpdateReport(null)} className="text-white/50 hover:text-white font-bold text-xl leading-none">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-emerald-500/20">
                  <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Actualizados Con Éxito</div>
                  <div className="text-3xl font-black text-emerald-400 mt-1">{updateReport.updatedCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Registros del sistema modificados</div>
                </div>

                <div className="bg-[#0F172A] p-4 rounded-2xl border border-amber-500/20">
                  <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">No Encontrados</div>
                  <div className="text-3xl font-black text-amber-400 mt-1">{updateReport.notFoundCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Códigos no hallados en {activeTab}</div>
                </div>

                <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#1E293B]">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total en Excel</div>
                  <div className="text-3xl font-black text-slate-200 mt-1">{updateReport.totalProcessed}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Líneas analizadas</div>
                </div>
              </div>

              {updateReport.updatedItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Detalle de Productos Actualizados ({updateReport.updatedItems.length}):
                  </h4>
                  <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] max-h-56 overflow-y-auto p-2 scrollbar-thin">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#1A263F] text-[10px] font-black uppercase tracking-wider text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2">Código</th>
                          <th className="p-2">Producto</th>
                          <th className="p-2 text-right">Precio Previo</th>
                          <th className="p-2 text-right text-emerald-400">Nuevo Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]">
                        {updateReport.updatedItems.map((item, i) => (
                          <tr key={i} className="hover:bg-[#152035]">
                            <td className="p-2 font-mono font-bold text-amber-400">{item.codigo}</td>
                            <td className="p-2 font-semibold text-white">{item.nombre}</td>
                            <td className="p-2 text-right text-slate-400">${Number(item.prevPrecio || 0).toLocaleString('es-CL')}</td>
                            <td className="p-2 text-right font-bold text-emerald-400">${Number(item.newPrecio || 0).toLocaleString('es-CL')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {updateReport.notFoundItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Códigos no encontrados en la base actual ({updateReport.notFoundItems.length}):
                  </h4>
                  <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] max-h-40 overflow-y-auto p-3 text-xs text-slate-400 font-mono space-y-1">
                    {updateReport.notFoundItems.slice(0, 10).map((nf, i) => (
                      <div key={i} className="flex justify-between border-b border-[#1E293B]/50 pb-1">
                        <span>{nf.codigo}</span>
                        <span className="text-slate-500">{nf.nombre}</span>
                      </div>
                    ))}
                    {updateReport.notFoundItems.length > 10 && (
                      <div className="text-[10px] text-center text-slate-500 italic pt-1">
                        ...y {updateReport.notFoundItems.length - 10} más.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#1E293B] bg-[#0F172A] flex justify-end">
              <button
                onClick={() => setUpdateReport(null)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Masiva de Seleccionados */}
      {showBatchEditModal && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] max-w-lg w-full overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-[#1E293B] bg-sky-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold uppercase tracking-widest text-sm text-sky-400">
                    Edición Masiva
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modificar <strong className="text-white">{selectedIds.length} registros</strong> seleccionados en <strong className="text-sky-300">{activeTab}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBatchEditModal(false)} className="text-white/50 hover:text-white font-bold text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Selecciona el campo que deseas actualizar:
                </label>
                <select
                  value={batchEditForm.fieldToEdit}
                  onChange={e => setBatchEditForm({ ...batchEditForm, fieldToEdit: e.target.value })}
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-semibold text-white outline-none focus:border-sky-500"
                >
                  <option value="precio">Precio Exacto ($)</option>
                  <option value="precio_porcentaje">Ajuste Porcentual de Precio (%)</option>
                  <option value="categoria_tipo">Categoría</option>
                  <option value="doctor">Doctor(a)</option>
                  <option value="solucion">Solución / Dilución</option>
                  <option value="fecha">Fecha Elaboración</option>
                </select>
              </div>

              {batchEditForm.fieldToEdit === 'precio' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Nuevo Precio ($ CLP) para todos los seleccionados:
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 12500"
                    value={batchEditForm.newValue}
                    onChange={e => setBatchEditForm({ ...batchEditForm, newValue: e.target.value })}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {batchEditForm.fieldToEdit === 'precio_porcentaje' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Porcentaje de variación (+ o -):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Ej. 10 para +10%, -5 para descuento de 5%"
                      value={batchEditForm.percentage}
                      onChange={e => setBatchEditForm({ ...batchEditForm, percentage: Number(e.target.value) })}
                      className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-bold text-sky-400 outline-none focus:border-sky-500"
                    />
                    <span className="text-lg font-black text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ejemplo: Ingrese <strong>10</strong> para aumentar los precios un 10%, o <strong>-10</strong> para reducirlos un 10%.
                  </p>
                </div>
              )}

              {batchEditForm.fieldToEdit === 'categoria_tipo' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Nueva Categoría:
                  </label>
                  <select
                    value={batchEditForm.newValue}
                    onChange={e => setBatchEditForm({ ...batchEditForm, newValue: e.target.value })}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-semibold text-white outline-none focus:border-sky-500"
                  >
                    <option value="">-- Seleccionar Categoría --</option>
                    {BASE_CATEGORIES.filter(c => c !== 'TODOS').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {batchEditForm.fieldToEdit === 'doctor' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Nuevo Doctor(a):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Dr. Eduardo Conejeros"
                    value={batchEditForm.newValue}
                    onChange={e => setBatchEditForm({ ...batchEditForm, newValue: e.target.value })}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-sky-500 uppercase"
                  />
                </div>
              )}

              {batchEditForm.fieldToEdit === 'solucion' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Nueva Solución / Dilución:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. R3 1:3"
                    value={batchEditForm.newValue}
                    onChange={e => setBatchEditForm({ ...batchEditForm, newValue: e.target.value })}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-sky-500 uppercase"
                  />
                </div>
              )}

              {batchEditForm.fieldToEdit === 'fecha' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Nueva Fecha:
                  </label>
                  <input
                    type="date"
                    value={batchEditForm.newValue}
                    onChange={e => setBatchEditForm({ ...batchEditForm, newValue: e.target.value })}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#1E293B] bg-[#0F172A] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowBatchEditModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBatchEdit}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg shadow-sky-500/20 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar a {selectedIds.length} Registros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Importaciones */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#111A2E] text-white">
              <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Historial y Reportes de Importación Guardados
              </h3>
              <button onClick={() => { setShowHistoryModal(false); setSelectedLog(null); }} className="text-white/50 hover:text-white font-bold text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
              {/* Sidebar: Lista de Importaciones */}
              <div className="w-full md:w-80 border-r border-[#1E293B] overflow-y-auto p-4 space-y-2 bg-[#111A2E]/50">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Registros de Importación</h4>
                {importLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No hay importaciones registradas.</p>
                ) : (
                  importLogs.map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        "w-full p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1.5 group",
                        selectedLog?.id === log.id 
                          ? "bg-blue-500/10 border-blue-500/50 text-white" 
                          : "bg-[#152035]/60 border-[#1E293B]/60 text-slate-300 hover:bg-[#1E293B] hover:text-white"
                      )}
                    >
                      <div className="text-xs font-bold truncate group-hover:text-blue-400 transition-colors">
                        {log.nombre_archivo}
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between items-center font-mono">
                        <span>{new Date(log.fecha).toLocaleString()}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#111A2E] text-blue-400 border border-blue-500/10 text-[9px] uppercase font-black">
                          {log.modulo.replace(' CS', '')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex gap-2">
                        <span>Éxito: <strong className="text-emerald-400">+{log.exitosos || 0}</strong></span>
                        <span>Dups: <strong className={log.duplicados_count > 0 ? "text-amber-400" : "text-slate-500"}>{log.duplicados_count || 0}</strong></span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Contenido Principal: Detalle de la Importación Seleccionada */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#152035]">
                {selectedLog ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-base font-bold text-white uppercase tracking-wide">
                          Detalle: {selectedLog.nombre_archivo}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          Importado el {new Date(selectedLog.fecha).toLocaleString()} por el Administrador
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('¿Estás seguro de eliminar este registro del historial? (Los registros de inventario importados NO se eliminarán)')) {
                              await localDB.deleteFromCollection('import_history', selectedLog.id);
                              setSelectedLog(null);
                              await loadImportLogs();
                            }
                          }}
                          className="p-2 text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Eliminar Reporte"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar Log
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-[#0F172A] p-4 rounded-xl border border-[#1E293B]">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Métricas del Reporte</div>
                        <div className="text-sm text-slate-300 mt-2 space-y-1">
                          <div>Procesados: <strong className="text-white">{selectedLog.total_procesados || 0}</strong></div>
                          <div>Exitosos: <strong className="text-emerald-400">+{selectedLog.exitosos || 0}</strong></div>
                          <div>Dups Detectados: <strong className="text-amber-400">{selectedLog.duplicados_count || 0}</strong></div>
                        </div>
                      </div>

                      <div className="bg-[#0F172A] p-4 rounded-xl border border-[#1E293B]">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Acción con Duplicados</div>
                        <div className="mt-2">
                          {selectedLog.duplicados_count === 0 ? (
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Sin inconvenientes
                            </span>
                          ) : selectedLog.accion_duplicados === 'importados_en_rojo' ? (
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                              Importados en Rojo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Omitidos / Ignorados
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 leading-tight">
                          {selectedLog.accion_duplicados === 'importados_en_rojo' 
                            ? 'Los códigos duplicados fueron incorporados al inventario de todas formas.' 
                            : 'Los códigos duplicados fueron filtrados y no se guardaron.'}
                        </div>
                      </div>

                      <div className="bg-[#0F172A] p-4 rounded-xl border border-[#1E293B]">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Otros Detalles</div>
                        <div className="text-xs text-slate-300 mt-2 space-y-1">
                          <div>Módulo: <strong className="text-slate-100">{selectedLog.modulo.replace(' CS', '')}</strong></div>
                          <div>Sin Código: <strong className="text-blue-400">{selectedLog.empty_codes || 0}</strong></div>
                          <div>Vacías: <strong className="text-slate-500">{selectedLog.empty_rows || 0}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de duplicados detallada del Log */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Listado de Inconvenientes de esta Importación ({selectedLog.duplicados_count || 0})
                      </h5>
                      {(!selectedLog.duplicados_detalle || selectedLog.duplicados_detalle.length === 0) ? (
                        <div className="bg-[#0F172A] p-6 rounded-2xl border border-[#1E293B] text-center text-xs text-slate-400 font-medium">
                          🎉 Esta importación no presentó códigos duplicados ni advertencias.
                        </div>
                      ) : (
                        <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden">
                          <table className="w-full text-left text-xs text-slate-300 border-collapse">
                            <thead className="bg-[#1A263F] text-[10px] font-black uppercase tracking-wider text-slate-300 sticky top-0">
                              <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Producto en Excel</th>
                                <th className="p-3">Tipo de Duplicado</th>
                                <th className="p-3">Producto Coincidente</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E293B]">
                              {selectedLog.duplicados_detalle.map((dup: any, idx: number) => (
                                <tr key={idx} className="hover:bg-[#152035]/50 transition-colors font-mono text-[11px]">
                                  <td className="p-3 font-bold text-amber-400">{dup.codigo}</td>
                                  <td className="p-3 font-sans font-bold text-slate-200">{dup.nombre || '---'}</td>
                                  <td className="p-3 font-sans">
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                                      dup.type === 'system' 
                                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    )}>
                                      {dup.type === 'system' ? 'Ya en sistema' : 'Repetido en Excel'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-sans text-slate-400 italic font-medium">{dup.existingProduct || '---'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                    <History className="w-16 h-16 mb-4 text-slate-600 animate-pulse" />
                    <p className="text-sm font-bold uppercase tracking-wider">Selecciona una Importación</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm text-center leading-relaxed">
                      Selecciona un registro de importación de la lista de la izquierda para revisar el reporte detallado, métricas, y errores históricos.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[#1E293B] bg-[#111A2E] flex justify-end">
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedLog(null); }}
                className="px-6 py-3 bg-[#1E3A5F] hover:bg-[#1D3557] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-md cursor-pointer"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
