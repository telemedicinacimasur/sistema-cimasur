import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { addNotification } from '../../lib/notifications';
import { cn, formatDate, formatCurrency, safe, parseExcelDate } from '../../lib/utils';
import { exportTableToPDF, viewExpedienteInNewTab, exportExpedienteToPDF } from '../../lib/pdfUtils';
import { RecordActions } from '../../components/RecordActions';
import { 
  ShoppingCart, 
  Search, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  ClipboardList, 
  ListChecks, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Plus,
  Trash,
  Filter,
  Save,
  Package,
  Eye,
  EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Lists of built-in products
const MERCADO_LIBRE_PRODUCTS = [
  "ARNICA CS Salina",
  "MELISSA P CS SALINA",
  "BEILSCHMIEDIA CS SALINA",
  "CALOSTRUM CS SALINA",
  "COCCULUS CS SALINA",
  "MAQUI CS SALINA",
  "ECHINAC A CS SALINA",
  "MUCES CS SALINA",
  "KIT OSTEOARTICULAR CS SALINA",
  "KIT MODULADOR DIGESTIVO CS SALINA",
  "KIT VIAJE CS SALINA",
  "KIN FIN DE AÑO CS SALINA"
];

const TIENDA_PRODUCTS = [
  "Acqua Maris CS Salina",
  "allium s cs Salina",
  "Arnica CS Salina",
  "Beilschmiedia CS Salina",
  "Calostrum CS Salina",
  "Cina CS Salina",
  "Daucus CS Salina",
  "E.F. Aprende CS – Salina",
  "E.F. Cambios Cs – Salina",
  "E.F. Energia CS – Salina",
  "E.F. Libre CS – Salina",
  "E.F. Lider CS – Salina",
  "E.F. Miedos CS – Salina",
  "E.F. Rescue Remedy CS – Salina",
  "E.F. Senior CS – Salina",
  "E.F. Serenidad CS – Salina",
  "E.F.D. A – Arnica CS – Etanol",
  "E.F.D. D – Fuchsia CS – Etanol",
  "E.F.D. E – Dandelion CS – Etanol",
  "Echinac A CS – Salina",
  "Kalium Tic CS – Salina",
  "Kit Fin de Año – Salina",
  "Kit Modulador Digestivo – Salina",
  "Kit Viaje – Salina",
  "Maqui CS – Salina",
  "Melissa P CS – Salina",
  "Muces CS – Salina",
  "Neem CS – Salina",
  "Sarsaparrilla CS – Salina"
];

const exportTableToExcel = (title: string, headers: string[], data: any[][], fileName: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  const safeTitle = title.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, safeTitle);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

interface SaleItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

interface SaleRecord {
  id?: string;
  anio: string;
  mes: string;
  fecha: string;
  cliente: string;
  vendedor: 'Mercado Libre' | 'Tienda';
  nroFrascos: number;
  valorCotizacion: number; // Total de la venta
  detalleProductos: string; // Text representation
  productos: SaleItem[];
  comunaCiudad?: string;
  createdAt?: string;
}

export default function SalesTiendaMLManager() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [customProducts, setCustomProducts] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    anio: new Date().getFullYear().toString(),
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
    fecha: new Date().toISOString().split('T')[0],
    cliente: '',
    vendedor: 'Tienda' as 'Mercado Libre' | 'Tienda',
    valorCotizacion: 0,
    comunaCiudad: '',
  });

  // Current adding items array
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  
  // Single item temporary fields
  const [tempProduct, setTempProduct] = useState('');
  const [tempQty, setTempQty] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  // Custom product creation
  const [newCustomProduct, setNewCustomProduct] = useState('');
  const [showCustomProdForm, setShowCustomProdForm] = useState(false);

  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [filterYear, setFilterYear] = useState('Todos');
  const [filterVendedor, setFilterVendedor] = useState('Todos');
  const [filterProducto, setFilterProducto] = useState('Todos');
  
  const [showProductSummary, setShowProductSummary] = useState(false);
  const [showMontoConsolidado, setShowMontoConsolidado] = useState(true);

  const [loadRange, setLoadRange] = useState<'mes_actual' | 'anio_actual' | 'historico_completo'>(() => {
    return (localStorage.getItem('cimasur_admin_load_range') as any) || 'mes_actual';
  });

  const getQueryOptions = () => {
    if (loadRange === 'historico_completo') return undefined;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (loadRange === 'mes_actual') {
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      return {
        dateField: 'fecha',
        startDate: `${currentYear}-${pad(currentMonth + 1)}-01`,
        endDate: `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`
      };
    } else { // anio_actual
      return {
        dateField: 'fecha',
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`
      };
    }
  };

  const loadData = async () => {
    try {
      const options = getQueryOptions();
      const sales = await localDB.getCollection('sales_tienda_ml', options);
      setRecords(sales);

      const customs = await localDB.getCollection('sales_tienda_ml_custom_products');
      setCustomProducts(customs.map(c => c.nombre).filter(Boolean));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    
    const handleRefresh = () => {
      loadData();
    };
    
    window.addEventListener('db-change', handleRefresh);
    window.addEventListener('cimasur-refresh-underdemand', handleRefresh);
    
    return () => {
      window.removeEventListener('db-change', handleRefresh);
      window.removeEventListener('cimasur-refresh-underdemand', handleRefresh);
    };
  }, [loadRange]);

  useEffect(() => {
    const handleStoreChange = () => {
      const r = (localStorage.getItem('cimasur_admin_load_range') as any) || 'mes_actual';
      if (r !== loadRange) {
        setLoadRange(r);
      }
    };
    const interval = setInterval(handleStoreChange, 1000);
    return () => clearInterval(interval);
  }, [loadRange]);

  // Merge built-in + custom products based on channel
  const getProductOptions = (vendedor: 'Mercado Libre' | 'Tienda') => {
    const builtin = vendedor === 'Mercado Libre' ? MERCADO_LIBRE_PRODUCTS : TIENDA_PRODUCTS;
    const customsFiltered = customProducts.filter(p => !builtin.includes(p));
    return [...builtin, ...customsFiltered].sort((a,b) => a.localeCompare(b));
  };

  const activeProductOptions = getProductOptions(form.vendedor);

  // All products for filters
  const allAvailableProducts = [
    ...new Set([
      ...MERCADO_LIBRE_PRODUCTS,
      ...TIENDA_PRODUCTS,
      ...customProducts
    ])
  ].sort((a, b) => a.localeCompare(b));

  const handleAddNewCustomProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomProduct.trim()) return;
    try {
      if (customProducts.includes(newCustomProduct.trim())) {
        alert('Este producto ya existe en la lista');
        return;
      }
      await localDB.saveToCollection('sales_tienda_ml_custom_products', { nombre: newCustomProduct.trim() });
      setNewCustomProduct('');
      setShowCustomProdForm(false);
      loadData();
      alert('Producto guardado correctamente y ahora estará disponible para ser seleccionado.');
    } catch (err) {
      console.error(err);
    }
  };

   const handleAddSaleItem = () => {
    if (!tempProduct) {
      alert('Por favor seleccione un producto');
      return;
    }
    if (tempQty <= 0) {
      alert('La cantidad debe ser mayor que 0');
      return;
    }

    const newItem: SaleItem = {
      nombre: tempProduct,
      cantidad: tempQty,
      precioUnitario: tempPrice,
      total: tempQty * tempPrice
    };

    const updatedItems = [...saleItems, newItem];
    setSaleItems(updatedItems);

    // Auto-calculate and update form valorCotizacion
    const selectTotal = updatedItems.reduce((acc, current) => acc + current.total, 0);
    setForm(prev => ({ ...prev, valorCotizacion: selectTotal }));
    
    // Reset temp fields
    setTempProduct('');
    setTempQty(1);
    setTempPrice(0);
  };

  const handleRemoveSaleItem = (index: number) => {
    const updatedItems = saleItems.filter((_, i) => i !== index);
    setSaleItems(updatedItems);

    // Auto-calculate and update form valorCotizacion
    const selectTotal = updatedItems.reduce((acc, current) => acc + current.total, 0);
    setForm(prev => ({ ...prev, valorCotizacion: selectTotal }));
  };

  // Automatic month/year sync when date changes
  const handleDateChange = (val: string) => {
    if (!val) return;
    const dateObj = new Date(val + 'T00:00:00');
    const syncAnio = dateObj.getFullYear().toString();
    const syncMes = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(dateObj);
    setForm(prev => ({
      ...prev,
      fecha: val,
      anio: syncAnio,
      mes: syncMes.charAt(0).toUpperCase() + syncMes.slice(1)
    }));
  };

  const totalFrascos = saleItems.reduce((acc, current) => acc + current.cantidad, 0);
  const totalCotizacion = saleItems.reduce((acc, current) => acc + current.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      alert('Debe agregar al menos un producto a la venta.');
      return;
    }

    // Detalle products raw text fallback for search / compatibility
    const detailText = saleItems.map(item => `${item.cantidad}x ${item.nombre}`).join('\n');

    const finalRecord: SaleRecord = {
      ...form,
      productos: saleItems,
      nroFrascos: totalFrascos,
      valorCotizacion: form.valorCotizacion || totalCotizacion,
      detalleProductos: detailText
    };

    try {
      if (editingId) {
        await localDB.updateInCollection('sales_tienda_ml', editingId, finalRecord);
        await addAuditLog(user as any, `Actualizó Venta (${form.vendedor}) Cliente: ${form.cliente}`, 'Administración');
        setEditingId(null);
        alert('Venta actualizada con éxito.');
      } else {
        await localDB.saveToCollection('sales_tienda_ml', finalRecord);
        await addNotification({
          title: `Nueva Venta ${form.vendedor}`,
          message: `${user?.displayName || user?.email || 'Usuario'} ingresó venta de ${form.vendedor} por ${formatCurrency(form.valorCotizacion || totalCotizacion)} (${totalFrascos} frascos)`,
          recipientRoles: ['admin', 'gestion'],
          sender: user?.displayName || user?.email || 'Sistema'
        });
        await addAuditLog(user as any, `Registró Venta (${form.vendedor}) Cliente: ${form.cliente}`, 'Administración');
        alert('Venta registrada con éxito.');
      }

      // Reset Form fields
      setForm({
        anio: new Date().getFullYear().toString(),
        mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
        fecha: new Date().toISOString().split('T')[0],
        cliente: '',
        vendedor: form.vendedor, // Keep the last selected seller as preference
        valorCotizacion: 0,
        comunaCiudad: '',
      });
      setSaleItems([]);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar.');
    }
  };

  const handleEdit = (r: SaleRecord) => {
    setEditingId(r.id || null);
    setForm({
      anio: r.anio,
      mes: r.mes,
      fecha: r.fecha,
      cliente: r.cliente,
      vendedor: r.vendedor,
      valorCotizacion: r.valorCotizacion || 0,
      comunaCiudad: r.comunaCiudad || '',
    });
    setSaleItems(r.productos || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await localDB.deleteFromCollection('sales_tienda_ml', id);
      await addAuditLog(user as any, `Eliminó Venta Tienda/ML`, 'Administración');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al intentar eliminar.');
    }
  };

  // Downloader of Excel importer template
  const downloadExcelTemplate = () => {
    const headers = [
      ["Año", "Mes", "Fecha", "Cliente", "Vendedor (Tienda / Mercado Libre)", "Total de la venta", "Producto", "Cantidad", "Precio Unitario", "Total Venta Item"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas Especiales");
    XLSX.writeFile(wb, "plantilla_importacion_ventas_tienda_ml.xlsx");
  };

  // Excel file upload parser with robust structuring helper
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

        // Group rows by Date and Cliente first, to construct items arrays nicely
        const groupedSales: Record<string, {
          rowInfo: any;
          items: SaleItem[];
        }> = {};

        data.forEach(row => {
          const client = safe(row["Cliente"]);
          const dateVal = parseExcelDate(row["Fecha"]) || new Date().toISOString().split('T')[0];
          if (!client) return;

          const groupKey = `${dateVal}_${client}`;

          const prodName = safe(row["Producto"]);
          const qty = parseInt(safe(row["Cantidad"])) || 1;
          const price = parseInt(safe(row["Precio Unitario"])) || 0;
          const itemTotal = parseInt(safe(row["Total Venta Item"])) || (qty * price);

          if (!groupedSales[groupKey]) {
            groupedSales[groupKey] = {
              rowInfo: row,
              items: []
            };
          }

          if (prodName) {
            groupedSales[groupKey].items.push({
              nombre: prodName,
              cantidad: qty,
              precioUnitario: price,
              total: itemTotal
            });
          }
        });

        // Save imported records
        let importedCount = 0;
        const currentCollection = await localDB.getCollection('sales_tienda_ml');

        for (const [groupKey, group] of Object.entries(groupedSales)) {
          const row = group.rowInfo;
          const clientName = safe(row["Cliente"]) || 'CLIENTE GENÉRICO';
          const dateVal = parseExcelDate(row["Fecha"]) || new Date().toISOString().split('T')[0];

          // Prevent duplicates
          if (currentCollection.some(r => r.cliente === clientName && r.fecha === dateVal)) continue;

          const totalQty = group.items.reduce((sum, item) => sum + item.cantidad, 0);
          const totalVal = parseInt(safe(row["Total de la venta"])) || group.items.reduce((sum, item) => sum + item.total, 0);
          const detailProducts = group.items.map(item => `${item.cantidad}x ${item.nombre}`).join('\n');

          const rawVendedor = safe(row["Vendedor (Tienda / Mercado Libre)"]).trim();
          const syncVendedor: 'Mercado Libre' | 'Tienda' = rawVendedor.toLowerCase().includes('mercado') 
            ? 'Mercado Libre' 
            : 'Tienda';

          const newSale: SaleRecord = {
            anio: safe(row["Año"]) || new Date().getFullYear().toString(),
            mes: safe(row["Mes"]) || new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
            fecha: dateVal,
            cliente: clientName,
            vendedor: syncVendedor,
            productos: group.items,
            nroFrascos: totalQty,
            valorCotizacion: totalVal,
            detalleProductos: detailProducts
          };

          await localDB.saveToCollection('sales_tienda_ml', newSale);
          importedCount++;
        }

        await addAuditLog(user as any, `Importó ${importedCount} ventas Tienda / ML desde Excel`, 'Administración');
        alert(`Éxito: Se importaron ${importedCount} ventas de Tienda y Mercado Libre.`);
        loadData();
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error al procesar el archivo Excel. Asegúrese de que el formato coincida con la plantilla.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filters application
  const filteredRecords = records.filter(r => {
    let match = true;
    if (dateFrom && r.fecha < dateFrom) match = false;
    if (dateTo && r.fecha > dateTo) match = false;
    
    if (filterMonth !== 'Todos') {
      const formattedMonth = filterMonth.trim().toLowerCase();
      const matchMonth = (r.mes || '').trim().toLowerCase();
      if (matchMonth !== formattedMonth) match = false;
    }

    if (filterYear !== 'Todos' && r.anio !== filterYear) match = false;
    if (filterVendedor !== 'Todos' && r.vendedor !== filterVendedor) match = false;

    // Filter by specific product inside array
    if (filterProducto !== 'Todos') {
      const hasProduct = (r.productos || []).some(item => item.nombre === filterProducto);
      if (!hasProduct) match = false;
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = `${r.cliente || ''} ${r.comunaCiudad || ''} ${r.detalleProductos || ''}`.toLowerCase();
      if (!text.includes(s)) match = false;
    }

    return match;
  }).sort((a,b) => {
    const d = (b.fecha || '').localeCompare(a.fecha || '');
    if (d !== 0) return d;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Consolidation statistics
  const getConsolidatedProducts = () => {
    const counts: Record<string, { qty: number; total: number }> = {};
    
    filteredRecords.forEach(r => {
      (r.productos || []).forEach(item => {
        const key = item.nombre;
        if (!counts[key]) {
          counts[key] = { qty: 0, total: 0 };
        }
        counts[key].qty += item.cantidad;
        counts[key].total += item.total;
      });
    });
    
    return Object.entries(counts)
      .map(([name, statistics]) => ({ name, qty: statistics.qty, total: statistics.total }))
      .sort((a, b) => b.qty - a.qty);
  };

  const consolidated = getConsolidatedProducts();
  const listFrascos = filteredRecords.reduce((sum, r) => sum + (Number(r.nroFrascos) || 0), 0);
  const listCotizacion = filteredRecords.reduce((sum, r) => sum + (Number(r.valorCotizacion) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#152035] p-6 rounded-3xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" /> Detalle de Ventas Tienda y Mercado Libre
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">
            Estructura optimizada de ventas con desglose detallado para canales Tienda Física y Mercado Libre.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-2xl flex items-center gap-1.5 transition-colors uppercase font-black"
            title="Descargar Plantilla Excel de Ejemplo"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla
          </button>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/30 px-3 py-2 rounded-2xl flex items-center gap-1.5 transition-colors uppercase font-black"
          >
            <Upload className="w-3.5 h-3.5" /> Importar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-3 bg-[#152035] rounded-3xl border border-[#1E293B] shadow-xl overflow-hidden h-fit">
          <div className="bg-[#1E3A5F] text-white p-5 font-bold flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm uppercase">
              <PlusCircle className="w-5 h-5 text-sky-400" /> 
              {editingId ? 'Editar Detalle de Venta' : 'Registrar Nueva Venta'}
            </span>
            <span className="text-[10px] bg-[#111C31] px-2.5 py-1 rounded-full font-black text-sky-400">
              CIMASUR SYSTEMS
            </span>
          </div>

          <form className="p-4 space-y-4" onSubmit={handleSubmit}>
            
            {/* Seller Select Choice */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Canal de Vendedor</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, vendedor: 'Tienda', valorCotizacion: 0 }));
                    setSaleItems([]);
                  }}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-black uppercase border transition-all",
                    form.vendedor === 'Tienda' 
                      ? "bg-amber-600 border-amber-500 text-white shadow" 
                      : "bg-[#111C31] border-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  🏪 Tienda Online
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, vendedor: 'Mercado Libre', valorCotizacion: 0 }));
                    setSaleItems([]);
                  }}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-black uppercase border transition-all",
                    form.vendedor === 'Mercado Libre' 
                      ? "bg-yellow-600 border-yellow-500 text-white shadow" 
                      : "bg-[#111C31] border-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  📦 Mercado Libre
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="w-[45%]">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Fecha</label>
                <input 
                  type="date" 
                  className="w-full bg-[#111C31] text-white border border-[#1E3A5F]/60 rounded-lg p-2 text-[10px] font-bold outline-none focus:border-[#38BDF8]" 
                  value={form.fecha} 
                  onChange={e => handleDateChange(e.target.value)} 
                  required 
                />
              </div>
              <div className="w-[20%]">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Año</label>
                <input 
                  className="w-full bg-[#111C31]/50 text-slate-400 border border-[#1E3A5F]/40 rounded-lg p-2 text-[10px] font-bold font-mono outline-none text-center" 
                  value={form.anio} 
                  readOnly 
                />
              </div>
              <div className="w-[35%]">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Mes</label>
                <input 
                  className="w-full bg-[#111C31]/50 text-slate-400 border border-[#1E3A5F]/40 rounded-lg p-2 text-[10px] font-bold outline-none uppercase text-center" 
                  value={form.mes} 
                  readOnly 
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="w-[60%]">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Cliente</label>
                <input 
                  placeholder="Escriba aquí..."
                  className="w-full bg-[#111C31] text-white border border-[#1E3A5F]/60 rounded-lg p-2 text-[10px] font-bold uppercase outline-none focus:border-[#38BDF8]" 
                  value={form.cliente} 
                  onChange={e => setForm({...form, cliente: e.target.value})} 
                  required 
                />
              </div>
              <div className="w-[40%]">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Venta ($)</label>
                <input 
                  type="number"
                  placeholder="Ej: 15200"
                  className="w-full bg-[#111C31] text-white border border-[#1E3A5F]/60 rounded-lg p-2 text-[10px] font-bold outline-none focus:border-[#38BDF8] font-mono" 
                  value={form.vendedor === 'Mercado Libre' ? (form.valorCotizacion || totalCotizacion || '') : (saleItems.length > 0 ? totalCotizacion : (form.valorCotizacion || ''))} 
                  onChange={e => setForm({...form, valorCotizacion: parseInt(e.target.value) || 0})} 
                  readOnly={form.vendedor !== 'Mercado Libre' && saleItems.length > 0}
                  required 
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Comuna / Ciudad</label>
              <input 
                placeholder="Ej: Providencia, Temuco, La Serena"
                className="w-full bg-[#111C31] text-white border border-[#1E3A5F]/60 rounded-lg p-2 text-[10px] font-bold uppercase outline-none focus:border-[#38BDF8]" 
                value={form.comunaCiudad} 
                onChange={e => setForm({...form, comunaCiudad: e.target.value})} 
              />
            </div>

            {/* Custom Products creation helper */}
            <div className="border border-slate-700/60 p-3 rounded-xl bg-[#0A111F]/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Productos
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomProdForm(!showCustomProdForm)}
                  className="text-[9px] font-bold text-sky-400 hover:underline uppercase"
                >
                  {showCustomProdForm ? '[Cerrar Panel]' : '[+] Producto nuevo'}
                </button>
              </div>

              {showCustomProdForm && (
                <div className="space-y-2 mb-3 bg-[#111C31] p-3 rounded-xl border border-indigo-500/30 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Nombre del Producto Nuevo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="bg-[#0A111F] text-[10px] border border-indigo-500/20 rounded px-2.5 py-1.5 grow font-bold text-slate-200"
                      placeholder="Ej: Nuevo Producto..."
                      value={newCustomProduct}
                      onChange={e => setNewCustomProduct(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCustomProduct}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1.5 text-[9px] font-black uppercase shrink-0"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {/* Temp product item selection builder */}
              <div className="space-y-3 p-3 bg-[#111C31] rounded-xl border border-slate-800">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Seleccionar Producto</label>
                  <input
                    type="text"
                    list="product-list-options"
                    placeholder="Buscar o elegir producto..."
                    className="w-full bg-[#0A111F] text-slate-200 text-[10px] font-bold rounded p-2 border border-slate-700 outline-none"
                    value={tempProduct}
                    onChange={e => setTempProduct(e.target.value)}
                  />
                  <datalist id="product-list-options">
                    {activeProductOptions.map((prod, idx) => (
                      <option key={idx} value={prod} />
                    ))}
                  </datalist>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="w-[32%]">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cant</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full bg-[#0A111F] text-slate-200 text-[10px] font-bold rounded p-2 border border-slate-700 font-mono outline-none"
                      value={tempQty}
                      onChange={e => setTempQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-[38%]">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Precio Un ($)</label>
                    <input
                      type="number"
                      placeholder="Precio..."
                      className="w-full bg-[#0A111F] text-slate-200 text-[10px] font-bold rounded p-2 border border-slate-700 font-mono outline-none"
                      value={tempPrice}
                      onChange={e => setTempPrice(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-[30%]">
                    <button
                      type="button"
                      onClick={handleAddSaleItem}
                      className="w-full h-[34px] bg-slate-700 hover:bg-slate-600 font-black text-[10px] tracking-widest rounded-lg text-white uppercase flex items-center justify-center gap-1 border border-slate-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* List of currently added items inside this sale order */}
            {saleItems.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest block font-mono">
                  Desglose de Productos ({saleItems.length})
                </span>
                <div className="bg-[#0A111F] border border-[#1E3A5F]/30 rounded-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                  {saleItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#111C31]/70 p-2.5 rounded-xl border border-slate-800 text-xs hover:bg-[#111C31] transition-all">
                      <div className="grow mr-4">
                        <span className="block font-bold text-slate-100 uppercase text-[11px] truncate">{item.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {item.cantidad} unidades x {formatCurrency(item.precioUnitario)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-[#38BDF8] font-mono">{formatCurrency(item.total)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSaleItem(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover de esta Venta"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resume Summary totals */}
            <div className="p-3 bg-[#1E3A5F]/30 rounded-xl border border-[#1E3A5F]/70 flex items-center justify-between mt-4">
              <div>
                <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest block">Total Frascos/Unidades</span>
                <span className="text-lg font-black text-white font-mono">{totalFrascos}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest block">Total Venta ($)</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{formatCurrency(form.valorCotizacion)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="w-full bg-[#1E3A5F] hover:bg-[#254B7B] text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
              >
                {editingId ? 'ACTUALIZAR VENTA' : 'GUARDAR VENTA'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      anio: new Date().getFullYear().toString(),
                      mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date()),
                      fecha: new Date().toISOString().split('T')[0],
                      cliente: '',
                      vendedor: 'Tienda',
                      valorCotizacion: 0,
                    });
                    setSaleItems([]);
                  }}
                  className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-2.5 rounded-xl hover:bg-red-600/30 text-[10px] font-black uppercase"
                >
                  Cancelar
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Right Column: Historical Sales List & Filters */}
        <div className="lg:col-span-9 space-y-5">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#152035] rounded-3xl p-5 border border-[#1E293B] shadow-lg relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Monto Consolidado</span>
                <button
                  type="button"
                  onClick={() => setShowMontoConsolidado(!showMontoConsolidado)}
                  className="text-slate-400 hover:text-sky-400 transition-colors p-1"
                  title={showMontoConsolidado ? "Ocultar Monto Consolidado" : "Mostrar Monto Consolidado"}
                >
                  {showMontoConsolidado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-rose-500" />}
                </button>
              </div>
              <span className="text-xl font-extrabold text-[#38BDF8] font-mono">
                {showMontoConsolidado 
                  ? listCotizacion.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
                  : '$ ••••••'}
              </span>
            </div>
            <div className="bg-[#152035] rounded-3xl p-5 border border-[#1E293B] shadow-lg">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Volumen Despachado</span>
              <span className="text-xl font-extrabold text-white font-mono">{listFrascos} frascos</span>
            </div>
            <div className="bg-[#152035] rounded-3xl p-5 border border-[#1E293B] shadow-lg">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad Transacciones</span>
              <span className="text-xl font-extrabold text-amber-500 font-mono">{filteredRecords.length} ventas</span>
            </div>
          </div>

          <div className="bg-[#152035] rounded-3xl border border-[#1E293B] shadow-xl overflow-hidden">
            
            {/* Rich Filters Header */}
            <div className="p-5 bg-[#1E3A5F]/80 border-b border-[#1E293B] space-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <h3 className="text-xs font-black uppercase text-white tracking-widest">
                  Registro Histórico de Ventas
                </h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => {
                      const listPrecioUnitario = filteredRecords.reduce((acc, r) => acc + (r.productos?.reduce((pAcc, p) => pAcc + (p.precioUnitario || 0), 0) || 0), 0);
                      const data = filteredRecords.map(r => {
                        const itemsStr = r.productos?.map(p => `${p.cantidad}x ${p.nombre}`).join('\n') || r.detalleProductos || '';
                        const pricesStr = r.productos?.map(p => formatCurrency(p.precioUnitario)).join('\n') || '';
                        const clientWithLocation = r.comunaCiudad ? `${r.cliente} (${r.comunaCiudad})` : r.cliente || '';
                        return [
                          formatDate(r.fecha), 
                          r.vendedor, 
                          clientWithLocation, 
                          itemsStr,
                          pricesStr,
                          r.nroFrascos || 0, 
                          formatCurrency(r.valorCotizacion || form.valorCotizacion || 0)
                        ];
                      });
                      data.push(['', '', 'TOTAL CONSOLIDADO', '', formatCurrency(listPrecioUnitario), listFrascos, formatCurrency(listCotizacion)]);
                      exportTableToPDF(
                        'Reporte Ventas Tienda y ML', 
                        ['Fecha', 'Canal', 'Cliente / Comuna', 'Productos Detalle', 'Precio Unitario ($)', 'Unidades', 'Total de la Venta ($)'], 
                        data, 
                        'reporte_ventas_tienda_ml', 
                        'l'
                      );
                    }}
                    className="text-white bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase hover:bg-[#38BDF8]/30 flex items-center gap-1.5"
                    title="Exportar registros filtrados a PDF"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                  <button 
                    onClick={() => {
                      const listPrecioUnitario = filteredRecords.reduce((acc, r) => acc + (r.productos?.reduce((pAcc, p) => pAcc + (p.precioUnitario || 0), 0) || 0), 0);
                      const headers = ['Año', 'Mes', 'Fecha Exacta', 'Canal Vendedor', 'Cliente', 'Comuna / Ciudad', 'Detalle Productos', 'Precio Unitario ($)', 'Total Frascos/Unidades', 'Total de la Venta ($)'];
                      const data = filteredRecords.map(r => {
                        const itemsStr = r.productos?.map(p => `${p.cantidad}x ${p.nombre}`).join(', ') || r.detalleProductos || '';
                        const pricesStr = r.productos?.map(p => formatCurrency(p.precioUnitario)).join(', ') || '';
                        return [
                          r.anio, 
                          r.mes, 
                          formatDate(r.fecha), 
                          r.vendedor, 
                          r.cliente || '', 
                          r.comunaCiudad || '',
                          itemsStr,
                          pricesStr,
                          r.nroFrascos || 0, 
                          r.valorCotizacion || 0
                        ];
                      });
                      data.push(['', '', '', '', 'TOTAL CONSOLIDADO', '', '', '', listFrascos, listCotizacion]);
                      exportTableToExcel('Ventas Tienda y Mercado Libre', headers, data, 'ventas_tienda_ml_reporte');
                    }}
                    className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 border border-emerald-500/50 shadow"
                    title="Exportar registros filtrados a Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
                  </button>
                  <button 
                    onClick={() => setShowProductSummary(!showProductSummary)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 transition-all shadow",
                      showProductSummary ? "bg-red-700 text-white" : "bg-red-600 text-white hover:bg-red-700"
                    )}
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Consolidar Productos
                  </button>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* Search Quick filter */}
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-300 tracking-wider">Búsqueda rápida</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      placeholder="Doc, cliente..." 
                      className="pl-8 pr-3 py-2 w-full bg-[#111C31] border border-[#1E3A5F]/40 outline-none text-[10px] rounded-lg text-white font-bold placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Vendedor Filter */}
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-300 tracking-wider">Filtrar Canal</label>
                  <select 
                    className="w-full bg-[#111C31] text-sky-400 border border-[#1E3A5F]/40 p-2 text-[10px] rounded-lg outline-none font-bold"
                    value={filterVendedor}
                    onChange={e => setFilterVendedor(e.target.value)}
                  >
                    <option value="Todos">Todos los canales</option>
                    <option value="Tienda">🏪 Tienda Física</option>
                    <option value="Mercado Libre">📦 Mercado Libre</option>
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-300 tracking-wider">Mes</label>
                  <select 
                    className="w-full bg-[#111C31] text-slate-200 border border-[#1E3A5F]/40 p-2 text-[10px] rounded-lg outline-none font-bold uppercase"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                  >
                    <option value="Todos">Todos los meses</option>
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Product filter */}
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-300 tracking-wider">Filtrar por Producto</label>
                  <select 
                    className="w-full bg-[#111C31] text-amber-400 border border-[#1E3A5F]/40 p-2 text-[10px] rounded-lg outline-none font-bold"
                    value={filterProducto}
                    onChange={e => setFilterProducto(e.target.value)}
                  >
                    <option value="Todos">Cualquier producto</option>
                    {allAvailableProducts.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Exact Date range filters */}
              <div className="flex gap-4 p-2 bg-[#111C31]/55 rounded-xl border border-slate-700/60 text-[10px] flex-col md:flex-row items-center font-bold">
                <span className="text-slate-400 uppercase tracking-widest text-[8px] mr-1">Rango Exacto de Fecha:</span>
                <div className="flex items-center gap-1 grow w-full md:w-auto">
                  <span className="text-slate-500">Desde:</span>
                  <input type="date" className="bg-[#0A111F] rounded px-2 py-1 text-slate-200" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 grow w-full md:w-auto">
                  <span className="text-slate-500">Hasta:</span>
                  <input type="date" className="bg-[#0A111F] rounded px-2 py-1 text-slate-200" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                {(dateFrom || dateTo) && (
                  <button 
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-red-400 hover:text-red-300 font-bold uppercase text-[9px] shrink-0"
                  >
                    Limpiar Rango
                  </button>
                )}
              </div>

            </div>

            {/* Consolidated products summary list */}
            {showProductSummary && (
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20 animate-in slide-in-from-top duration-300 space-y-3">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-amber-500" /> Resumen de Productos Vendidos
                </h4>
                <div className="bg-[#0A111F]/50 max-h-56 overflow-y-auto border border-amber-500/10 rounded-2xl">
                  {consolidated.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest p-2 text-left border-b border-slate-800 bg-[#111C31]">
                          <th className="p-3">Nombre del Producto</th>
                          <th className="p-3 text-center w-24">Cantidad</th>
                          <th className="p-3 text-right w-32">Total Recaudado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {consolidated.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#111C31]/50">
                            <td className="p-3 font-bold text-slate-300 uppercase text-[10px]">{item.name}</td>
                            <td className="p-3 text-center">
                              <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-black text-[10px] font-mono">
                                {item.qty} u.
                              </span>
                            </td>
                            <td className="p-3 text-right font-black font-mono text-[#38BDF8]">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-8 text-center text-xs text-slate-400 italic">No hay productos vendidos en este filtro.</p>
                  )}
                </div>
                <div className="text-[9px] font-bold text-slate-400 flex justify-between uppercase">
                  <span>Mostrando {consolidated.length} productos diferentes</span>
                  <button
                    onClick={() => {
                      const text = consolidated.map(i => `${i.qty}x ${i.name}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Resumen copiado al portapapeles.');
                    }}
                    className="text-amber-500 hover:text-amber-400 hover:underline"
                  >
                    Copiar Formulario Resumido
                  </button>
                </div>
              </div>
            )}

            {/* Main Table of Records */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-[#111C31] text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Canal</th>
                    <th className="p-4">Cliente / Desglose</th>
                    <th className="p-4 text-center w-32">Cant / Unidades</th>
                    <th className="p-4 text-right">Precio Unitario ($)</th>
                    <th className="p-4 text-right">Total de la Venta ($)</th>
                    <th className="p-4 text-center">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#152035]/20">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-[#111C31]/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-400 whitespace-nowrap">
                        {formatDate(r.fecha)}
                      </td>
                      <td className="p-4 font-mono">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                          r.vendedor === 'Mercado Libre' 
                            ? "bg-yellow-500/15 text-yellow-500" 
                            : "bg-amber-500/15 text-amber-500"
                        )}>
                          {r.vendedor}
                        </span>
                      </td>
                      <td className="p-4 max-w-sm">
                        <span className="block font-black text-slate-100 uppercase text-[11px] truncate">{r.cliente}</span>
                        {r.comunaCiudad && (
                          <span className="block text-[10px] text-sky-400 font-bold uppercase mt-1">
                            📍 {r.comunaCiudad}
                          </span>
                        )}
                        <div className="mt-1 space-y-1">
                          {r.productos && r.productos.length > 0 ? (
                            r.productos.map((prod, pIdx) => (
                              <div key={pIdx} className="text-[10px] text-slate-300 flex items-center gap-1.5 uppercase font-medium">
                                <span className="text-amber-500">🎯</span> {prod.nombre}
                              </div>
                            ))
                          ) : (
                            <span className="block text-[10px] text-slate-400 mt-1 whitespace-pre-line leading-relaxed italic border-l-2 border-slate-700/60 pl-2">
                              {r.detalleProductos}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-white text-[13px] font-mono w-32">
                        {r.productos && r.productos.length > 0 ? (
                          <div className="space-y-1.5">
                            {r.productos.map((prod, pIdx) => (
                              <div key={pIdx} className="font-extrabold text-[12px] py-0.5">
                                {prod.cantidad} x
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-extrabold">{r.nroFrascos}</span>
                        )}
                      </td>
                      <td className="p-4 text-right text-amber-400 text-[13px] font-mono">
                        {r.productos && r.productos.length > 0 ? (
                          <div className="space-y-1.5">
                            {r.productos.map((prod, pIdx) => (
                              <div key={pIdx} className="font-semibold text-[11px] py-0.5">
                                {formatCurrency(prod.precioUnitario)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400 text-[13px] font-mono whitespace-nowrap">
                        {formatCurrency(r.valorCotizacion)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <RecordActions
                            module="manager"
                            onView={() => {
                              const itemsList = r.productos || [];
                              const data = [
                                { label: 'Canal', value: r.vendedor },
                                { label: 'Fecha', value: formatDate(r.fecha) },
                                { label: 'Nombre Cliente', value: r.cliente },
                                { label: 'Comuna / Ciudad', value: r.comunaCiudad || 'No registrada' },
                                { label: 'Frascos totales', value: `${r.nroFrascos} frascos` },
                                { label: 'Monto Total Venta', value: formatCurrency(r.valorCotizacion) },
                                { 
                                  label: 'Detalle de Productos', 
                                  value: itemsList.map(item => `${item.cantidad}x ${item.nombre} (${formatCurrency(item.precioUnitario)} c/u)`).join('\n') 
                                }
                              ];
                              viewExpedienteInNewTab(`Expediente Especial Venta: ${r.cliente}`, data, `detalles_venta_${r.cliente}`);
                            }}
                            onDownload={() => {
                              const itemsList = r.productos || [];
                              const data = [
                                { label: 'Canal', value: r.vendedor },
                                { label: 'Fecha', value: formatDate(r.fecha) },
                                { label: 'Nombre Cliente', value: r.cliente },
                                { label: 'Comuna / Ciudad', value: r.comunaCiudad || 'No registrada' },
                                { label: 'Frascos totales', value: `${r.nroFrascos} frascos` },
                                { label: 'Monto Total Venta', value: formatCurrency(r.valorCotizacion) },
                                { 
                                  label: 'Detalle de Productos', 
                                  value: itemsList.map(item => `${item.cantidad}x ${item.nombre} (${formatCurrency(item.precioUnitario)} c/u)`).join('\n') 
                                }
                              ];
                              exportExpedienteToPDF(`Expediente Especial Venta: ${r.cliente}`, data, `detalles_venta_${r.cliente}`);
                            }}
                            onEdit={() => handleEdit(r)}
                            onDelete={() => handleDelete(r.id || '')}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 italic">
                        No se encontraron registros de ventas que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredRecords.length > 0 && (
                  <tfoot className="bg-[#111C31] border-t-2 border-slate-700 font-bold">
                    <tr className="text-slate-200">
                      <td colSpan={3} className="p-4 text-left font-black uppercase text-[10px] tracking-widest text-[#38BDF8]">
                        SUMA TOTAL CONSOLIDADA
                      </td>
                      <td className="p-4 text-center font-black text-amber-400 text-[14px] font-mono whitespace-nowrap">
                        {listFrascos} u.
                      </td>
                      <td className="p-4 text-right">
                        {/* Empty spacing space under Unit Prices */}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400 text-[14px] font-mono whitespace-nowrap">
                        {showMontoConsolidado ? formatCurrency(listCotizacion) : '$ ••••••'}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
