import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { localDB } from '../../lib/auth';
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
  deleteDoc
} from 'firebase/firestore';
import { 
  Save, 
  PlusCircle, 
  Target, 
  Package, 
  Tag, 
  Check, 
  RefreshCw, 
  TriangleAlert, 
  Calendar, 
  DollarSign, 
  Layers, 
  Sparkles,
  ChevronDown,
  Info,
  Settings,
  Filter,
  Download,
  FileText,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';

const PRODUCTOS_CATALOGO = [
  "ARNICA CS", "SARSAPARRILLA CS", "BEILSCHMIEDIA CS", "SILIMARINA CS",
  "MELISSA P CS SALINA", "BEILSCHMIEDIA CS SALINA", "CALOSTRUM CS SALINA",
  "COCCULUS CS SALINA", "MAQUI CS SALINA", "ECHINAC A CS SALINA", "MUCES CS SALINA",
  "KIT OSTEOARTICULAR CS SALINA", "KIT MODULADOR DIGESTIVO CS SALINA", "KIT VIAJE CS SALINA"
];

const PRECIOS_BASE: Record<string, number> = {
  "ARNICA CS": 12500,
  "SARSAPARRILLA CS": 11500,
  "BEILSCHMIEDIA CS": 9500,
  "SILIMARINA CS": 13500,
  "MELISSA P CS SALINA": 9500,
  "BEILSCHMIEDIA CS SALINA": 9500,
  "CALOSTRUM CS SALINA": 14500,
  "COCCULUS CS SALINA": 9500,
  "MAQUI CS SALINA": 10500,
  "ECHINAC A CS SALINA": 10500,
  "MUCES CS SALINA": 10500,
  "KIT OSTEOARTICULAR CS SALINA": 32000,
  "KIT MODULADOR DIGESTIVO CS SALINA": 32000,
  "KIT VIAJE CS SALINA": 25000
};

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
  const existing = localStorage.getItem(key);
  let allLotes: any[] = [];
  if (existing) {
    try {
      allLotes = JSON.parse(existing);
    } catch (e) {}
  }
  
  const clientLotes = allLotes.filter((l: any) => l.clienteId === clienteId);
  
  if (clientLotes.length === 0) {
    const seed = [
      {
        id: `lote_arnica_${clienteId}`,
        clienteId: clienteId,
        productoId: "ARNICA CS",
        solucionLote: "LOTE 102A",
        fechaEntrega: "2026-01-10",
        fechaVencimiento: "2027-01-10",
        unidadesIniciales: 100,
        precioUnitNeto: 12500,
        totalVentaOriginal: 1250000,
        activo: true,
        createdAt: new Date().toISOString(),
        movimientos: {
          "2026-01": { unidadesVendidas: 10 },
          "2026-02": { unidadesVendidas: 15 },
          "2026-03": { unidadesVendidas: 5 }
        }
      },
      {
        id: `lote_sarsa_${clienteId}`,
        clienteId: clienteId,
        productoId: "SARSAPARRILLA CS",
        solucionLote: "LOTE 204B",
        fechaEntrega: "2026-02-15",
        fechaVencimiento: "2027-02-15",
        unidadesIniciales: 80,
        precioUnitNeto: 11500,
        totalVentaOriginal: 920000,
        activo: true,
        createdAt: new Date().toISOString(),
        movimientos: {
          "2026-02": { unidadesVendidas: 5 },
          "2026-03": { unidadesVendidas: 12 }
        }
      },
      {
        id: `lote_beil_${clienteId}`,
        clienteId: clienteId,
        solucionLote: "LOTE 401C",
        productoId: "BEILSCHMIEDIA CS",
        fechaEntrega: "2026-03-01",
        fechaVencimiento: "2027-03-01",
        unidadesIniciales: 50,
        precioUnitNeto: 9500,
        totalVentaOriginal: 475000,
        activo: true,
        createdAt: new Date().toISOString(),
        movimientos: {}
      },
      {
        id: `lote_sili_${clienteId}`,
        clienteId: clienteId,
        solucionLote: "LOTE 509D",
        productoId: "SILIMARINA CS",
        fechaEntrega: "2026-04-01",
        fechaVencimiento: "2027-04-01",
        unidadesIniciales: 120,
        precioUnitNeto: 13500,
        totalVentaOriginal: 1620000,
        activo: true,
        createdAt: new Date().toISOString(),
        movimientos: {}
      }
    ];
    allLotes.push(...seed);
    localStorage.setItem(key, JSON.stringify(allLotes));
    return seed;
  }
  
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

export default function VentasConsignacionView() {
  const [activeTab, setActiveTab] = useState<'declaraciones' | 'registro_ventas'>('declaraciones');
  const [clientes, setClientes] = useState<any[]>([]);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>(PRODUCTOS_CATALOGO);
  const [loading, setLoading] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Tab 1: Declaración Mensual (Select Cliente)
  const [declaracionCliente, setDeclaracionCliente] = useState('');
  const [lotesActivos, setLotesActivos] = useState<any[]>([]);

  // Tab 1 UI states for Unified Excel Layout
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [replenishmentFilter, setReplenishmentFilter] = useState<'todos' | 'reposicion' | 'con-stock'>('todos');
  const [salesInputs, setSalesInputs] = useState<Record<string, number>>({});
  const [savingAllMovements, setSavingAllMovements] = useState(false);
  const [fixedDataExpanded, setFixedDataExpanded] = useState(false);

  // Additional state variables for managing replenishments and all lotes
  const [todosLosLotes, setTodosLosLotes] = useState<any[]>([]);
  const [adminFilterCliente, setAdminFilterCliente] = useState('');
  const [adminFilterProducto, setAdminFilterProducto] = useState('');
  const [repUnits, setRepUnits] = useState<Record<string, number>>({});
  const [repDates, setRepDates] = useState<Record<string, string>>({});

  // Tab 2: Registro de Ventas (Select Cliente)
  const [registroVentasCliente, setRegistroVentasCliente] = useState('');

  // Dropdown / Collapsible details states
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedRep, setExpandedRep] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  
  // Inline manual product addition inside the template
  const [inlineAddOpen, setInlineAddOpen] = useState(false);
  const [selectedLoteToLink, setSelectedLoteToLink] = useState('');
  const [inlineForm, setInlineForm] = useState({
    productoId: '',
    solucionLote: '',
    fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unidadesIniciales: 100,
    precioUnitNeto: 0,
  });

  // Fixed Data Collapsible Forms & Fields
  const [showAddLoteForm, setShowAddLoteForm] = useState(false);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importClienteId, setImportClienteId] = useState('');
  const [importText, setImportText] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientRut, setNewClientRut] = useState('');

  // Form for Lote Delivery / Creation
  const [formEntrega, setFormEntrega] = useState({
    cliente_id: '',
    producto_id: '',
    solucion_lote: '',
    fecha_entrega: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unidades_iniciales: 100,
    precio_unit_neto: 0
  });

  useEffect(() => {
    loadClientes();
    loadTodosLosLotes();
  }, []);

  useEffect(() => {
    loadUniqueProducts();
  }, [declaracionCliente, activeTab]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const contacts = await localDB.getCollection('contacts');
      contacts.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      
      if (contacts.length === 0) {
        setClientes([
          { id: "demo_1", name: "Distribuidora Botánica Sur", rut: "76.123.456-7" },
          { id: "demo_2", name: "Farmacia de la Naturaleza", rut: "77.987.654-3" },
          { id: "demo_3", name: "Clínica de la Madre Tierra", rut: "85.456.789-k" }
        ]);
      } else {
        setClientes(contacts);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUniqueProducts = async () => {
    const productsSet = new Set(PRODUCTOS_CATALOGO);
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const snap = await getDocs(collection(db, 'crm_consignacion_lotes'));
        snap.forEach(doc => {
          const p = doc.data().productoId;
          if (p) productsSet.add(p);
        });
      } else {
        const key = 'mock_consignacion_lotes';
        const saved = localStorage.getItem(key);
        if (saved) {
          const lotes = JSON.parse(saved);
          lotes.forEach((l: any) => {
            if (l.productoId) productsSet.add(l.productoId);
          });
        }
      }
    } catch (e) {
      console.error('Error scanning unique products:', e);
    }
    setUniqueProducts(Array.from(productsSet));
  };

  // Pre-fill price when product is selected in delivery form
  useEffect(() => {
    if (formEntrega.producto_id && formEntrega.cliente_id) {
      if (!isFirebaseReady()) {
        const localKey = `mock_precios_${formEntrega.cliente_id}`;
        const saved = localStorage.getItem(localKey);
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

  const loadTodosLosLotes = async () => {
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const snap = await getDocs(collection(db, 'crm_consignacion_lotes'));
        const loaded = [];
        for (const d of snap.docs) {
          const loteId = d.id;
          const data = d.data();
          
          const movsSnap = await getDocs(collection(db, 'crm_consignacion_lotes', loteId, 'movimientos'));
          const movimientos: Record<string, any> = {};
          movsSnap.forEach(mDoc => {
            movimientos[mDoc.id] = mDoc.data();
          });

          loaded.push({
            id: loteId,
            ...data,
            movimientos
          });
        }
        setTodosLosLotes(loaded);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          setTodosLosLotes(JSON.parse(existing));
        } else {
          const demoLotes: any[] = [];
          const demoClients = ["demo_1", "demo_2", "demo_3"];
          demoClients.forEach(cId => {
            const clientLotes = getMockLotesForClient(cId);
            demoLotes.push(...clientLotes);
          });
          setTodosLosLotes(demoLotes);
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
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1) {
            allLotes[idx].reposiciones = updatedRepos;
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }
      alert("Reposición registrada exitosamente.");
      setRepUnits(prev => ({ ...prev, [loteId]: 0 }));
      setRepDates(prev => ({ ...prev, [loteId]: '' }));
      
      if (declaracionCliente) {
        await loadLotes(declaracionCliente);
      } else {
        await loadTodosLosLotes();
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al registrar reposición: " + e.message);
    }
  };

  const loadLotes = async (clienteId: string) => {
    try {
      setLoadingLotes(true);
      if (isFirebaseReady()) {
        const db = getDb();
        const q = query(
          collection(db, 'crm_consignacion_lotes'),
          where('clienteId', '==', clienteId)
        );
        const snap = await getDocs(q);
        const loadedLotes = [];
        
        for (const d of snap.docs) {
          const loteId = d.id;
          const data = d.data();
          
          const movsSnap = await getDocs(collection(db, 'crm_consignacion_lotes', loteId, 'movimientos'));
          const movimientos: Record<string, any> = {};
          movsSnap.forEach(mDoc => {
            movimientos[mDoc.id] = mDoc.data();
          });
          
          loadedLotes.push({
            id: loteId,
            ...data,
            movimientos
          });
        }
        setLotesActivos(loadedLotes);
      } else {
        const clientLotes = getMockLotesForClient(clienteId);
        setLotesActivos(clientLotes);
      }
      await loadTodosLosLotes();
    } catch (e) {
      console.error('Error loading lotes:', e);
    } finally {
      setLoadingLotes(false);
    }
  };

  useEffect(() => {
    if (declaracionCliente) {
      loadLotes(declaracionCliente);
    } else {
      setLotesActivos([]);
    }
  }, [declaracionCliente]);

  useEffect(() => {
    const inputs: Record<string, number> = {};
    lotesActivos.forEach(lote => {
      inputs[lote.id] = Number(lote.movimientos?.[selectedMonth]?.unidadesVendidas || 0);
    });
    setSalesInputs(inputs);
  }, [lotesActivos, selectedMonth]);

  const handleImportLotes = async (text: string, cid: string) => {
    if (!cid) {
      alert("Por favor, seleccione un cliente para la importación.");
      return;
    }
    const lines = text.split(/\r?\n/);
    const importedList: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Ignore header row if it contains columns keywords
      if (i === 0 && (line.toLowerCase().includes('producto') || line.toLowerCase().includes('solucion') || line.toLowerCase().includes('vencimiento'))) {
        continue; 
      }

      // Try to split by tab, semicolon, or comma
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');
      if (parts.length < 2) parts = line.split(',');

      if (parts.length < 3) {
        failCount++;
        continue;
      }

      const productoId = parts[0]?.trim().toUpperCase();
      const solucionLote = parts[1]?.trim().toUpperCase() || 'S/L';
      const fechaVencimientoStr = parts[2]?.trim();
      const unidadesIniciales = parseInt(parts[3]?.trim()) || 100;
      const precioUnitNeto = parseInt(parts[4]?.trim()) || 0;

      if (!productoId) {
        failCount++;
        continue;
      }

      // Validate date format, or default to 1 year from now
      let finalVenc = fechaVencimientoStr;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(finalVenc)) {
        finalVenc = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
      }

      importedList.push({
        clienteId: cid,
        productoId,
        solucionLote,
        fechaVencimiento: finalVenc,
        unidadesIniciales,
        precioUnitNeto,
      });
    }

    if (importedList.length === 0) {
      alert("No se encontraron registros válidos para importar. Asegúrese de separar las columnas con TAB, coma (,) o punto y coma (;).");
      return;
    }

    try {
      if (isFirebaseReady()) {
        const db = getDb();
        for (const item of importedList) {
          const totalVal = item.unidadesIniciales * item.precioUnitNeto;
          const loteData = {
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaEntrega: Timestamp.fromDate(new Date()),
            fechaVencimiento: Timestamp.fromDate(new Date(item.fechaVencimiento + 'T12:00:00')),
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
          successCount++;
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        let allLotes = existing ? JSON.parse(existing) : [];

        for (const item of importedList) {
          const totalVal = item.unidadesIniciales * item.precioUnitNeto;
          const newLote = {
            id: `lote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaEntrega: new Date().toISOString().split('T')[0],
            fechaVencimiento: item.fechaVencimiento,
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            totalVentaOriginal: totalVal,
            activo: true,
            createdAt: new Date().toISOString(),
            movimientos: {}
          };
          allLotes.push(newLote);
          successCount++;
        }
        localStorage.setItem(key, JSON.stringify(allLotes));
      }

      alert(`Importación completada con éxito. Se registraron ${successCount} productos/lotes. Errores: ${failCount}`);
      setImportText('');
      setShowImportForm(false);
      
      await loadTodosLosLotes();
      if (declaracionCliente === cid) {
        await loadLotes(declaracionCliente);
      }
    } catch (error: any) {
      console.error("Error al importar lotes:", error);
      alert("Error al guardar productos importados: " + error.message);
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
      const units = Number(formEntrega.unidades_iniciales);
      const price = Number(formEntrega.precio_unit_neto);
      const totalVal = units * price;

      if (isFirebaseReady()) {
        const db = getDb();
        const loteData = {
          clienteId: formEntrega.cliente_id,
          productoId: uProduct,
          solucionLote: formEntrega.solucion_lote.toUpperCase().trim() || 'S/L',
          fechaEntrega: Timestamp.fromDate(new Date(formEntrega.fecha_entrega + 'T12:00:00')),
          fechaVencimiento: Timestamp.fromDate(new Date(formEntrega.fecha_vencimiento + 'T12:00:00')),
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal,
          activo: true,
          createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        let allLotes = existing ? JSON.parse(existing) : [];
        
        const newLote = {
          id: `lote_${Date.now()}`,
          clienteId: formEntrega.cliente_id,
          productoId: uProduct,
          solucionLote: formEntrega.solucion_lote.toUpperCase().trim() || 'S/L',
          fechaEntrega: formEntrega.fecha_entrega,
          fechaVencimiento: formEntrega.fecha_vencimiento,
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal,
          activo: true,
          createdAt: new Date().toISOString(),
          movimientos: {}
        };
        allLotes.push(newLote);
        localStorage.setItem(key, JSON.stringify(allLotes));
      }

      alert('Lote en consignación registrado correctamente.');
      setFormEntrega({
        cliente_id: formEntrega.cliente_id,
        producto_id: '',
        solucion_lote: '',
        fecha_entrega: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        unidades_iniciales: 100,
        precio_unit_neto: 0
      });

      if (declaracionCliente === formEntrega.cliente_id) {
        await loadLotes(declaracionCliente);
      } else {
        await loadTodosLosLotes();
      }
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
      const units = Number(inlineForm.unidadesIniciales);
      const price = Number(inlineForm.precioUnitNeto);
      const totalVal = units * price;
      // Use the first day of the selected month as the delivery/creation date
      const deliveryDateStr = `${selectedMonth}-01`;

      if (isFirebaseReady()) {
        const db = getDb();
        const loteData = {
          clienteId: declaracionCliente,
          productoId: uProduct,
          solucionLote: inlineForm.solucionLote.toUpperCase().trim() || 'SALINA',
          fechaEntrega: Timestamp.fromDate(new Date(deliveryDateStr + 'T12:00:00')),
          fechaVencimiento: Timestamp.fromDate(new Date(inlineForm.fechaVencimiento + 'T12:00:00')),
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal,
          activo: true,
          createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        let allLotes = existing ? JSON.parse(existing) : [];
        
        const newLote = {
          id: `lote_${Date.now()}`,
          clienteId: declaracionCliente,
          productoId: uProduct,
          solucionLote: inlineForm.solucionLote.toUpperCase().trim() || 'SALINA',
          fechaEntrega: deliveryDateStr,
          fechaVencimiento: inlineForm.fechaVencimiento,
          unidadesIniciales: units,
          precioUnitNeto: price,
          totalVentaOriginal: totalVal,
          activo: true,
          createdAt: new Date().toISOString(),
          movimientos: {}
        };
        allLotes.push(newLote);
        localStorage.setItem(key, JSON.stringify(allLotes));
      }

      alert('Producto agregado correctamente.');
      setInlineAddOpen(false);
      setInlineForm({
        productoId: '',
        solucionLote: '',
        fechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        unidadesIniciales: 100,
        precioUnitNeto: 0,
      });

      await loadLotes(declaracionCliente);
    } catch (err: any) {
      console.error(err);
      alert('Error al agregar producto: ' + err.message);
    }
  };

  const handleAddProductToMonthTemplate = async (loteId: string) => {
    if (!loteId) {
      alert("Por favor seleccione un producto/lote de la lista.");
      return;
    }
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const movDocRef = doc(db, 'crm_consignacion_lotes', loteId, 'movimientos', selectedMonth);
        await setDoc(movDocRef, {
          unidadesVendidas: 0,
          saldoAnterior: 0,
          saldoResultante: 0,
          montoVentaNeto: 0,
          fechaRegistro: Timestamp.now(),
          added: true
        });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1) {
            if (!allLotes[idx].movimientos) allLotes[idx].movimientos = {};
            allLotes[idx].movimientos[selectedMonth] = {
              unidadesVendidas: 0,
              fechaRegistro: new Date().toISOString(),
              added: true
            };
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }
      
      await loadLotes(declaracionCliente);
      setSalesInputs(prev => ({ ...prev, [loteId]: 0 }));
      setInlineAddOpen(false);
      setSelectedLoteToLink('');
      
      alert("Producto agregado a la planilla de este mes.");
    } catch (e: any) {
      console.error(e);
      alert("Error al agregar producto: " + e.message);
    }
  };

  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    if (!confirm("¿Está seguro de remover este producto de la planilla de este mes? El saldo y stock se recalcularán automáticamente.")) return;
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const movDocRef = doc(db, 'crm_consignacion_lotes', loteId, 'movimientos', selectedMonth);
        await deleteDoc(movDocRef);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1 && allLotes[idx].movimientos) {
            delete allLotes[idx].movimientos[selectedMonth];
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }
      await loadLotes(declaracionCliente);
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

  const handleCreateNewClient = async () => {
    if (!newClientName.trim()) {
      alert("Por favor ingrese el nombre del cliente.");
      return;
    }
    try {
      const clientObj = {
        name: newClientName.trim(),
        rut: newClientRut.trim(),
        categoria: 'Consignación',
        createdAt: new Date().toISOString()
      };
      await localDB.saveToCollection('contacts', clientObj);
      alert(`Cliente "${newClientName}" registrado correctamente.`);
      setNewClientName('');
      setNewClientRut('');
      setShowAddClientForm(false);
      await loadClientes();
    } catch (e: any) {
      console.error(e);
      alert("Error al registrar cliente: " + e.message);
    }
  };

  const handleSaveAllMovements = async () => {
    if (!declaracionCliente) return;
    try {
      setSavingAllMovements(true);

      if (isFirebaseReady()) {
        const db = getDb();
        
        for (const lote of lotesActivos) {
          const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
          if (selectedMonth < startMonth) continue; // Skip if not delivered yet

          const currentSales = Number(salesInputs[lote.id] || 0);
          const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, currentSales);
          if (!traj) continue;

          // Save movement
          const movDocRef = doc(db, 'crm_consignacion_lotes', lote.id, 'movimientos', selectedMonth);
          await setDoc(movDocRef, {
            unidadesVendidas: currentSales,
            saldoAnterior: Number(traj.stockDisponible),
            saldoResultante: Number(traj.frascosRestantes),
            montoVentaNeto: Number(traj.montoVentaNeto),
            fechaRegistro: Timestamp.now()
          });

          // Update active status as metadata
          const loteRef = doc(db, 'crm_consignacion_lotes', lote.id);
          await setDoc(loteRef, {
            activo: traj.frascosRestantes > 0
          }, { merge: true });
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          allLotes.forEach((l: any) => {
            if (l.clienteId === declaracionCliente) {
              const startMonth = parseDateString(l.fechaEntrega).substring(0, 7);
              if (selectedMonth >= startMonth) {
                const currentSales = Number(salesInputs[l.id] || 0);
                const traj = getLoteTrajectoryUpToMonth(l, selectedMonth, currentSales);
                if (traj) {
                  if (!l.movimientos) l.movimientos = {};
                  l.movimientos[selectedMonth] = {
                    unidadesVendidas: currentSales,
                    saldoAnterior: Number(traj.stockDisponible),
                    saldoResultante: Number(traj.frascosRestantes),
                    montoVentaNeto: Number(traj.montoVentaNeto),
                    fechaRegistro: new Date().toISOString()
                  };
                  l.activo = traj.frascosRestantes > 0;
                }
              }
            }
          });
          localStorage.setItem(key, JSON.stringify(allLotes));
        }
      }

      alert(`Planilla de ventas para el mes de ${formatMonthName(selectedMonth)} guardada con éxito.`);
      await loadLotes(declaracionCliente);
    } catch (e: any) {
      console.error(e);
      alert('Error guardando la declaración mensual de ventas: ' + e.message);
    } finally {
      setSavingAllMovements(false);
    }
  };

  return (
    <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-2xl overflow-hidden min-h-[700px] flex flex-col font-sans">
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
          {uniqueProducts.map(p => (
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
                          <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">
                            ⚙️ Administración de Datos Fijos (Lotes Registrados)
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Visualice, edite y guarde los datos originales de todos los lotes del sistema sin espacio.
                          </p>
                        </div>
                      </div>

                      {/* Dropdown action buttons requested in Rule 5 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setShowAddLoteForm(!showAddLoteForm);
                            setShowAddClientForm(false);
                            setShowImportForm(false);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                            showAddLoteForm 
                              ? "bg-emerald-500 text-[#050914]" 
                              : "bg-[#050914] text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-[#050914]"
                          )}
                        >
                          <Plus size={14} />
                          Ingreso de Producto
                        </button>
                        <button
                          onClick={() => {
                            setShowAddClientForm(!showAddClientForm);
                            setShowAddLoteForm(false);
                            setShowImportForm(false);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                            showAddClientForm 
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
                            "px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md",
                            showImportForm 
                              ? "bg-purple-500 text-[#050914]" 
                              : "bg-[#050914] text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-[#050914]"
                          )}
                        >
                          <Upload size={14} />
                          Importar Productos
                        </button>
                      </div>

                      {/* Filters inside fixed data admin */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          className="bg-[#050914] text-slate-300 border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-sky-500"
                          value={adminFilterCliente}
                          onChange={(e) => setAdminFilterCliente(e.target.value)}
                        >
                          <option value="">📋 Todos los Clientes</option>
                          {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          className="bg-[#050914] text-white border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-sky-500"
                          value={adminFilterProducto}
                          onChange={(e) => setAdminFilterProducto(e.target.value)}
                        />
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
                              <input
                                type="text"
                                list="productos-datalist"
                                placeholder="Escribe o selecciona producto..."
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-emerald-500"
                                value={formEntrega.producto_id}
                                onChange={e => setFormEntrega({ ...formEntrega, producto_id: e.target.value })}
                                required
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
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-emerald-500 text-center"
                                value={formEntrega.unidades_iniciales}
                                onChange={e => setFormEntrega({ ...formEntrega, unidades_iniciales: parseInt(e.target.value) || 0 })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">$ Unit s/IVA</label>
                              <input
                                type="number"
                                min="0"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-emerald-500 text-center"
                                value={formEntrega.precio_unit_neto}
                                onChange={e => setFormEntrega({ ...formEntrega, precio_unit_neto: parseInt(e.target.value) || 0 })}
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

                      {/* Dropdown Form 2: Crear Cliente */}
                      {showAddClientForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-sky-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <h5 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                            <PlusCircle size={14} /> Registrar Nuevo Cliente en Consignación
                          </h5>
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
                                onClick={() => setShowAddClientForm(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleCreateNewClient}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-sky-500/10"
                              >
                                Crear Cliente
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dropdown Form 3: Importar Productos */}
                      {showImportForm && (
                        <div className="bg-[#0D1627] p-5 rounded-2xl border border-purple-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200 mb-2">
                          <h5 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Upload size={14} /> Importación de Productos en Consignación
                          </h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cliente Destinatario</label>
                              <ClientAutocomplete
                                clientes={clientes}
                                value={importClienteId}
                                onChange={setImportClienteId}
                                placeholder="Escriba para buscar cliente..."
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cargar Archivo CSV / de Texto</label>
                              <div 
                                className="border-2 border-dashed border-[#1E293B] hover:border-purple-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#050914]/40"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setImportText(event.target?.result as string || '');
                                    };
                                    reader.readAsText(file);
                                  }
                                }}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.csv,.txt';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        setImportText(event.target?.result as string || '');
                                      };
                                      reader.readAsText(file);
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce-slow" />
                                <span className="text-xs text-slate-300 font-bold block">Arrastre aquí su archivo CSV o haga clic para seleccionar</span>
                                <span className="text-[10px] text-slate-500 mt-1 block">Formatos soportados: .csv, .txt</span>
                              </div>
                            </div>

                            <div className="md:col-span-3">
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">O Pegar Datos Directamente</label>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setImportText("Producto;Solución;Vencimiento;Unidades;Precio\nARNICA CS;LOTE-A;2027-12-31;120;13500\nSARSAPARRILLA CS;LOTE-B;2027-08-15;150;14000");
                                  }}
                                  className="text-[10px] font-bold text-purple-400 hover:underline"
                                >
                                  Cargar Ejemplo
                                </button>
                              </div>
                              <textarea
                                rows={5}
                                placeholder="Producto;Solución;Vencimiento;Unidades;Precio&#10;ARNICA CS;LOTE-A;2027-12-31;100;13500"
                                className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-xl p-3 text-xs font-mono outline-none focus:border-purple-500"
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                              />
                              <p className="text-[9px] text-slate-400 mt-1">
                                Formato: <strong>Producto; Solución; Fecha Vencimiento (AAAA-MM-DD); Stock Inicial; Precio Unitario s/IVA</strong> (separado por Tabulaciones, comas o puntos y comas).
                              </p>
                            </div>

                            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImportForm(false);
                                  setImportText('');
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImportLotes(importText, importClienteId)}
                                className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-[#050914] font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-purple-500/10"
                              >
                                Importar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-slate-400 bg-sky-500/5 border border-sky-500/10 p-3.5 rounded-xl flex items-center gap-2 mb-2 font-medium">
                        <Info size={14} className="text-sky-400 flex-shrink-0" />
                        Edite los datos originales de cada producto en consignación. Los cambios actualizarán secuencialmente el stock remanente para los meses posteriores.
                      </div>
                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                        {todosLosLotes.filter(lote => {
                          if (adminFilterCliente && lote.clienteId !== adminFilterCliente) return false;
                          if (adminFilterProducto && !lote.productoId.toLowerCase().includes(adminFilterProducto.toLowerCase())) return false;
                          return true;
                        }).length > 0 ? (
                          todosLosLotes.filter(lote => {
                            if (adminFilterCliente && lote.clienteId !== adminFilterCliente) return false;
                            if (adminFilterProducto && !lote.productoId.toLowerCase().includes(adminFilterProducto.toLowerCase())) return false;
                            return true;
                          }).map(lote => {
                            const clientName = clientes.find(c => c.id === lote.clienteId)?.name || 'Cliente';
                            return (
                              <div key={lote.id} className="relative border-l-4 border-sky-500 pl-2">
                                <LoteFixedDataEditor 
                                  lote={lote} 
                                  uniqueProducts={uniqueProducts} 
                                  onRefresh={async () => {
                                    if (declaracionCliente) await loadLotes(declaracionCliente);
                                    await loadTodosLosLotes();
                                  }} 
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-slate-500 font-semibold text-xs">
                            No se encontraron lotes para los filtros seleccionados.
                          </div>
                        )}
                      </div>
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
                  <div className="bg-[#111A2E] p-5 rounded-2xl border border-[#1E293B] shadow-lg">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mes de Reporte</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
                          if (idx > 0) setSelectedMonth(MONTH_OPTIONS[idx - 1].value);
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
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
                          if (idx < MONTH_OPTIONS.length - 1) setSelectedMonth(MONTH_OPTIONS[idx + 1].value);
                        }}
                        disabled={selectedMonth === MONTH_OPTIONS[MONTH_OPTIONS.length - 1].value || !declaracionCliente}
                        className="p-2.5 bg-[#050914] hover:bg-[#1E293B]/40 disabled:opacity-30 border border-[#1E293B] rounded-xl text-slate-400 hover:text-white transition-all text-xs font-black"
                      >
                        ▶
                      </button>
                    </div>
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
                        const hasMov = item.lote.movimientos && item.lote.movimientos[selectedMonth] !== undefined;
                        return item.traj && item.traj.delivered && hasMov;
                      });

                      const filteredLotes = activeLotesForMonth.filter(item => {
                        if (replenishmentFilter === 'reposicion') {
                          return item.traj.frascosRestantes === 0;
                        }
                        if (replenishmentFilter === 'con-stock') {
                          return item.traj.frascosRestantes > 0;
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
                              <span className="bg-sky-500/15 text-sky-400 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-sky-500/20 shadow-lg">
                                📅 {formatMonthName(selectedMonth)}
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[10px] uppercase font-black tracking-widest text-slate-400">
                                  <tr>
                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 text-center">Stock Disponible</th>
                                    <th className="p-4 text-center bg-sky-500/5 text-sky-400 w-44">und vendida</th>
                                    <th className="p-4 text-center">$ vendido</th>
                                    <th className="p-4 text-center">Frascos Restantes en Stock</th>
                                    <th className="p-4 pr-6 text-center w-80">Reposición</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]/20 text-xs">
                                   {filteredLotes.length > 0 ? (
                                     filteredLotes.map(({ lote, traj }) => {
                                       const currentSales = salesInputs[lote.id] ?? 0;
                                       return (
                                         <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors">
                                           <td className="p-4 pl-6">
                                             <div className="flex items-start justify-between gap-2">
                                               <div className="font-black text-slate-200 text-sm">{lote.productoId}</div>
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
                                                   F. Venc: {parseDateString(lote.fechaVencimiento)}
                                                 </span>
                                               </div>
                                               
                                               {/* Replenishments History List */}
                                               {lote.reposiciones && lote.reposiciones.length > 0 && (
                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                   {lote.reposiciones.map((rep: any, idx: number) => (
                                                     <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-mono font-semibold">
                                                       Rep: +{rep.unidades} u ({rep.fecha})
                                                     </span>
                                                   ))}
                                                 </div>
                                               )}
                                             </div>
                                           </td>
                                           <td className="p-4 text-center text-slate-300 font-bold font-mono text-sm">
                                             {traj.stockDisponible} u.
                                           </td>
                                           <td className="p-4 text-center bg-sky-500/5">
                                             <div className="flex items-center justify-center gap-2">
                                               <input 
                                                 type="number"
                                                 min="0"
                                                 max={traj.stockDisponible}
                                                 className="bg-[#050914] border border-sky-500/30 rounded-lg p-2 text-sky-400 font-black w-24 text-center outline-none focus:border-sky-500 text-xs font-mono shadow-inner"
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
                                           <td className="p-4 text-center">
                                             <span className={cn(
                                               "font-black px-3 py-1 rounded-full font-mono text-xs",
                                               traj.frascosRestantes === 0
                                                 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                 : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                             )}>
                                               {traj.frascosRestantes} u.
                                             </span>
                                           </td>
                                           <td className="p-4 pr-6 text-center">
                                             {(() => {
                                               const isRepOpen = expandedRep[lote.id];
                                               return (
                                                 <div className="flex flex-col items-center justify-center gap-1.5">
                                                   <button
                                                     type="button"
                                                     onClick={() => setExpandedRep(prev => ({ ...prev, [lote.id]: !prev[lote.id] }))}
                                                     className={cn(
                                                       "p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border shadow-md active:scale-95 min-w-[125px]",
                                                       isRepOpen
                                                         ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                         : "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20"
                                                     )}
                                                   >
                                                     {isRepOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                                                     <span>{isRepOpen ? "Ocultar" : "Reposición"}</span>
                                                   </button>
                                                   
                                                   {isRepOpen && (
                                                     <div className="flex flex-col gap-1.5 p-2 bg-[#1A263E]/40 rounded-xl border border-sky-500/10 min-w-[200px] text-left mx-auto animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                                                         🔄 Reposición / Agregar Stock
                                                       </span>
                                                       <div className="grid grid-cols-2 gap-1.5">
                                                         <div>
                                                           <label className="text-[8px] text-slate-400 block mb-0.5 font-bold uppercase">Unidades</label>
                                                           <input 
                                                             type="number"
                                                             min="1"
                                                             placeholder="Cant."
                                                             className="w-full bg-[#050914] border border-[#1E293B] rounded-lg p-1 text-sky-400 font-bold text-center text-xs outline-none focus:border-sky-500 font-mono"
                                                             value={repUnits[lote.id] || ''}
                                                             onChange={e => setRepUnits(prev => ({ ...prev, [lote.id]: parseInt(e.target.value) || 0 }))}
                                                           />
                                                         </div>
                                                         <div>
                                                           <label className="text-[8px] text-slate-400 block mb-0.5 font-bold uppercase">Fecha</label>
                                                           <input 
                                                             type="date"
                                                             className="w-full bg-[#050914] border border-[#1E293B] rounded-lg p-1 text-slate-200 font-bold text-xs outline-none focus:border-sky-500 [color-scheme:dark]"
                                                             value={repDates[lote.id] || ''}
                                                             onChange={e => setRepDates(prev => ({ ...prev, [lote.id]: e.target.value }))}
                                                           />
                                                         </div>
                                                       </div>
                                                       <button
                                                         type="button"
                                                         onClick={() => handleSaveReplenishment(lote.id, repUnits[lote.id] || 0, repDates[lote.id] || '')}
                                                         className="w-full mt-1 bg-emerald-500 hover:bg-emerald-600 text-[#050914] font-black py-1.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95"
                                                       >
                                                         <Save size={10} /> Guardar Stock
                                                       </button>
                                                     </div>
                                                   )}
                                                 </div>
                                               );
                                             })()}
                                           </td>
                                         </tr>
                                       );
                                     })
                                   ) : (
                                     <tr>
                                       <td colSpan={6} className="p-12 text-center text-slate-500 font-semibold">
                                         No hay productos entregados o activos para el mes de {formatMonthName(selectedMonth)}.
                                       </td>
                                     </tr>
                                   )}

                                   {/* Manual inline product additions row with '+' button */}
                                   <tr>
                                     <td colSpan={6} className="p-4 border-t border-[#1E293B]/40 bg-[#0F172A]/30">
                                       {!inlineAddOpen ? (
                                         <button
                                           type="button"
                                           onClick={() => {
                                             setInlineAddOpen(true);
                                             setSelectedLoteToLink('');
                                           }}
                                           className="px-4 py-2 bg-[#1A263E]/60 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-dashed border-sky-500/35 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider active:scale-95"
                                         >
                                           <PlusCircle size={14} />
                                           Agregar Producto
                                         </button>
                                       ) : (
                                         <div className="bg-[#0D1627] p-5 rounded-2xl border border-sky-500/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                           <h5 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                                             <PlusCircle size={14} /> Agregar Producto de Datos Fijos a esta Planilla
                                           </h5>
                                           
                                           {(() => {
                                             const availableFixedLotes = lotesActivos.filter(l => {
                                               return !l.movimientos || l.movimientos[selectedMonth] === undefined;
                                             });

                                             if (availableFixedLotes.length === 0) {
                                               return (
                                                 <div className="text-slate-400 text-xs font-medium bg-[#111A2E]/55 p-4 rounded-xl border border-[#1E293B] flex flex-col gap-2">
                                                   <p>⚠️ No hay más productos/lotes registrados en Datos Fijos para este cliente que no estén ya en esta planilla.</p>
                                                   <p className="text-[11px] text-slate-500">
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
                                                  <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Seleccionar Producto (Lote Registrado en Datos Fijos)</label>
                                                    <select
                                                      className="w-full bg-[#050914] text-white border border-[#1E293B] rounded-lg p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                                                      value={selectedLoteToLink}
                                                      onChange={e => setSelectedLoteToLink(e.target.value)}
                                                    >
                                                      <option value="">-- Seleccionar de Datos Fijos --</option>
                                                      {availableFixedLotes.map(l => (
                                                        <option key={l.id} value={l.id}>
                                                          {l.productoId} - Solución: {l.solucionLote || 'S/L'} (Venc: {parseDateString(l.fechaVencimiento)}) - Stock Inicial: {l.unidadesIniciales} u. - [{formatCurrency(Number(l.precioUnitNeto) || 0)}/u]
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  
                                                  <div className="flex justify-end gap-2 pt-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setInlineAddOpen(false);
                                                        setSelectedLoteToLink('');
                                                      }}
                                                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                      Cancelar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleAddProductToMonthTemplate(selectedLoteToLink)}
                                                      className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-[#050914] font-black rounded-lg text-[10px] uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-sky-500/10"
                                                    >
                                                      <Check size={12} /> Agregar a Planilla
                                                    </button>
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
                                disabled={savingAllMovements || filteredLotes.length === 0}
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
                </div>

                {registroVentasCliente ? (
                  (() => {
                    const clientLotes = todosLosLotes.filter(l => l.clienteId === registroVentasCliente);
                    
                    // Compute current stock inventory to export
                    const inventoryStatus = clientLotes.map(lote => {
                      const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, 0);
                      return { lote, traj };
                    }).filter(item => item.traj);

                    // Summarize saved month templates
                    // Let's gather all months that have any saved movimientos
                    const monthSummaryMap: Record<string, { unidadesVendidas: number, montoVendido: number, count: number }> = {};
                    clientLotes.forEach(lote => {
                      if (lote.movimientos) {
                        Object.keys(lote.movimientos).forEach(m => {
                          const mov = lote.movimientos[m];
                          if (mov && Number(mov.unidadesVendidas) > 0) {
                            if (!monthSummaryMap[m]) {
                              monthSummaryMap[m] = { unidadesVendidas: 0, montoVendido: 0, count: 0 };
                            }
                            monthSummaryMap[m].unidadesVendidas += Number(mov.unidadesVendidas || 0);
                            monthSummaryMap[m].montoVendido += Number(mov.unidadesVendidas || 0) * (Number(lote.precioUnitNeto) || 0);
                            monthSummaryMap[m].count += 1;
                          }
                        });
                      }
                    });

                    const savedMonthsList = Object.entries(monthSummaryMap).map(([month, data]) => ({
                      month,
                      ...data
                    })).sort((a, b) => b.month.localeCompare(a.month));

                    // Function to export the remaining stock report as PDF
                    const handleExportStockPDF = () => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const doc = new jsPDF({ orientation: 'p' });
                      
                      // Title
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(14);
                      doc.setTextColor(30, 41, 59); // Slate 800
                      doc.text('REPORTE DE STOCK RESTANTE - CONSIGNACIÓN', 14, 18);
                      
                      // Metadata
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(100, 116, 139); // Slate 500
                      doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
                      doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 30);
                      
                      const headers = ['PRODUCTO', 'SOLUCIÓN', 'FECHA VENCIMIENTO', 'STOCK DISPONIBLE'];
                      const data = inventoryStatus.map(({ lote, traj }) => {
                        const venc = parseDateString(lote.fechaVencimiento);
                        return [
                          lote.productoId,
                          lote.solucionLote || 'S/S',
                          venc,
                          `${traj?.frascosRestantes || 0} unidades`
                        ];
                      });
                      
                      autoTable(doc, {
                        startY: 36,
                        head: [headers],
                        body: data,
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: {
                          textColor: [30, 58, 95], // PRIMARY_COLOR
                          fontSize: 9,
                          fontStyle: 'bold',
                          fillColor: [248, 250, 252], // Slate 50
                        },
                        styles: {
                          fontSize: 9,
                          cellPadding: 4,
                          textColor: [51, 65, 85], // Slate 700
                        },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body') {
                              doc.setDrawColor(226, 232, 240); // Slate 200 border
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });
                      
                      const finalY = (doc as any).lastAutoTable.finalY + 12;
                      doc.setFont('helvetica', 'italic');
                      doc.setFontSize(8);
                      doc.setTextColor(148, 163, 184); // Slate 400
                      doc.text('Generado desde el Módulo de Consignación S&E', 14, finalY);
                      
                      doc.save(`Reporte_Stock_Restante_${clientName.replace(/\s+/g, '_')}.pdf`);
                    };

                    // Function to download a quote-style sales report in PDF
                    const handleDownloadQuoteReport = (month: string, items: any[]) => {
                      const clientName = clientes.find(c => c.id === registroVentasCliente)?.name || 'Cliente';
                      const monthNameFormatted = formatMonthName(month);
                      const doc = new jsPDF({ orientation: 'p' });
                      
                      // Title
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(14);
                      doc.setTextColor(30, 41, 59); // Slate 800
                      doc.text('DECLARACIÓN DE VENTAS / CONSIGNACIÓN', 14, 18);
                      
                      // Metadata
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(100, 116, 139); // Slate 500
                      doc.text(`Cliente: ${clientName.toUpperCase()}`, 14, 25);
                      doc.text(`Periodo de Ventas: ${monthNameFormatted.toUpperCase()}`, 14, 30);
                      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 35);
                      
                      const headers = ['PRODUCTO', 'SOLUCIÓN', 'CANTIDAD', 'P. UNITARIO', 'TOTAL'];
                      let grandTotal = 0;
                      let totalUnits = 0;
                      const data = items.map(item => {
                        grandTotal += item.montoVendido;
                        totalUnits += item.unidadesVendidas;
                        return [
                          item.productoId,
                          item.solucionLote || 'S/S',
                          `${item.unidadesVendidas} u.`,
                          formatCurrency(item.precioUnitNeto),
                          formatCurrency(item.montoVendido)
                        ];
                      });
                      
                      // Push total row
                      data.push([
                        'TOTALES DECLARADOS',
                        '',
                        `${totalUnits} u.`,
                        '',
                        formatCurrency(grandTotal)
                      ]);
                      
                      autoTable(doc, {
                        startY: 42,
                        head: [headers],
                        body: data,
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: {
                          textColor: [30, 58, 95], // PRIMARY_COLOR
                          fontSize: 9,
                          fontStyle: 'bold',
                          fillColor: [248, 250, 252], // Slate 50
                        },
                        styles: {
                          fontSize: 9,
                          cellPadding: 4,
                          textColor: [51, 65, 85], // Slate 700
                        },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body') {
                              doc.setDrawColor(226, 232, 240); // Slate 200 border
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                           if (cellData.row.section === 'body' && cellData.row.index === data.length - 1) {
                              doc.setFont('helvetica', 'bold');
                              doc.setTextColor(30, 41, 59); // Dark slate
                           }
                        }
                      });
                      
                      let currentY = (doc as any).lastAutoTable.finalY + 15;
                      
                      // Notes
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(8.5);
                      doc.setTextColor(71, 85, 105);
                      doc.text('NOTAS:', 14, currentY);
                      currentY += 5;
                      
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(8);
                      doc.setTextColor(100, 116, 139);
                      doc.text('- Documento emitido para fines de control y cobro de consignación.', 14, currentY);
                      currentY += 4;
                      doc.text('- Los saldos y stock restante se actualizan automáticamente en el sistema.', 14, currentY);
                      currentY += 15;
                      
                      // Signatures
                      if (currentY + 20 < doc.internal.pageSize.getHeight()) {
                        doc.setDrawColor(203, 213, 225); // Slate 300
                        doc.setLineWidth(0.5);
                        
                        // Left signature line
                        doc.line(14, currentY, 80, currentY);
                        doc.text('Firma Cliente', 14, currentY + 4);
                        
                        // Right signature line
                        doc.line(130, currentY, 196, currentY);
                        doc.text('Firma Autorizada', 130, currentY + 4);
                      }
                      
                      doc.save(`Venta_Consignacion_${clientName.replace(/\s+/g, '_')}_${month}.pdf`);
                    };

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* 1. Inventory remaining stock list with export capabilities */}
                        <div className="bg-[#111A2E] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
                          <div className="p-5 border-b border-[#1E293B]/40 flex justify-between items-center bg-[#15233C]/10">
                            <div className="flex items-center gap-2">
                              <Package className="text-emerald-400" size={18} />
                              <div>
                                <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                                  Stock de Productos en Consignación
                                </h4>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportStockPDF}
                              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#050914] font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                            >
                              <Download size={12} />
                              Exportar Stock (PDF)
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-[#0D1627] border-b border-[#1E293B] text-[9px] uppercase font-black tracking-widest text-slate-400">
                                <tr>
                                  <th className="p-4 pl-6">Producto</th>
                                  <th className="p-4 text-center">F. Venc.</th>
                                  <th className="p-4 text-center">Stock Disponible</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1E293B]/10 text-xs">
                                {inventoryStatus.length > 0 ? (
                                  inventoryStatus.map(({ lote, traj }) => (
                                    <tr key={lote.id} className="hover:bg-[#1E293B]/10 transition-colors">
                                      <td className="p-4 pl-6">
                                        <div className="font-bold text-slate-200">{lote.productoId}</div>
                                        <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Solución: {lote.solucionLote || 'S/S'}</span>
                                      </td>
                                      <td className="p-4 text-center text-slate-400 font-semibold font-mono">
                                        {parseDateString(lote.fechaVencimiento)}
                                      </td>
                                      <td className="p-4 text-center">
                                        <span className={cn(
                                          "font-black px-2.5 py-1 rounded-full font-mono text-[11px]",
                                          (traj?.frascosRestantes || 0) === 0
                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                        )}>
                                          {traj?.frascosRestantes || 0} u.
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={3} className="p-12 text-center text-slate-500 font-bold">
                                      Este cliente no posee ningún producto registrado en consignación.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
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
                                  if (mov && Number(mov.unidadesVendidas) > 0) {
                                    return {
                                      productoId: lote.productoId,
                                      solucionLote: lote.solucionLote,
                                      unidadesVendidas: Number(mov.unidadesVendidas),
                                      precioUnitNeto: Number(lote.precioUnitNeto) || 0,
                                      montoVendido: Number(mov.unidadesVendidas) * (Number(lote.precioUnitNeto) || 0)
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
                                          <span className="text-sm font-black text-slate-100">{formatMonthName(m.month)}</span>
                                          <span className="text-[10px] text-slate-400 font-semibold">{itemsInMonth.length} soluciones declaradas</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-6">
                                        <div className="text-right">
                                          <div className="text-xs font-black font-mono text-slate-300">{m.unidadesVendidas} u.</div>
                                          <div className="text-[10px] text-slate-500 font-bold">Unidades</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs font-black font-mono text-emerald-400">{formatCurrency(m.montoVendido)}</div>
                                          <div className="text-[10px] text-slate-500 font-bold">Monto</div>
                                        </div>
                                      </div>
                                    </button>

                                    {/* Expanded Detail Panel */}
                                    {isExpanded && (
                                      <div className="p-4 bg-[#0A1120]/40 border-t border-sky-500/10 space-y-4 animate-in fade-in duration-200">
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
                                                    <div className="text-[9px] text-slate-500 font-mono">Solución: {item.solucionLote || 'S/S'}</div>
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

                                        {/* Download Quote Button */}
                                        <div className="flex justify-end pr-1">
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadQuoteReport(m.month, itemsInMonth)}
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
  const startMonth = parseDateString(lote.fechaEntrega).substring(0, 7);
  if (!startMonth) return null;
  if (targetMonth < startMonth) {
    return {
      delivered: false,
      stockDisponible: 0,
      ventas: 0,
      montoVentaNeto: 0,
      frascosRestantes: 0
    };
  }

  // Generate sequence of months from startMonth up to targetMonth
  const months: string[] = [];
  let [currYear, currMonth] = startMonth.split('-').map(Number);
  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);

  while (currYear < targetYear || (currYear === targetYear && currMonth <= targetMonthNum)) {
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
    
    runningStock += totalRepInMonth;

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
    unidadesIniciales: Number(lote.unidadesIniciales) || 100,
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
        const existing = localStorage.getItem(key);
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
            localStorage.setItem(key, JSON.stringify(allLotes));
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
        const existing = localStorage.getItem(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          allLotes = allLotes.filter((l: any) => l.id !== lote.id);
          localStorage.setItem(key, JSON.stringify(allLotes));
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
        <input 
          type="number"
          placeholder="Stock"
          className="w-full bg-[#050914] text-sky-400 border border-[#1E293B]/60 rounded-lg px-2 py-1.5 font-black text-center outline-none focus:border-sky-500 text-xs font-mono"
          value={form.unidadesIniciales}
          onChange={e => setForm({ ...form, unidadesIniciales: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="w-24">
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
          <span className="text-[10px] text-slate-400 font-bold block">Total Original</span>
          <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(form.unidadesIniciales * form.precioUnitNeto)}</span>
        </div>
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
