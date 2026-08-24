import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove, cleanupLocalStorageQuota } from '../../lib/safeStorage';
import { getIndexedDbCache, setIndexedDbCache, removeIndexedDbCache } from '../../lib/indexedDbCache';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { localDB, addAuditLog } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatCurrency } from '../../lib/utils';
import { getDb, isFirebaseReady } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  Timestamp,
  deleteDoc,
  writeBatch,
  updateDoc,
  deleteField,
  limit
} from 'firebase/firestore';
import { 
  Save, Users, 
  PlusCircle, 
  Target, 
  Package, 
  Tag, 
  Check, 
  CheckCircle,
  Clock,
  RefreshCw, 
  TriangleAlert, 
  Calendar, 
  DollarSign, 
  Layers, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Settings,
  Filter,
  Download,
  FileText,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload, Edit, Edit2, Edit3, X, RotateCcw, Search, ListFilter
} from 'lucide-react';
const PRODUCTOS_CATALOGO: string[] = [];

const PRECIOS_BASE: Record<string, number> = {};

// Robust date parsing helpers to guarantee YYYY-MM-DD
const parseDateString = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal.toDate === 'function') {
    try {
      const d = dateVal.toDate();
      return d.toISOString().split('T')[0];
    } catch (e) {}
  }
  if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
    try {
      const d = new Date(dateVal.seconds * 1000);
      return d.toISOString().split('T')[0];
    } catch (e) {}
  }
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return '';
};

const formatDateToDDMMYYYY = (dateVal: any): string => {
  const yyyymmdd = parseDateString(dateVal);
  if (!yyyymmdd) return '';
  const parts = yyyymmdd.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return yyyymmdd;
};

const formatMonthName = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  const monthsEs = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const mIdx = parseInt(month, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${monthsEs[mIdx]} ${year}`;
  }
  return yearMonth;
};

const generateMultiMonthLabel = (baseYearMonth: string, numMonths: number): string => {
  if (!baseYearMonth || !baseYearMonth.includes('-')) return '';
  if (numMonths <= 1) return formatMonthName(baseYearMonth);

  const [yearStr, monthStr] = baseYearMonth.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  const monthsEs = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (numMonths === 2) {
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) { nextM = 1; nextY += 1; }
    if (y === nextY) {
      return `${monthsEs[m - 1]} y ${monthsEs[nextM - 1]} ${y}`;
    } else {
      return `${monthsEs[m - 1]} ${y} y ${monthsEs[nextM - 1]} ${nextY}`;
    }
  }

  if (numMonths === 3) {
    let m2 = m + 1;
    let y2 = y;
    if (m2 > 12) { m2 = 1; y2 += 1; }
    let m3 = m + 2;
    let y3 = y;
    if (m3 > 12) { m3 -= 12; y3 += 1; }

    if (y === y3) {
      return `${monthsEs[m - 1]}, ${monthsEs[m2 - 1]} y ${monthsEs[m3 - 1]} ${y}`;
    } else {
      return `${monthsEs[m - 1]} ${y} a ${monthsEs[m3 - 1]} ${y3}`;
    }
  }

  let endM = m + numMonths - 1;
  let endY = y;
  while (endM > 12) {
    endM -= 12;
    endY += 1;
  }

  if (y === endY) {
    return `${monthsEs[m - 1]} a ${monthsEs[endM - 1]} ${y}`;
  } else {
    return `${monthsEs[m - 1]} ${y} a ${monthsEs[endM - 1]} ${endY}`;
  }
};

const handleDownloadQuoteReportGlobal = (month: string, items: any[], clientName: string = 'Cliente', customPeriodLabel?: string) => {
  const monthNameFormatted = customPeriodLabel || formatMonthName(month);
  const doc = new jsPDF({ orientation: 'p' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('DECLARACIÓN DE VENTAS / CONSIGNACIÓN', 14, 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
  doc.text(`Periodo de Ventas: ${monthNameFormatted.toUpperCase()}`, 14, 30);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 35);
  
  const headers = ['PRODUCTO', 'SOLUCIÓN', 'CANTIDAD', 'P. UNITARIO', 'TOTAL'];
  let grandTotal = 0;
  let totalUnits = 0;

  const sortedItems = [...items].sort((a, b) => {
    const keyA = `${a.productoId || ''} ${a.solucionLote || ''}`.toLowerCase();
    const keyB = `${b.productoId || ''} ${b.solucionLote || ''}`.toLowerCase();
    return keyA.localeCompare(keyB);
  });

  const data = sortedItems.map(item => {
    const unidades = Number(item.unidadesVendidas) || 0;
    const precio = Number(item.precioUnitNeto) || 0;
    const total = item.montoVendido ?? (unidades * precio);
    grandTotal += total;
    totalUnits += unidades;
    return [
      item.productoId,
      item.solucionLote || 'S/S',
      String(unidades),
      formatCurrency(precio),
      formatCurrency(total)
    ];
  });
  
  autoTable(doc, {
    startY: 42,
    head: [headers],
    body: data,
    foot: [['TOTALES DECLARADOS', '', String(totalUnits), '', formatCurrency(grandTotal)]],
    theme: 'plain',
    margin: { left: 14, right: 14 },
    headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
    footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
    didDrawCell: (cellData) => {
       if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.1);
          doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
       }
    }
  });
  
  doc.save(`Venta_Consignacion_${clientName.replace(/\s+/g, '_')}_${month}.pdf`);
};

const generateTwelveMonths = (startYearMonth: string): string[] => {
  const months: string[] = [];
  let [year, month] = startYearMonth.split('-').map(Number);
  if (isNaN(year) || !month) {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth() + 1;
  }
  for (let i = 0; i < 12; i++) {
    const mStr = String(month).padStart(2, '0');
    months.push(`${year}-${mStr}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
};

// Seed mock data for demonstration
const getMockLotesForClient = (clienteId: string): any[] => {
  const key = 'mock_consignacion_lotes';
  const existing = safeLocalStorageGet(key);
  let allLotes: any[] = [];
  if (existing) {
    try {
      allLotes = JSON.parse(existing);
    } catch (e) {}
  }
  
  const clientLotes = allLotes.filter((l: any) => {
    if (l.clienteId !== clienteId) return false;
    if (l.id && (l.id.startsWith('lote_arnica_') || l.id.startsWith('lote_sarsa_') || l.id.startsWith('lote_beil_') || l.id.startsWith('lote_sili_'))) return false;
    return true;
  });
  
  return clientLotes;
};


const ClientAutocomplete = ({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente..."
}: {
  clientes: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (value) {
      const c = clientes.find(client => client.id === value);
      if (c) setSearchTerm(c.name);
    } else {
      setSearchTerm('');
    }
  }, [value, clientes]);

  return (
    <div className="relative">
      <input 
        type="text"
        className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-3 outline-none focus:border-sky-500 transition-colors font-bold text-xs"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
      />
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-[#050914] border border-[#1E293B] rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
          {clientes
            .filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .map(c => (
              <div
                key={c.id}
                className="p-3 text-xs text-slate-300 hover:bg-[#1E293B] cursor-pointer"
                onMouseDown={() => {
                  setSearchTerm(c.name);
                  onChange(c.id);
                  setShowDropdown(false);
                }}
              >
                {c.name}
              </div>
          ))}
          {clientes.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <div className="p-3 text-xs text-slate-500">No se encontraron clientes</div>
          )}
        </div>
      )}


    </div>
  );
};

const ProductSolutionAutocomplete = ({
  value,
  onChange,
  onSelectCombination,
  placeholder,
  registeredCombinations,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectCombination: (comb: { productoId: string; solucionLote: string; precioUnitNeto: number }) => void;
  placeholder: string;
  registeredCombinations: any[];
  className?: string;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!value) return registeredCombinations;
    const s = value.toLowerCase();
    return registeredCombinations.filter(c =>
      c.productoId.toLowerCase().includes(s) ||
      (c.solucionLote || '').toLowerCase().includes(s)
    );
  }, [value, registeredCombinations]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
        placeholder={placeholder}
        required
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#091122] border border-[#1E293B] rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800/50 custom-scrollbar">
          {filtered.map((comb, index) => (
            <div
              key={index}
              className="p-2.5 text-xs hover:bg-[#1E293B] cursor-pointer flex flex-col gap-1 transition-colors"
              onMouseDown={() => {
                onSelectCombination(comb);
                setShowDropdown(false);
              }}
            >
              <div className="font-bold text-slate-100 flex justify-between items-center">
                <span>{comb.productoId}</span>
                <span className="text-[10px] text-amber-400 font-mono font-normal">
                  ${comb.precioUnitNeto.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">
                Solución: <span className="font-mono">{comb.solucionLote || 'S/L'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function VentasConsignacionView() {
  const { user } = useAuth();
  
  const userRoles = user?.roles || [user?.role || 'viewer'];
  const hasFullAccess = userRoles.includes('admin');
  const adminPerm = user?.permissions?.['manager'] || user?.permissions?.['admin'];
  const isReadonly = !hasFullAccess && adminPerm?.readonly === true;
  const canEdit = hasFullAccess || (!isReadonly && (adminPerm ? adminPerm.edit !== false : true));
  const canDelete = hasFullAccess || (!isReadonly && (adminPerm ? adminPerm.delete !== false : true));
  
  const [activeTab, setActiveTab] = useState<'declaraciones' | 'registro_ventas'>('declaraciones');
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [lotesCache, setLotesCache] = useState<Record<string, { data: any[], timestamp: number }>>({});

  // Memory Caching Refs to prevent unnecessary Firestore queries across month or client changes
  const clientesCacheRef = React.useRef<any[] | null>(null);
  const clientLotesMemoryCache = React.useRef<Record<string, any[]>>({});
  const todosLosLotesMemoryCache = React.useRef<any[] | null>(null);
  const savedPlanillasMemoryCache = React.useRef<Record<string, { months: Set<string>; meta: Record<string, any> }>>({});

  // Tab 1: Declaración Mensual (Select Cliente)
  const [declaracionCliente, setDeclaracionCliente] = useState('');
  const [lotesActivos, setLotesActivos] = useState<any[]>([]);

  // Tab 1 UI states for Unified Excel Layout
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedMonthlyLoteIds, setSelectedMonthlyLoteIds] = useState<Set<string>>(new Set());
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [replenishmentFilter, setReplenishmentFilter] = useState<'todos' | 'reposicion' | 'con-stock' | 'agotados'>('todos');
  const [salesInputs, setSalesInputs] = useState<Record<string, number>>({});
  const lastSyncKeyRef = React.useRef<string>('');
  const [savingAllMovements, setSavingAllMovements] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [fixedDataExpanded, setFixedDataExpanded] = useState(false);
  const [selectedFixedLoteIds, setSelectedFixedLoteIds] = useState<Set<string>>(new Set());
  const [savedPlanillaMonths, setSavedPlanillaMonths] = useState<Set<string>>(new Set());
  const [savedPlanillasMeta, setSavedPlanillasMeta] = useState<Record<string, {
    numMonths?: number;
    isBimonthly?: boolean;
    secondMonth?: string;
    customPeriodLabel?: string;
    observaciones?: string;
  }>>({});

  const [editarPlanillaModal, setEditarPlanillaModal] = useState<{
    isOpen: boolean;
    month: string;
  } | null>(null);

  const [editarPlanillaForm, setEditarPlanillaForm] = useState<{
    month: string;
    numMonths: number;
    isBimonthly: boolean;
    secondMonth: string;
    customPeriodLabel: string;
    observaciones: string;
    items: Array<{
      loteId: string;
      productoId: string;
      solucionLote: string;
      unidadesVendidas: number;
      precioUnitNeto: number;
    }>;
  }>({
    month: '',
    numMonths: 1,
    isBimonthly: false,
    secondMonth: '',
    customPeriodLabel: '',
    observaciones: '',
    items: []
  });

  const [addLoteToPlanillaSearch, setAddLoteToPlanillaSearch] = useState('');
  const [addLoteDropdownOpen, setAddLoteDropdownOpen] = useState(false);
  const [savingEditarPlanilla, setSavingEditarPlanilla] = useState(false);

  // Pagination state for "Seleccionar productos (Lotes registrados en datos fijos)"
  const [inlineAddPage, setInlineAddPage] = useState(1);
  const INLINE_ADD_PAGE_SIZE = 25;

  const loadSavedPlanillas = useCallback(async (clienteId: string, force = false) => {
    if (!clienteId) {
      setSavedPlanillaMonths(new Set());
      setSavedPlanillasMeta({});
      return;
    }
    // Return instantly from memory cache if available and not forced
    if (!force && savedPlanillasMemoryCache.current[clienteId]) {
      setSavedPlanillaMonths(savedPlanillasMemoryCache.current[clienteId].months);
      setSavedPlanillasMeta(savedPlanillasMemoryCache.current[clienteId].meta);
      return;
    }
    try {
      const set = new Set<string>();
      const metaMap: Record<string, any> = {};
      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'planillas_consignacion'),
          where('clienteId', '==', clienteId),
          limit(5000)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.month) {
            set.add(data.month);
            metaMap[data.month] = {
              numMonths: data.numMonths || (data.isBimonthly ? 2 : 1),
              isBimonthly: data.isBimonthly,
              secondMonth: data.secondMonth,
              customPeriodLabel: data.customPeriodLabel,
              observaciones: data.observaciones
            };
          }
        });
      } else {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith(`mock_planilla_${clienteId}_`)) {
                const m = k.replace(`mock_planilla_${clienteId}_`, '');
                set.add(m);
                try {
                  const stored = safeLocalStorageGet(k);
                  if (stored && stored.startsWith('{')) {
                    const parsed = JSON.parse(stored);
                    metaMap[m] = {
                      numMonths: parsed.numMonths || (parsed.isBimonthly ? 2 : 1),
                      isBimonthly: parsed.isBimonthly,
                      secondMonth: parsed.secondMonth,
                      customPeriodLabel: parsed.customPeriodLabel,
                      observaciones: parsed.observaciones
                    };
                  }
                } catch (e) {
                  // ignore
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error reading mock planillas from storage:', e);
        }
      }
      savedPlanillasMemoryCache.current[clienteId] = { months: set, meta: metaMap };
      setSavedPlanillaMonths(set);
      setSavedPlanillasMeta(metaMap);
    } catch (e) {
      console.error("Error loading saved planillas:", e);
    }
  }, []);

  // Additional state variables for managing replenishments and all lotes
  const [todosLosLotes, setTodosLosLotes] = useState<any[]>([]);

  const uniqueProducts = useMemo(() => {
    const set = new Set(PRODUCTOS_CATALOGO);
    todosLosLotes.forEach(l => l.productoId && set.add(l.productoId));
    return Array.from(set);
  }, [todosLosLotes]);

  const registeredCombinations = useMemo(() => {
    const map = new Map<string, { productoId: string; solucionLote: string; precioUnitNeto: number }>();
    todosLosLotes.forEach(lote => {
      const prod = (lote.productoId || '').trim();
      const sol = (lote.solucionLote || '').trim();
      if (!prod) return;
      const key = `${prod.toUpperCase()}___${sol.toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          productoId: prod.toUpperCase(),
          solucionLote: sol.toUpperCase(),
          precioUnitNeto: Number(lote.precioUnitNeto) || 0
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => String(a.productoId || "").localeCompare(String(b.productoId || "")));
  }, [todosLosLotes]);

  const handleDownloadRegisteredProductsPDF = () => {
    const filteredLotes = todosLosLotes.filter(lote => {
      if (adminFilterCliente) {
        const clientObj = clientes.find(c => c.id === adminFilterCliente);
        const isMatchingId = lote.clienteId === adminFilterCliente;
        const isMatchingName = clientObj && (lote.clienteId || '').toLowerCase() === clientObj.name.toLowerCase();
        if (!isMatchingId && !isMatchingName) return false;
      }
      if (adminFilterProducto) {
        const search = adminFilterProducto.toLowerCase();
        const pName = (lote.productoId || "").toLowerCase();
        const sName = (lote.solucionLote || "").toLowerCase();
        if (!pName.includes(search) && !sName.includes(search)) return false;
      }
      return true;
    });

    const productSolutionMap = new Map<string, {
      clientName: string;
      productoId: string;
      solucionLote: string;
      precioUnitNeto: number;
      totalStockActivo: number;
    }>();

    filteredLotes.forEach(lote => {
      const clientObj = clientes.find(c => c.id === lote.clienteId || c.name.toLowerCase() === (lote.clienteId || '').toLowerCase());
      const cName = clientObj?.name || lote.clienteId || 'Cliente';
      const prodName = (lote.productoId || '').trim().toUpperCase();
      const solName = (lote.solucionLote || 'S/L').trim().toUpperCase();
      const groupKey = `${lote.clienteId}___${prodName}___${solName}`;

      let totalVendidas = 0;
      Object.values(lote.movimientos || {}).forEach((m: any) => {
        if (!m.hidden) totalVendidas += Number(m.unidadesVendidas || 0);
      });
      const remaining = Math.max(0, Number(lote.unidadesIniciales || 0) - totalVendidas);

      if (!productSolutionMap.has(groupKey)) {
        productSolutionMap.set(groupKey, {
          clientName: cName,
          productoId: prodName,
          solucionLote: solName,
          precioUnitNeto: Number(lote.precioUnitNeto) || 0,
          totalStockActivo: remaining,
        });
      } else {
        const existing = productSolutionMap.get(groupKey)!;
        existing.totalStockActivo += remaining;
      }
    });

    const list = Array.from(productSolutionMap.values()).sort((a, b) => {
      if (a.clientName !== b.clientName) return String(a.clientName || "").localeCompare(String(b.clientName || ""));
      return String(a.productoId || "").localeCompare(String(b.productoId || ""));
    });

    const doc = new jsPDF({ orientation: 'p' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('REGISTRO DE PRODUCTOS EN CONSIGNACIÓN', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 25);
    if (adminFilterCliente) {
      const filterClientName = clientes.find(c => c.id === adminFilterCliente)?.name || adminFilterCliente;
      doc.text(`Filtro Cliente: ${filterClientName.toUpperCase()}`, 14, 30);
    }

    const headers = ['CLIENTE', 'PRODUCTO', 'SOLUCIÓN', 'PRECIO UNIT. (S/IVA)'];
    const data = list.map(item => [
      item.clientName,
      item.productoId,
      item.solucionLote,
      formatCurrency(item.precioUnitNeto)
    ]);

    autoTable(doc, {
      startY: adminFilterCliente ? 36 : 30,
      head: [headers],
      body: data,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      headStyles: {
        textColor: [30, 58, 95],
        fontSize: 9,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85],
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generado desde el Módulo de Consignación S&E', 14, finalY);

    doc.save(`Registro_Productos_Consignacion_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const [adminFilterCliente, setAdminFilterCliente] = useState('');
  const [adminFilterProducto, setAdminFilterProducto] = useState('');
  const [adminTabStatus, setAdminTabStatus] = useState<'activos' | 'inactivos'>('activos');
  const [repUnits, setRepUnits] = useState<Record<string, number>>({});
  const [repDates, setRepDates] = useState<Record<string, string>>({});

  // Tab 2: Registro de Ventas (Select Cliente)
  const [registroVentasCliente, setRegistroVentasCliente] = useState('');
  const [registroVentasStockTab, setRegistroVentasStockTab] = useState<'activos' | 'inactivos'>('activos');
  const [inactivosSubTab, setInactivosSubTab] = useState<'todos' | 'lotes' | 'rebajas'>('todos');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Devolución / Rebaja Modal state
  const [devolucionModal, setDevolucionModal] = useState<{
    isOpen: boolean;
    loteId?: string;
  } | null>(null);

  const [devolucionForm, setDevolucionForm] = useState({
    loteId: '',
    fecha: new Date().toISOString().split('T')[0],
    unidades: 1,
    motivo: '',
  });
  const [savingDevolucion, setSavingDevolucion] = useState(false);
  const [devolucionSearchQuery, setDevolucionSearchQuery] = useState('');
  const [devolucionDropdownOpen, setDevolucionDropdownOpen] = useState(false);

  const openDevolucionModal = (lote?: any, targetMonth?: string) => {
    const targetLoteId = lote ? lote.id.toString() : '';
    const initialDate = targetMonth ? `${targetMonth}-15` : new Date().toISOString().split('T')[0];
    setDevolucionForm({
      loteId: targetLoteId,
      fecha: initialDate,
      unidades: 1,
      motivo: '',
    });
    if (lote) {
      setDevolucionSearchQuery(`${lote.productoId} - Solución: ${lote.solucionLote || 'S/S'}`);
    } else {
      setDevolucionSearchQuery('');
    }
    setDevolucionDropdownOpen(false);
    setDevolucionModal({ isOpen: true, loteId: targetLoteId });
  };

  // Reposición / Quick Add Modal state
  const [reponerModal, setReponerModal] = useState<{
    isOpen: boolean;
    clienteId: string;
    productoId: string;
    solucionLote: string;
    precioUnitNeto: number;
  } | null>(null);

  const [reponerForm, setReponerForm] = useState({
    clienteId: '',
    productoId: '',
    solucionLote: '',
    fechaEntrega: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unidadesIniciales: '' as any,
    precioUnitNeto: '' as any,
  });
  const [savingReponer, setSavingReponer] = useState(false);

  const openReponerModal = (clienteId: string = '', productoId: string = '', solucionLote: string = '', precioUnitNeto: number = 0) => {
    const cid = clienteId || registroVentasCliente || adminFilterCliente || declaracionCliente || '';
    const finalPrice = precioUnitNeto || PRECIOS_BASE[productoId] || '';
    setReponerForm({
      clienteId: cid,
      productoId: productoId,
      solucionLote: solucionLote,
      fechaEntrega: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      unidadesIniciales: '' as any,
      precioUnitNeto: finalPrice as any,
    });
    setReponerModal({
      isOpen: true,
      clienteId: cid,
      productoId,
      solucionLote,
      precioUnitNeto: typeof finalPrice === 'number' ? finalPrice : 0,
    });
  };

  const handleSaveQuickReponer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingReponer) return;
    if (!reponerForm.clienteId) {
      alert('Por favor seleccione un cliente.');
      return;
    }
    if (!reponerForm.productoId.trim()) {
      alert('Por favor ingrese o seleccione un producto.');
      return;
    }
    if (!reponerForm.unidadesIniciales || reponerForm.unidadesIniciales <= 0) {
      alert('Por favor ingrese una cantidad de stock válida.');
      return;
    }

    try {
      setSavingReponer(true);
      const uProduct = reponerForm.productoId.toUpperCase().trim();
      const uSolucion = reponerForm.solucionLote.toUpperCase().trim() || 'S/L';
      const units = Number(reponerForm.unidadesIniciales);
      const price = Number(reponerForm.precioUnitNeto);
      const totalVal = units * price;
      const targetVenc = reponerForm.fechaVencimiento;

      // Invalidate memory and local caches
      todosLosLotesMemoryCache.current = null;
      if (reponerForm.clienteId) {
        delete clientLotesMemoryCache.current[reponerForm.clienteId];
        safeLocalStorageRemove(`cache_lotes_${reponerForm.clienteId}`); removeIndexedDbCache(`cache_lotes_${reponerForm.clienteId}`).catch(() => {});
      }
      safeLocalStorageRemove('cache_todos_los_lotes'); removeIndexedDbCache('cache_todos_los_lotes').catch(() => {});

      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', reponerForm.clienteId),
          where('productoId', '==', uProduct),
          limit(50)
        );
        const snap = await getDocs(q);
        let existingLoteDoc: any = null;

        snap.docs.forEach(d => {
          const data = d.data();
          const docSol = (data.solucionLote || 'S/L').toUpperCase().trim();
          const docVenc = parseDateString(data.fechaVencimiento);
          if (docSol === uSolucion && docVenc === targetVenc) {
            existingLoteDoc = { id: d.id, ...data };
          }
        });

        if (existingLoteDoc) {
          const loteRef = doc(db, 'crm_consignacion_lotes', existingLoteDoc.id);
          const currentUnits = Number(existingLoteDoc.unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(existingLoteDoc.precioUnitNeto || 0);
          await updateDoc(loteRef, {
            unidadesIniciales: newUnits,
            precioUnitNeto: finalPrice,
            totalVentaOriginal: newUnits * finalPrice,
            updatedAt: Timestamp.now()
          });
        } else {
          const loteData = {
            clienteId: reponerForm.clienteId,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: Timestamp.fromDate(new Date(reponerForm.fechaEntrega + 'T12:00:00')),
            fechaVencimiento: Timestamp.fromDate(new Date(targetVenc + 'T12:00:00')),
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        let allLotes = existing ? JSON.parse(existing) : [];

        const existingIdx = allLotes.findIndex((l: any) =>
          l.clienteId === reponerForm.clienteId &&
          (l.productoId || '').toUpperCase().trim() === uProduct &&
          (l.solucionLote || 'S/L').toUpperCase().trim() === uSolucion &&
          parseDateString(l.fechaVencimiento) === targetVenc
        );

        if (existingIdx !== -1) {
          const currentUnits = Number(allLotes[existingIdx].unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(allLotes[existingIdx].precioUnitNeto || 0);
          allLotes[existingIdx].unidadesIniciales = newUnits;
          allLotes[existingIdx].precioUnitNeto = finalPrice;
          allLotes[existingIdx].totalVentaOriginal = newUnits * finalPrice;
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        } else {
          const newLote = {
            id: `lote_${Date.now()}`,
            clienteId: reponerForm.clienteId,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: reponerForm.fechaEntrega,
            fechaVencimiento: targetVenc,
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: new Date().toISOString(),
            movimientos: {}
          };
          allLotes.push(newLote);
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }

      setSaveNotification(`✅ Reposición de stock guardada: ${units} u. de ${uProduct} registradas exitosamente.`);
      setTimeout(() => setSaveNotification(null), 5000);

      setReponerModal(null);

      await loadTodosLosLotes(true);
      if (declaracionCliente === reponerForm.clienteId || registroVentasCliente === reponerForm.clienteId) {
        await loadLotes(reponerForm.clienteId, true);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error guardando la reposición: ' + err.message);
    } finally {
      setSavingReponer(false);
    }
  };

  // Edit Lote Modal State & Handlers
  const [editLoteModal, setEditLoteModal] = useState<{
    isOpen: boolean;
    lote: any;
  } | null>(null);

  const [editLoteForm, setEditLoteForm] = useState({
    productoId: '',
    solucionLote: '',
    fechaVencimiento: '',
    unidadesIniciales: 0,
    precioUnitNeto: 0,
  });
  const [savingEditLote, setSavingEditLote] = useState(false);

  const openEditLoteModal = (lote: any) => {
    setEditLoteForm({
      productoId: lote.productoId || '',
      solucionLote: lote.solucionLote || '',
      fechaVencimiento: parseDateString(lote.fechaVencimiento) || new Date().toISOString().split('T')[0],
      unidadesIniciales: Number(lote.unidadesIniciales || 0),
      precioUnitNeto: Number(lote.precioUnitNeto || 0),
    });
    setEditLoteModal({ isOpen: true, lote });
  };

  const handleSaveDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devolucionForm.loteId) {
      alert('Por favor seleccione un producto o lote para rebajar.');
      return;
    }
    const units = Number(devolucionForm.unidades);
    if (!units || units <= 0) {
      alert('Las unidades a devolver deben ser mayores a 0.');
      return;
    }

    const targetLote = todosLosLotes.find((l: any) => l.id.toString() === devolucionForm.loteId.toString());
    if (!targetLote) {
      alert('No se encontró el lote seleccionado.');
      return;
    }

    try {
      setSavingDevolucion(true);
      const newDev = {
        id: Date.now().toString(),
        fecha: devolucionForm.fecha || new Date().toISOString().split('T')[0],
        unidades: units,
        motivo: devolucionForm.motivo.trim() || 'Devolución de stock',
        createdAt: new Date().toISOString()
      };

      const currentDevs = targetLote.devoluciones || [];
      const updatedDevs = [...currentDevs, newDev];

      if (isFirebaseReady()) {
        const db = getDb();
        const loteRef = doc(db, 'crm_consignacion_lotes', targetLote.id);
        await setDoc(loteRef, { devoluciones: updatedDevs }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id.toString() === targetLote.id.toString());
          if (idx !== -1) {
            allLotes[idx].devoluciones = updatedDevs;
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }

      setDevolucionModal(null);
      const cid = registroVentasCliente || declaracionCliente || adminFilterCliente;
      if (cid) {
        await loadLotes(cid, true);
      }
      await loadTodosLosLotes(true);
    } catch (err: any) {
      alert('Error al registrar la devolución: ' + err.message);
    } finally {
      setSavingDevolucion(false);
    }
  };

  const handleDeleteDevolucion = async (loteId: string, devId: string) => {
    if (!confirm('¿Está seguro de eliminar esta devolución?')) return;
    const targetLote = todosLosLotes.find((l: any) => l.id.toString() === loteId.toString());
    if (!targetLote) return;

    try {
      const updatedDevs = (targetLote.devoluciones || []).filter((d: any) => d.id !== devId);
      if (isFirebaseReady()) {
        const db = getDb();
        const loteRef = doc(db, 'crm_consignacion_lotes', targetLote.id);
        await setDoc(loteRef, { devoluciones: updatedDevs }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id.toString() === targetLote.id.toString());
          if (idx !== -1) {
            allLotes[idx].devoluciones = updatedDevs;
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }
      const cid = registroVentasCliente || declaracionCliente || adminFilterCliente;
      if (cid) {
        await loadLotes(cid, true);
      }
      await loadTodosLosLotes(true);
    } catch (err: any) {
      alert('Error al eliminar la devolución: ' + err.message);
    }
  };

  const handleSaveEditLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLoteModal?.lote) return;
    if (!editLoteForm.productoId.trim()) {
      alert('Por favor ingrese el nombre del producto.');
      return;
    }
    try {
      setSavingEditLote(true);
      const loteId = editLoteModal.lote.id;
      const uProduct = editLoteForm.productoId.toUpperCase().trim();
      const uSolucion = editLoteForm.solucionLote.toUpperCase().trim() || 'S/L';
      const units = Number(editLoteForm.unidadesIniciales);
      const price = Number(editLoteForm.precioUnitNeto);
      const totalVal = units * price;

      if (isFirebaseReady()) {
        const db = getDb();
        const loteRef = doc(db, 'crm_consignacion_lotes', loteId);
        await setDoc(loteRef, {
          productoId: uProduct,
          solucionLote: uSolucion,
          fechaVencimiento: Timestamp.fromDate(new Date(editLoteForm.fechaVencimiento + 'T12:00:00')),
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal
        }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id.toString() === loteId.toString());
          if (idx !== -1) {
            allLotes[idx].productoId = uProduct;
            allLotes[idx].solucionLote = uSolucion;
            allLotes[idx].fechaVencimiento = editLoteForm.fechaVencimiento;
            allLotes[idx].unidadesIniciales = units;
            allLotes[idx].precioUnitNeto = price;
            allLotes[idx].totalVentaOriginal = totalVal;
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }
      setEditLoteModal(null);
      const cid = registroVentasCliente || declaracionCliente || adminFilterCliente;
      if (cid) {
        await loadLotes(cid, true);
      }
      await loadTodosLosLotes(true);
    } catch (err: any) {
      alert('Error al actualizar el producto: ' + err.message);
    } finally {
      setSavingEditLote(false);
    }
  };

  // Delete Lote Modal State & Handlers
  const [deleteLoteModal, setDeleteLoteModal] = useState<{
    isOpen: boolean;
    loteId: string;
    productoName: string;
  } | null>(null);
  const [deletingLote, setDeletingLote] = useState(false);

  const openDeleteLoteModal = (lote: any) => {
    setDeleteLoteModal({
      isOpen: true,
      loteId: lote.id,
      productoName: lote.productoId || 'Producto',
    });
  };

  const handleConfirmDeleteLote = async () => {
    if (!deleteLoteModal?.loteId) return;
    try {
      setDeletingLote(true);
      const loteId = deleteLoteModal.loteId;
      if (isFirebaseReady()) {
        const db = getDb();
        await deleteDoc(doc(db, 'crm_consignacion_lotes', loteId));
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          allLotes = allLotes.filter((l: any) => l.id.toString() !== loteId.toString());
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }
      setDeleteLoteModal(null);
      const cid = registroVentasCliente || declaracionCliente || adminFilterCliente;
      if (cid) {
        await loadLotes(cid, true);
      }
      await loadTodosLosLotes(true);
    } catch (err: any) {
      alert('Error al eliminar producto: ' + err.message);
    } finally {
      setDeletingLote(false);
    }
  };

  // Dropdown / Collapsible details states
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedRep, setExpandedRep] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  
  // Inline manual product addition inside the template
  const [inlineAddOpen, setInlineAddOpen] = useState(false);
  const [selectedLotesToLink, setSelectedLotesToLink] = useState<Record<string, number>>({});
  const [bulkUnitsInput, setBulkUnitsInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inlineForm, setInlineForm] = useState({
    productoId: '',
    solucionLote: '',
    fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unidadesIniciales: '' as any,
    precioUnitNeto: '' as any,
  });

  // Fixed Data Collapsible Forms & Fields
  const [showAddLoteForm, setShowAddLoteForm] = useState(false);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importClienteId, setImportClienteId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRut, setNewClientRut] = useState('');
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientRut, setEditClientRut] = useState('');

  // Form for Lote Delivery / Creation
  const [formEntrega, setFormEntrega] = useState({
    cliente_id: '',
    producto_id: '',
    solucion_lote: '',
    fecha_entrega: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unidades_iniciales: '' as any,
    precio_unit_neto: '' as any
  });

  useEffect(() => {
    cleanupLocalStorageQuota();
    loadClientes();
  }, []);

  const loadClientes = async (force = false) => {
    try {
      if (!force && clientesCacheRef.current && clientesCacheRef.current.length > 0) {
        setClientes(clientesCacheRef.current);
        return;
      }
      setLoading(true);
      const contacts = await localDB.getCollection('consignacion_clientes');
      
      // Cleanup any mock/demo clients that were previously seeded
      for (const c of contacts) {
        if (c.id && c.id.startsWith('demo_')) {
          await localDB.deleteFromCollection('consignacion_clientes', c.id);
        }
      }
      
      const realContacts = contacts.filter((c: any) => c.id && !c.id.startsWith('demo_'));
      realContacts.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
      
      clientesCacheRef.current = realContacts;
      setClientes(realContacts);
    } catch (e) {
      console.error('Error loading consignment clients:', e);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill price when product is selected in delivery form
  useEffect(() => {
    if (formEntrega.producto_id && formEntrega.cliente_id) {
      if (!isFirebaseReady()) {
        const localKey = `mock_precios_${formEntrega.cliente_id}`;
        const saved = safeLocalStorageGet(localKey);
        let customPrice = null;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            customPrice = parsed[formEntrega.producto_id]?.precioNeto;
          } catch (e) {}
        }
        const finalPrice = customPrice ?? PRECIOS_BASE[formEntrega.producto_id] ?? 0;
        setFormEntrega(prev => ({ ...prev, precio_unit_neto: finalPrice }));
        return;
      }
      const db = getDb();
      const docId = `${formEntrega.cliente_id}_${formEntrega.producto_id}`;
      getDoc(doc(db, 'crm_consignacion_precios', docId)).then(snap => {
        if (snap.exists()) {
          setFormEntrega(prev => ({ ...prev, precio_unit_neto: snap.data().precioNeto }));
        } else {
          setFormEntrega(prev => ({ ...prev, precio_unit_neto: PRECIOS_BASE[formEntrega.producto_id] || 0 }));
        }
      }).catch(() => {
        setFormEntrega(prev => ({ ...prev, precio_unit_neto: PRECIOS_BASE[formEntrega.producto_id] || 0 }));
      });
    } else {
      setFormEntrega(prev => ({ ...prev, precio_unit_neto: PRECIOS_BASE[formEntrega.producto_id] || 0 }));
    }
  }, [formEntrega.producto_id, formEntrega.cliente_id]);

  const loadTodosLosLotes = async (force = false) => {
    try {
      // 1. Check in-memory state / ref first (instant)
      if (!force && todosLosLotesMemoryCache.current && todosLosLotesMemoryCache.current.length > 0) {
        setTodosLosLotes(todosLosLotesMemoryCache.current);
        return;
      }
      
      const cacheKey = 'cache_todos_los_lotes';
      if (!force) {
        // 2. Check IndexedDB cache (asynchronous, no 5MB limit)
        const idbData = await getIndexedDbCache<any[]>(cacheKey);
        if (idbData && Array.isArray(idbData) && idbData.length > 0) {
          todosLosLotesMemoryCache.current = idbData;
          setTodosLosLotes(idbData);
          return;
        }
      }

      if (isFirebaseReady()) {
        const db = getDb();
        const snap = await getDocs(query(collection(db, 'crm_consignacion_lotes'), limit(5000)));
        const loaded: any[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          if (!data) continue;
          
          loaded.push({
            id: d.id,
            ...data,
            movimientos: data.movimientos || {}
          });
        }
        // Save to IndexedDB (safe against QuotaExceededError) and Memory Cache
        setIndexedDbCache(cacheKey, loaded, 300000).catch(() => {});
        todosLosLotesMemoryCache.current = loaded;
        setTodosLosLotes(loaded);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = [];
          try {
            allLotes = JSON.parse(existing);
            if (!Array.isArray(allLotes)) allLotes = [];
          } catch(e) {
            allLotes = [];
          }
          // Cleanup dummy data
          allLotes = allLotes.filter((l: any) => {
            if (!l) return false;
            if (l.clienteId && l.clienteId.startsWith('demo_')) return false;
            if (l.id && (l.id.startsWith('lote_arnica_') || l.id.startsWith('lote_sarsa_') || l.id.startsWith('lote_beil_') || l.id.startsWith('lote_sili_'))) return false;
            return true;
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
          todosLosLotesMemoryCache.current = allLotes;
          setTodosLosLotes(allLotes);
        } else {
          todosLosLotesMemoryCache.current = [];
          setTodosLosLotes([]);
        }
      }
    } catch (e) {
      console.error('Error loading all system lotes:', e);
    }
  };

  const handleSaveReplenishment = async (loteId: string, unidades: number, fecha: string) => {
    if (!unidades || unidades <= 0) {
      alert("Por favor ingrese una cantidad de unidades de reposición válida.");
      return;
    }
    if (!fecha) {
      alert("Por favor seleccione una fecha de reposición.");
      return;
    }
    try {
      const loteObj = todosLosLotes.find(l => l.id === loteId) || lotesActivos.find(l => l.id === loteId);
      if (!loteObj) return;

      const currentRepos = loteObj.reposiciones || [];
      const updatedRepos = [...currentRepos, { unidades, fecha }];

      if (isFirebaseReady()) {
        const db = getDb();
        const docRef = doc(db, 'crm_consignacion_lotes', loteId);
        await setDoc(docRef, { reposiciones: updatedRepos }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1) {
            allLotes[idx].reposiciones = updatedRepos;
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }
      alert("Reposición registrada exitosamente.");
      setRepUnits(prev => ({ ...prev, [loteId]: 0 }));
      setRepDates(prev => ({ ...prev, [loteId]: '' }));
      
      if (declaracionCliente) {
        delete clientLotesMemoryCache.current[declaracionCliente];
        await loadLotes(declaracionCliente, true);
      } else {
        todosLosLotesMemoryCache.current = null;
        await loadTodosLosLotes(true);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al registrar reposición: " + e.message);
    }
  };

  const loadLotes = async (clienteId: string, force = false) => {
    try {
      if (!clienteId) return;
      
      // 1. Memory Cache Check (instant)
      if (!force && clientLotesMemoryCache.current[clienteId] && clientLotesMemoryCache.current[clienteId].length > 0) {
        setLotesActivos(clientLotesMemoryCache.current[clienteId]);
        return;
      }

      const cacheKey = `cache_lotes_${clienteId}`;
      if (!force) {
        // 2. Check IndexedDB cache
        const idbData = await getIndexedDbCache<any[]>(cacheKey);
        if (idbData && Array.isArray(idbData) && idbData.length > 0) {
          clientLotesMemoryCache.current[clienteId] = idbData;
          setLotesActivos(idbData);
          return;
        }
      }

      setLoadingLotes(true);
      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', clienteId),
          limit(5000)
        );
        const snap = await getDocs(q);
        
        const promises = snap.docs.map(async (d) => {
          const loteId = d.id;
          const data = d.data();
          
          return {
            id: loteId,
            ...data,
            movimientos: data.movimientos || {}
          };
        });

        const results = await Promise.all(promises);
        // Store in IndexedDB and Memory Cache (never in localStorage to prevent QuotaExceededError)
        setIndexedDbCache(cacheKey, results, 300000).catch(() => {});
        clientLotesMemoryCache.current[clienteId] = results;
        setLotesActivos(results);
      } else {
        const clientLotes = getMockLotesForClient(clienteId);
        clientLotesMemoryCache.current[clienteId] = clientLotes;
        setLotesActivos(clientLotes);
      }
    } catch (e) {
      console.error('Error loading lotes:', e);
    } finally {
      setLoadingLotes(false);
    }
  };

  // Debounced loadLotes to prevent excessive reads during rapid client switching
  useEffect(() => {
    if (!declaracionCliente) {
      setLotesActivos([]);
      return;
    }

    const timer = setTimeout(() => {
      loadLotes(declaracionCliente);
      loadSavedPlanillas(declaracionCliente);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [declaracionCliente, selectedMonth, loadSavedPlanillas]);

  useEffect(() => {
    if (registroVentasCliente) {
      loadSavedPlanillas(registroVentasCliente);
      loadTodosLosLotes();
    }
  }, [registroVentasCliente, loadSavedPlanillas]);

  // Sync salesInputs with saved movements when selectedMonth, declaracionCliente or lotesActivos changes
  useEffect(() => {
    const syncKey = `${declaracionCliente}_${selectedMonth}`;
    const isNewKey = lastSyncKeyRef.current !== syncKey;
    if (isNewKey) {
      lastSyncKeyRef.current = syncKey;
    }

    setSalesInputs(prev => {
      const next: Record<string, number> = {};
      lotesActivos.forEach(lote => {
        const savedVal = lote.movimientos?.[selectedMonth]?.unidadesVendidas;
        if (isNewKey) {
          if (savedVal !== undefined) {
            next[lote.id] = Number(savedVal) || 0;
          }
        } else {
          if (prev[lote.id] !== undefined) {
            next[lote.id] = prev[lote.id];
          } else if (savedVal !== undefined) {
            next[lote.id] = Number(savedVal) || 0;
          }
        }
      });
      return next;
    });
  }, [declaracionCliente, selectedMonth, lotesActivos]);

  // Only load all lotes when specifically needed (e.g., when Admin de Datos Fijos is expanded)
  useEffect(() => {
    let active = true;
    if (fixedDataExpanded) {
      loadTodosLosLotes().then(() => {});
    }
    return () => { active = false; };
  }, [fixedDataExpanded]);

  const handleImportExcel = async (file: File, cid: string) => {
    if (!cid) {
      alert("Por favor, seleccione un cliente para la importación.");
      return;
    }
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const importedList: any[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Skip header row usually index 0
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 5) continue;
        
        const productoId = (row[0] || '').toString().trim();
        const solucionLote = (row[1] || '').toString().trim();
        let fechaVencimiento = '';
        if (typeof row[2] === 'number') {
            // Excel date number
            const date = new Date(Math.round((row[2] - 25569) * 86400 * 1000));
            fechaVencimiento = date.toISOString().split('T')[0];
        } else {
            fechaVencimiento = (row[2] || '').toString().trim();
        }
        
        const unidadesIniciales = Number(row[3]);
        const precioUnitNeto = Number(row[4]);
        
        if (!productoId || isNaN(unidadesIniciales) || isNaN(precioUnitNeto)) {
          failCount++;
          continue;
        }
        
        importedList.push({
          clienteId: cid,
          productoId,
          solucionLote,
          fechaVencimiento,
          unidadesIniciales,
          precioUnitNeto
        });
      }
      
      if (importedList.length === 0) {
        alert("No se encontraron registros válidos. Formato: Producto | Solución/Lote | Fecha Venc. (AAAA-MM-DD) | Unidades Iniciales | Precio Unitario");
        return;
      }
      
      if (isFirebaseReady()) {
        const db = getDb();
        for (const item of importedList) {
          const totalVal = item.unidadesIniciales * item.precioUnitNeto;
          const loteData = {
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaVencimiento: item.fechaVencimiento,
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            precioTotalNeto: totalVal,
            unidadesDisponibles: item.unidadesIniciales,
            mesesConsignados: 0,
            movimientos: {},
            createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
          successCount++;
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        let allLotes = existing ? JSON.parse(existing) : [];
        for (const item of importedList) {
          const totalVal = item.unidadesIniciales * item.precioUnitNeto;
          const newLote = {
            id: `lote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaVencimiento: item.fechaVencimiento,
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            precioTotalNeto: totalVal,
            unidadesDisponibles: item.unidadesIniciales,
            mesesConsignados: 0,
            movimientos: {},
            createdAt: new Date().toISOString()
          };
          allLotes.push(newLote);
          successCount++;
        }
        safeLocalStorageSet(key, JSON.stringify(allLotes));
      }
      
      alert(`Importación completada. Registrados: ${successCount}. Errores: ${failCount}`);
      setImportFile(null);
      setShowImportForm(false);
      
      await loadTodosLosLotes();
      if (declaracionCliente === cid) {
        await loadLotes(declaracionCliente, true);
      }
      
    } catch (err: any) {
      console.error("Error al procesar el archivo Excel:", err);
      alert("Error: " + err.message);
    }
  };

  const handleCreateEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEntrega.cliente_id) {
      alert('Por favor seleccione un cliente.');
      return;
    }
    if (!formEntrega.producto_id.trim()) {
      alert('Por favor ingrese o seleccione un producto.');
      return;
    }

    try {
      const uProduct = formEntrega.producto_id.toUpperCase().trim();
      const uSolucion = formEntrega.solucion_lote.toUpperCase().trim() || 'S/L';
      const units = Number(formEntrega.unidades_iniciales);
      const price = Number(formEntrega.precio_unit_neto);
      const totalVal = units * price;
      const targetVenc = formEntrega.fecha_vencimiento;

      // Invalidate memory and local caches
      todosLosLotesMemoryCache.current = null;
      if (formEntrega.cliente_id) {
        delete clientLotesMemoryCache.current[formEntrega.cliente_id];
        safeLocalStorageRemove(`cache_lotes_${formEntrega.cliente_id}`); removeIndexedDbCache(`cache_lotes_${formEntrega.cliente_id}`).catch(() => {});
      }
      safeLocalStorageRemove('cache_todos_los_lotes'); removeIndexedDbCache('cache_todos_los_lotes').catch(() => {});

      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', formEntrega.cliente_id),
          where('productoId', '==', uProduct),
          limit(50)
        );
        const snap = await getDocs(q);
        let existingLoteDoc: any = null;

        snap.docs.forEach(d => {
          const data = d.data();
          const docSol = (data.solucionLote || 'S/L').toUpperCase().trim();
          const docVenc = parseDateString(data.fechaVencimiento);
          if (docSol === uSolucion && docVenc === targetVenc) {
            existingLoteDoc = { id: d.id, ...data };
          }
        });

        if (existingLoteDoc) {
          const loteRef = doc(db, 'crm_consignacion_lotes', existingLoteDoc.id);
          const currentUnits = Number(existingLoteDoc.unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(existingLoteDoc.precioUnitNeto || 0);
          await updateDoc(loteRef, {
            unidadesIniciales: newUnits,
            precioUnitNeto: finalPrice,
            totalVentaOriginal: newUnits * finalPrice,
            updatedAt: Timestamp.now()
          });
        } else {
          const loteData = {
            clienteId: formEntrega.cliente_id,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: Timestamp.fromDate(new Date(formEntrega.fecha_entrega + 'T12:00:00')),
            fechaVencimiento: Timestamp.fromDate(new Date(targetVenc + 'T12:00:00')),
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        let allLotes = existing ? JSON.parse(existing) : [];
        
        const existingIdx = allLotes.findIndex((l: any) =>
          l.clienteId === formEntrega.cliente_id &&
          (l.productoId || '').toUpperCase().trim() === uProduct &&
          (l.solucionLote || 'S/L').toUpperCase().trim() === uSolucion &&
          parseDateString(l.fechaVencimiento) === targetVenc
        );

        if (existingIdx !== -1) {
          const currentUnits = Number(allLotes[existingIdx].unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(allLotes[existingIdx].precioUnitNeto || 0);
          allLotes[existingIdx].unidadesIniciales = newUnits;
          allLotes[existingIdx].precioUnitNeto = finalPrice;
          allLotes[existingIdx].totalVentaOriginal = newUnits * finalPrice;
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        } else {
          const newLote = {
            id: `lote_${Date.now()}`,
            clienteId: formEntrega.cliente_id,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: formEntrega.fecha_entrega,
            fechaVencimiento: targetVenc,
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: new Date().toISOString(),
            movimientos: {}
          };
          allLotes.push(newLote);
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }

      alert('Lote en consignación registrado correctamente.');
      setFormEntrega({
        cliente_id: formEntrega.cliente_id,
        producto_id: '',
        solucion_lote: '',
        fecha_entrega: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        unidades_iniciales: '' as any,
        precio_unit_neto: '' as any
      });

      if (declaracionCliente === formEntrega.cliente_id || registroVentasCliente === formEntrega.cliente_id) {
        await loadLotes(formEntrega.cliente_id, true);
      }
      await loadTodosLosLotes(true);
    } catch (err: any) {
      console.error(err);
      alert('Error registrando despacho: ' + err.message);
    }
  };

  const handleSaveInlineProduct = async () => {
    if (!declaracionCliente) {
      alert("Por favor seleccione un cliente primero.");
      return;
    }
    if (!inlineForm.productoId.trim()) {
      alert("Por favor ingrese el nombre del producto.");
      return;
    }

    try {
      const uProduct = inlineForm.productoId.toUpperCase().trim();
      const uSolucion = inlineForm.solucionLote.toUpperCase().trim() || 'SALINA';
      const units = Number(inlineForm.unidadesIniciales);
      const price = Number(inlineForm.precioUnitNeto);
      const totalVal = units * price;
      const targetVenc = inlineForm.fechaVencimiento;
      const deliveryDateStr = `${selectedMonth}-01`;

      // Invalidate memory and local caches
      todosLosLotesMemoryCache.current = null;
      if (declaracionCliente) {
        delete clientLotesMemoryCache.current[declaracionCliente];
        safeLocalStorageRemove(`cache_lotes_${declaracionCliente}`); removeIndexedDbCache(`cache_lotes_${declaracionCliente}`).catch(() => {});
      }
      safeLocalStorageRemove('cache_todos_los_lotes'); removeIndexedDbCache('cache_todos_los_lotes').catch(() => {});

      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', declaracionCliente),
          where('productoId', '==', uProduct),
          limit(50)
        );
        const snap = await getDocs(q);
        let existingLoteDoc: any = null;

        snap.docs.forEach(d => {
          const data = d.data();
          const docSol = (data.solucionLote || 'S/L').toUpperCase().trim();
          const docVenc = parseDateString(data.fechaVencimiento);
          if (docSol === uSolucion && docVenc === targetVenc) {
            existingLoteDoc = { id: d.id, ...data };
          }
        });

        if (existingLoteDoc) {
          const loteRef = doc(db, 'crm_consignacion_lotes', existingLoteDoc.id);
          const currentUnits = Number(existingLoteDoc.unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(existingLoteDoc.precioUnitNeto || 0);
          await updateDoc(loteRef, {
            unidadesIniciales: newUnits,
            precioUnitNeto: finalPrice,
            totalVentaOriginal: newUnits * finalPrice,
            updatedAt: Timestamp.now()
          });
        } else {
          const loteData = {
            clienteId: declaracionCliente,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: Timestamp.fromDate(new Date(deliveryDateStr + 'T12:00:00')),
            fechaVencimiento: Timestamp.fromDate(new Date(targetVenc + 'T12:00:00')),
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        let allLotes = existing ? JSON.parse(existing) : [];
        
        const existingIdx = allLotes.findIndex((l: any) =>
          l.clienteId === declaracionCliente &&
          (l.productoId || '').toUpperCase().trim() === uProduct &&
          (l.solucionLote || 'S/L').toUpperCase().trim() === uSolucion &&
          parseDateString(l.fechaVencimiento) === targetVenc
        );

        if (existingIdx !== -1) {
          const currentUnits = Number(allLotes[existingIdx].unidadesIniciales || 0);
          const newUnits = currentUnits + units;
          const finalPrice = price > 0 ? price : Number(allLotes[existingIdx].precioUnitNeto || 0);
          allLotes[existingIdx].unidadesIniciales = newUnits;
          allLotes[existingIdx].precioUnitNeto = finalPrice;
          allLotes[existingIdx].totalVentaOriginal = newUnits * finalPrice;
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        } else {
          const newLote = {
            id: `lote_${Date.now()}`,
            clienteId: declaracionCliente,
            productoId: uProduct,
            solucionLote: uSolucion,
            fechaEntrega: deliveryDateStr,
            fechaVencimiento: targetVenc,
            unidadesIniciales: units,
            precioUnitNeto: price,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: new Date().toISOString(),
            movimientos: {}
          };
          allLotes.push(newLote);
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }

      alert('Producto agregado correctamente.');
      setInlineAddOpen(false);
      setInlineForm({
        productoId: '',
        solucionLote: '',
        fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        unidadesIniciales: '' as any,
        precioUnitNeto: '' as any,
      });

      await loadLotes(declaracionCliente, true);
      await loadTodosLosLotes(true);
    } catch (err: any) {
      console.error(err);
      alert('Error al agregar producto: ' + err.message);
    }
  };

  const [consolidating, setConsolidating] = useState(false);

  const handleConsolidateDuplicates = async (clienteId: string) => {
    if (!clienteId) return;
    try {
      setConsolidating(true);
      todosLosLotesMemoryCache.current = null;
      if (clienteId) {
        delete clientLotesMemoryCache.current[clienteId];
        safeLocalStorageRemove(`cache_lotes_${clienteId}`); removeIndexedDbCache(`cache_lotes_${clienteId}`).catch(() => {});
      }
      safeLocalStorageRemove('cache_todos_los_lotes'); removeIndexedDbCache('cache_todos_los_lotes').catch(() => {});

      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', clienteId),
          limit(5000)
        );
        const snap = await getDocs(q);
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const groups: Record<string, any[]> = {};
        allDocs.forEach(docItem => {
          const p = (docItem.productoId || '').toUpperCase().trim();
          const s = (docItem.solucionLote || 'S/L').toUpperCase().trim();
          const v = parseDateString(docItem.fechaVencimiento);
          const key = `${p}|${s}|${v}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(docItem);
        });

        let consolidatedCount = 0;
        for (const key of Object.keys(groups)) {
          const items = groups[key];
          if (items.length > 1) {
            const primary = items[0];
            let totalUnits = Number(primary.unidadesIniciales || 0);
            const mergedMovs = { ...(primary.movimientos || {}) };

            for (let i = 1; i < items.length; i++) {
              const dup = items[i];
              totalUnits += Number(dup.unidadesIniciales || 0);

              if (dup.movimientos) {
                Object.keys(dup.movimientos).forEach(mKey => {
                  if (!mergedMovs[mKey]) {
                    mergedMovs[mKey] = dup.movimientos[mKey];
                  } else {
                    const pSales = Number(mergedMovs[mKey]?.unidadesVendidas || 0);
                    const dSales = Number(dup.movimientos[mKey]?.unidadesVendidas || 0);
                    mergedMovs[mKey].unidadesVendidas = pSales + dSales;
                  }
                });
              }

              await deleteDoc(doc(db, 'crm_consignacion_lotes', dup.id));
              consolidatedCount++;
            }

            const primaryRef = doc(db, 'crm_consignacion_lotes', primary.id);
            const price = Number(primary.precioUnitNeto || 0);
            await updateDoc(primaryRef, {
              unidadesIniciales: totalUnits,
              totalVentaOriginal: totalUnits * price,
              movimientos: mergedMovs,
              updatedAt: Timestamp.now()
            });
          }
        }

        if (consolidatedCount > 0) {
          alert(`✅ Se unificaron ${consolidatedCount} lote(s) duplicados correctamente.`);
        } else {
          alert('No se encontraron lotes duplicados para este cliente.');
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          const clientLotes = allLotes.filter((l: any) => l.clienteId === clienteId);
          const otherLotes = allLotes.filter((l: any) => l.clienteId !== clienteId);

          const groups: Record<string, any[]> = {};
          clientLotes.forEach((docItem: any) => {
            const p = (docItem.productoId || '').toUpperCase().trim();
            const s = (docItem.solucionLote || 'S/L').toUpperCase().trim();
            const v = parseDateString(docItem.fechaVencimiento);
            const groupKey = `${p}|${s}|${v}`;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(docItem);
          });

          let mergedClientLotes: any[] = [];
          let consolidatedCount = 0;

          Object.keys(groups).forEach(gKey => {
            const items = groups[gKey];
            if (items.length > 1) {
              const primary = { ...items[0] };
              let totalUnits = Number(primary.unidadesIniciales || 0);
              for (let i = 1; i < items.length; i++) {
                totalUnits += Number(items[i].unidadesIniciales || 0);
                consolidatedCount++;
              }
              primary.unidadesIniciales = totalUnits;
              primary.totalVentaOriginal = totalUnits * Number(primary.precioUnitNeto || 0);
              mergedClientLotes.push(primary);
            } else {
              mergedClientLotes.push(items[0]);
            }
          });

          safeLocalStorageSet(key, JSON.stringify([...otherLotes, ...mergedClientLotes]));
          if (consolidatedCount > 0) {
            alert(`✅ Se unificaron ${consolidatedCount} lote(s) duplicados correctamente.`);
          } else {
            alert('No se encontraron lotes duplicados para este cliente.');
          }
        }
      }

      await loadTodosLosLotes(true);
      await loadLotes(clienteId, true);
    } catch (e: any) {
      console.error(e);
      alert('Error unificando duplicados: ' + e.message);
    } finally {
      setConsolidating(false);
    }
  };

  const handleAddMultipleProductsToMonthTemplate = async (selectedMap: Record<string, number>) => {
    const loteIds = Object.keys(selectedMap);
    if (loteIds.length === 0) {
      alert("Por favor seleccione al menos un producto de la lista.");
      return;
    }
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const promises = loteIds.map(loteId => {
          const units = Number(selectedMap[loteId] || 0);
          const loteRef = doc(db, 'crm_consignacion_lotes', loteId);
          return updateDoc(loteRef, {
            [`movimientos.${selectedMonth}`]: {
              unidadesVendidas: units,
              saldoAnterior: 0,
              saldoResultante: 0,
              montoVentaNeto: 0,
              fechaRegistro: Timestamp.now(),
              added: true
            }
          });
        });
        await Promise.all(promises);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          loteIds.forEach(loteId => {
            const units = Number(selectedMap[loteId] || 0);
            const idx = allLotes.findIndex((l: any) => l.id === loteId);
            if (idx !== -1) {
              if (!allLotes[idx].movimientos) allLotes[idx].movimientos = {};
              allLotes[idx].movimientos[selectedMonth] = {
                unidadesVendidas: units,
                fechaRegistro: new Date().toISOString(),
                added: true
              };
            }
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }
      
      setSalesInputs(prev => {
        const updated = { ...prev };
        loteIds.forEach(id => {
          updated[id] = Number(selectedMap[id] || 0);
        });
        return updated;
      });

      await loadLotes(declaracionCliente, true);
      setInlineAddOpen(false);
      setSelectedLotesToLink({});
      
      alert(`Se agregaron ${loteIds.length} producto(s) a la planilla de este mes.`);
    } catch (e: any) {
      console.error(e);
      alert("Error al agregar productos: " + e.message);
    }
  };

  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const loteRef = doc(db, 'crm_consignacion_lotes', loteId);
        await updateDoc(loteRef, {
          [`movimientos.${selectedMonth}`]: { hidden: true }
        });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1) {
            if (!allLotes[idx].movimientos) allLotes[idx].movimientos = {};
            allLotes[idx].movimientos[selectedMonth] = { hidden: true };
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }
      await loadLotes(declaracionCliente, true);
      setSalesInputs(prev => {
        const copy = { ...prev };
        delete copy[loteId];
        return copy;
      });
      alert("Producto removido de la planilla.");
    } catch (e: any) {
      console.error(e);
      alert("Error al remover producto: " + e.message);
    }
  };

  const handleBulkRemoveFromMonthTemplate = async () => {
    if (selectedMonthlyLoteIds.size === 0) return;
    
    const count = selectedMonthlyLoteIds.size;
    if (!confirm(`¿Está seguro de remover los ${count} productos seleccionados de la planilla de ${formatMonthName(selectedMonth)}?`)) return;

    try {
      setSavingAllMovements(true); // Reuse saving state
      if (isFirebaseReady()) {
        const db = getDb();
        const batch = writeBatch(db);
        selectedMonthlyLoteIds.forEach(loteId => {
          const loteRef = doc(db, 'crm_consignacion_lotes', loteId);
          batch.update(loteRef, {
            [`movimientos.${selectedMonth}`]: { hidden: true }
          });
        });
        await batch.commit();
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          selectedMonthlyLoteIds.forEach(loteId => {
            const idx = allLotes.findIndex((l: any) => l.id === loteId);
            if (idx !== -1) {
              if (!allLotes[idx].movimientos) allLotes[idx].movimientos = {};
              allLotes[idx].movimientos[selectedMonth] = { hidden: true };
            }
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }
      
      const cid = declaracionCliente;
      const idsToRemove = Array.from(selectedMonthlyLoteIds);
      
      setSelectedMonthlyLoteIds(new Set());
      await loadLotes(cid, true);
      
      setSalesInputs(prev => {
        const copy = { ...prev };
        idsToRemove.forEach((id: string) => delete copy[id]);
        return copy;
      });
      
      alert(`${count} productos removidos de la planilla.`);
    } catch (e: any) {
      console.error("Error in bulk remove:", e);
      alert("Error en remoción masiva: " + e.message);
    } finally {
      setSavingAllMovements(false);
    }
  };

  const toggleFixedLoteSelection = (id: string) => {
    setSelectedFixedLoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteFixedLotes = async () => {
    if (selectedFixedLoteIds.size === 0) return;
    
    const count = selectedFixedLoteIds.size;
    const confirmMessage = `¿Está seguro de eliminar permanentemente los ${count} registros seleccionados (lotes y/o reposiciones)?\n\nEsta acción es irreversible y afectará el cálculo de stock remanente.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setSavingAllMovements(true);
      console.log(`Iniciando eliminación masiva de ${count} registros...`);
      
      // Group selections by Lote ID
      const groupedByLote: Record<string, { original: boolean, repIndices: number[] }> = {};
      selectedFixedLoteIds.forEach(displayId => {
        const isRep = displayId.includes('_rep_');
        const loteId = isRep ? displayId.split('_rep_')[0] : displayId;
        
        if (!groupedByLote[loteId]) {
          groupedByLote[loteId] = { original: false, repIndices: [] };
        }
        
        if (!isRep) {
          groupedByLote[loteId].original = true;
        } else {
          groupedByLote[loteId].repIndices.push(parseInt(displayId.split('_rep_')[1]));
        }
      });

      if (isFirebaseReady()) {
        const db = getDb();
        const { writeBatch, query, collection, documentId, where, getDocs } = await import('firebase/firestore');
        const batch = writeBatch(db);
        let batchCount = 0;

        const loteIds = Object.keys(groupedByLote);
        const loteDataMap: Record<string, any> = {};

        // Fetch all lote documents in chunks of 30
        for (let i = 0; i < loteIds.length; i += 30) {
          const chunk = loteIds.slice(i, i + 30);
          const q = query(collection(db, 'crm_consignacion_lotes'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            loteDataMap[doc.id] = doc.data();
          });
        }

        for (const [loteId, info] of Object.entries(groupedByLote)) {
          const docRef = doc(db, 'crm_consignacion_lotes', loteId);
          
          if (info.original) {
            // Delete whole lote
            batch.delete(docRef);
            batchCount++;
          } else if (info.repIndices.length > 0) {
            const data = loteDataMap[loteId];
            if (data) {
              let repos = data.reposiciones || [];
              const sortedIndices = [...info.repIndices].sort((a, b) => b - a);
              sortedIndices.forEach(idx => {
                if (repos[idx]) repos.splice(idx, 1);
              });
              await setDoc(docRef, { reposiciones: repos }, { merge: true });
            }
          }
          
          // Firestore batch limit is 500
          if (batchCount >= 400) {
            await batch.commit();
            // Start new batch if needed (rare for this use case but safe)
            // (Skipping complex re-initialization for now as 108 < 400)
          }
        }
        if (batchCount > 0) await batch.commit();
      } else {
        // Almacenamiento Local (Mock DB) - Direct manipulation to avoid DATABASE_URL prompt
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          for (const [loteId, info] of Object.entries(groupedByLote)) {
            const idx = allLotes.findIndex((l: any) => l.id.toString() === loteId.toString());
            if (idx === -1) continue;

            if (info.original) {
              allLotes.splice(idx, 1);
            } else if (info.repIndices.length > 0) {
              let repos = allLotes[idx].reposiciones || [];
              const sortedIndices = [...info.repIndices].sort((a, b) => b - a);
              sortedIndices.forEach(rIdx => {
                if (repos[rIdx]) repos.splice(rIdx, 1);
              });
              allLotes[idx].reposiciones = repos;
            }
          }
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }
      
      setSelectedFixedLoteIds(new Set());
      
      // Automatic data refresh
      console.log("Refrescando datos...");
      if (declaracionCliente) await loadLotes(declaracionCliente, true);
      await loadTodosLosLotes();
      
      alert(`Acción completada: Se eliminaron ${count} registros exitosamente.`);
    } catch (e: any) {
      console.error("Error in bulk delete:", e);
      alert("Error crítico en eliminación masiva: " + e.message);
    } finally {
      setSavingAllMovements(false);
    }
  };

    const handleSaveClient = async () => {
    if (!newClientName.trim()) {
      alert("Por favor ingrese el nombre del cliente.");
      return;
    }
    try {
      if (editingClient) {
        const updatedClient = {
          ...editingClient,
          name: newClientName.trim(),
          rut: newClientRut.trim(),
          updatedAt: new Date().toISOString()
        };
        await localDB.updateInCollection('consignacion_clientes', editingClient.id, updatedClient);
        if (user) {
          await addAuditLog(user, `Editó cliente en Consignación: "${editingClient.name}" -> "${updatedClient.name}"`, 'Administración');
        }
        alert(`Cliente "${updatedClient.name}" actualizado correctamente.`);
      } else {
        const clientObj = {
          name: newClientName.trim(),
          rut: newClientRut.trim(),
          categoria: 'Consignación',
          createdAt: new Date().toISOString()
        };
        await localDB.saveToCollection('consignacion_clientes', clientObj);
        if (user) {
          await addAuditLog(user, `Registró nuevo cliente en Consignación: "${clientObj.name}"`, 'Administración');
        }
        alert(`Cliente "${newClientName}" registrado correctamente.`);
      }
      setNewClientName('');
      setNewClientRut('');
      setEditingClient(null);
      setShowAddClientForm(false);
      await loadClientes(true);
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar cliente: " + e.message);
    }
  };

  const handleDeleteClient = async (client: any) => {
    if (window.confirm(`¿Está seguro de eliminar al cliente "${client.name}"?`)) {
      try {
        await localDB.deleteFromCollection('consignacion_clientes', client.id);
        if (user) {
          await addAuditLog(user, `Eliminó cliente en Consignación: "${client.name}"`, 'Administración');
        }
        if (editingClient?.id === client.id) {
          setEditingClient(null);
          setNewClientName('');
          setNewClientRut('');
        }
        await loadClientes(true);
      } catch (e: any) {
        console.error(e);
        alert("Error al eliminar cliente: " + e.message);
      }
    }
  };

  const handleDeletePlanilla = async (monthToDelete: string) => {
    if (!declaracionCliente) return;
    if (!confirm(`¿Estás seguro de que deseas borrar la planilla de ${formatMonthName(monthToDelete)}? Esto también eliminará los movimientos registrados para este mes.`)) return;

    try {
      if (isFirebaseReady()) {
        const db = getDb();
        
        // 1. Delete movements for this month
        for (const lote of lotesActivos) {
          const loteRef = doc(db, 'crm_consignacion_lotes', lote.id);
          await updateDoc(loteRef, {
            [`movimientos.${monthToDelete}`]: deleteField()
          });
        }

        // 2. Delete planilla record
        const planillaRef = doc(db, 'planillas_consignacion', `${declaracionCliente}_${monthToDelete}`);
        await deleteDoc(planillaRef);
        
        alert("Planilla y movimientos borrados exitosamente.");
      } else {
        safeLocalStorageRemove(`mock_planilla_${declaracionCliente}_${monthToDelete}`);
        
        // Also delete from local mock db
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          allLotes.forEach((l: any) => {
             if (l.movimientos && l.movimientos[monthToDelete]) {
                delete l.movimientos[monthToDelete];
             }
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
        
        alert("Planilla borrada exitosamente.");
      }
      setSavedPlanillaMonths(prev => {
        const next = new Set(prev);
        next.delete(monthToDelete);
        return next;
      });
      await loadLotes(declaracionCliente, true);
      await loadTodosLosLotes(true);
      setIsEditingHistory(false);
    } catch (e: any) {
      console.error(e);
      alert('Error borrando la planilla: ' + e.message);
    }
  };

  const openEditarPlanillaModal = (month: string, itemsInMonth: any[], meta?: any) => {
    const currentMeta = meta || savedPlanillasMeta[month] || {};
    let numM = currentMeta.numMonths || (currentMeta.isBimonthly ? 2 : 1);
    
    let initialLabel = currentMeta.customPeriodLabel || '';
    if (!initialLabel) {
      initialLabel = generateMultiMonthLabel(month, numM);
    }

    setEditarPlanillaForm({
      month: month,
      numMonths: numM,
      isBimonthly: numM > 1,
      secondMonth: currentMeta.secondMonth || '',
      customPeriodLabel: initialLabel,
      observaciones: currentMeta.observaciones || '',
      items: itemsInMonth.map(item => ({
        loteId: item.loteId || item.id || '',
        productoId: item.productoId,
        solucionLote: item.solucionLote || '',
        unidadesVendidas: Number(item.unidadesVendidas) || 0,
        precioUnitNeto: Number(item.precioUnitNeto) || 0,
      }))
    });

    setAddLoteToPlanillaSearch('');
    setAddLoteDropdownOpen(false);
    setEditarPlanillaModal({ isOpen: true, month });
  };

  const handleSaveEditedPlanilla = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cid = declaracionCliente || registroVentasCliente || adminFilterCliente;
    if (!cid || !editarPlanillaForm.month) return;

    try {
      setSavingEditarPlanilla(true);
      const month = editarPlanillaForm.month;
      const numM = editarPlanillaForm.numMonths || (editarPlanillaForm.isBimonthly ? 2 : 1);

      if (isFirebaseReady()) {
        const db = getDb();

        for (const item of editarPlanillaForm.items) {
          if (!item.loteId) continue;
          const loteRef = doc(db, 'crm_consignacion_lotes', item.loteId);
          const units = Number(item.unidadesVendidas) || 0;
          const price = Number(item.precioUnitNeto) || 0;
          const totalNeto = units * price;

          if (units > 0) {
            await updateDoc(loteRef, {
              precioUnitNeto: price,
              [`movimientos.${month}`]: {
                unidadesVendidas: units,
                montoVentaNeto: totalNeto,
                fechaRegistro: Timestamp.now()
              }
            });
          } else {
            await updateDoc(loteRef, {
              [`movimientos.${month}`]: deleteField()
            });
          }
        }

        const planillaRef = doc(db, 'planillas_consignacion', `${cid}_${month}`);
        await setDoc(planillaRef, {
          clienteId: cid,
          month: month,
          numMonths: numM,
          isBimonthly: numM > 1,
          secondMonth: editarPlanillaForm.secondMonth || '',
          customPeriodLabel: editarPlanillaForm.customPeriodLabel || '',
          observaciones: editarPlanillaForm.observaciones || '',
          updatedAt: Timestamp.now()
        }, { merge: true });

      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          editarPlanillaForm.items.forEach(item => {
            const l = allLotes.find((x: any) => x.id.toString() === item.loteId.toString());
            if (l) {
              const units = Number(item.unidadesVendidas) || 0;
              const price = Number(item.precioUnitNeto) || 0;
              l.precioUnitNeto = price;
              if (!l.movimientos) l.movimientos = {};
              if (units > 0) {
                l.movimientos[month] = {
                  unidadesVendidas: units,
                  montoVentaNeto: units * price,
                  fechaRegistro: new Date().toISOString()
                };
              } else {
                delete l.movimientos[month];
              }
            }
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }

        safeLocalStorageSet(`mock_planilla_${cid}_${month}`, JSON.stringify({
          clienteId: cid,
          month: month,
          numMonths: numM,
          isBimonthly: numM > 1,
          secondMonth: editarPlanillaForm.secondMonth || '',
          customPeriodLabel: editarPlanillaForm.customPeriodLabel || '',
          observaciones: editarPlanillaForm.observaciones || '',
          updatedAt: new Date().toISOString()
        }));
      }

      await loadSavedPlanillas(cid);
      await loadLotes(cid, true);
      await loadTodosLosLotes(true);

      setSavingEditarPlanilla(false);
      setEditarPlanillaModal(null);
      setSaveNotification("Historial de planilla y cotización actualizados correctamente.");
      setTimeout(() => setSaveNotification(null), 5000);
    } catch (err: any) {
      console.error('Error al guardar la planilla editada:', err);
      alert('Error al guardar los cambios: ' + err.message);
      setSavingEditarPlanilla(false);
    }
  };

  const handleEditPlanilla = (planilla: any) => {
    setActiveTab('declaraciones');
    setSelectedMonth(planilla.month);
    setIsEditingHistory(true);
    
    // Cargar unidades vendidas
    const newSalesInputs: Record<string, number> = {};
    todosLosLotes.forEach(lote => {
      const mov = lote.movimientos?.[planilla.month];
      if (mov) {
        newSalesInputs[lote.id] = mov.unidadesVendidas || 0;
      }
    });
    setSalesInputs(newSalesInputs);
  };

  const handleSaveAllMovements = async () => {
    if (!declaracionCliente) return;
    try {
      setSavingAllMovements(true);

      if (isFirebaseReady()) {
        const db = getDb();
        
        for (const lote of lotesActivos) {
          const mov = lote.movimientos?.[selectedMonth];
          if (mov?.hidden) continue; 
          
          const currentSales = Number(salesInputs[lote.id] ?? lote.movimientos?.[selectedMonth]?.unidadesVendidas ?? 0);
          const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, currentSales);
          if (!traj) continue;

          const hadMovement = !!lote.movimientos?.[selectedMonth];
          if (currentSales > 0 || hadMovement) {
            const loteRef = doc(db, 'crm_consignacion_lotes', lote.id);
            await updateDoc(loteRef, {
              activo: true,
              [`movimientos.${selectedMonth}`]: {
                unidadesVendidas: currentSales,
                saldoAnterior: Number(traj.stockDisponible),
                saldoResultante: Number(traj.frascosRestantes),
                montoVentaNeto: Number(traj.montoVentaNeto),
                fechaRegistro: Timestamp.now()
              }
            });
          }
        }
        
        const planillaRef = doc(db, 'planillas_consignacion', `${declaracionCliente}_${selectedMonth}`);
        await setDoc(planillaRef, {
          clienteId: declaracionCliente,
          month: selectedMonth,
          savedAt: Timestamp.now()
        });
        
        setSalesInputs({});
        setSavedPlanillaMonths(prev => new Set(prev).add(selectedMonth));
        setSaveNotification("Plantilla guardada exitosamente en Ventas en Consignación");
        setTimeout(() => setSaveNotification(null), 5000);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const mov = l.movimientos?.[selectedMonth];
              if (mov?.hidden) return;
              
              const currentSales = Number(salesInputs[l.id] ?? l.movimientos?.[selectedMonth]?.unidadesVendidas ?? 0);
              const traj = getLoteTrajectoryUpToMonth(l, selectedMonth, currentSales);
              if (traj) {
                const hadMovement = !!l.movimientos?.[selectedMonth];
                if (currentSales > 0 || hadMovement) {
                  if (!l.movimientos) l.movimientos = {};
                  l.movimientos[selectedMonth] = {
                    unidadesVendidas: currentSales,
                    saldoAnterior: Number(traj.stockDisponible),
                    saldoResultante: Number(traj.frascosRestantes),
                    montoVentaNeto: Number(traj.montoVentaNeto),
                    fechaRegistro: new Date().toISOString()
                  };
                  l.activo = true;
                }
              }
            }
          });
          safeLocalStorageSet(key, JSON.stringify(allLotes));
          
          const planillaKey = `mock_planilla_${declaracionCliente}_${selectedMonth}`;
          safeLocalStorageSet(planillaKey, JSON.stringify({
            clienteId: declaracionCliente,
            month: selectedMonth,
            savedAt: new Date().toISOString()
          }));
          
          setSalesInputs({});
          setSavedPlanillaMonths(prev => new Set(prev).add(selectedMonth));
          setSaveNotification("Plantilla guardada exitosamente en Ventas en Consignación");
          setTimeout(() => setSaveNotification(null), 5000);
        }
      }

      await loadLotes(declaracionCliente, true);
      await loadTodosLosLotes(true);
      setIsEditingHistory(false);
    } catch (e: any) {
      console.error(e);
      alert('Error guardando la declaración mensual de ventas: ' + e.message);
    } finally {
      setSavingAllMovements(false);
    }
  };

  return (
    <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-2xl overflow-hidden min-h-[700px] flex flex-col font-sans">
      {saveNotification && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white p-4 rounded-xl shadow-lg z-50">
          {saveNotification}
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#122540] p-8 pb-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Package className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-sky-400 animate-pulse" />
              Ventas en Consignación
            </h2>
            <p className="text-slate-300 mt-2 text-sm max-w-2xl leading-relaxed font-medium">
              Alineado 100% con su plantilla de Excel. Registre lotes, edite sus datos fijos y declare las ventas de forma secuencial con control de saldos y reposición automática.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFixedDataExpanded(!fixedDataExpanded)}
            className={cn(
              "p-4 bg-[#0A1120]/85 hover:bg-[#111A2E] border rounded-2xl transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl",
              fixedDataExpanded 
                ? "border-sky-500 text-sky-400 shadow-sky-500/10 animate-pulse" 
                : "border-[#1E293B] text-slate-300 hover:text-white"
            )}
          >
            <Settings size={18} className={cn("transition-transform duration-500", fixedDataExpanded ? "rotate-90 text-sky-400" : "text-slate-400")} />
            Administrar Lotes (Datos Fijos)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0A1120] border-b border-[#1E293B] overflow-x-auto">
        {[
          { id: 'declaraciones', label: 'Declaración Mensual y Saldos', icon: Target },
          { id: 'registro_ventas', label: 'Registro de Ventas', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-8 py-5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap border-r border-[#1E293B]/40",
              activeTab === tab.id ? "bg-[#152035] text-sky-400 border-t-2 border-sky-400" : "text-slate-500 hover:text-slate-300 hover:bg-[#111A2E]"
            )}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Dynamic Product Autocomplete List */}
        <datalist id="productos-datalist">
          {Array.isArray(uniqueProducts) && uniqueProducts.map(p => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : (
          <>
            {/* TAB 1: DECLARACION MENSUAL */}
            {activeTab === 'declaraciones' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* COLLAPSIBLE ADMIN DE DATOS FIJOS (at the beginning, inside engranaje panel) */}
                {fixedDataExpanded && (
                  <div className="bg-[#111A2E] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-[#1E293B]/40 bg-[#15233C]/20 flex justify-between items-center flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400">
                          <Settings size={20} className="animate-spin-slow text-sky-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                            📦 Registro de Productos en Consignación
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Listado de productos en consignación junto con su solución. Use el botón para agregar nuevos productos.
                          </p>
                        </div>
                      </div>

                      {/* Dropdown action buttons requested in Rule 5 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setShowAddLoteForm(!showAddLoteForm);
                                setShowAddClientForm(false);
                                setShowImportForm(false);
                              }}
                              className={cn(
                                "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg active:scale-95",
                                showAddLoteForm 
                                  ? "bg-emerald-500 text-[#050914] shadow-emerald-500/20" 
                                  : "bg-emerald-500 hover:bg-emerald-400 text-[#050914] shadow-emerald-500/20"
                              )}
                            >
                              <Plus size={16} className="stroke-[3]" />
                              + Agregar Producto en Consignación
                            </button>
                            <button
                              onClick={() => {
                                setEditingClient(null);
                                setNewClientName('');
                                setNewClientRut('');
                                setShowAddClientForm(!showAddClientForm || editingClient !== null);
                                setShowAddLoteForm(false);
                                setShowImportForm(false);
                              }}
                              className={cn(
                                "px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                                showAddClientForm && !editingClient
                                  ? "bg-sky-500 text-[#050914]"
                                  : "bg-[#050914] text-sky-400 border border-sky-500/20 hover:bg-sky-500 hover:text-[#050914]"
                              )}
                            >
                              <Plus size={14} />
                              Crear Cliente
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowImportForm(!showImportForm);
                                setShowAddLoteForm(false);
                                setShowAddClientForm(false);
                              }}
                              className={cn(
                                "px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                                showImportForm 
                                  ? "bg-purple-500 text-[#050914]" 
                                  : "bg-[#050914] text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-[#050914]"
                              )}
                            >
                              <Upload size={14} />
                              Importar Productos
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleDownloadRegisteredProductsPDF}
                          className="px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md bg-[#050914] text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white"
                        >
                          <Download size={14} />
                          Descargar Registro (PDF)
                        </button>
                      </div>

                      {/* Filters inside fixed data admin */}
                      <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                        <div className="w-64">
                          <ClientAutocomplete
                            clientes={clientes}
                            value={adminFilterCliente}
                            onChange={setAdminFilterCliente}
                            placeholder="Buscar y filtrar por cliente..."
                          />
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          className="bg-[#050914] text-white border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-sky-500 w-64"
                          value={adminFilterProducto}
                          onChange={(e) => setAdminFilterProducto(e.target.value)}
                        />
                        {(adminFilterCliente || adminFilterProducto) && (
                           <button
                             onClick={() => { setAdminFilterCliente(''); setAdminFilterProducto(''); }}
                             className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                           >
                             Limpiar Filtros
                           </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4 bg-[#0B1220]">
                      {/* Dropdown Form 1: Ingreso de Producto / Solución */}
                      {showAddLoteForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-emerald-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <h5 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <PlusCircle size={14} /> Nuevo Producto / Solución en Consignación
                          </h5>
                          <form 
                            onSubmit={async (e) => {
                              await handleCreateEntrega(e);
                              setShowAddLoteForm(false);
                            }} 
                            className="grid grid-cols-1 md:grid-cols-3 gap-4"
                          >
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cliente Destinatario</label>
                              <ClientAutocomplete
                                clientes={clientes}
                                value={formEntrega.cliente_id}
                                onChange={(id) => setFormEntrega({ ...formEntrega, cliente_id: id })}
                                placeholder="Escriba para buscar cliente..."
                              />
                            </div>
                             <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Producto</label>
                              <ProductSolutionAutocomplete
                                value={formEntrega.producto_id}
                                onChange={(val) => setFormEntrega({ ...formEntrega, producto_id: val })}
                                onSelectCombination={(comb) => {
                                  setFormEntrega({
                                    ...formEntrega,
                                    producto_id: comb.productoId,
                                    solucion_lote: comb.solucionLote,
                                    precio_unit_neto: comb.precioUnitNeto
                                  });
                                }}
                                placeholder="Escribe o selecciona producto..."
                                registeredCombinations={registeredCombinations}
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-emerald-500 uppercase"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Solución</label>
                              <input
                                type="text"
                                placeholder="Ej: SALINA, CS-01"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-emerald-500 uppercase"
                                value={formEntrega.solucion_lote}
                                onChange={e => setFormEntrega({ ...formEntrega, solucion_lote: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fecha Vencimiento</label>
                              <input
                                type="date"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-emerald-500 [color-scheme:dark]"
                                value={formEntrega.fecha_vencimiento}
                                onChange={e => setFormEntrega({ ...formEntrega, fecha_vencimiento: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Unidades Iniciales</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="Ej: 100"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-emerald-500 text-center"
                                value={formEntrega.unidades_iniciales ?? ''}
                                onChange={e => setFormEntrega({ ...formEntrega, unidades_iniciales: e.target.value === '' ? ('' as any) : parseInt(e.target.value) || 0 })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">$ Unit s/IVA</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-emerald-500 text-center"
                                value={formEntrega.precio_unit_neto ?? ''}
                                onChange={e => setFormEntrega({ ...formEntrega, precio_unit_neto: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0 })}
                                required
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowAddLoteForm(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-500/10"
                              >
                                Guardar Producto
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Dropdown Form 2: Registrar / Editar Cliente */}
                      {showAddClientForm && (
                        <div className={cn(
                          "p-5 rounded-2xl border shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2 transition-colors",
                          editingClient ? "bg-[#0D1627] border-amber-500/30" : "bg-[#0D1627] border-sky-500/20"
                        )}>
                          <div className="flex justify-between items-center border-b border-[#1E293B] pb-3 flex-wrap gap-2">
                            <h5 className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", editingClient ? "text-amber-400" : "text-sky-400")}>
                              {editingClient ? (
                                <>
                                  <Edit size={16} /> Modificar / Actualizar Cliente en Consignación
                                </>
                              ) : (
                                <>
                                  <PlusCircle size={16} /> Registrar Nuevo Cliente en Consignación
                                </>
                              )}
                            </h5>
                            {editingClient && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClient(null);
                                  setNewClientName('');
                                  setNewClientRut('');
                                }}
                                className="text-xs text-sky-400 hover:text-sky-300 font-bold underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Cambiar a modo "Crear Nuevo Cliente"
                              </button>
                            )}
                          </div>

                          {/* Dropdown selector when editing or multiple clients exist */}
                          {clientes.length > 0 && (
                            <div className="bg-[#050914] p-3 rounded-xl border border-[#1E293B]">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                {editingClient ? 'Cliente Actualmente Seleccionado para Editar:' : 'Cargar Cliente Existente para Editar:'}
                              </label>
                              <select
                                className="w-full bg-[#0D1627] text-white border border-[#1E293B] rounded-lg p-2 text-xs font-semibold outline-none focus:border-amber-500"
                                value={editingClient?.id || ''}
                                onChange={(e) => {
                                  const selected = clientes.find(c => c.id === e.target.value);
                                  if (selected) {
                                    setEditingClient(selected);
                                    setNewClientName(selected.name || '');
                                    setNewClientRut(selected.rut || '');
                                  } else {
                                    setEditingClient(null);
                                    setNewClientName('');
                                    setNewClientRut('');
                                  }
                                }}
                              >
                                <option value="">-- {editingClient ? 'Cambiar de cliente a editar...' : 'Seleccione cliente si desea editar uno existente'} --</option>
                                {clientes.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.rut ? `(${c.rut})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nombre de la Empresa / Cliente</label>
                              <input
                                type="text"
                                placeholder="Ej: Laboratorio Clinico Las Condes"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-sky-500"
                                value={newClientName}
                                onChange={e => setNewClientName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">RUT o Identificación (Opcional)</label>
                              <input
                                type="text"
                                placeholder="Ej: 76.123.456-7"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-sky-500"
                                value={newClientRut}
                                onChange={e => setNewClientRut(e.target.value)}
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddClientForm(false);
                                  setEditingClient(null);
                                  setNewClientName('');
                                  setNewClientRut('');
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveClient}
                                className={cn(
                                  "px-5 py-2 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5",
                                  editingClient
                                    ? "bg-amber-500 hover:bg-amber-400 text-[#050914] shadow-amber-500/10"
                                    : "bg-sky-500 hover:bg-sky-600 text-[#050914] shadow-sky-500/10"
                                )}
                              >
                                {editingClient ? <Save size={14} /> : <PlusCircle size={14} />}
                                {editingClient ? 'ACTUALIZAR CLIENTE' : 'CREAR CLIENTE'}
                              </button>
                            </div>
                          </div>

                          {/* LIST OF REGISTERED CLIENTS */}
                          {clientes.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#1E293B]">
                              <h6 className="text-[11px] font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users size={14} className="text-sky-400" /> Clientes Registrados en Sistema ({clientes.length})
                              </h6>
                              <div className="max-h-52 overflow-y-auto border border-[#1E293B] rounded-xl divide-y divide-[#1E293B] bg-[#050914]">
                                {clientes.map(c => (
                                  <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-[#0D1627] transition-colors">
                                    <div>
                                      <span className="text-xs font-bold text-white block">{c.name}</span>
                                      {c.rut && <span className="text-[10px] text-slate-400 font-mono">RUT: {c.rut}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingClient(c);
                                          setNewClientName(c.name || '');
                                          setNewClientRut(c.rut || '');
                                        }}
                                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#050914] rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                      >
                                        <Edit size={12} /> Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteClient(c)}
                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                                        title="Eliminar Cliente"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dropdown Form 3: Importar Productos */}
                      {showImportForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-purple-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                              <Upload size={14} /> Importación de Productos desde Excel
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                const header = ["Producto", "Solución/Lote", "Fecha Venc. (AAAA-MM-DD)", "Unidades Iniciales", "Precio Unitario"];
                                const demoRow = ["OZO-100", "L-45", "2027-12-31", 100, 25.50];
                                const ws = XLSX.utils.aoa_to_sheet([header, demoRow]);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
                                XLSX.writeFile(wb, "plantilla_importacion.xlsx");
                              }}
                              className="text-[10px] text-purple-400 font-bold uppercase underline hover:text-purple-300"
                            >
                              Descargar Plantilla Excel
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cliente Destinatario</label>
                              <ClientAutocomplete
                                clientes={clientes}
                                value={importClienteId}
                                onChange={setImportClienteId}
                                placeholder="Escriba para buscar cliente..."
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cargar Archivo Excel (.xlsx)</label>
                              <div 
                                className={cn(
                                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                                  importFile ? "border-emerald-500 bg-emerald-500/10" : "border-purple-500/30 bg-[#050914] hover:bg-purple-500/5 hover:border-purple-500"
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files[0];
                                  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                                    setImportFile(file);
                                  } else {
                                    alert('Por favor, suba un archivo Excel (.xlsx o .xls)');
                                  }
                                }}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.xlsx,.xls';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) setImportFile(file);
                                  };
                                  input.click();
                                }}
                              >
                                {importFile ? (
                                  <div>
                                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <Check size={24} />
                                    </div>
                                    <span className="text-xs text-emerald-400 font-bold block">{importFile.name}</span>
                                    <span className="text-[10px] text-slate-500 mt-1 block">{(importFile.size / 1024).toFixed(2)} KB</span>
                                  </div>
                                ) : (
                                  <div>
                                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce-slow" />
                                    <span className="text-xs text-slate-300 font-bold block">Arrastre aquí su archivo Excel o haga clic para seleccionar</span>
                                    <span className="text-[10px] text-slate-500 mt-1 block">Formato: .xlsx. Columnas: Producto | Solución | Vencimiento | Unidades | Precio</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImportForm(false);
                                  setImportFile(null);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (importFile) {
                                    handleImportExcel(importFile, importClienteId);
                                  } else {
                                    alert('Debe cargar un archivo Excel primero.');
                                  }
                                }}
                                disabled={!importFile}
                                className={cn(
                                  "px-5 py-2 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all",
                                  importFile ? "bg-purple-500 hover:bg-purple-600 text-[#050914] shadow-purple-500/10" : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                )}
                              >
                                Importar Excel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-slate-400 bg-sky-500/5 border border-sky-500/10 p-3.5 rounded-xl flex items-center gap-2 mb-2 font-medium">
                        <Info size={14} className="text-sky-400 flex-shrink-0" />
                        Visualice los productos registrados en consignación junto con su solución. Presione "+ Agregar Producto" para incluir nuevos productos.
                      </div>
                      {(() => {
                        const filteredLotes = todosLosLotes.filter(lote => {
                          if (adminFilterCliente) {
                            const clientObj = clientes.find(c => c.id === adminFilterCliente);
                            const isMatchingId = lote.clienteId === adminFilterCliente;
                            const isMatchingName = clientObj && (lote.clienteId || '').toLowerCase() === clientObj.name.toLowerCase();
                            if (!isMatchingId && !isMatchingName) return false;
                          }
                          if (adminFilterProducto) {
                            const search = adminFilterProducto.toLowerCase();
                            const pName = (lote.productoId || "").toLowerCase();
                            const sName = (lote.solucionLote || "").toLowerCase();
                            if (!pName.includes(search) && !sName.includes(search)) return false;
                          }
                          return true;
                        });

                        const productSolutionMap = new Map<string, {
                          key: string;
                          sampleLoteId: string;
                          clienteId: string;
                          clientName: string;
                          productoId: string;
                          solucionLote: string;
                          precioUnitNeto: number;
                          totalLotes: number;
                          totalStockActivo: number;
                          sampleLote: any;
                        }>();

                        filteredLotes.forEach(lote => {
                          const clientObj = clientes.find(c => c.id === lote.clienteId || c.name.toLowerCase() === (lote.clienteId || '').toLowerCase());
                          const cName = clientObj?.name || lote.clienteId || 'Cliente';
                          const prodName = (lote.productoId || '').trim().toUpperCase();
                          const solName = (lote.solucionLote || 'S/L').trim().toUpperCase();
                          const groupKey = `${lote.clienteId}___${prodName}___${solName}`;

                          let totalVendidas = 0;
                          Object.values(lote.movimientos || {}).forEach((m: any) => {
                            if (!m.hidden) totalVendidas += Number(m.unidadesVendidas || 0);
                          });
                          const remaining = Math.max(0, Number(lote.unidadesIniciales || 0) - totalVendidas);

                          if (!productSolutionMap.has(groupKey)) {
                            productSolutionMap.set(groupKey, {
                              key: groupKey,
                              sampleLoteId: lote.id,
                              clienteId: lote.clienteId,
                              clientName: cName,
                              productoId: prodName,
                              solucionLote: solName,
                              precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                              totalLotes: 1,
                              totalStockActivo: remaining,
                              sampleLote: lote
                            });
                          } else {
                            const existing = productSolutionMap.get(groupKey)!;
                            existing.totalLotes += 1;
                            existing.totalStockActivo += remaining;
                          }
                        });

                        const productSolutionList = Array.from(productSolutionMap.values()).sort((a, b) => {
                          if (a.clientName !== b.clientName) return String(a.clientName || "").localeCompare(String(b.clientName || ""));
                          if (a.productoId !== b.productoId) return String(a.productoId || "").localeCompare(String(b.productoId || ""));
                          return String(a.solucionLote || "").localeCompare(String(b.solucionLote || ""));
                        });

                        return (
                          <div className="space-y-4">
                            {productSolutionList.length === 0 ? (
                              <div className="text-center py-12 bg-[#050914] border border-dashed border-[#1E293B] rounded-2xl text-slate-500 font-semibold text-xs space-y-3">
                                <p>No hay productos registrados en consignación para los filtros seleccionados.</p>
                                <button
                                  type="button"
                                  onClick={() => setShowAddLoteForm(true)}
                                  className="px-4 py-2 bg-emerald-500 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg"
                                >
                                  <Plus size={14} /> Registrar Primer Producto
                                </button>
                              </div>
                            ) : (
                              <div className="border border-[#1E293B] rounded-2xl bg-[#050914] overflow-hidden shadow-xl">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#0D1627] text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-[#1E293B]">
                                    <tr>
                                      <th className="p-3.5 pl-5">Cliente</th>
                                      <th className="p-3.5">Producto</th>
                                      <th className="p-3.5">Solución</th>
                                      <th className="p-3.5 text-right pr-6">Precio Unit. (s/IVA)</th>
                                      <th className="p-3.5 text-center">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1E293B]/60">
                                    {productSolutionList.map((item) => (
                                      <tr key={item.key} className="hover:bg-[#111A2E]/60 transition-colors">
                                        <td className="p-3.5 pl-5 font-bold text-slate-300">
                                          {item.clientName}
                                        </td>
                                        <td className="p-3.5">
                                          <div className="font-black text-white text-xs">{item.productoId}</div>
                                        </td>
                                        <td className="p-3.5">
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                            {item.solucionLote}
                                          </span>
                                        </td>
                                        <td className="p-3.5 text-right pr-6 font-mono font-bold text-amber-400 text-xs">
                                          {formatCurrency(item.precioUnitNeto)}
                                        </td>
                                        <td className="p-3.5 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (item.sampleLote) {
                                                  openEditLoteModal(item.sampleLote);
                                                }
                                              }}
                                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                              title="Editar producto"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (confirm(`¿Está seguro de eliminar el producto ${item.productoId} (${item.solucionLote})?`)) {
                                                  try {
                                                    const db = getDb();
                                                    await deleteDoc(doc(db, 'consignacion_lotes', item.sampleLoteId));
                                                    await loadTodosLosLotes();
                                                  } catch (e: any) {
                                                    alert('Error al eliminar: ' + e.message);
                                                  }
                                                }
                                              }}
                                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
                                              title="Eliminar producto"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()}
              </div>
            </div>
          )}

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Filter 1: Cliente */}
                  <div className="bg-[#111A2E] p-5 rounded-2xl border border-[#1E293B] shadow-lg">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente Seleccionado</label>
                    <ClientAutocomplete 
                      clientes={clientes}
                      value={declaracionCliente}
                      onChange={setDeclaracionCliente}
                      placeholder="Ingrese el nombre del cliente..."
                    />
                  </div>

                  {/* Filter 2: Mes de Reporte con Controles Nav */}
                  {/* Filter 2: Mes de Reporte con Controles Nav */}
                  <div className="bg-[#111A2E] p-5 rounded-2xl border border-[#1E293B] shadow-lg flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Mes de Reporte
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
                            if (idx > 0) { setSelectedMonth(MONTH_OPTIONS[idx - 1].value); setIsEditingHistory(false); }
                          }}
                          disabled={selectedMonth === MONTH_OPTIONS[0].value || !declaracionCliente}
                          className="p-2.5 bg-[#050914] hover:bg-[#1E293B]/40 disabled:opacity-30 border border-[#1E293B] rounded-xl text-slate-400 hover:text-white transition-all text-xs font-black"
                        >
                          ◀
                        </button>
                        <input
                          type="month"
                          className="flex-1 bg-[#050914] text-sky-400 border border-[#1E293B] rounded-xl p-3 outline-none focus:border-sky-500 transition-colors font-black text-xs text-center"
                          value={selectedMonth}
                          disabled={!declaracionCliente}
                          onChange={(e) => { setSelectedMonth(e.target.value); setIsEditingHistory(false); }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
                            if (idx < MONTH_OPTIONS.length - 1) { setSelectedMonth(MONTH_OPTIONS[idx + 1].value); setIsEditingHistory(false); }
                          }}
                          disabled={selectedMonth === MONTH_OPTIONS[MONTH_OPTIONS.length - 1].value || !declaracionCliente}
                          className="p-2.5 bg-[#050914] hover:bg-[#1E293B]/40 disabled:opacity-30 border border-[#1E293B] rounded-xl text-slate-400 hover:text-white transition-all text-xs font-black"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                    {declaracionCliente && (
                      <button
                        type="button"
                        onClick={() => openDevolucionModal(undefined, selectedMonth)}
                        className="mt-3 w-full bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/30 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-amber-500/5"
                      >
                        <RotateCcw size={13} />
                        Registrar Devolución ({formatMonthName(selectedMonth)})
                      </button>
                    )}
                  </div>

                  {/* Filter 3: Filtro de Reposición */}
                  <div className="bg-[#111A2E] p-5 rounded-2xl border border-[#1E293B] shadow-lg">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Filtro de Stock / Reposición</label>
                    <select
                      className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-3 outline-none focus:border-sky-500 transition-colors font-bold text-xs"
                      value={replenishmentFilter}
                      disabled={!declaracionCliente}
                      onChange={(e) => setReplenishmentFilter(e.target.value as any)}
                    >
                      <option value="todos">📋 Mostrar Todas las Soluciones</option>
                      <option value="reposicion">⚠️ Requiere Reposición (Stock 0)</option>
                      <option value="con-stock">✅ Con Stock Disponible (&gt; 0)</option>
                      <option value="agotados">🚫 Agotados / Comprados (Stock 0)</option>
                    </select>
                  </div>
                </div>

                {declaracionCliente ? (
                  loadingLotes ? (
                    <div className="p-16 flex justify-center items-center bg-[#111A2E]/35 rounded-3xl border border-[#1E293B]">
                      <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
                    </div>
                  ) : lotesActivos.length > 0 ? (
                    (() => {
                      // Precompute trajectories of active products/lotes
                      const activeLotesForMonth = lotesActivos.map(lote => {
                        const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, salesInputs[lote.id]);
                        return { lote, traj };
                      }).filter(item => {
                        if (!item.traj || !item.traj.delivered) return false;
                        const mov = item.lote.movimientos?.[selectedMonth];
                        if (mov && mov.hidden) return false;
                        return mov !== undefined && !mov.hidden;
                      }).sort((a, b) => {
                        const nameA = (a.lote.productoId || '').toString().toLowerCase();
                        const nameB = (b.lote.productoId || '').toString().toLowerCase();
                        if (nameA !== nameB) return nameA.localeCompare(nameB);
                        const dateA = String(a.lote?.fechaVencimiento?.toDate ? a.lote.fechaVencimiento.toDate().toISOString() : (a.lote?.fechaVencimiento || ''));
                        const dateB = String(b.lote?.fechaVencimiento?.toDate ? b.lote.fechaVencimiento.toDate().toISOString() : (b.lote?.fechaVencimiento || ''));
                        return dateA.localeCompare(dateB);
                      });

                      const filteredLotes = activeLotesForMonth.filter(item => {
                        if (replenishmentFilter === 'reposicion') {
                          return item.traj.frascosRestantes === 0;
                        }
                        if (replenishmentFilter === 'con-stock') {
                          return item.traj.frascosRestantes > 0;
                        }
                        if (replenishmentFilter === 'agotados') {
                          return item.traj.frascosRestantes === 0;
                        }
                        return true;
                      });

                      return (
                        <div className="space-y-6">
                          {/* Unified Excel Table */}
                          <div className="bg-[#111A2E] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
                            <div className="p-5 border-b border-[#1E293B]/40 flex justify-between items-center bg-[#15233C]/20 flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <Layers className="text-sky-400 animate-pulse" size={18} />
                                <div>
                                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                                    Planilla de Control Mensual de Ventas y Saldos (Secuencial)
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Visualización por producto y lote. El stock inicial toma el remanente del mes anterior de forma secuencial.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {selectedMonthlyLoteIds.size > 0 && (
                                  <button
                                    type="button"
                                    disabled={savingAllMovements}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleBulkRemoveFromMonthTemplate();
                                    }}
                                    className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 shadow-lg transition-all animate-in zoom-in-95 disabled:opacity-50"
                                  >
                                    {savingAllMovements ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    Remover Seleccionados ({selectedMonthlyLoteIds.size})
                                  </button>
                                )}
                                {(() => {
                                  const isCurrentMonthSaved = savedPlanillaMonths.has(selectedMonth);
                                  return isCurrentMonthSaved ? (
                                    <div className="flex items-center gap-2">
                                      <span className="bg-emerald-500/15 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/30 shadow-lg flex items-center gap-1.5">
                                        <CheckCircle size={14} /> Planilla Guardada ({formatMonthName(selectedMonth)})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setIsEditingHistory(!isEditingHistory)}
                                        className="bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-[#050914] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-500/30 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Edit3 size={14} />
                                        {isEditingHistory ? "Cancelar Edición" : "Editar Planilla"}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="bg-sky-500/15 text-sky-400 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-sky-500/20 shadow-lg">
                                      📅 {formatMonthName(selectedMonth)} (Borrador)
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[10px] uppercase font-black tracking-widest text-slate-400">
                                  <tr>
                                    <th className="p-4 pl-6 w-12 text-center">
                                      <input 
                                        type="checkbox"
                                        className="accent-sky-500 cursor-pointer"
                                        checked={filteredLotes.length > 0 && selectedMonthlyLoteIds.size === filteredLotes.length}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMonthlyLoteIds(new Set(filteredLotes.map(item => item.lote.id)));
                                          } else {
                                            setSelectedMonthlyLoteIds(new Set());
                                          }
                                        }}
                                      />
                                    </th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4 text-center">Stock Inicial</th>
                                    <th className="p-4 text-center">Precio Unit.</th>
                                    <th className="p-4 text-center bg-sky-500/5 text-sky-400 w-44">und vendida</th>
                                    <th className="p-4 text-center">$ Vendido</th>
                                    <th className="p-4 text-center">Frascos Restantes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                   {filteredLotes.length > 0 ? (
                                     filteredLotes.map(({ lote, traj }) => {
                                       const savedSales = lote.movimientos?.[selectedMonth]?.unidadesVendidas;
                                       const currentSales = salesInputs[lote.id] !== undefined ? salesInputs[lote.id] : (savedSales ?? 0);
                                       const isSelected = selectedMonthlyLoteIds.has(lote.id);
                                       const isCurrentMonthSaved = savedPlanillaMonths.has(selectedMonth);
                                       const isSaved = isCurrentMonthSaved && !isEditingHistory;
                                       return (
                                         <tr key={lote.id} className={cn("hover:bg-[#1E293B]/10 transition-colors", isSelected ? "bg-sky-500/5" : "")}>
                                           <td className="p-4 pl-6 w-12 text-center">
                                             <input
                                               type="checkbox"
                                               disabled={isSaved}
                                               className="accent-sky-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                               checked={isSelected}
                                               onChange={(e) => {
                                                 const next = new Set(selectedMonthlyLoteIds);
                                                 if (e.target.checked) next.add(lote.id);
                                                 else next.delete(lote.id);
                                                 setSelectedMonthlyLoteIds(next);
                                               }}
                                             />
                                           </td>
                                           <td className="p-4">
                                             <div className="flex items-start justify-between gap-2">
                                               <div className="font-black text-slate-200 text-sm">
                                                 {lote.productoId} 
                                               </div>
                                               <button
                                                 type="button"
                                                 onClick={() => handleRemoveProductFromMonthTemplate(lote.id)}
                                                 title="Remover de esta Planilla"
                                                 className="p-1 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                                               >
                                                 <Trash2 size={13} />
                                               </button>
                                             </div>
                                             <div className="flex flex-col gap-1 mt-1">
                                               <div className="flex items-center gap-2">
                                                 <span className="bg-[#0A1120] border border-[#1E293B]/50 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">
                                                   Solución: {lote.solucionLote || 'S/L'}
                                                 </span>
                                                 <span className="bg-[#0A1120] border border-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                                   F. Venc: {formatDateToDDMMYYYY(lote.fechaVencimiento)}
                                                 </span>
                                               </div>
                                               
                                               {/* Replenishments History List */}
                                             </div>
                                           </td>
                                           <td className="p-4 text-center text-slate-300 font-bold font-mono text-sm">
                                             {traj.stockDisponible} u.
                                           </td>
                                           <td className="p-4 text-center text-slate-400 font-bold font-mono text-xs">
                                             {formatCurrency(Number(lote.precioUnitNeto) || 0)}
                                           </td>
                                           <td className="p-4 text-center bg-sky-500/5">
                                             <div className="flex items-center justify-center gap-2">
                                               <input 
                                                 type="number"
                                                 min="0"
                                                 max={traj.stockDisponible} disabled={isSaved}
                                                 className={cn("bg-[#050914] border border-sky-500/30 rounded-lg p-2 text-sky-400 font-black w-24 text-center outline-none focus:border-sky-500 text-xs font-mono shadow-inner", isSaved && "opacity-50 cursor-not-allowed border-slate-600 text-slate-400 grayscale")}
                                                 value={currentSales || ''}
                                                 onChange={e => {
                                                   const val = Math.min(Math.max(parseInt(e.target.value) || 0, 0), traj.stockDisponible);
                                                   setSalesInputs(prev => ({ ...prev, [lote.id]: val }));
                                                 }}
                                                 placeholder="0"
                                               />
                                               <span className="text-slate-500 font-bold text-[10px]">u.</span>
                                             </div>
                                           </td>
                                           <td className="p-4 text-center text-emerald-400 font-black font-mono text-sm">
                                             {formatCurrency(currentSales * (Number(lote.precioUnitNeto) || 0))}
                                           </td>
                                           <td className="p-4 text-center pr-6">
                                             <span className={cn(
                                               "font-black px-3 py-1 rounded-full font-mono text-xs",
                                               traj.frascosRestantes === 0
                                                 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                 : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                             )}>
                                               {traj.frascosRestantes} u.
                                             </span>
                                           </td>
                                         </tr>
                                       );
                                     })
                                   ) : (
                                     <tr>
                                       <td colSpan={8} className="p-12 text-center text-slate-500 font-semibold">
                                         No hay productos entregados o activos para el mes de {formatMonthName(selectedMonth)}.
                                       </td>
                                     </tr>
                                   )}

                                   {/* Totals Row */}
                                   {filteredLotes.length > 0 && (
                                     <tr className="bg-[#050914] border-t-2 border-[#1E293B]">
                                       <td colSpan={3} className="p-4 text-right text-slate-400 font-bold text-xs uppercase tracking-widest">
                                         Totales del Mes:
                                       </td>
                                       <td className="p-4 text-center font-black font-mono text-[9px] text-slate-500 uppercase">
                                         {/* unit price sum not meaningful */}
                                       </td>
                                       <td className="p-4 text-center font-black font-mono text-xs text-sky-400">
                                         {filteredLotes.reduce((acc, item) => acc + (salesInputs[item.lote.id] || 0), 0)} u.
                                       </td>
                                       <td className="p-4 text-center font-black font-mono text-sm text-emerald-400">
                                         {formatCurrency(filteredLotes.reduce((acc, item) => {
                                            const sales = Number(salesInputs[item.lote.id] || 0);
                                            return acc + (sales * (Number(item.lote.precioUnitNeto) || 0));
                                         }, 0))}
                                       </td>
                                       <td colSpan={2} className="p-4 text-center font-black font-mono text-xs text-slate-300">
                                         {filteredLotes.reduce((acc, item) => acc + item.traj.frascosRestantes, 0)} u. (Saldo Final)
                                       </td>
                                     </tr>
                                   )}

                                   {/* Manual inline product additions row with '+' button */}
                                   <tr>
                                     <td colSpan={8} className="p-4 border-t border-[#1E293B]/40 bg-[#0F172A]/30">
                                       {!inlineAddOpen ? (
                                         <button
                                           type="button"
                                           onClick={() => {
                                             setInlineAddOpen(true);
                                             setSelectedLotesToLink({});
                                           }}
                                           className="px-4 py-2 bg-[#1A263E]/60 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-dashed border-sky-500/35 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider active:scale-95"
                                         >
                                           <PlusCircle size={14} />
                                           Agregar Producto
                                         </button>
                                       ) : (
                                          <div className="bg-[#0D1627] p-5 rounded-2xl border border-sky-500/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                              <h5 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <PlusCircle size={14} /> Agregar Producto(s) de Datos Fijos a esta Planilla
                                              </h5>
                                              {Object.keys(selectedLotesToLink).length > 0 && (
                                                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
                                                  {Object.keys(selectedLotesToLink).length} seleccionado(s) | Total a descontar: {Object.values(selectedLotesToLink).reduce((a: number, b: any) => a + Number(b || 0), 0)} u.
                                                </span>
                                              )}
                                            </div>
                                            
                                            {(() => {
                                              const flattenedItems: any[] = [];
                                              lotesActivos.forEach(l => {
                                                let totalVendidas = 0;
                                                Object.values(l.movimientos || {}).forEach((m: any) => {
                                                  if (!m.hidden) {
                                                     totalVendidas += Number(m.unidadesVendidas || 0);
                                                  }
                                                });
                                                let remainingOriginal = Math.max(0, Number(l.unidadesIniciales || 0) - totalVendidas);
                                                let remainingVentasForReps = Math.max(0, totalVendidas - Number(l.unidadesIniciales || 0));

                                                // Lote original
                                                flattenedItems.push({
                                                  ...l,
                                                  displayId: l.id,
                                                  type: 'ORIGINAL',
                                                  sortDate: parseDateString(l.fechaVencimiento),
                                                  displayUnidades: remainingOriginal,
                                                  originalUnidades: l.unidadesIniciales
                                                });
                                                
                                                // Reposiciones como filas separadas
                                                l.reposiciones?.forEach((rep: any, idx: number) => {
                                                  const currentRepUnits = Number(rep.unidades || 0);
                                                  const remainingRep = Math.max(0, currentRepUnits - remainingVentasForReps);
                                                  remainingVentasForReps = Math.max(0, remainingVentasForReps - currentRepUnits);
                                                  flattenedItems.push({
                                                    ...l,
                                                    displayId: `${l.id}_rep_${idx}`,
                                                    type: 'REP',
                                                    sortDate: parseDateString(l.fechaVencimiento),
                                                    displayUnidades: remainingRep,
                                                    originalUnidades: currentRepUnits,
                                                    fechaRep: rep.fecha
                                                  });
                                                });
                                              });

                                              const itemsWithStock = flattenedItems.filter(item => item.displayUnidades > 0);

                                              const sortedItems = [...itemsWithStock].sort((a, b) => {
                                                const nameA = (a.productoId || "").toString().toLowerCase();
                                                const nameB = (b.productoId || "").toString().toLowerCase();
                                                if (nameA !== nameB) return nameA.localeCompare(nameB);
                                                
                                                // Safe date comparison
                                                const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
                                                const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
                                                return dateA - dateB;
                                              });

                                              // Mapa de prioridad FIFO por producto
                                              const earliestMap: Record<string, string> = {};
                                              sortedItems.forEach(item => {
                                                if (!earliestMap[item.productoId]) {
                                                  earliestMap[item.productoId] = item.displayId;
                                                }
                                              });

                                              const filteredItems = sortedItems.filter(l => 
                                                (l.productoId || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                (l.solucionLote || "").toLowerCase().includes(searchTerm.toLowerCase())
                                              );

                                              const totalInlineAddPages = Math.ceil(filteredItems.length / INLINE_ADD_PAGE_SIZE) || 1;
                                              const currentInlinePage = Math.min(inlineAddPage, totalInlineAddPages);
                                              const paginatedItems = filteredItems.slice((currentInlinePage - 1) * INLINE_ADD_PAGE_SIZE, currentInlinePage * INLINE_ADD_PAGE_SIZE);

                                              const selectedCount = Object.keys(selectedLotesToLink).length;
                                              const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(l => selectedLotesToLink[l.id] !== undefined);

                                              const handleToggleSelectAll = () => {
                                                if (allFilteredSelected) {
                                                  setSelectedLotesToLink(prev => {
                                                    const next = { ...prev };
                                                    filteredItems.forEach(l => delete next[l.id]);
                                                    return next;
                                                  });
                                                } else {
                                                  setSelectedLotesToLink(prev => {
                                                    const next = { ...prev };
                                                    filteredItems.forEach(l => {
                                                      if (next[l.id] === undefined) {
                                                        next[l.id] = 0;
                                                      }
                                                    });
                                                    return next;
                                                  });
                                                }
                                              };

                                              const handleApplyBulkUnits = () => {
                                                const unitsVal = Math.max(0, parseInt(bulkUnitsInput) || 0);
                                                if (selectedCount === 0) {
                                                  alert("Por favor seleccione al menos un producto para aplicar las unidades.");
                                                  return;
                                                }
                                                setSelectedLotesToLink(prev => {
                                                  const next = { ...prev };
                                                  Object.keys(next).forEach(id => {
                                                    next[id] = unitsVal;
                                                  });
                                                  return next;
                                                });
                                              };

                                              const handleApplyMaxUnitsToSelected = () => {
                                                if (selectedCount === 0) {
                                                  alert("Por favor seleccione al menos un producto.");
                                                  return;
                                                }
                                                setSelectedLotesToLink(prev => {
                                                  const next = { ...prev };
                                                  filteredItems.forEach(l => {
                                                    if (next[l.id] !== undefined) {
                                                      next[l.id] = l.displayUnidades;
                                                    }
                                                  });
                                                  return next;
                                                });
                                              };

                                              if (itemsWithStock.length === 0) {
                                                return (
                                                  <div className="text-[#94A3B8] text-xs font-medium bg-[#111A2E]/55 p-4 rounded-xl border border-[#1E293B] flex flex-col gap-2">
                                                    <p>⚠️ No hay más productos/lotes registrados en Datos Fijos para este cliente que no estén ya en esta planilla.</p>
                                                    <p className="text-[11px] text-[#64748B]">
                                                      Por favor, registre nuevos productos para este cliente en la sección <strong>⚙️ Administración de Datos Fijos</strong> más abajo.
                                                    </p>
                                                    <div className="flex justify-end mt-2">
                                                      <button
                                                        type="button"
                                                        onClick={() => setInlineAddOpen(false)}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                      >
                                                        Cerrar
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              }

                                               return (
                                                 <div className="space-y-4">
                                                   {/* Search and Bulk Action Toolbar */}
                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end bg-[#050914] p-3 rounded-xl border border-[#1E293B]">
                                                     <div>
                                                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Buscar producto manual</label>
                                                       <input
                                                         type="text"
                                                         className="w-full bg-[#0D1627] text-white border border-[#1E293B]/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500 text-xs font-semibold"
                                                         placeholder="Buscar por nombre o solución (ej: ARNICA)..."
                                                         value={searchTerm}
                                                         onChange={e => {
                                                           setSearchTerm(e.target.value);
                                                           setInlineAddPage(1);
                                                         }}
                                                       />
                                                     </div>

                                                     <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
                                                       <div className="flex items-center gap-1.5">
                                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fijar u. en seleccionados:</span>
                                                         <input
                                                           type="number"
                                                           min="0"
                                                           placeholder="Ej: 1"
                                                           className="w-16 bg-[#0D1627] text-white border border-[#1E293B] rounded-lg px-2 py-1 text-xs text-center font-mono font-bold outline-none focus:border-sky-500"
                                                           value={bulkUnitsInput}
                                                           onChange={e => setBulkUnitsInput(e.target.value)}
                                                         />
                                                         <button
                                                           type="button"
                                                           onClick={handleApplyBulkUnits}
                                                           className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-[#050914] border border-sky-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                         >
                                                           Aplicar
                                                         </button>
                                                       </div>
                                                       <button
                                                         type="button"
                                                         onClick={handleApplyMaxUnitsToSelected}
                                                         className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                         title="Fijar stock máximo disponible para todos los seleccionados"
                                                       >
                                                         Stock Máx.
                                                       </button>
                                                     </div>
                                                   </div>

                                                   {/* Selection summary & table label */}
                                                   <div className="flex items-center justify-between px-1">
                                                     <label className="block text-[10px] font-black text-slate-300 uppercase tracking-wider">
                                                       Seleccionar Productos (Lotes Registrados en Datos Fijos)
                                                     </label>
                                                     <div className="flex items-center gap-2">
                                                       <button
                                                         type="button"
                                                         onClick={handleToggleSelectAll}
                                                         className="text-[10px] font-black text-sky-400 hover:text-sky-300 underline uppercase tracking-wider"
                                                       >
                                                         {allFilteredSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                                                       </button>
                                                     </div>
                                                   </div>

                                                   <div className="max-h-72 overflow-y-auto border border-[#1E293B] rounded-xl bg-[#050914] mb-2 shadow-inner">
                                                     <table className="w-full text-left text-[10px]">
                                                       <thead className="bg-[#0D1627] text-slate-400 uppercase font-black text-[9px] sticky top-0 z-10 shadow-sm">
                                                         <tr>
                                                           <th className="p-2.5 border-b border-[#1E293B] text-center w-10">
                                                             <input
                                                               type="checkbox"
                                                               checked={allFilteredSelected}
                                                               onChange={handleToggleSelectAll}
                                                               className="accent-sky-500 cursor-pointer w-3.5 h-3.5"
                                                             />
                                                           </th>
                                                           <th className="p-2.5 border-b border-[#1E293B]">Producto</th>
                                                           <th className="p-2.5 border-b border-[#1E293B]">Solución</th>
                                                           <th className="p-2.5 border-b border-[#1E293B]">Venc.</th>
                                                           <th className="p-2.5 border-b border-[#1E293B] text-center">Stock Disp.</th>
                                                           <th className="p-2.5 border-b border-[#1E293B] text-right">Precio</th>
                                                           <th className="p-2.5 border-b border-[#1E293B] text-center w-36">Unidades a Descontar</th>
                                                           <th className="p-2.5 border-b border-[#1E293B] text-center w-28">Saldo Restante</th>
                                                         </tr>
                                                       </thead>
                                                       <tbody className="divide-y divide-[#1E293B]">
                                                         {paginatedItems.map(l => {
                                                           const isFIFO = earliestMap[l.productoId] === l.displayId;
                                                           const isSelected = selectedLotesToLink[l.id] !== undefined;
                                                           const currentUnits = isSelected ? (selectedLotesToLink[l.id] ?? 0) : 0;
                                                           const remainingStock = Math.max(0, Number(l.displayUnidades || 0) - (isSelected ? Number(currentUnits || 0) : 0));

                                                           const toggleSelection = () => {
                                                             setSelectedLotesToLink(prev => {
                                                               const next = { ...prev };
                                                               if (next[l.id] !== undefined) {
                                                                 delete next[l.id];
                                                               } else {
                                                                 next[l.id] = 0;
                                                               }
                                                               return next;
                                                             });
                                                           };

                                                           const updateUnits = (val: number) => {
                                                             const safeVal = Math.max(0, val);
                                                             setSelectedLotesToLink(prev => ({
                                                               ...prev,
                                                               [l.id]: safeVal
                                                             }));
                                                           };

                                                           return (
                                                             <tr 
                                                               key={l.displayId} 
                                                               className={cn(
                                                                 "hover:bg-[#1E293B]/60 transition-colors border-l-4",
                                                                 isSelected ? "bg-sky-500/10 border-l-sky-500" : "border-l-transparent",
                                                                 isFIFO && !isSelected ? "bg-rose-500/5 border-l-rose-500/50" : ""
                                                               )} 
                                                             >
                                                               <td className="p-2.5 text-center">
                                                                 <input
                                                                   type="checkbox"
                                                                   checked={isSelected}
                                                                   onChange={toggleSelection}
                                                                   className="accent-sky-500 cursor-pointer w-3.5 h-3.5"
                                                                 />
                                                               </td>
                                                               <td className="p-2.5 cursor-pointer" onClick={toggleSelection}>
                                                                 <div className={cn("font-black text-xs flex items-center flex-wrap gap-1", isFIFO ? "text-rose-400" : "text-white")}>
                                                                   {l.productoId}
                                                                   {isFIFO && <span className="text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter font-black">Prioridad FIFO</span>}
                                                                   {l.type === 'REP' && (
                                                                     <span className="text-[8px] bg-emerald-500 text-[#050914] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">REP</span>
                                                                   )}
                                                                 </div>
                                                                 <div className="mt-0.5 flex items-center gap-2">
                                                                   <span className="text-[9px] text-slate-500 font-bold uppercase">
                                                                     {l.type === 'ORIGINAL' ? 'Original:' : `Reposición (${l.fechaRep}):`}
                                                                   </span>
                                                                   <span className="text-[9px] text-sky-400 font-mono font-black">{l.displayUnidades} u.</span>
                                                                 </div>
                                                               </td>
                                                               <td className="p-2.5 text-emerald-400 font-mono text-[10px] cursor-pointer" onClick={toggleSelection}>
                                                                 {l.solucionLote || 'S/L'}
                                                               </td>
                                                               <td className="p-2.5 text-slate-300 text-[10px] cursor-pointer" onClick={toggleSelection}>
                                                                 <span className={isFIFO ? "text-rose-300 font-black" : "font-medium"}>{formatDateToDDMMYYYY(l.fechaVencimiento)}</span>
                                                               </td>
                                                               <td className="p-2.5 text-center font-mono font-bold text-sky-400 text-[11px] cursor-pointer" onClick={toggleSelection}>
                                                                 {l.displayUnidades} u.
                                                               </td>
                                                               <td className="p-2.5 text-right text-amber-400 font-mono text-[10px] cursor-pointer" onClick={toggleSelection}>
                                                                 {formatCurrency(Number(l.precioUnitNeto) || 0)}
                                                               </td>
                                                               <td className="p-2.5 text-center">
                                                                 <div className="flex items-center justify-center gap-1.5">
                                                                   <input
                                                                     type="number"
                                                                     min="0"
                                                                     max={l.displayUnidades}
                                                                     value={isSelected ? (currentUnits === 0 ? '' : currentUnits) : ''}
                                                                     placeholder="0"
                                                                     onChange={(e) => {
                                                                       const val = parseInt(e.target.value);
                                                                       if (isNaN(val)) {
                                                                         setSelectedLotesToLink(prev => {
                                                                           const next = { ...prev };
                                                                           delete next[l.id];
                                                                           return next;
                                                                         });
                                                                       } else {
                                                                         updateUnits(val);
                                                                       }
                                                                     }}
                                                                     className={cn(
                                                                       "w-20 bg-[#0D1627] text-white border rounded-lg p-1.5 text-xs font-mono font-bold text-center outline-none transition-colors",
                                                                       isSelected ? "border-sky-500 font-black text-sky-400" : "border-[#1E293B] text-slate-400 focus:border-sky-500"
                                                                     )}
                                                                   />
                                                                   <button
                                                                     type="button"
                                                                     onClick={() => updateUnits(l.displayUnidades)}
                                                                     className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-mono font-black uppercase tracking-tighter"
                                                                     title="Fijar stock máximo disponible"
                                                                   >
                                                                     Máx
                                                                   </button>
                                                                 </div>
                                                               </td>
                                                               <td className="p-2.5 text-center cursor-pointer" onClick={toggleSelection}>
                                                                 <span className={cn(
                                                                   "font-mono font-black text-[11px] px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 transition-all",
                                                                   remainingStock === 0
                                                                     ? "bg-slate-800/80 text-slate-400 border-slate-700"
                                                                     : remainingStock < 5
                                                                     ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                                     : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                                 )}>
                                                                   {remainingStock} u.
                                                                 </span>
                                                               </td>
                                                             </tr>
                                                           );
                                                         })}
                                                         {filteredItems.length === 0 && (
                                                           <tr>
                                                             <td colSpan={8} className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                                                               No se encontraron productos
                                                             </td>
                                                           </tr>
                                                         )}
                                                       </tbody>
                                                     </table>
                                                   </div>

                                                   {/* Pagination Controls */}
                                                   {filteredItems.length > INLINE_ADD_PAGE_SIZE && (
                                                     <div className="flex items-center justify-between px-3 py-2 bg-[#0D1627] rounded-xl border border-[#1E293B] text-[10px] text-slate-400">
                                                       <div>
                                                         Mostrando <span className="text-white font-bold">{((currentInlinePage - 1) * INLINE_ADD_PAGE_SIZE) + 1}</span> - <span className="text-white font-bold">{Math.min(currentInlinePage * INLINE_ADD_PAGE_SIZE, filteredItems.length)}</span> de <span className="text-white font-bold">{filteredItems.length}</span> productos
                                                       </div>
                                                       <div className="flex items-center gap-1.5">
                                                         <button
                                                           type="button"
                                                           disabled={currentInlinePage <= 1}
                                                           onClick={() => setInlineAddPage(prev => Math.max(1, prev - 1))}
                                                           className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                         >
                                                           Anterior
                                                         </button>
                                                         <span className="font-mono font-bold text-slate-300 px-1.5">
                                                           Pág. {currentInlinePage} de {totalInlineAddPages}
                                                         </span>
                                                         <button
                                                           type="button"
                                                           disabled={currentInlinePage >= totalInlineAddPages}
                                                           onClick={() => setInlineAddPage(prev => Math.min(totalInlineAddPages, prev + 1))}
                                                           className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                         >
                                                           Siguiente
                                                         </button>
                                                       </div>
                                                     </div>
                                                   )}

                                                   {/* Footer Actions */}
                                                   <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#1E293B]">
                                                     <div className="text-[11px] font-bold text-slate-400">
                                                       {selectedCount > 0 ? (
                                                         <span className="text-sky-400 font-black">
                                                           {selectedCount} producto(s) listo(s) para agregar a la planilla
                                                         </span>
                                                       ) : (
                                                         <span>Marque los productos que desea incluir en la planilla del mes</span>
                                                       )}
                                                     </div>
                                                     <div className="flex justify-end gap-2">
                                                       <button
                                                         type="button"
                                                         onClick={() => {
                                                           setInlineAddOpen(false);
                                                           setSelectedLotesToLink({});
                                                         }}
                                                         className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                                       >
                                                         Cancelar
                                                       </button>
                                                       <button
                                                         type="button"
                                                         disabled={selectedCount === 0}
                                                         onClick={() => handleAddMultipleProductsToMonthTemplate(selectedLotesToLink)}
                                                         className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                                                       >
                                                         <Check size={14} strokeWidth={3} />
                                                         Agregar {selectedCount > 0 ? `(${selectedCount})` : ''} a Planilla
                                                       </button>
                                                     </div>
                                                   </div>
                                                 </div>
                                               );
                                            })()}
                                          </div>
                                         )}
                                     </td>
                                   </tr>
                                 </tbody>
                              </table>
                            </div>

                            <div className="p-6 border-t border-[#1E293B]/40 bg-[#0D1627] flex justify-between items-center flex-wrap gap-4">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                                <Info size={14} className="text-sky-400" />
                                Las ventas modificadas actualizarán el stock remanente para los meses posteriores.
                              </div>
                              <button
                                type="button"
                                onClick={handleSaveAllMovements}
                                disabled={savingAllMovements || activeLotesForMonth.length === 0}
                                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-55 text-[#050914] font-black px-8 py-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-sky-500/25 font-sans"
                              >
                                {savingAllMovements ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                                Guardar Planilla de Ventas ({formatMonthName(selectedMonth)})
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-16 bg-[#111A2E] border border-dashed border-[#1E293B] rounded-3xl text-center">
                      <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <h4 className="text-slate-300 font-bold">No hay lotes en consignación registrados</h4>
                      <p className="text-slate-500 text-xs mt-1">Por favor registre un despacho o entrega en la segunda pestaña para comenzar.</p>
                    </div>
                  )
                ) : (
                  <div className="bg-[#111A2E]/50 border border-dashed border-[#1E293B] p-12 rounded-2xl text-center">
                    <Target className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h4 className="text-slate-300 font-bold">Sin cliente seleccionado</h4>
                    <p className="text-slate-500 text-xs mt-1">Seleccione un cliente para ver y declarar sus movimientos mensuales.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: REGISTRO DE VENTAS */}
            {activeTab === 'registro_ventas' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#111A2E] p-6 rounded-2xl border border-[#1E293B] shadow-lg max-w-md">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Filtrar por Cliente</label>
                  <ClientAutocomplete 
                    clientes={clientes}
                    value={registroVentasCliente}
                    onChange={setRegistroVentasCliente}
                    placeholder="Escriba para buscar cliente..."
                  />
                  {registroVentasCliente && (
                    <button
                      type="button"
                      onClick={() => {
                        const clientObj = clientes.find(c => c.id === registroVentasCliente);
                        if (clientObj) {
                          setEditingClient(clientObj);
                          setEditClientName(clientObj.name || '');
                          setEditClientRut(clientObj.rut || '');
                          setShowEditClientModal(true);
                        }
                      }}
                      className="px-3 py-2 bg-[#050914] text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-[#050914] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md mt-3 w-full justify-center"
                      title="Editar Nombre de este Cliente"
                    >
                      <Edit size={14} />
                      Editar Nombre del Cliente
                    </button>
                  )}
                </div>

                {registroVentasCliente ? (
                  (() => {
                    const clientLotes = todosLosLotes.filter(l => l.clienteId === registroVentasCliente);
                    
                    // Compute current stock inventory taking into account all saved movements up to latest month
                    let maxMonth = new Date().toISOString().substring(0, 7);
                    clientLotes.forEach(lote => {
                      if (lote.movimientos) {
                        Object.keys(lote.movimientos).forEach(m => {
                          if (m > maxMonth) maxMonth = m;
                        });
                      }
                    });

                    const inventoryStatus = clientLotes.map(lote => {
                      const traj = getLoteTrajectoryUpToMonth(lote, maxMonth, undefined);
                      return { lote, traj };
                    }).filter(item => item.traj)
                    .sort((a, b) => {
                      const keyA = `${a.lote.productoId || ''} ${a.lote.solucionLote || ''}`.toLowerCase();
                      const keyB = `${b.lote.productoId || ''} ${b.lote.solucionLote || ''}`.toLowerCase();
                      return keyA.localeCompare(keyB);
                    });

                    const activeItemsAll = inventoryStatus.filter(item => (item.traj?.frascosRestantes || 0) > 0);
                    const inactiveItemsAll = inventoryStatus.filter(item => (item.traj?.frascosRestantes || 0) <= 0);

                    const matchesStockSearch = ({ lote }: { lote: any }) => {
                      if (!stockSearchTerm.trim()) return true;
                      const term = stockSearchTerm.toLowerCase().trim();
                      const prod = (lote.productoId || '').toLowerCase();
                      const sol = (lote.solucionLote || '').toLowerCase();
                      const venc = formatDateToDDMMYYYY(lote.fechaVencimiento).toLowerCase();
                      return prod.includes(term) || sol.includes(term) || venc.includes(term);
                    };

                    const activeItems = activeItemsAll.filter(matchesStockSearch);
                    const inactiveItems = inactiveItemsAll.filter(matchesStockSearch);

                    const devolucionesList = clientLotes.flatMap((lote: any) => {
                      const devs = lote.devoluciones || [];
                      return devs.map((d: any) => ({
                        ...d,
                        loteId: lote.id,
                        productoId: lote.productoId,
                        solucionLote: lote.solucionLote,
                        fechaVencimiento: lote.fechaVencimiento,
                        precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                        unidadesInicialesLote: lote.unidadesIniciales,
                        loteActivo: lote.activo,
                        loteObj: lote
                      }));
                    }).filter((d: any) => {
                      if (!stockSearchTerm.trim()) return true;
                      const term = stockSearchTerm.toLowerCase().trim();
                      const prod = (d.productoId || '').toLowerCase();
                      const sol = (d.solucionLote || '').toLowerCase();
                      const mot = (d.motivo || '').toLowerCase();
                      const fecha = (d.fecha || '').toLowerCase();
                      return prod.includes(term) || sol.includes(term) || mot.includes(term) || fecha.includes(term);
                    }).sort((a: any, b: any) => String(b.fecha || '').localeCompare(String(a.fecha || '')));

                    const totalDevolvedUnits = devolucionesList.reduce((sum: number, d: any) => sum + (Number(d.unidades) || 0), 0);
                    const totalDevolvedAmount = devolucionesList.reduce((sum: number, d: any) => sum + ((Number(d.unidades) || 0) * (Number(d.precioUnitNeto) || 0)), 0);

                    // Summarize saved month templates
                    // Let's gather all months that have any saved movimientos
                    const monthSummaryMap: Record<string, { unidadesVendidas: number, montoVendido: number, count: number }> = {};
                    savedPlanillaMonths.forEach(m => {
                      monthSummaryMap[m] = { unidadesVendidas: 0, montoVendido: 0, count: 0 };
                    });
                    clientLotes.forEach(lote => {
                      if (lote.movimientos) {
                        Object.keys(lote.movimientos).forEach(m => {
                          const mov = lote.movimientos[m];
                          const sales = Number(mov?.unidadesVendidas || 0);
                          if (mov && !mov.hidden && sales > 0) {
                            if (!monthSummaryMap[m]) {
                              monthSummaryMap[m] = { unidadesVendidas: 0, montoVendido: 0, count: 0 };
                            }
                            monthSummaryMap[m].unidadesVendidas += sales;
                            monthSummaryMap[m].montoVendido += sales * (Number(lote.precioUnitNeto) || 0);
                            monthSummaryMap[m].count += 1;
                          }
                        });
                      }
                    });

                    const savedMonthsList = Object.entries(monthSummaryMap).map(([month, data]) => ({
                      month,
                      ...data,
                      meta: savedPlanillasMeta[month] || {}
                    })).sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')));

                    const totalActiveStockUnits = activeItems.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);
                    const totalInactiveStockUnits = inactiveItems.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);
                    const totalAllStockUnits = inventoryStatus.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);

                    // Excel Export Handlers for Stock
                    const handleExportActiveStockExcel = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const data = activeItems.map(({ lote, traj }) => ({
                        'Producto': lote.productoId,
                        'Solución': lote.solucionLote || 'S/S',
                        'Precio Unitario Neto ($)': lote.precioUnitNeto || 0,
                        'Fecha Vencimiento': formatDateToDDMMYYYY(lote.fechaVencimiento),
                        'Stock Disponible (Unidades)': traj?.frascosRestantes || 0,
                        'Valor Total Stock ($)': (traj?.frascosRestantes || 0) * (lote.precioUnitNeto || 0)
                      }));

                      const totalVal = activeItems.reduce((sum, { lote, traj }) => sum + ((traj?.frascosRestantes || 0) * (lote.precioUnitNeto || 0)), 0);
                      data.push({
                        'Producto': 'TOTAL STOCK ACTIVO',
                        'Solución': '',
                        'Precio Unitario Neto ($)': 0,
                        'Fecha Vencimiento': '',
                        'Stock Disponible (Unidades)': totalActiveStockUnits,
                        'Valor Total Stock ($)': totalVal
                      });

                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Stock Activo");
                      XLSX.writeFile(wb, `Stock_Activo_${clientName.replace(/\s+/g, '_')}.xlsx`);
                    };

                    const handleExportAllStockExcel = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const data = inventoryStatus.map(({ lote, traj }) => ({
                        'Producto': lote.productoId,
                        'Solución': lote.solucionLote || 'S/S',
                        'Precio Unitario Neto ($)': lote.precioUnitNeto || 0,
                        'Fecha Vencimiento': formatDateToDDMMYYYY(lote.fechaVencimiento),
                        'Stock Disponible (Unidades)': traj?.frascosRestantes || 0,
                        'Estado': (traj?.frascosRestantes || 0) > 0 ? 'Activo' : 'Agotado / Sin Stock',
                        'Valor Total Stock ($)': (traj?.frascosRestantes || 0) * (lote.precioUnitNeto || 0)
                      }));

                      const totalVal = inventoryStatus.reduce((sum, { lote, traj }) => sum + ((traj?.frascosRestantes || 0) * (lote.precioUnitNeto || 0)), 0);
                      data.push({
                        'Producto': 'TOTAL CONSIGNACIÓN',
                        'Solución': '',
                        'Precio Unitario Neto ($)': 0,
                        'Fecha Vencimiento': '',
                        'Stock Disponible (Unidades)': totalAllStockUnits,
                        'Estado': '',
                        'Valor Total Stock ($)': totalVal
                      });

                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Stock Consignacion");
                      XLSX.writeFile(wb, `Stock_Consignacion_${clientName.replace(/\s+/g, '_')}.xlsx`);
                    };

                    // Function to export the remaining stock report as PDF
                    const handleExportStockPDF = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const doc = new jsPDF({ orientation: 'p' });
                      
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(14);
                      doc.setTextColor(30, 41, 59);
                      doc.text('REPORTE DE STOCK RESTANTE - CONSIGNACIÓN', 14, 18);
                      
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(100, 116, 139);
                      doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
                      doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 30);
                      
                      const totalStock = inventoryStatus.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);
                      const headers = ['PRODUCTO', 'SOLUCIÓN', 'P. UNITARIO', 'FECHA VENCIMIENTO', 'STOCK DISPONIBLE'];
                      const data = inventoryStatus.map(({ lote, traj }) => {
                        const venc = formatDateToDDMMYYYY(lote.fechaVencimiento);
                        return [
                          lote.productoId,
                          lote.solucionLote || 'S/S',
                          formatCurrency(lote.precioUnitNeto || 0),
                          venc,
                          String(traj?.frascosRestantes || 0)
                        ];
                      });
                      
                      autoTable(doc, {
                        startY: 36,
                        head: [headers],
                        body: data,
                        foot: [['', '', '', 'TOTAL', String(totalStock)]],
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
                              doc.setDrawColor(226, 232, 240);
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });
                      
                      const finalY = (doc as any).lastAutoTable.finalY + 12;
                      doc.setFont('helvetica', 'italic');
                      doc.setFontSize(8);
                      doc.setTextColor(148, 163, 184);
                      doc.text('Generado desde el Módulo de Consignación S&E', 14, finalY);
                      
                      doc.save(`Reporte_Stock_Restante_${clientName.replace(/\s+/g, '_')}.pdf`);
                    };

                    const handleExportActiveStockPDF = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const doc = new jsPDF({ orientation: 'p' });
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(14);
                      doc.setTextColor(30, 41, 59);
                      doc.text('REPORTE DE STOCK ACTIVO - CONSIGNACIÓN', 14, 18);
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(100, 116, 139);
                      doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
                      doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 30);

                      const totalStock = activeItems.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);
                      const headers = ['PRODUCTO', 'SOLUCIÓN', 'P. UNITARIO', 'FECHA VENCIMIENTO', 'STOCK DISPONIBLE'];
                      const data = activeItems.map(({ lote, traj }) => [
                        lote.productoId,
                        lote.solucionLote || 'S/S',
                        formatCurrency(lote.precioUnitNeto || 0),
                        formatDateToDDMMYYYY(lote.fechaVencimiento),
                        String(traj?.frascosRestantes || 0)
                      ]);

                      autoTable(doc, {
                        startY: 36,
                        head: [headers],
                        body: data,
                        foot: [['', '', '', 'TOTAL', String(totalStock)]],
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
                              doc.setDrawColor(226, 232, 240);
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });
                      doc.save(`Stock_Activo_${clientName.replace(/\s+/g, '_')}.pdf`);
                    };

                    const handleExportInactiveStockPDF = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const doc = new jsPDF({ orientation: 'p' });
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(14);
                      doc.setTextColor(30, 41, 59);
                      doc.text('REPORTE DE STOCK INACTIVO / AGOTADO - CONSIGNACIÓN', 14, 18);
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(100, 116, 139);
                      doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
                      doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 30);

                      const totalStock = inactiveItems.reduce((sum, { traj }) => sum + (traj?.frascosRestantes || 0), 0);
                      const headers = ['PRODUCTO', 'SOLUCIÓN', 'P. UNITARIO', 'FECHA VENCIMIENTO', 'ESTADO'];
                      const data = inactiveItems.map(({ lote, traj }) => [
                        lote.productoId,
                        lote.solucionLote || 'S/S',
                        formatCurrency(lote.precioUnitNeto || 0),
                        formatDateToDDMMYYYY(lote.fechaVencimiento),
                        'Agotado'
                      ]);

                      autoTable(doc, {
                        startY: 36,
                        head: [headers],
                        body: data,
                        foot: [['', '', '', 'TOTAL', String(totalStock)]],
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
                              doc.setDrawColor(226, 232, 240);
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });
                      doc.save(`Stock_Inactivo_${clientName.replace(/\s+/g, '_')}.pdf`);
                    };

                    // Function to download a quote-style sales report in PDF
                    const handleDownloadQuoteReport = (month: string, items: any[], customPeriodLabel?: string) => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      handleDownloadQuoteReportGlobal(month, items, clientName, customPeriodLabel);
                    };

                    const duplicateCount = (() => {
                      const keys = new Set<string>();
                      let dupes = 0;
                      clientLotes.forEach(l => {
                        const k = `${(l.productoId || '').toUpperCase().trim()}|${(l.solucionLote || 'S/L').toUpperCase().trim()}|${parseDateString(l.fechaVencimiento)}`;
                        if (keys.has(k)) dupes++;
                        else keys.add(k);
                      });
                      return dupes;
                    })();

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* 1. Inventory remaining stock list with export capabilities */}
                        <div className="bg-[#111A2E] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
                          <div className="p-5 border-b border-[#1E293B]/40 flex flex-wrap justify-between items-center gap-3 bg-[#15233C]/10">
                            <div className="flex items-center gap-2">
                              <Package className="text-emerald-400" size={18} />
                              <div>
                                <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                                  Stock de Productos en Consignación
                                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-black font-mono tracking-normal">
                                    {totalActiveStockUnits} u. disponibles
                                  </span>
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {duplicateCount > 0 && (
                                <button
                                  type="button"
                                  disabled={consolidating}
                                  onClick={() => handleConsolidateDuplicates(registroVentasCliente)}
                                  title="Unificar lotes duplicados con el mismo producto, solución y fecha de vencimiento"
                                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
                                >
                                  {consolidating ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                  Unificar Duplicados ({duplicateCount})
                                </button>
                              )}
                              {activeItems.length > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleExportActiveStockExcel}
                                    title="Descargar stock activo en Excel (.xlsx)"
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                                  >
                                    <Download size={11} />
                                    Activos (Excel)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleExportActiveStockPDF}
                                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                                  >
                                    <Download size={11} />
                                    Activos (PDF)
                                  </button>
                                </>
                              )}
                              {inactiveItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleExportInactiveStockPDF}
                                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                                >
                                  <Download size={11} />
                                  Inactivos (PDF)
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleExportAllStockExcel}
                                title="Descargar todo el inventario en Excel (.xlsx)"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                              >
                                <Download size={11} />
                                Todo (Excel)
                              </button>
                              <button
                                type="button"
                                onClick={handleExportStockPDF}
                                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-[#050914] font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                              >
                                <Download size={11} />
                                Todo (PDF)
                              </button>
                              <button
                                type="button"
                                onClick={() => openReponerModal(registroVentasCliente)}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-[#050914] font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                              >
                                <Plus size={13} />
                                Ingresar Nuevo Stock
                              </button>
                            </div>
                          </div>

                          {/* Buscador de Stock */}
                          <div className="p-3 bg-[#0B1220] border-b border-[#1E293B] flex items-center justify-between gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[220px]">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={stockSearchTerm}
                                onChange={(e) => setStockSearchTerm(e.target.value)}
                                placeholder="Buscar producto, solución, vencimiento..."
                                className="w-full bg-[#050914] text-xs text-slate-200 placeholder-slate-500 pl-9 pr-8 py-2 rounded-xl border border-[#1E293B] focus:border-amber-500/50 outline-none transition-all font-medium"
                              />
                              {stockSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setStockSearchTerm('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-[#1E293B]"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {stockSearchTerm ? `Filtrando por "${stockSearchTerm}"` : `Mostrando lotes ${registroVentasStockTab === 'activos' ? 'con stock activo' : 'sin stock'}`}
                            </div>
                          </div>

                          {/* Activos / Inactivos Tab Switcher */}
                          <div className="p-3 bg-[#080E1A] border-b border-[#1E293B] flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setRegistroVentasStockTab('activos')}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  registroVentasStockTab === 'activos'
                                    ? "bg-emerald-500 text-[#050914] shadow-lg shadow-emerald-500/20"
                                    : "bg-[#050914] text-slate-400 hover:text-white border border-[#1E293B]"
                                )}
                              >
                                🟢 Activos ({activeItems.length} lotes | {totalActiveStockUnits} u.)
                              </button>
                              <button
                                type="button"
                                onClick={() => setRegistroVentasStockTab('inactivos')}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  registroVentasStockTab === 'inactivos'
                                    ? "bg-slate-700 text-white shadow-lg shadow-slate-700/20"
                                    : "bg-[#050914] text-slate-400 hover:text-white border border-[#1E293B]"
                                )}
                              >
                                ⚪ Inactivos / Rebajados ({inactiveItems.length} lotes | {devolucionesList.length} rebajas)
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {registroVentasStockTab === 'activos' 
                                ? 'Mostrando lotes con stock activo (> 0)' 
                                : 'Mostrando lotes sin stock y registro histórico de productos rebajados/devueltos'}
                            </div>
                          </div>

                          {/* Subtabs when in Inactivos */}
                          {registroVentasStockTab === 'inactivos' && (
                            <div className="p-2.5 bg-[#0D1627]/90 border-b border-[#1E293B] flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('lotes')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'lotes'
                                      ? "bg-slate-600 text-white shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <Package size={13} />
                                  Lotes Agotados ({inactiveItems.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('rebajas')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'rebajas'
                                      ? "bg-amber-500 text-[#050914] font-black shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <RotateCcw size={13} />
                                  Historial de Rebajas / Devoluciones ({devolucionesList.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInactivosSubTab('todo')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                    inactivosSubTab === 'todo'
                                      ? "bg-sky-500 text-[#050914] font-black shadow-sm"
                                      : "bg-[#050914] text-slate-400 hover:text-slate-200 border border-[#1E293B]"
                                  )}
                                >
                                  <ListFilter size={13} />
                                  Vista Completa
                                </button>
                              </div>
                              <div className="text-[10px] text-amber-400/90 font-mono font-bold">
                                Total Rebajado: <span className="text-amber-300 font-black">{totalDevolvedUnits} u.</span> ({formatCurrency(totalDevolvedAmount)})
                              </div>
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            {/* IF INACTIVOS SUBTAB IS REBAJAS ONLY */}
                            {registroVentasStockTab === 'inactivos' && inactivosSubTab === 'rebajas' ? (
                              <table className="w-full text-left">
                                <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                  <tr>
                                    <th className="p-4 pl-6">Producto / Lote</th>
                                    <th className="p-4 text-center">F. Rebaja</th>
                                    <th className="p-4 text-center">Unidades Rebajadas</th>
                                    <th className="p-4 text-center">Valor Unitario</th>
                                    <th className="p-4 text-center">Total Rebajado</th>
                                    <th className="p-4">Motivo / Justificación</th>
                                    <th className="p-4 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                  {devolucionesList.length > 0 ? (
                                    devolucionesList.map((d: any) => {
                                      const totalMonto = (Number(d.unidades) || 0) * (Number(d.precioUnitNeto) || 0);
                                      return (
                                        <tr key={d.id} className="hover:bg-[#1E293B]/20 transition-colors">
                                          <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-200 flex items-center gap-2">
                                              {d.productoId}
                                              <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                                Rebaja
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                              <span className="text-emerald-400">Solución: {d.solucionLote || 'S/L'}</span>
                                              <span>•</span>
                                              <span>Venc: {formatDateToDDMMYYYY(d.fechaVencimiento)}</span>
                                            </div>
                                          </td>
                                          <td className="p-4 text-center text-slate-300 font-semibold font-mono text-xs">
                                            {formatDateToDDMMYYYY(d.fecha)}
                                          </td>
                                          <td className="p-4 text-center">
                                            <span className="font-black px-2.5 py-1 rounded-full font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                                              -{d.unidades} u.
                                            </span>
                                          </td>
                                          <td className="p-4 text-center font-mono font-bold text-slate-300">
                                            {formatCurrency(d.precioUnitNeto || 0)}
                                          </td>
                                          <td className="p-4 text-center font-mono font-black text-rose-400">
                                            -{formatCurrency(totalMonto)}
                                          </td>
                                          <td className="p-4 text-slate-300 text-xs">
                                            <span className="bg-[#050914] px-2.5 py-1 rounded-lg border border-[#1E293B] text-[11px] text-slate-300 block w-fit">
                                              {d.motivo || 'Devolución / Ajuste de stock'}
                                            </span>
                                          </td>
                                          <td className="p-4 text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteDevolucion(d.loteId, d.id)}
                                              title="Revertir / Eliminar esta rebaja"
                                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                                        No se han registrado rebajas ni devoluciones de productos para este cliente.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              /* STANDARD TABLE FOR ACTIVOS, INACTIVOS (LOTES) OR TODO */
                              <>
                                <table className="w-full text-left">
                                  <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                    <tr>
                                      <th className="p-4 pl-6">Producto</th>
                                      <th className="p-4 text-center">F. Venc.</th>
                                      <th className="p-4 text-center">Valor Unitario</th>
                                      <th className="p-4 text-center">
                                        Stock Disponible ({registroVentasStockTab === 'activos' ? `${totalActiveStockUnits} u.` : '0 u.'})
                                      </th>
                                      <th className="p-4 text-center">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1E293B]/10 text-xs">
                                    {registroVentasStockTab === 'activos' ? (
                                      activeItems.length > 0 ? (
                                        activeItems.map(({ lote, traj }) => (
                                          <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors">
                                            <td className="p-4 pl-6">
                                              <div className="font-bold text-slate-200">{lote.productoId}</div>
                                              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Solución: {lote.solucionLote || 'S/S'}</span>
                                            </td>
                                            <td className="p-4 text-center text-slate-400 font-semibold font-mono">{formatDateToDDMMYYYY(lote.fechaVencimiento)}</td>
                                            <td className="p-4 text-center font-mono font-bold text-amber-400">
                                              {formatCurrency(lote.precioUnitNeto || 0)}
                                            </td>
                                            <td className="p-4 text-center">
                                              <span className="font-black px-2.5 py-1 rounded-full font-mono text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/20 block w-fit mx-auto">
                                                {traj?.frascosRestantes || 0} u.
                                              </span>
                                              {(() => {
                                                const devUnits = (lote.devoluciones || []).reduce((sum: number, d: any) => sum + (Number(d.unidades) || 0), 0);
                                                if (devUnits > 0) {
                                                  return (
                                                    <span className="text-[10px] text-amber-400 font-semibold font-mono mt-1 block">
                                                      Rebajado: -{devUnits} u.
                                                    </span>
                                                  );
                                                }
                                                return null;
                                              })()}
                                            </td>
                                            <td className="p-4 text-center">
                                              <div className="flex items-center justify-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => openDevolucionModal(lote)}
                                                  title="Registrar devolución o rebaja de stock"
                                                  className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <RotateCcw size={12} /> Rebaja
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openEditLoteModal(lote)}
                                                  title="Editar producto"
                                                  className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-[#050914] border border-sky-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Edit2 size={12} /> Editar
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openDeleteLoteModal(lote)}
                                                  title="Eliminar producto"
                                                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Trash2 size={12} /> Eliminar
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                            No hay productos con stock activo para este cliente.
                                          </td>
                                        </tr>
                                      )
                                    ) : (
                                      inactiveItems.length > 0 ? (
                                        inactiveItems.map(({ lote, traj }) => {
                                          const devUnits = (lote.devoluciones || []).reduce((sum: number, d: any) => sum + (Number(d.unidades) || 0), 0);
                                          return (
                                            <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors opacity-90">
                                              <td className="p-4 pl-6">
                                                <div className="font-bold text-slate-400 line-through">{lote.productoId}</div>
                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Solución: {lote.solucionLote || 'S/S'}</span>
                                              </td>
                                              <td className="p-4 text-center text-slate-500 font-semibold font-mono">{formatDateToDDMMYYYY(lote.fechaVencimiento)}</td>
                                              <td className="p-4 text-center font-mono font-bold text-amber-400/70">
                                                {formatCurrency(lote.precioUnitNeto || 0)}
                                              </td>
                                              <td className="p-4 text-center">
                                                <span className="font-black px-2.5 py-1 rounded-full font-mono text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                  0 u. (Agotado)
                                                </span>
                                                {devUnits > 0 && (
                                                  <span className="text-[10px] text-amber-400 font-semibold font-mono mt-1 block">
                                                    Rebajado por dev.: -{devUnits} u.
                                                  </span>
                                                )}
                                              </td>
                                              <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => openDevolucionModal(lote)}
                                                    title="Registrar devolución o rebaja de stock"
                                                    className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <RotateCcw size={12} /> Rebaja
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => openEditLoteModal(lote)}
                                                    title="Editar producto"
                                                    className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-[#050914] border border-sky-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <Edit2 size={12} /> Editar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => openDeleteLoteModal(lote)}
                                                    title="Eliminar producto"
                                                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <Trash2 size={12} /> Eliminar
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                            No hay productos inactivos o sin stock para este cliente.
                                          </td>
                                        </tr>
                                      )
                                    )}
                                    {inventoryStatus.length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                                          Este cliente no posee ningún producto registrado en consignación.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>

                                {/* IF INACTIVOS SUBTAB IS TODO, ALSO RENDER THE REBAJADOS TABLE BELOW */}
                                {registroVentasStockTab === 'inactivos' && inactivosSubTab === 'todo' && devolucionesList.length > 0 && (
                                  <div className="mt-6 border-t border-[#1E293B] pt-4">
                                    <div className="px-4 py-2 flex items-center justify-between bg-[#080E1A] rounded-xl mb-3 border border-[#1E293B]">
                                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                                        <RotateCcw size={14} />
                                        Historial Detallado de Rebajas y Devoluciones ({devolucionesList.length})
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono font-bold">
                                        Total Rebajado: {totalDevolvedUnits} u. ({formatCurrency(totalDevolvedAmount)})
                                      </div>
                                    </div>
                                    <table className="w-full text-left">
                                      <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                        <tr>
                                          <th className="p-3 pl-6">Producto / Lote</th>
                                          <th className="p-3 text-center">F. Rebaja</th>
                                          <th className="p-3 text-center">Unidades Rebajadas</th>
                                          <th className="p-3 text-center">Valor Unitario</th>
                                          <th className="p-3 text-center">Total</th>
                                          <th className="p-3">Motivo</th>
                                          <th className="p-3 text-center">Acción</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                        {devolucionesList.map((d: any) => {
                                          const totalMonto = (Number(d.unidades) || 0) * (Number(d.precioUnitNeto) || 0);
                                          return (
                                            <tr key={d.id} className="hover:bg-[#1E293B]/20 transition-colors">
                                              <td className="p-3 pl-6">
                                                <div className="font-bold text-slate-200 flex items-center gap-2">
                                                  {d.productoId}
                                                  <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded font-mono font-bold uppercase">
                                                    Rebaja
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                                  <span className="text-emerald-400">Solución: {d.solucionLote || 'S/L'}</span>
                                                  <span>•</span>
                                                  <span>Venc: {formatDateToDDMMYYYY(d.fechaVencimiento)}</span>
                                                </div>
                                              </td>
                                              <td className="p-3 text-center text-slate-300 font-semibold font-mono text-xs">
                                                {formatDateToDDMMYYYY(d.fecha)}
                                              </td>
                                              <td className="p-3 text-center">
                                                <span className="font-black px-2 py-0.5 rounded-full font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                                                  -{d.unidades} u.
                                                </span>
                                              </td>
                                              <td className="p-3 text-center font-mono font-bold text-slate-300">
                                                {formatCurrency(d.precioUnitNeto || 0)}
                                              </td>
                                              <td className="p-3 text-center font-mono font-black text-rose-400">
                                                -{formatCurrency(totalMonto)}
                                              </td>
                                              <td className="p-3 text-slate-300 text-xs">
                                                <span className="bg-[#050914] px-2 py-0.5 rounded-lg border border-[#1E293B] text-[10px] text-slate-300 block w-fit">
                                                  {d.motivo || 'Devolución / Ajuste de stock'}
                                                </span>
                                              </td>
                                              <td className="p-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteDevolucion(d.loteId, d.id)}
                                                  title="Revertir / Eliminar esta rebaja"
                                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* 2. List of Saved Monthly Templates */}
                        <div className="bg-[#111A2E] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
                          <div className="p-5 border-b border-[#1E293B]/40 bg-[#15233C]/10">
                            <div className="flex items-center gap-2">
                              <FileText className="text-sky-400" size={18} />
                              <div>
                                <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                                  Historial de Planillas Guardadas
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Haga clic en un mes para ver el detalle y descargar cotización.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="divide-y divide-[#1E293B]/20">
                            {savedMonthsList.length > 0 ? (
                              savedMonthsList.map((m) => {
                                const isExpanded = expandedHistory[m.month];
                                
                                // Get details of products sold in this saved month
                                const itemsInMonth = clientLotes.map(lote => {
                                  const mov = lote.movimientos?.[m.month];
                                  const sales = Number(mov?.unidadesVendidas || 0);
                                  if (mov && !mov.hidden && sales > 0) {
                                    return {
                                      loteId: lote.id,
                                      productoId: lote.productoId,
                                      solucionLote: lote.solucionLote,
                                      fechaVencimiento: lote.fechaVencimiento,
                                      unidadesVendidas: sales,
                                      precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                                      montoVendido: sales * (Number(lote.precioUnitNeto) || 0)
                                    };
                                  }
                                  return null;
                                }).filter(Boolean) as any[];

                                return (
                                  <div key={m.month} className="transition-colors hover:bg-slate-800/10">
                                    {/* Month Header Clickable Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedHistory(prev => ({ ...prev, [m.month]: !prev[m.month] }))}
                                      className="w-full text-left p-4 flex items-center justify-between gap-4 font-bold text-slate-200 hover:bg-[#1E293B]/20 transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <ChevronDown 
                                          size={16} 
                                          className={cn(
                                            "text-sky-400 transition-transform duration-200", 
                                            isExpanded && "transform rotate-180"
                                          )} 
                                        />
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-black text-slate-100">
                                            {m.meta?.customPeriodLabel || formatMonthName(m.month)}
                                          </span>
                                          {((m.meta?.numMonths && m.meta.numMonths > 1) || m.meta?.isBimonthly) && (
                                            <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-500/30">
                                              Ventas {m.meta?.numMonths || 2} Meses
                                            </span>
                                          )}
                                        </div>
                                          <span className="text-[10px] text-slate-400 font-semibold">{itemsInMonth.length} soluciones declaradas</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-6">
                                        {(() => {
                                          const monthDevs = clientLotes.flatMap(lote => {
                                            const devs = (lote.devoluciones || []).filter((d: any) => d.fecha && d.fecha.substring(0, 7) === m.month);
                                            return devs.map((d: any) => ({
                                              ...d,
                                              loteId: lote.id,
                                              productoId: lote.productoId,
                                              solucionLote: lote.solucionLote,
                                              precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                                              montoTotal: (Number(d.unidades) || 0) * (Number(lote.precioUnitNeto) || 0)
                                            }));
                                          });
                                          const devUnits = monthDevs.reduce((sum, d) => sum + Number(d.unidades), 0);
                                          const devMonto = monthDevs.reduce((sum, d) => sum + d.montoTotal, 0);

                                          return (
                                            <>
                                              {devUnits > 0 && (
                                                <div className="text-right bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                                                  <div className="text-xs font-black font-mono text-amber-400">-{devUnits} u.</div>
                                                  <div className="text-[9px] text-amber-500 font-bold">Devuelto ({formatCurrency(devMonto)})</div>
                                                </div>
                                              )}
                                              <div className="text-right">
                                                <div className="text-xs font-black font-mono text-slate-300">{m.unidadesVendidas} u.</div>
                                                <div className="text-[10px] text-slate-500 font-bold font-mono">Vendidas</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-xs font-black font-mono text-emerald-400">{formatCurrency(m.montoVendido)}</div>
                                                <div className="text-[10px] text-slate-500 font-bold">Monto Venta</div>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </button>

                                    {/* Expanded Detail Panel */}
                                    {isExpanded && (
                                      <div className="p-4 bg-[#0A1120]/40 border-t border-sky-500/10 space-y-4 animate-in fade-in duration-200">
                                        {/* Devoluciones section for this month */}
                                        {(() => {
                                          const monthDevs = clientLotes.flatMap(lote => {
                                            const devs = (lote.devoluciones || []).filter((d: any) => d.fecha && d.fecha.substring(0, 7) === m.month);
                                            return devs.map((d: any) => ({
                                              ...d,
                                              loteId: lote.id,
                                              productoId: lote.productoId,
                                              solucionLote: lote.solucionLote,
                                              precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                                              montoTotal: (Number(d.unidades) || 0) * (Number(lote.precioUnitNeto) || 0)
                                            }));
                                          });

                                          return (
                                            <div className="bg-[#0D1627] rounded-2xl border border-amber-500/30 p-4 space-y-3">
                                              <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                                                  <RotateCcw size={15} />
                                                  Devoluciones / Rebajas de Stock en {formatMonthName(m.month)}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => openDevolucionModal(undefined, m.month)}
                                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-[#050914] border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  + Registrar Devolución en {formatMonthName(m.month)}
                                                </button>
                                              </div>

                                              {monthDevs.length > 0 ? (
                                                <div className="divide-y divide-[#1E293B]">
                                                  {monthDevs.map((d) => (
                                                    <div key={d.id} className="py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap">
                                                      <div>
                                                        <span className="font-black text-white uppercase">{d.productoId}</span>
                                                        <span className="text-slate-400 text-[11px] ml-2">({d.solucionLote || 'S/S'})</span>
                                                        <p className="text-[10px] text-slate-500 italic mt-0.5">
                                                          {d.motivo || 'Sin observaciones'} - Fecha: {formatDateToDDMMYYYY(d.fecha)}
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                          <span className="font-mono font-black text-amber-400">-{d.unidades} u.</span>
                                                          <div className="text-[10px] font-mono text-slate-400">{formatCurrency(d.montoTotal)}</div>
                                                        </div>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleDeleteDevolucion(d.loteId, d.id)}
                                                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                          title="Eliminar esta devolución"
                                                        >
                                                          <Trash2 size={13} />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-[11px] text-slate-500 italic">No se registraron devoluciones en {formatMonthName(m.month)}.</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Products Table list for this month */}
                                        <div className="bg-[#0D1627]/90 rounded-2xl border border-[#1E293B]/60 overflow-hidden">
                                          <table className="w-full text-left text-[11px]">
                                            <thead className="bg-[#050914] text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                              <tr>
                                                <th className="p-3 pl-4">Producto / Solución</th>
                                                <th className="p-3 text-center">Cant.</th>
                                                <th className="p-3 text-center">P. Unit.</th>
                                                <th className="p-3 text-right pr-4">Total</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#1E293B]/20">
                                              {itemsInMonth.map((item, idx) => (
                                                <tr key={idx} className="text-slate-300 hover:bg-slate-800/10">
                                                  <td className="p-3 pl-4">
                                                    <div className="font-bold text-slate-100">{item.productoId}</div>
                                                    <div className="flex flex-wrap gap-x-2 text-[9px] text-slate-500 font-mono">
                                                      <span>Solución: {item.solucionLote || 'S/S'}</span>
                                                      {item.fechaVencimiento && (
                                                        <span className="text-rose-400 font-bold">| F. Venc: {formatDateToDDMMYYYY(item.fechaVencimiento)}</span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="p-3 text-center font-black font-mono text-slate-300">
                                                    {item.unidadesVendidas} u.
                                                  </td>
                                                  <td className="p-3 text-center font-semibold font-mono text-slate-400">
                                                    {formatCurrency(item.precioUnitNeto)}
                                                  </td>
                                                  <td className="p-3 text-right pr-4 font-black font-mono text-emerald-400">
                                                    {formatCurrency(item.montoVendido)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>

                                        <div className="flex justify-end gap-2 pr-1">
                                          <button
                                            type="button"
                                            onClick={() => openEditarPlanillaModal(m.month, itemsInMonth, m.meta)}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#050914] font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                                          >
                                            <Edit3 size={13} />
                                            Editar Planilla / Cotización
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePlanilla(m.month)}
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                                          >
                                            <Trash2 size={13} />
                                            Borrar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadQuoteReport(m.month, itemsInMonth, m.meta?.customPeriodLabel)}
                                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-[#050914] font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                                          >
                                            <Download size={13} />
                                            Descargar Venta (PDF)
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-12 text-center text-slate-500 font-bold text-xs">
                                No se han guardado plantillas de ventas mensuales para este cliente aún.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-[#111A2E]/50 border border-dashed border-[#1E293B] p-12 rounded-2xl text-center max-w-md mx-auto">
                    <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h4 className="text-slate-300 font-bold">Sin cliente seleccionado</h4>
                    <p className="text-slate-500 text-xs mt-1">Seleccione un cliente para ver sus reportes de ventas e inventario disponible.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* EDITOR DE PLANILLA / COTIZACIÓN DE HISTORIAL MODAL */}
      {editarPlanillaModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0D1627] border border-amber-500/40 rounded-3xl p-6 w-full max-w-3xl shadow-2xl shadow-amber-500/10 space-y-5 max-h-[90vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
                  <Edit3 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Editor de Planilla & Cotización de Ventas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Modifique las ventas declaradas, ajuste cantidades y defina el período (ej. ventas de 2 meses).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditarPlanillaModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPlanilla} className="space-y-5">
              {/* 1. CONFIGURACIÓN DEL PERÍODO (SINGLE VS 2 O MÁS MESES) */}
              <div className="bg-[#050914] border border-[#1E293B] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} /> Período de Ventas / Cotización
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Mes base: <strong className="text-white font-mono">{formatMonthName(editarPlanillaForm.month)}</strong>
                  </span>
                </div>

                {/* Multi-month duration selector */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Duración del período acumulado:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { num: 1, label: '1 Mes', badge: 'Mes Único' },
                      { num: 2, label: '2 Meses', badge: 'Bimensual' },
                      { num: 3, label: '3 Meses', badge: 'Trimestral' },
                      { num: 4, label: '4 Meses', badge: 'Cuatrimestral' },
                      { num: 0, label: 'Varios Meses', badge: 'Personalizado' },
                    ].map((opt) => {
                      const currentNum = editarPlanillaForm.numMonths || 1;
                      const isSelected = opt.num === 0
                        ? currentNum > 4
                        : currentNum === opt.num;

                      return (
                        <button
                          key={opt.num}
                          type="button"
                          onClick={() => {
                            const targetNum = opt.num === 0 ? 5 : opt.num;
                            const newLabel = generateMultiMonthLabel(editarPlanillaForm.month, targetNum);
                            setEditarPlanillaForm(prev => ({
                              ...prev,
                              numMonths: targetNum,
                              isBimonthly: targetNum > 1,
                              customPeriodLabel: newLabel
                            }));
                          }}
                          className={cn(
                            "p-2.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[64px]",
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10 font-bold"
                              : "bg-[#0D1627] border-[#1E293B] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          )}
                        >
                          <div className="text-xs font-bold text-white">{opt.label}</div>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-1",
                            isSelected ? "bg-amber-500/30 text-amber-200" : "bg-slate-800 text-slate-400"
                          )}>
                            {opt.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Stepper for 2 or more months */}
                  {(editarPlanillaForm.numMonths || 1) >= 2 && (
                    <div className="flex items-center justify-between bg-[#0D1627] p-2.5 rounded-xl border border-[#1E293B] mt-2 flex-wrap gap-2">
                      <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                        <Calendar size={13} className="text-amber-400" />
                        Número exacto de meses:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[2, 3, 4, 5, 6, 8, 12].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              const newLabel = generateMultiMonthLabel(editarPlanillaForm.month, n);
                              setEditarPlanillaForm(prev => ({
                                ...prev,
                                numMonths: n,
                                isBimonthly: true,
                                customPeriodLabel: newLabel
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                              (editarPlanillaForm.numMonths || 2) === n
                                ? "bg-amber-500 text-slate-950 shadow font-black"
                                : "bg-[#050914] text-slate-300 hover:bg-slate-800 border border-[#1E293B]"
                            )}
                          >
                            {n} m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Period Title Input & Presets */}
                <div className="space-y-2 pt-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Nombre / Etiqueta del Período para la Cotización (PDF):
                  </label>
                  <input
                    type="text"
                    value={editarPlanillaForm.customPeriodLabel}
                    onChange={(e) => setEditarPlanillaForm(prev => ({ ...prev, customPeriodLabel: e.target.value }))}
                    placeholder="Ej. JUNIO Y JULIO 2026, TRIMESTRE MA-JU-JL"
                    className="w-full bg-[#0D1627] text-white border border-[#1E293B] rounded-xl px-3.5 py-2 text-xs font-bold font-mono outline-none focus:border-amber-500 uppercase"
                  />
                  
                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-bold mr-1">Atajos rápidos:</span>
                    {[
                      { label: `2 Meses (${generateMultiMonthLabel(editarPlanillaForm.month, 2)})`, num: 2 },
                      { label: `3 Meses (${generateMultiMonthLabel(editarPlanillaForm.month, 3)})`, num: 3 },
                      { label: `4 Meses (${generateMultiMonthLabel(editarPlanillaForm.month, 4)})`, num: 4 },
                      { label: `Consignación ${formatMonthName(editarPlanillaForm.month)}`, num: 1 }
                    ].map((presetObj, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => {
                          const generated = presetObj.num > 1 
                            ? generateMultiMonthLabel(editarPlanillaForm.month, presetObj.num)
                            : `Consignación ${formatMonthName(editarPlanillaForm.month)}`;
                          setEditarPlanillaForm(prev => ({
                            ...prev,
                            numMonths: presetObj.num,
                            isBimonthly: presetObj.num > 1,
                            customPeriodLabel: generated
                          }));
                        }}
                        className="px-2.5 py-1 bg-[#0D1627] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-[#1E293B] hover:border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        + {presetObj.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. TABLA DE PRODUCTOS E ÍTEMS DE LA PLANILLA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    Productos e Ítems en la Planilla ({editarPlanillaForm.items.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ajuste la cantidad vendida o precio unitario por producto.
                  </span>
                </div>

                <div className="bg-[#050914] border border-[#1E293B] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0D1627] text-[9px] uppercase font-black text-slate-400 border-b border-[#1E293B]">
                      <tr>
                        <th className="p-3 pl-4">Producto / Solución</th>
                        <th className="p-3 text-center w-32">Cant. Vendida</th>
                        <th className="p-3 text-center w-36">Precio Unit. ($)</th>
                        <th className="p-3 text-right pr-4 w-32">Subtotal ($)</th>
                        <th className="p-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/40">
                      {editarPlanillaForm.items.length > 0 ? (
                        editarPlanillaForm.items.map((item, idx) => {
                          const subtotal = (Number(item.unidadesVendidas) || 0) * (Number(item.precioUnitNeto) || 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                              <td className="p-3 pl-4">
                                <div className="font-bold text-slate-100">{item.productoId}</div>
                                <div className="text-[10px] text-amber-400 font-mono">
                                  Solución: {item.solucionLote || 'S/S'}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unidadesVendidas}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setEditarPlanillaForm(prev => {
                                      const nextItems = [...prev.items];
                                      nextItems[idx] = { ...nextItems[idx], unidadesVendidas: val };
                                      return { ...prev, items: nextItems };
                                    });
                                  }}
                                  className="w-20 bg-[#0D1627] text-amber-300 font-mono font-black text-center border border-[#1E293B] rounded-lg py-1 text-xs outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.precioUnitNeto}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    setEditarPlanillaForm(prev => {
                                      const nextItems = [...prev.items];
                                      nextItems[idx] = { ...nextItems[idx], precioUnitNeto: val };
                                      return { ...prev, items: nextItems };
                                    });
                                  }}
                                  className="w-28 bg-[#0D1627] text-slate-200 font-mono font-bold text-center border border-[#1E293B] rounded-lg py-1 text-xs outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3 text-right pr-4 font-mono font-black text-emerald-400">
                                {formatCurrency(subtotal)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditarPlanillaForm(prev => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  title="Quitar producto de esta planilla"
                                  className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                            No hay productos en esta planilla. Utilice el buscador abajo para agregar ítems.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. BÚSQUEDA Y AGREGAR MAS PRODUCTOS A ESTA PLANILLA */}
              <div className="bg-[#050914] border border-[#1E293B] rounded-2xl p-4 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  + Agregar Producto / Lote del Cliente a esta Planilla:
                </label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3 text-sky-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Escriba el nombre o solución para añadir un producto..."
                      value={addLoteToPlanillaSearch}
                      onFocus={() => setAddLoteDropdownOpen(true)}
                      onChange={(e) => {
                        setAddLoteToPlanillaSearch(e.target.value);
                        setAddLoteDropdownOpen(true);
                      }}
                      className="w-full bg-[#0D1627] text-white border border-[#1E293B] rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-sky-500 uppercase"
                    />
                    {addLoteToPlanillaSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddLoteToPlanillaSearch('');
                          setAddLoteDropdownOpen(true);
                        }}
                        className="absolute right-2.5 text-slate-500 hover:text-white p-1"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {addLoteDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0A1120] border border-sky-500/30 rounded-2xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-[#1E293B]/40 animate-in fade-in duration-150">
                      {(() => {
                        const targetCid = declaracionCliente || registroVentasCliente || adminFilterCliente;
                        const clientLotesList = todosLosLotes.filter((l: any) => l.clienteId === targetCid);
                        const existingLoteIds = new Set(editarPlanillaForm.items.map(i => i.loteId));

                        const available = clientLotesList.filter((l: any) => {
                          if (existingLoteIds.has(l.id)) return false;
                          if (!addLoteToPlanillaSearch.trim()) return true;
                          const term = addLoteToPlanillaSearch.toLowerCase().trim();
                          const prod = (l.productoId || '').toLowerCase();
                          const sol = (l.solucionLote || '').toLowerCase();
                          return prod.includes(term) || sol.includes(term);
                        });

                        if (available.length === 0) {
                          return (
                            <div className="p-4 text-center text-slate-500 text-xs italic">
                              No hay otros productos disponibles para añadir.
                            </div>
                          );
                        }

                        return available.map((lote: any) => (
                          <button
                            key={lote.id}
                            type="button"
                            onClick={() => {
                              setEditarPlanillaForm(prev => ({
                                ...prev,
                                items: [
                                  ...prev.items,
                                  {
                                    loteId: lote.id,
                                    productoId: lote.productoId,
                                    solucionLote: lote.solucionLote || 'S/S',
                                    unidadesVendidas: 1,
                                    precioUnitNeto: Number(lote.precioUnitNeto) || 0
                                  }
                                ]
                              }));
                              setAddLoteToPlanillaSearch('');
                              setAddLoteDropdownOpen(false);
                            }}
                            className="w-full text-left p-3 hover:bg-sky-500/10 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-white uppercase text-xs">{lote.productoId}</span>
                              <span className="text-[10px] text-sky-400 font-mono ml-2">Solución: {lote.solucionLote || 'S/S'}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {formatCurrency(lote.precioUnitNeto || 0)}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. TOTALES RESUMEN */}
              {(() => {
                const totalUnits = editarPlanillaForm.items.reduce((sum, item) => sum + (Number(item.unidadesVendidas) || 0), 0);
                const totalNeto = editarPlanillaForm.items.reduce((sum, item) => sum + ((Number(item.unidadesVendidas) || 0) * (Number(item.precioUnitNeto) || 0)), 0);
                const totalIVA = totalNeto * 0.19;
                const totalGeneral = totalNeto + totalIVA;

                return (
                  <div className="bg-[#050914] border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-black">Total Unidades</div>
                        <div className="text-base font-black font-mono text-amber-300">{totalUnits} u.</div>
                      </div>
                      <div className="border-l border-[#1E293B] pl-6">
                        <div className="text-[10px] text-slate-400 uppercase font-black">Monto Neto</div>
                        <div className="text-base font-black font-mono text-emerald-400">{formatCurrency(totalNeto)}</div>
                      </div>
                      <div className="border-l border-[#1E293B] pl-6">
                        <div className="text-[10px] text-slate-400 uppercase font-black">IVA (19%)</div>
                        <div className="text-base font-black font-mono text-sky-400">{formatCurrency(totalIVA)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-400 uppercase font-black tracking-widest text-right">Total General</div>
                      <div className="text-xl font-black font-mono text-amber-400 text-right">{formatCurrency(totalGeneral)}</div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. PIE DE MODAL / ACCIONES */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                    handleDownloadQuoteReportGlobal(
                      editarPlanillaForm.month,
                      editarPlanillaForm.items.map(i => ({
                        productoId: i.productoId,
                        solucionLote: i.solucionLote,
                        unidadesVendidas: Number(i.unidadesVendidas) || 0,
                        precioUnitNeto: Number(i.precioUnitNeto) || 0,
                        montoVendido: (Number(i.unidadesVendidas) || 0) * (Number(i.precioUnitNeto) || 0)
                      })),
                      clientName,
                      editarPlanillaForm.customPeriodLabel
                    );
                  }}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 active:scale-95 cursor-pointer"
                >
                  <Download size={15} />
                  Descargar Cotización (PDF)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditarPlanillaModal(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditarPlanilla}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingEditarPlanilla ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        Guardar Cambios en Historial
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVOLUCION / REBAJA DE STOCK MODAL WITH MANUAL SEARCH */}
      {devolucionModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1627] border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-amber-500/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Registrar Devolución / Rebaja de Stock
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Descuente o devuelva unidades del stock de consignación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDevolucionModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDevolucion} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Buscar y Seleccionar Producto / Lote
                </label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3 text-amber-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Escriba el nombre, código o solución del producto..."
                      className="w-full bg-[#050914] text-white placeholder-slate-500 border border-[#1E293B] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold outline-none focus:border-amber-500 uppercase transition-all"
                      value={devolucionSearchQuery}
                      onFocus={() => setDevolucionDropdownOpen(true)}
                      onChange={(e) => {
                        setDevolucionSearchQuery(e.target.value);
                        setDevolucionForm(prev => ({ ...prev, loteId: '' }));
                        setDevolucionDropdownOpen(true);
                      }}
                    />
                    {devolucionSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setDevolucionSearchQuery('');
                          setDevolucionForm(prev => ({ ...prev, loteId: '' }));
                          setDevolucionDropdownOpen(true);
                        }}
                        className="absolute right-2.5 text-slate-500 hover:text-slate-300 p-1 rounded-lg"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown list of filtered products */}
                  {devolucionDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0A1120] border border-amber-500/30 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[#1E293B]/40 animate-in fade-in duration-150">
                      {(() => {
                        const targetClientId = declaracionCliente || registroVentasCliente || adminFilterCliente;
                        const availableLotes = todosLosLotes.filter((l: any) => {
                          if (targetClientId && l.clienteId !== targetClientId) return false;
                          if (!devolucionSearchQuery.trim()) return true;
                          const query = devolucionSearchQuery.toLowerCase().trim();
                          const prod = (l.productoId || '').toLowerCase();
                          const sol = (l.solucionLote || '').toLowerCase();
                          return prod.includes(query) || sol.includes(query);
                        });

                        if (availableLotes.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-slate-400 font-medium">
                              No se encontraron productos que coincidan con "{devolucionSearchQuery}"
                            </div>
                          );
                        }

                        return availableLotes.map((l: any) => {
                          const maxM = new Date().toISOString().substring(0, 7);
                          const traj = getLoteTrajectoryUpToMonth(l, maxM, undefined);
                          const available = traj?.frascosRestantes || 0;
                          const isSelected = devolucionForm.loteId.toString() === l.id.toString();

                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => {
                                setDevolucionForm(prev => ({ ...prev, loteId: l.id.toString() }));
                                setDevolucionSearchQuery(`${l.productoId} - Solución: ${l.solucionLote || 'S/S'}`);
                                setDevolucionDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-amber-500/10 transition-colors cursor-pointer",
                                isSelected && "bg-amber-500/20 border-l-4 border-amber-500"
                              )}
                            >
                              <div>
                                <div className="text-xs font-black text-white uppercase">{l.productoId}</div>
                                <div className="text-[11px] text-slate-400 font-medium">Solución: {l.solucionLote || 'S/S'}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                                  Stock: {available} u.
                                </span>
                                <div className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                                  {formatCurrency(l.precioUnitNeto || 0)}
                                </div>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {devolucionForm.loteId && (() => {
                const selectedLoteObj = todosLosLotes.find((l: any) => l.id.toString() === devolucionForm.loteId.toString());
                if (!selectedLoteObj) return null;
                const maxM = new Date().toISOString().substring(0, 7);
                const traj = getLoteTrajectoryUpToMonth(selectedLoteObj, maxM, undefined);
                const available = traj?.frascosRestantes || 0;
                const devs = selectedLoteObj.devoluciones || [];
                return (
                  <div className="bg-[#050914] border border-[#1E293B] rounded-2xl p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Stock Actual Disponible:</span>
                      <span className="font-mono font-black text-sky-400">{available} u.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Precio Unitario Neto:</span>
                      <span className="font-mono font-bold text-amber-400">{formatCurrency(selectedLoteObj.precioUnitNeto || 0)}</span>
                    </div>

                    {devs.length > 0 && (
                      <div className="pt-2 border-t border-[#1E293B] mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Historial de Devoluciones / Rebajas registradas:
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                          {devs.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between bg-[#0D1627] p-2 rounded-xl text-[11px] border border-[#1E293B]">
                              <div>
                                <span className="text-amber-400 font-bold font-mono">-{d.unidades} u.</span>
                                <span className="text-slate-400 ml-2 font-mono">({formatDateToDDMMYYYY(d.fecha)})</span>
                                <p className="text-[10px] text-slate-500 italic mt-0.5">{d.motivo}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteDevolucion(selectedLoteObj.id, d.id)}
                                title="Eliminar esta devolución"
                                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Unidades a Rebajar / Devolver
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-[#050914] text-amber-400 font-mono border border-[#1E293B] rounded-xl p-2.5 text-xs font-black outline-none focus:border-amber-500"
                    value={devolucionForm.unidades === 0 ? '' : devolucionForm.unidades}
                    placeholder="Ej: 5"
                    onChange={(e) => setDevolucionForm({ ...devolucionForm, unidades: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Fecha de Devolución
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#050914] text-slate-200 border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                    value={devolucionForm.fecha}
                    onChange={(e) => setDevolucionForm({ ...devolucionForm, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Motivo / Observación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Devolución cliente, producto vencido, merma..."
                  className="w-full bg-[#050914] text-slate-200 border border-[#1E293B] rounded-xl p-2.5 text-xs font-medium outline-none focus:border-amber-500"
                  value={devolucionForm.motivo}
                  onChange={(e) => setDevolucionForm({ ...devolucionForm, motivo: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setDevolucionModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDevolucion}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-[#050914] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  {savingDevolucion ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar Devolución / Rebaja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK REPOSICION / INGRESO DE STOCK MODAL */}
      {reponerModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1627] border border-emerald-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-emerald-500/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Ingresar Nuevo Stock / Reposición
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ingrese el nuevo stock o reposición de producto en consignación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReponerModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickReponer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Cliente Destinatario
                </label>
                <ClientAutocomplete
                  clientes={clientes}
                  value={reponerForm.clienteId}
                  onChange={(cid) => setReponerForm({ ...reponerForm, clienteId: cid })}
                  placeholder="Escriba o seleccione cliente..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Producto
                  </label>
                  <ProductSolutionAutocomplete
                    value={reponerForm.productoId}
                    onChange={(val) => setReponerForm({ ...reponerForm, productoId: val })}
                    onSelectCombination={(comb) => {
                      setReponerForm({
                        ...reponerForm,
                        productoId: comb.productoId,
                        solucionLote: comb.solucionLote,
                        precioUnitNeto: comb.precioUnitNeto
                      });
                    }}
                    placeholder="Ej: ARNICA CS"
                    registeredCombinations={registeredCombinations}
                    className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Solución / Lote
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050914] text-emerald-400 font-mono border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                    value={reponerForm.solucionLote}
                    onChange={(e) => setReponerForm({ ...reponerForm, solucionLote: e.target.value })}
                    placeholder="Ej: SALINA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Stock a Ingresar (u.)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-[#050914] text-sky-400 font-mono border border-[#1E293B] rounded-xl p-2.5 text-xs font-black outline-none focus:border-emerald-500"
                    value={reponerForm.unidadesIniciales === 0 ? '' : (reponerForm.unidadesIniciales || '')}
                    placeholder="Ej: 100"
                    onChange={(e) => setReponerForm({ ...reponerForm, unidadesIniciales: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    F. Vencimiento
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#050914] text-rose-400 border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                    value={reponerForm.fechaVencimiento}
                    onChange={(e) => setReponerForm({ ...reponerForm, fechaVencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Precio Unitario Neto ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-[#050914] text-amber-400 font-black border border-[#1E293B] rounded-xl p-2.5 text-xs outline-none focus:border-emerald-500"
                  value={reponerForm.precioUnitNeto === 0 ? '' : (reponerForm.precioUnitNeto || '')}
                  placeholder="0"
                  onChange={(e) => setReponerForm({ ...reponerForm, precioUnitNeto: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setReponerModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingReponer}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-[#050914] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {savingReponer ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar Reposición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LOTE MODAL */}
      {editLoteModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1627] border border-sky-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-sky-500/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400">
                  <Edit2 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Editar Producto / Lote
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Modifique la información original de este producto en consignación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditLoteModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditLote} className="space-y-4">
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Producto
                </label>
                <ProductSolutionAutocomplete
                  value={editLoteForm.productoId}
                  onChange={(val) => setEditLoteForm({ ...editLoteForm, productoId: val })}
                  onSelectCombination={(comb) => {
                    setEditLoteForm({
                      ...editLoteForm,
                      productoId: comb.productoId,
                      solucionLote: comb.solucionLote,
                      precioUnitNeto: comb.precioUnitNeto
                    });
                  }}
                  placeholder="Ej: ARNICA CS"
                  registeredCombinations={registeredCombinations}
                  className="w-full bg-[#050914] text-slate-200 border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-sky-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Solución
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: SALINA, CS-01"
                    className="w-full bg-[#050914] text-slate-200 border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-sky-500 uppercase"
                    value={editLoteForm.solucionLote}
                    onChange={(e) => setEditLoteForm({ ...editLoteForm, solucionLote: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    F. Vencimiento
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#050914] text-slate-200 border border-[#1E293B] rounded-xl p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                    value={editLoteForm.fechaVencimiento}
                    onChange={(e) => setEditLoteForm({ ...editLoteForm, fechaVencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Unidades Iniciales
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-[#050914] text-sky-400 border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-sky-500"
                    value={editLoteForm.unidadesIniciales === 0 ? '' : (editLoteForm.unidadesIniciales || '')}
                    placeholder="0"
                    onChange={(e) => setEditLoteForm({ ...editLoteForm, unidadesIniciales: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    $ Unit s/IVA ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    className="w-full bg-[#050914] text-amber-400 border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-sky-500"
                    value={editLoteForm.precioUnitNeto === 0 ? '' : (editLoteForm.precioUnitNeto || '')}
                    placeholder="0"
                    onChange={(e) => setEditLoteForm({ ...editLoteForm, precioUnitNeto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditLoteModal(null)}
                  className="px-4 py-2.5 bg-[#050914] hover:bg-slate-800 text-slate-400 font-black rounded-xl text-xs uppercase tracking-wider border border-[#1E293B] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditLote}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 active:scale-95 flex items-center gap-2"
                >
                  {savingEditLote ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE LOTE CONFIRMATION MODAL */}
      {deleteLoteModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1627] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-rose-500/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Confirmar Eliminación
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ¿Eliminar <strong className="text-rose-400">{deleteLoteModal.productoName}</strong> permanentemente?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Esta acción eliminará el producto en consignación de la base de datos de forma irreversible.
            </p>

            <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteLoteModal(null)}
                className="px-4 py-2.5 bg-[#050914] hover:bg-slate-800 text-slate-400 font-black rounded-xl text-xs uppercase tracking-wider border border-[#1E293B] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingLote}
                onClick={handleConfirmDeleteLote}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 active:scale-95 flex items-center gap-2"
              >
                {deletingLote ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Sí, Eliminar Producto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// MONTH_OPTIONS static array representing standard selectable months
const MONTH_OPTIONS = [
  { value: '2026-01', label: 'Enero 2026' },
  { value: '2026-02', label: 'Febrero 2026' },
  { value: '2026-03', label: 'Marzo 2026' },
  { value: '2026-04', label: 'Abril 2026' },
  { value: '2026-05', label: 'Mayo 2026' },
  { value: '2026-06', label: 'Junio 2026' },
  { value: '2026-07', label: 'Julio 2026' },
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-09', label: 'Septiembre 2026' },
  { value: '2026-10', label: 'Octubre 2026' },
  { value: '2026-11', label: 'Noviembre 2026' },
  { value: '2026-12', label: 'Diciembre 2026' },
  { value: '2027-01', label: 'Enero 2027' },
  { value: '2027-02', label: 'Febrero 2027' },
  { value: '2027-03', label: 'Marzo 2027' },
  { value: '2027-04', label: 'Abril 2027' },
  { value: '2027-05', label: 'Mayo 2027' },
  { value: '2027-06', label: 'Junio 2027' },
  { value: '2027-07', label: 'Julio 2027' },
  { value: '2027-08', label: 'Agosto 2027' },
  { value: '2027-09', label: 'Septiembre 2027' },
  { value: '2027-10', label: 'Octubre 2027' },
  { value: '2027-11', label: 'Noviembre 2027' },
  { value: '2027-12', label: 'Diciembre 2027' },
];

// Helper to calculate the sequential trajectory of inventory from startMonth up to targetMonth
function getLoteTrajectoryUpToMonth(lote: any, targetMonth: string, tempSalesForTargetMonth?: number) {
  if (!lote) return null;
  const rawDate = lote.fechaEntrega || lote.createdAt;
  if (!rawDate) return null;

  const actualStartMonth = parseDateString(rawDate).substring(0, 7);
  if (!actualStartMonth || actualStartMonth.length < 7) return null;
  
  // Find the absolute earliest month that we should start tracking from, 
  // considering the batch delivery date AND any historical movements registered on it.
  let startMonth = actualStartMonth;
  if (lote.movimientos) {
    Object.keys(lote.movimientos).forEach(m => {
      if (/^\d{4}-\d{2}$/.test(m)) {
        if (m < startMonth) {
          startMonth = m;
        }
      }
    });
  }
  if (lote.devoluciones) {
    lote.devoluciones.forEach((d: any) => {
      if (d.fecha && d.fecha.length >= 7) {
        const m = d.fecha.substring(0, 7);
        if (m < startMonth) startMonth = m;
      }
    });
  }
  // Allow registration and calculation from targetMonth even if earlier than startMonth
  if (targetMonth < startMonth) {
    startMonth = targetMonth;
  }

  // Generate sequence of months from startMonth up to targetMonth
  const months: string[] = [];
  const parts = startMonth.split('-');
  if (parts.length < 2) return null;
  
  let currYear = parseInt(parts[0]);
  let currMonth = parseInt(parts[1]);
  
  const targetParts = targetMonth.split('-');
  if (targetParts.length < 2) return null;
  const targetYear = parseInt(targetParts[0]);
  const targetMonthNum = parseInt(targetParts[1]);

  if (isNaN(currYear) || isNaN(currMonth) || isNaN(targetYear) || isNaN(targetMonthNum)) return null;

  // Safety limit to prevent infinite loops (max 10 years of trajectory)
  let safetyCounter = 0;
  while ((currYear < targetYear || (currYear === targetYear && currMonth <= targetMonthNum)) && safetyCounter < 120) {
    safetyCounter++;
    const mStr = String(currMonth).padStart(2, '0');
    months.push(`${currYear}-${mStr}`);
    currMonth++;
    if (currMonth > 12) {
      currMonth = 1;
      currYear++;
    }
  }

  let runningStock = Number(lote.unidadesIniciales) || 0;
  let result = {
    delivered: true,
    stockDisponible: runningStock,
    ventas: 0,
    montoVentaNeto: 0,
    frascosRestantes: runningStock
  };

  for (const m of months) {
    const repsInMonth = (lote.reposiciones || []).filter((r: any) => r.fecha && r.fecha.substring(0, 7) === m);
    const totalRepInMonth = repsInMonth.reduce((sum: number, r: any) => sum + (Number(r.unidades) || 0), 0);

    const devsInMonth = (lote.devoluciones || []).filter((r: any) => r.fecha && r.fecha.substring(0, 7) === m);
    const totalDevInMonth = devsInMonth.reduce((sum: number, r: any) => sum + (Number(r.unidades) || 0), 0);

    runningStock += (totalRepInMonth - totalDevInMonth);

    const stockDisp = runningStock;
    // Use tempSalesForTargetMonth if m is targetMonth and is passed, else database's saved ventas
    const ventas = (m === targetMonth && tempSalesForTargetMonth !== undefined)
      ? tempSalesForTargetMonth
      : Number(lote.movimientos?.[m]?.unidadesVendidas || 0);

    const remaining = Math.max(stockDisp - ventas, 0);
    runningStock = remaining;

    if (m === targetMonth) {
      result = {
        delivered: true,
        stockDisponible: stockDisp,
        ventas,
        montoVentaNeto: ventas * (Number(lote.precioUnitNeto) || 0),
        frascosRestantes: remaining
      };
    }
  }

  return result;
}

// Subcomponent to edit a Lote's fixed data
function LoteFixedDataRow({ 
  item, 
  isFIFO, 
  onRefresh,
  isSelected,
  onToggle,
  onReponer
}: { 
  key?: string, 
  item: any, 
  isFIFO: boolean, 
  onRefresh: () => void | Promise<void>,
  isSelected: boolean,
  onToggle: (id: string) => void,
  onReponer: (item: any) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    productoId: item.productoId || '',
    solucionLote: item.solucionLote || '',
    fechaVencimiento: parseDateString(item.fechaVencimiento),
    unidadesIniciales: Number(item.originalUnidades ?? item.displayUnidades) || 0,
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
            productoId: (form.productoId || "").toUpperCase().trim(),
            solucionLote: (form.solucionLote || "").toUpperCase().trim() || 'S/L',
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
        const existing = safeLocalStorageGet(key);
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
            safeLocalStorageSet(key, JSON.stringify(allLotes));
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

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    
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
        // Almacenamiento Local (Mock DB) - Direct manipulation
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          if (item.type === 'ORIGINAL') {
             allLotes = allLotes.filter((l: any) => l.id.toString() !== item.id.toString());
          } else if (item.type === 'REP') {
             const index = allLotes.findIndex((l: any) => l.id.toString() === item.id.toString());
             if (index !== -1) {
                let repos = allLotes[index].reposiciones || [];
                repos.splice(item.repIndex, 1);
                allLotes[index].reposiciones = repos;
             }
          }
          safeLocalStorageSet(key, JSON.stringify(allLotes));
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
        <td className="p-2"></td>
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
  }

  return (
    <tr className={cn("hover:bg-[#1E293B]/60 transition-colors group", isFIFO ? "bg-rose-500/5" : "")}>
      <td className="p-3 w-10 text-center">
         <div className="flex justify-center">
           <input 
             type="checkbox" 
             checked={isSelected} 
             onChange={() => onToggle(item.displayId)}
             className="w-4 h-4 accent-sky-500 rounded border-slate-600 bg-slate-800 cursor-pointer hover:border-sky-500/50 transition-colors shadow-sm"
           />
         </div>
      </td>
      <td className="p-3">
         <span className="text-[9px] text-slate-400 block truncate w-24 font-bold">{item.clientName}</span>
      </td>
      <td className="p-2">
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
      <td className="p-2 text-emerald-400 font-mono text-[10px]">{item.solucionLote || 'S/L'}</td>
      <td className="p-2 font-bold text-rose-400 text-[10px]">{item.sortDate}</td>
      <td className="p-2 text-right font-black text-amber-400 text-xs">{formatCurrency(item.precioUnitNeto || 0)}</td>
      <td className="p-2 text-center w-20">
         <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {!isDeleting ? (
              <>
                <button onClick={() => setIsEditing(true)} title="Editar" className="bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Edit2 size={12} /></button>
                <button onClick={() => onReponer(item)} title="Nuevo Producto" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Plus size={12} /></button>
                <button onClick={handleDelete} disabled={saving} title="Eliminar" className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-[#050914] p-1.5 rounded transition-colors"><Trash2 size={12} /></button>
              </>
            ) : (
              <div className="flex items-center gap-1 bg-rose-500/10 p-1 rounded border border-rose-500/30">
                 <button onClick={handleDelete} className="text-[9px] font-black uppercase text-rose-400 px-1 hover:text-white">Confirmar</button>
                 <button onClick={() => setIsDeleting(false)} className="text-[9px] font-black uppercase text-slate-400 px-1 hover:text-white">X</button>
              </div>
            )}
         </div>
      </td>
    </tr>
  );
}

function LoteFixedDataEditor({ 
  lote, 
  uniqueProducts, 
  onRefresh 
}: { 
  key?: string;
  lote: any; 
  uniqueProducts: string[]; 
  onRefresh: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    productoId: lote.productoId || '',
    solucionLote: lote.solucionLote || '',
    fechaVencimiento: parseDateString(lote.fechaVencimiento),
    unidadesIniciales: Number(lote.unidadesIniciales) || 0,
    precioUnitNeto: Number(lote.precioUnitNeto) || 0,
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
        const docRef = doc(db, 'crm_consignacion_lotes', lote.id);
        await setDoc(docRef, {
          productoId: form.productoId.toUpperCase().trim(),
          solucionLote: form.solucionLote.toUpperCase().trim() || 'S/L',
          fechaVencimiento: Timestamp.fromDate(new Date(form.fechaVencimiento + 'T12:00:00')),
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal
        }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const index = allLotes.findIndex((l: any) => l.id === lote.id);
          if (index !== -1) {
            allLotes[index].productoId = form.productoId.toUpperCase().trim();
            allLotes[index].solucionLote = form.solucionLote.toUpperCase().trim() || 'S/L';
            allLotes[index].fechaVencimiento = form.fechaVencimiento;
            allLotes[index].unidadesIniciales = units;
            allLotes[index].precioUnitNeto = price;
            allLotes[index].totalVentaOriginal = totalVal;
            safeLocalStorageSet(key, JSON.stringify(allLotes));
          }
        }
      }
      alert('Datos fijos guardados exitosamente.');
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar datos fijos: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    console.log("Delete button clicked for lote:", lote);
    if (!lote || !lote.id) {
      alert("Error: No se puede identificar el producto a eliminar.");
      return;
    }
    if (!window.confirm('¿Está seguro de que desea eliminar este producto/solución de forma permanente? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      setSaving(true);
      if (isFirebaseReady()) {
        const db = getDb();
        await deleteDoc(doc(db, 'crm_consignacion_lotes', lote.id));
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = safeLocalStorageGet(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          allLotes = allLotes.filter((l: any) => l.id !== lote.id);
          safeLocalStorageSet(key, JSON.stringify(allLotes));
        }
      }
      alert('Producto/solución eliminado exitosamente.');
      onRefresh();
    } catch (e: any) {
      console.error("Error in handleDelete:", e);
      alert('Error al eliminar producto/solución: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#15233C]/20 hover:bg-[#15233C]/40 p-2 rounded-xl border border-[#1E293B]/40 flex flex-wrap md:flex-nowrap gap-2 items-center justify-between text-xs transition-colors">
      <div className="flex-1 min-w-[130px]">
        <input 
          type="text"
          className="w-full bg-[#050914] text-white border border-[#1E293B]/60 rounded-lg px-2.5 py-1.5 font-bold outline-none focus:border-sky-500 text-xs"
          value={form.productoId}
          placeholder="Producto"
          onChange={e => setForm({ ...form, productoId: e.target.value })}
        />
      </div>
      <div className="w-28">
        <input 
          type="text"
          placeholder="Solución"
          className="w-full bg-[#050914] text-emerald-400 border border-[#1E293B]/60 rounded-lg px-2 py-1.5 font-bold outline-none focus:border-emerald-500 uppercase font-mono text-center text-xs"
          value={form.solucionLote}
          onChange={e => setForm({ ...form, solucionLote: e.target.value })}
        />
      </div>
      <div className="w-32">
        <input 
          type="date"
          className="w-full bg-[#050914] text-rose-400 border border-[#1E293B]/60 rounded-lg px-2 py-1.5 font-bold outline-none focus:border-sky-500 [color-scheme:dark] text-xs text-center"
          value={form.fechaVencimiento}
          onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
        />
      </div>
      <div className="w-20">
        <div className="text-[8px] text-slate-500 font-bold uppercase mb-0.5 text-center">Stock Inicial</div>
        <input 
          type="number"
          placeholder="Stock"
          className="w-full bg-[#050914] text-sky-400 border border-[#1E293B]/60 rounded-lg px-2 py-1.5 font-black text-center outline-none focus:border-sky-500 text-xs font-mono"
          value={form.unidadesIniciales}
          onChange={e => setForm({ ...form, unidadesIniciales: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="w-24">
        <div className="text-[8px] text-slate-500 font-bold uppercase mb-0.5 text-center">Precio Unit.</div>
        <input 
          type="number"
          placeholder="Precio"
          className="w-full bg-[#050914] text-amber-400 border border-[#1E293B]/60 rounded-lg px-2 py-1.5 font-black text-center outline-none focus:border-sky-500 text-xs font-mono"
          value={form.precioUnitNeto}
          onChange={e => setForm({ ...form, precioUnitNeto: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right whitespace-nowrap">
          <span className="text-[10px] text-slate-400 font-bold block leading-none mb-1">Total Original</span>
          <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(form.unidadesIniciales * form.precioUnitNeto)}</span>
        </div>
        {lote.reposiciones && lote.reposiciones.length > 0 && (
          <div className="text-right whitespace-nowrap pl-3 border-l border-[#1E293B]">
            <span className="text-[10px] text-slate-400 font-bold block leading-none mb-1">Total Repuesto</span>
            <span className="text-xs font-black text-sky-400 font-mono">
              +{lote.reposiciones.reduce((sum: number, r: any) => sum + (Number(r.unidades) || 0), 0)} u.
            </span>
            <div className="mt-1 flex flex-wrap gap-1 justify-end max-w-[200px]">
              {lote.reposiciones.map((r: any, i: number) => (
                <span key={i} title={`Fecha: ${r.fecha}`} className="text-[8px] bg-[#1E293B] text-slate-300 px-1 rounded border border-slate-700/50">
                  +{r.unidades}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[#050914] font-black px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider shadow-md shadow-rose-500/10 active:scale-95"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
