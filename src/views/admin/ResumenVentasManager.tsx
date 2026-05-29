import React, { useState, useEffect } from 'react';
import { localDB } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area
} from 'recharts';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Search, FileText, FileSpreadsheet, Download, Upload, Eye, EyeOff } from 'lucide-react';
import { exportExpedienteToPDF } from '../../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ALL_YEARS = Array.from({ length: 2026 - 2014 + 1 }, (_, i) => 2014 + i);

const YEAR_BLOCKS = [
  [2014, 2015, 2016, 2017],
  [2018, 2019, 2020, 2021],
  [2022, 2023, 2024, 2025],
  [2026]
];

const CHART_WINDOWS = [
  { label: '2023-2026', years: [2023, 2024, 2025, 2026] },
  { label: '2022-2025', years: [2022, 2023, 2024, 2025] },
  { label: '2021-2024', years: [2021, 2022, 2023, 2024] },
  { label: '2020-2023', years: [2020, 2021, 2022, 2023] },
  { label: '2019-2022', years: [2019, 2020, 2021, 2022] },
  { label: '2018-2021', years: [2018, 2019, 2020, 2021] }
];

export default function ResumenVentasManager() {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // View Filter
  const [viewFilter, setViewFilter] = useState<'all' | 'frascos' | 'pesos'>('all');

  // Date Range Filters
  const [desde, setDesde] = useState({ year: 2026, month: 0 });
  const [hasta, setHasta] = useState({ year: 2026, month: 11 });

  // Chart Windows
  const [frascosScale, setFrascosScale] = useState<'month' | 'quarter' | 'year'>('month');
  const [pesosScale, setPesosScale] = useState<'month' | 'quarter' | 'year'>('month');
  const [hideFrascos, setHideFrascos] = useState(false);
  const [hideRecaudacion, setHideRecaudacion] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({ year: 2026, month: 0, frascos: '', pesos: '', metaFrascos: '', metaPesos: '' });
  
  const [showMetaAnualModal, setShowMetaAnualModal] = useState(false);
  const [metaAnualForm, setMetaAnualForm] = useState({ year: 2026, metaFrascosAnual: '', metaPesosAnual: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const ovrds = await localDB.getCollection('ventas_overrides');
      
      const ovMap: Record<string, any> = {};
      ovrds.forEach(o => {
          ovMap[o.id] = o;
      });
      setOverrides(ovMap);
      
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-10 font-bold text-white text-center">Cargando matrices de análisis...</div>;

  // Helper getters using manual overrides
  const getFrascos = (year: number, month: number) => {
      const manual = overrides[`${year}-${month}`]?.frascos;
      return Number(manual) || 0;
  };
  const getPesos = (year: number, month: number) => {
      const manual = overrides[`${year}-${month}`]?.pesos;
      return Number(manual) || 0;
  };
  const getMetaFrascos = (year: number, month: number) => {
      const manual = overrides[`${year}-${month}`]?.metaFrascos;
      return Number(manual) || 0;
  };
  const getMetaPesos = (year: number, month: number) => {
      const manual = overrides[`${year}-${month}`]?.metaPesos;
      return Number(manual) || 0;
  };
  const getMetaFrascosAnual = (year: number) => {
      const manual = overrides[`${year}-annual`]?.metaFrascosAnual;
      return Number(manual) || 0;
  };
  const getMetaPesosAnual = (year: number) => {
      const manual = overrides[`${year}-annual`]?.metaPesosAnual;
      return Number(manual) || 0;
  };

  const currentYears = Array.from({ length: hasta.year - desde.year + 1 }, (_, i) => desde.year + i);

  // Filtro Date Range verification function
  const isDateInRange = (y: number, m: number) => {
      const d = y * 12 + m;
      const start = desde.year * 12 + desde.month;
      const end = hasta.year * 12 + hasta.month;
      return d >= start && d <= end;
  };

  const FULL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Filtro de meses para no mostrar los que no coinciden con search si se usa
  const filteredMonths = MONTHS.map((m, idx) => ({ m, idx, full: FULL_MONTHS[idx] })).filter(({ m, idx, full }) => {
     if (!searchTerm) return true;
     const term = searchTerm.toLowerCase();
     if (m.toLowerCase().includes(term)) return true;
     if (full.toLowerCase().includes(term)) return true;
     // Check if any value in current block matches
     for (const y of currentYears) {
         if (String(y).includes(term)) return true;
         if (String(getFrascos(y, idx)).includes(term)) return true;
         if (String(getPesos(y, idx)).includes(term)) return true;
     }
     return false;
  });

  // Chart Data Generator
  const getChartData = (years: number[], scale: string, type: 'frascos' | 'pesos') => {
      let data: any[] = [];
      
      if (scale === 'year') {
          years.forEach(y => {
              let val = 0; let active = false;
              filteredMonths.forEach(({ idx: m }) => {
                  if (isDateInRange(y, m)) {
                      active = true;
                      val += type === 'frascos' ? getFrascos(y, m) : getPesos(y, m);
                  }
              });
              if (active) data.push({ name: String(y), valor: val });
          });
      } else if (scale === 'quarter') {
          years.forEach(y => {
              for(let q=0; q<4; q++){
                  let val = 0; let active = false;
                  for(let m=0; m<3; m++) {
                     const mIdx = q*3+m;
                     if (isDateInRange(y, mIdx) && filteredMonths.some(fm => fm.idx === mIdx)) {
                         active = true;
                         val += type === 'frascos' ? getFrascos(y, mIdx) : getPesos(y, mIdx);
                     }
                  }
                  if (active) data.push({ name: `${y} Q${q+1}`, valor: val });
              }
          });
      } else {
          // Agrupamos por mes real (Categoría: Nombre del Mes)
          // Cada objeto tendrá claves para cada año seleccionado: { name: 'Enero', '2014': val, '2015': val }
          filteredMonths.forEach(({ m, idx }) => {
              let monthEntry: any = { name: m };
              let hasData = false;
              years.forEach(y => {
                  if (isDateInRange(y, idx)) {
                      const val = type === 'frascos' ? getFrascos(y, idx) : getPesos(y, idx);
                      monthEntry[String(y)] = val;
                      if (val > 0) hasData = true;
                  }
              });
              if (hasData || !searchTerm) data.push(monthEntry);
          });
      }
      return data;
  };

  const evalNumeric = (val: string | number) => {
      if (val === undefined || val === null || val === "") return "";
      try {
          const clean = String(val).replace(/[^\d+*/().-]/g, '');
          if (!clean) return "";
          const result = new Function(`return ${clean}`)();
          return String(result);
      } catch {
          return String(val);
      }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const overrideKey = `${modalForm.year}-${modalForm.month}`;
          const payload = {
              id: overrideKey, // Use deterministic ID for Firestore
              overrideKey,
              frascos: evalNumeric(modalForm.frascos),
              pesos: evalNumeric(modalForm.pesos),
              metaFrascos: evalNumeric(modalForm.metaFrascos),
              metaPesos: evalNumeric(modalForm.metaPesos)
          };

          // saveToCollection now handles upserts if payload has an id
          const savedDoc = await localDB.saveToCollection('ventas_overrides', payload);
          
          setOverrides(prev => ({...prev, [overrideKey]: savedDoc}));
          setShowModal(false);
      } catch (err) {
          console.error(err);
          alert('Error al guardar los cambios: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      }
  };

  const handleSaveMetaAnual = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const overrideKey = `${metaAnualForm.year}-annual`;
          const payload = {
              id: overrideKey,
              overrideKey,
              year: metaAnualForm.year,
              metaFrascosAnual: metaAnualForm.metaFrascosAnual,
              metaPesosAnual: metaAnualForm.metaPesosAnual
          };

          const savedDoc = await localDB.saveToCollection('ventas_overrides', payload);
          setOverrides(prev => ({...prev, [overrideKey]: savedDoc}));
          setShowMetaAnualModal(false);
      } catch (err) {
          console.error(err);
          alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      }
  };

  const openMetaAnualModalFor = (y: number) => {
      const exist: any = Object.values(overrides).find((o: any) => o.overrideKey === `${y}-annual` || o.id === `${y}-annual`) || {};
      setMetaAnualForm({
          year: y,
          metaFrascosAnual: exist.metaFrascosAnual || '',
          metaPesosAnual: exist.metaPesosAnual || ''
      });
      setShowMetaAnualModal(true);
  };

  const openModalFor = (y: number, m: number) => {
      const exist: any = Object.values(overrides).find((o: any) => o.overrideKey === `${y}-${m}` || o.id === `${y}-${m}`) || {};
      setModalForm({
          year: y,
          month: m,
          frascos: exist.frascos ?? '',
          pesos: exist.pesos ?? '',
          metaFrascos: exist.metaFrascos ?? '',
          metaPesos: exist.metaPesos ?? ''
      });
      setShowModal(true);
  };

  const exportPDF = async () => {
        const headers = ['MES', ...currentYears.map(String)];
        
        const tables = [];
        const images: string[] = [];

        // Calculation of totals for summarized section
        let totalFrascos = 0;
        let countFrascos = 0;
        let totalPesos = 0;
        let countPesos = 0;

        // Capture frascos chart
        if (viewFilter === 'all' || viewFilter === 'frascos') {
             const chartF = document.getElementById('chart-frascos');
             if (chartF) {
                 // Add temporary title for capture
                 const titleEl = document.createElement('div');
                 titleEl.innerText = `UNIDADES FRASCOS - AÑOS ${currentYears.join(', ')}`;
                 titleEl.style.color = '#FBBF24';
                 titleEl.style.fontWeight = 'bold';
                 titleEl.style.textAlign = 'center';
                 titleEl.style.marginBottom = '10px';
                 chartF.prepend(titleEl);
                 
                 const dataUrl = await toPng(chartF, { backgroundColor: '#0D1527', pixelRatio: 1.5 });
                 images.push(dataUrl);
                 
                 chartF.removeChild(titleEl);
             }

             // Frascos Table rows
             const frascosRows = [];
             MONTHS.forEach((m, idx) => {
                 const rowCells = [m.toUpperCase()];
                 currentYears.forEach(y => {
                     const v = getFrascos(y, idx);
                     if (isDateInRange(y, idx)) {
                         totalFrascos += v;
                         countFrascos++;
                     }
                     rowCells.push(String(v || '-'));
                 });
                 frascosRows.push(rowCells);
             });
             const arrTotalsFrascos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) t += getFrascos(y, i); return String(t || '-');
             });
             frascosRows.push(['TOTAL ANUAL', ...arrTotalsFrascos]);
             
             tables.push({
                 title: `Unidades: Frascos (${currentYears[0]} - ${currentYears[currentYears.length-1]})`,
                 headers,
                 rows: frascosRows
             });
        }
        
        // Capture pesos chart
        if (viewFilter === 'all' || viewFilter === 'pesos') {
             const chartP = document.getElementById('chart-pesos');
             if (chartP) {
                 // Add temporary title for capture
                 const titleEl = document.createElement('div');
                 titleEl.innerText = `RECAUDACIÓN PESOS - AÑOS ${currentYears.join(', ')}`;
                 titleEl.style.color = '#10B981';
                 titleEl.style.fontWeight = 'bold';
                 titleEl.style.textAlign = 'center';
                 titleEl.style.marginBottom = '10px';
                 chartP.prepend(titleEl);

                 const dataUrl = await toPng(chartP, { backgroundColor: '#0D1527', pixelRatio: 1.5 });
                 images.push(dataUrl);

                 chartP.removeChild(titleEl);
             }

             // Pesos Table rows
             const pesosRows = [];
             MONTHS.forEach((m, idx) => {
                 const rowCells = [m.toUpperCase()];
                 currentYears.forEach(y => {
                     const v = getPesos(y, idx);
                     if (isDateInRange(y, idx)) {
                         totalPesos += v;
                         countPesos++;
                     }
                     rowCells.push(v > 0 ? `$${v.toLocaleString('es-CL')}` : '-');
                 });
                 pesosRows.push(rowCells);
             });
             const arrTotalsPesos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) t += getPesos(y, i); return t > 0 ? `$${t.toLocaleString('es-CL')}` : '-';
             });
             pesosRows.push(['TOTAL ANUAL $', ...arrTotalsPesos]);
             
             tables.push({
                 title: `Recaudación: Pesos (${currentYears[0]} - ${currentYears[currentYears.length-1]})`,
                 headers,
                 rows: pesosRows
             });
        }

        const avgFrascos = countFrascos > 0 ? (totalFrascos / countFrascos).toFixed(1) : 0;
        const avgPesos = countPesos > 0 ? (totalPesos / countPesos) : 0;

        exportExpedienteToPDF(
            'REPORTE ANALÍTICO DE VENTAS',
            [
                { label: 'Filtro Activo', value: viewFilter === 'all' ? 'Unidades y Pesos' : viewFilter === 'frascos' ? 'Solo Unidades' : 'Solo Pesos' },
                { label: 'Rango de Años', value: `${currentYears.join(', ')}` },
                { label: 'Período', value: `${MONTHS[desde.month]} ${desde.year} - ${MONTHS[hasta.month]} ${hasta.year}` },
                { label: 'Fecha de Emisión', value: new Date().toLocaleString('es-CL') },
                { label: '---', value: '---' },
                { label: 'Total Acumulado Frascos', value: totalFrascos.toLocaleString('es-CL') },
                { label: 'Total Promedio Frascos', value: String(avgFrascos) },
                { label: 'Total Acumulado Pesos', value: `$${totalPesos.toLocaleString('es-CL')}` },
                { label: 'Total Promedio Pesos', value: `$${Math.round(avgPesos).toLocaleString('es-CL')}` }
            ],
            `rep_ventas_${desde.year}_${Date.now()}`,
            tables,
            'l', 
            7, 14, 10, 7, // Smaller font sizes to fit
            images
        );
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (viewFilter === 'all' || viewFilter === 'frascos') {
        const dataFrascos: any[][] = [['MES', ...currentYears.map(String)]];
        MONTHS.forEach((m, idx) => {
            dataFrascos.push([m.toUpperCase(), ...currentYears.map(y => getFrascos(y, idx))]);
        });
        const wsFrascos = XLSX.utils.aoa_to_sheet(dataFrascos);
        XLSX.utils.book_append_sheet(wb, wsFrascos, "Frascos");
    }

    if (viewFilter === 'all' || viewFilter === 'pesos') {
        const dataPesos: any[][] = [['MES', ...currentYears.map(String)]];
        MONTHS.forEach((m, idx) => {
            dataPesos.push([m.toUpperCase(), ...currentYears.map(y => getPesos(y, idx))]);
        });
        const wsPesos = XLSX.utils.aoa_to_sheet(dataPesos);
        XLSX.utils.book_append_sheet(wb, wsPesos, "Pesos");
    }

    XLSX.writeFile(wb, `analisis_ventas_${Date.now()}.xlsx`);
  }

  const downloadImportTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['AÑO', 'MES', 'FRASCOS', 'PESOS', 'META_FRASCOS_ANUAL', 'META_PESOS_ANUAL'],
        [2024, 'Ene', 150, 2500000, 2400, 36000000],
        [2024, 'Feb', 180, 2800000, 2400, 36000000]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Importacion");
    XLSX.writeFile(wb, "plantilla_importacion_general.xlsx");
  }

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
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            let updatesCount = 0;

            for (const row of data) {
                const y = Number(row['AÑO']);
                const mesRaw = row['MES'];
                let m = -1;

                if (typeof mesRaw === 'number') {
                    if (mesRaw >= 1 && mesRaw <= 12) m = mesRaw - 1;
                    else if (mesRaw >= 0 && mesRaw <= 11) m = mesRaw;
                } else if (mesRaw instanceof Date) {
                    m = mesRaw.getMonth();
                } else {
                    const mesStr = String(mesRaw || '').toLowerCase().trim();
                    m = MONTHS.findIndex(mon => mon.toLowerCase() === mesStr);
                    if (m === -1) m = FULL_MONTHS.findIndex(mon => mon.toLowerCase() === mesStr);
                    // Variaciones comunes para septiembre y otros meses si fuera necesario
                    if (m === -1) {
                        if (['set', 'sept', 'setiembre', 'sep.'].includes(mesStr)) m = 8;
                        if (['ene.', 'enero'].includes(mesStr)) m = 0;
                        if (['feb.', 'febrero'].includes(mesStr)) m = 1;
                        if (['mar.', 'marzo'].includes(mesStr)) m = 2;
                        if (['abr.', 'abril'].includes(mesStr)) m = 3;
                        if (['may.', 'mayo'].includes(mesStr)) m = 4;
                        if (['jun.', 'junio'].includes(mesStr)) m = 5;
                        if (['jul.', 'julio'].includes(mesStr)) m = 6;
                        if (['ago.', 'agosto'].includes(mesStr)) m = 7;
                        if (['oct.', 'octubre'].includes(mesStr)) m = 9;
                        if (['nov.', 'noviembre'].includes(mesStr)) m = 10;
                        if (['dic.', 'diciembre'].includes(mesStr)) m = 11;
                    }
                }
                
                if (isNaN(y) || y < 2014 || y > 2026 || m < 0 || m > 11) continue;

                const key = `${y}-${m}`;
                const f = row['FRASCOS'] !== undefined ? row['FRASCOS'] : undefined;
                const p = row['PESOS'] !== undefined ? row['PESOS'] : undefined;
                const mfAnual = row['META_FRASCOS_ANUAL'] !== undefined ? Number(row['META_FRASCOS_ANUAL']) : undefined;
                const mpAnual = row['META_PESOS_ANUAL'] !== undefined ? Number(row['META_PESOS_ANUAL']) : undefined;

                const current = overrides[key] || {};
                
                const newData = {
                    ...current,
                    id: key,
                    overrideKey: key,
                    year: y,
                    month: m,
                    frascos: f !== undefined ? String(f) : (current.frascos || ''),
                    pesos: p !== undefined ? String(p) : (current.pesos || ''),
                };
                await localDB.saveToCollection('ventas_overrides', newData);

                // Save annual metas if present
                if (mfAnual !== undefined || mpAnual !== undefined) {
                    const annualKey = `${y}-annual`;
                    const currentAnnual = overrides[annualKey] || {};
                    const annualData = {
                        id: annualKey,
                        year: y,
                        metaFrascosAnual: mfAnual !== undefined ? mfAnual : (currentAnnual.metaFrascosAnual || ''),
                        metaPesosAnual: mpAnual !== undefined ? mpAnual : (currentAnnual.metaPesosAnual || '')
                    };
                    await localDB.saveToCollection('ventas_overrides', annualData);
                }
                
                updatesCount++;
            }

            alert(`Éxito: Se importaron/actualizaron ${updatesCount} registros.`);
            
            // Reload
            const ovrds = await localDB.getCollection('ventas_overrides');
            const ovMap: Record<string, any> = {};
            ovrds.forEach(o => { ovMap[o.id] = o; });
            setOverrides(ovMap);

        } catch (error) {
            console.error(error);
            alert('Error al importar Excel');
        }
    };
    reader.readAsBinaryString(file);
    // reset input
    if (e.target) e.target.value = '';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 pb-20">
        
        {/* CABECERA ÚNICA DE CONTROL */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#1C2541] p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#38BDF8]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
                <h1 className="text-white font-bold text-3xl tracking-tight">Dashboard Analítico</h1>
                <p className="text-slate-400 text-sm mt-1">Control integral de unidades productivas y recaudación</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto relative z-10">
                <button 
                    onClick={() => openModalFor(2026, new Date().getMonth())}
                    className="flex-1 md:flex-none bg-[#38BDF8] text-[#0F172A] font-black text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#7DDBFF] shadow-lg border border-[#38BDF8] transition-all active:scale-95 uppercase tracking-wider"
                >
                    <Edit3 className="w-4 h-4" /> Gestión de Datos
                </button>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <button className="w-full bg-[#1e293b] text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#334155] border border-slate-700 transition-all uppercase tracking-wider">
                            <Upload className="w-4 h-4 text-[#38BDF8]" /> Importar
                        </button>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={importExcel}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>
                    <button 
                        onClick={downloadImportTemplate}
                        className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#334155] border border-slate-700 transition-all uppercase tracking-wider"
                        title="Descargar Plantilla Excel"
                    >
                        <Download className="w-4 h-4" /> Plantilla
                    </button>
                </div>
            </div>
        </div>

        {/* BARRA DE HERRAMIENTAS OPERATIVA */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1C2541]/80 px-5 py-4 rounded-xl border border-slate-700 backdrop-blur-md shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Filtrar registros..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#0D1527] border border-slate-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none transition-all placeholder-slate-500"
                    />
                </div>
                
                <div className="flex bg-[#0D1527] p-1 rounded-lg border border-slate-700 w-full sm:w-auto">
                    <button 
                        onClick={() => setViewFilter('all')} 
                        className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all", viewFilter === 'all' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                    >
                        Ambos
                    </button>
                    <button 
                        onClick={() => setViewFilter('frascos')} 
                        className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all", viewFilter === 'frascos' ? "bg-yellow-400 text-black" : "text-slate-400 hover:text-white")}
                    >
                        Unidades
                    </button>
                    <button 
                        onClick={() => setViewFilter('pesos')} 
                        className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all", viewFilter === 'pesos' ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white")}
                    >
                        Pesos
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col xl:flex-row items-center w-full md:w-auto justify-between md:justify-end gap-3 xl:gap-5">
                {/* GLOBAL DATE RANGE SELECTOR */}
                <div className="flex items-center gap-2 bg-[#0D1527] p-2 rounded-lg border border-slate-700 shadow-inner">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Desde:</span>
                        <select className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer" value={desde.month} onChange={e => setDesde({...desde, month: Number(e.target.value)})}>
                            {MONTHS.map((m, i) => <option key={i} value={i} className="text-black">{m}</option>)}
                        </select>
                        <select className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer" value={desde.year} onChange={e => setDesde({...desde, year: Number(e.target.value)})}>
                            {ALL_YEARS.map(y => <option key={y} value={y} className="text-black">{y}</option>)}
                        </select>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Hasta:</span>
                        <select className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer" value={hasta.month} onChange={e => setHasta({...hasta, month: Number(e.target.value)})}>
                            {MONTHS.map((m, i) => <option key={i} value={i} className="text-black">{m}</option>)}
                        </select>
                        <select className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer" value={hasta.year} onChange={e => setHasta({...hasta, year: Number(e.target.value)})}>
                            {ALL_YEARS.map(y => <option key={y} value={y} className="text-black">{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    <button onClick={exportPDF} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-rose-500/20 whitespace-nowrap">
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={exportExcel} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-emerald-500/20 whitespace-nowrap">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                </div>
            </div>
        </div>

        {/* SECCIÓN 1: MÓDULO DE UNIDADES (FRASCOS) */}
        {(viewFilter === 'all' || viewFilter === 'frascos') && (
        <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-[17px] font-black text-yellow-400 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Módulo de Unidades: Frascos
                    </h3>
                    <button 
                        onClick={() => setHideFrascos(!hideFrascos)} 
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition"
                        title={hideFrascos ? "Mostrar datos" : "Ocultar datos"}
                    >
                        {hideFrascos ? <EyeOff className="w-4.5 h-4.5 text-sky-400" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                </div>
                
                {(() => {
                    let sum = 0; let count = 0;
                    filteredMonths.forEach(({ idx: m }) => {
                        currentYears.forEach(y => {
                            if (isDateInRange(y, m)) {
                                sum += getFrascos(y, m);
                                count++;
                            }
                        });
                    });
                    const avg = count > 0 ? (sum / count).toFixed(1) : 0;
                    return (
                        <div className="flex bg-[#0D1527] rounded-xl border border-slate-700 overflow-hidden shadow-inner w-full sm:w-auto">
                             <div className="px-4 py-2 border-r border-slate-700">
                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-widest leading-tight">Total Acumulado</span>
                                <span className="text-sm font-black text-white">{hideFrascos ? '******' : sum.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="px-4 py-2">
                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-widest leading-tight">Total Promedio</span>
                                <span className="text-sm font-black text-yellow-400">{hideFrascos ? '******' : avg}</span>
                            </div>
                        </div>
                    );
                })()}
            </div>
            
            {/* TABLA FRASCOS COMPACTA */}
            <div className="overflow-x-auto custom-scrollbar-white rounded-lg border border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-[#0D1527] text-slate-300">
                        <tr>
                            <th className="py-2.5 px-4 font-bold border-b border-slate-600 bg-[#0D1527] w-24 tracking-wide">MES</th>
                            {currentYears.map(y => <th key={y} className="py-2.5 px-4 font-bold border-b border-slate-600 text-center tracking-wide">{y}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-[#152035] text-white">
                        {filteredMonths.map(({ m, idx }) => (
                            <tr key={m} className="border-b border-slate-800/50 hover:bg-[#1E293B] transition-colors group">
                                <td className="py-2 px-4 font-bold border-r border-slate-700 text-slate-400 group-hover:text-white uppercase tracking-wider text-[11px]">{m}</td>
                                {currentYears.map(y => {
                                    const val = getFrascos(y, idx);
                                    const inRange = isDateInRange(y, idx);
                                    const hasOverride = overrides[`${y}-${idx}`]?.frascos !== undefined && overrides[`${y}-${idx}`]?.frascos !== '';
                                    return (
                                        <td key={y} onDoubleClick={() => openModalFor(y, idx)} className={cn("py-2 px-4 text-center cursor-pointer hover:bg-yellow-400/10 border-r border-slate-800/60 transition-colors", !inRange && "opacity-20")}>
                                            <span className={cn("font-medium", hasOverride && "text-yellow-400 underline decoration-dotted")}>{hideFrascos ? '***' : (val || '-')}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        
                        {/* TOTAL / META / DIFERENCIA FRASCOS */}
                        <tr className="bg-yellow-400/10 text-yellow-500 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Total Filtrado</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                filteredMonths.forEach(({ idx: m }) => {
                                    if (isDateInRange(y, m)) totalYear += getFrascos(y, m);
                                });
                                return <td key={y} className="py-2.5 px-4 text-center border-r border-slate-800/50">{hideFrascos ? '******' : (totalYear > 0 ? totalYear.toLocaleString('es-CL') : '-')}</td>;
                            })}
                        </tr>
                        <tr className="bg-[#0D1527] text-slate-300 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Meta Anual</td>
                            {currentYears.map(y => {
                                const metaAnual = getMetaFrascosAnual(y);
                                const hasOverride = overrides[`${y}-annual`]?.metaFrascosAnual !== undefined && overrides[`${y}-annual`]?.metaFrascosAnual !== '';
                                return <td key={y} onDoubleClick={() => openMetaAnualModalFor(y)} className="py-2.5 px-4 text-center border-r border-slate-800/50 cursor-pointer hover:bg-yellow-400/10 transition-colors">
                                    <span className={hasOverride ? "text-yellow-400 underline decoration-dotted" : ""}>
                                        {hideFrascos ? '******' : (metaAnual > 0 ? metaAnual.toLocaleString('es-CL') : '-')}
                                    </span>
                                </td>;
                            })}
                        </tr>
                        <tr className="bg-[#1C2541] text-white font-black border-t border-slate-600">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide bg-slate-800/50">Diferencia</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                filteredMonths.forEach(({ idx: m }) => {
                                    if (isDateInRange(y, m)) totalYear += getFrascos(y, m);
                                });
                                const metaAnual = getMetaFrascosAnual(y);
                                if(totalYear === 0 || metaAnual === 0) return <td key={y} className="py-2.5 px-4 border-r border-slate-800 text-center bg-slate-800/30">-</td>;
                                const diff = totalYear - metaAnual;
                                return <td key={y} className={cn("py-2.5 px-4 text-center border-r border-slate-800", diff < 0 ? "text-rose-400 bg-rose-500/5" : "text-green-400 bg-green-500/5")}>{hideFrascos ? '******' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-CL')}`}</td>;
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* GRÁFICO FRASCOS INTEGRADO */}
            <div className="pt-4 border-t border-slate-700/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h4 className="text-slate-400 font-bold text-[11px] uppercase tracking-widest pl-1">Estacionalidad Unidades</h4>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-[#0D1527] p-1 rounded-lg border border-slate-700 gap-1">
                            {(['month', 'quarter', 'year'] as const).map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setFrascosScale(p)} 
                                    className={cn(
                                        "px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all", 
                                        frascosScale === p ? "bg-yellow-400 text-[#0F172A]" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trim' : 'Año'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div id="chart-frascos" className="h-64 md:h-72 w-full bg-[#0D1527] rounded-xl p-4 border border-slate-700/50 pt-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData(currentYears, frascosScale, 'frascos')} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={10} tickCount={5} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px' }} itemStyle={{ fontWeight: 700 }} cursor={{ fill: '#1E293B', opacity: 0.4 }} />
                            {frascosScale === 'month' ? (
                                currentYears.map((y, i) => (
                                    <Bar key={y} dataKey={String(y)} name={String(y)} fill={['#FBBF24', '#38BDF8', '#818CF8', '#FB7185', '#34D399'][i % 5]} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                ))
                            ) : (
                                <Bar dataKey="valor" name="Frascos" fill="#FBBF24" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        )}

        {/* SECCIÓN 2: MÓDULO MONETARIO (PESOS) */}
        {(viewFilter === 'all' || viewFilter === 'pesos') && (
        <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-[17px] font-black text-emerald-400 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Módulo Monetario: Recaudación $
                    </h3>
                    <button 
                        onClick={() => setHideRecaudacion(!hideRecaudacion)} 
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition"
                        title={hideRecaudacion ? "Mostrar datos" : "Ocultar datos"}
                    >
                        {hideRecaudacion ? <EyeOff className="w-4.5 h-4.5 text-sky-400" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                </div>
                
                {(() => {
                    let sum = 0; let count = 0;
                    filteredMonths.forEach(({ idx: m }) => {
                        currentYears.forEach(y => {
                            if (isDateInRange(y, m)) {
                                sum += getPesos(y, m);
                                count++;
                            }
                        });
                    });
                    const avg = count > 0 ? (sum / count) : 0;
                    return (
                        <div className="flex bg-[#0D1527] rounded-xl border border-slate-700 overflow-hidden shadow-inner w-full sm:w-auto">
                            <div className="px-4 py-2 border-r border-slate-700">
                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-widest leading-tight">Total Acumulado</span>
                                <span className="text-sm font-black text-white">{hideRecaudacion ? '******' : `$${sum.toLocaleString('es-CL')}`}</span>
                            </div>
                            <div className="px-4 py-2">
                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-widest leading-tight">Total Promedio</span>
                                <span className="text-sm font-black text-emerald-400">{hideRecaudacion ? '******' : `$${Math.round(avg).toLocaleString('es-CL')}`}</span>
                            </div>
                        </div>
                    );
                })()}
            </div>
            
            {/* TABLA PESOS COMPACTA */}
            <div className="overflow-x-auto custom-scrollbar-white rounded-lg border border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-[#0D1527] text-slate-300">
                        <tr>
                            <th className="py-2.5 px-4 font-bold border-b border-slate-600 bg-[#0D1527] w-24 tracking-wide">MES</th>
                            {currentYears.map(y => <th key={y} className="py-2.5 px-4 font-bold border-b border-slate-600 text-center tracking-wide">{y}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-[#152035] text-white">
                        {filteredMonths.map(({ m, idx }) => (
                            <tr key={m} className="border-b border-slate-800/50 hover:bg-[#1E293B] transition-colors group">
                                <td className="py-2 px-4 font-bold border-r border-slate-700 text-slate-400 group-hover:text-white uppercase tracking-wider text-[11px]">{m}</td>
                                {currentYears.map(y => {
                                    const val = getPesos(y, idx);
                                    const inRange = isDateInRange(y, idx);
                                    const hasOverride = overrides[`${y}-${idx}`]?.pesos !== undefined && overrides[`${y}-${idx}`]?.pesos !== '';
                                    return (
                                        <td key={y} onDoubleClick={() => openModalFor(y, idx)} className={cn("py-2 px-4 text-center cursor-pointer hover:bg-emerald-400/10 border-r border-slate-800/60 transition-colors", !inRange && "opacity-20")}>
                                            <span className={cn("font-medium", hasOverride ? "text-yellow-400 border-b border-dashed border-yellow-400" : "text-emerald-300/90")}>
                                                {hideRecaudacion ? '******' : (val > 0 ? `$${val.toLocaleString('es-CL')}` : '-')}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        
                        {/* TOTAL / META / DIFERENCIA PESOS */}
                        <tr className="bg-emerald-500/10 text-emerald-400 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Total Filtrado $</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                filteredMonths.forEach(({ idx: m }) => {
                                    if (isDateInRange(y, m)) totalYear += getPesos(y, m);
                                });
                                return <td key={y} className="py-2.5 px-4 text-center border-r border-slate-800/50">{hideRecaudacion ? '******' : (totalYear > 0 ? `$${totalYear.toLocaleString('es-CL')}` : '-')}</td>;
                            })}
                        </tr>
                        <tr className="bg-[#0D1527] text-slate-300 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Meta Anual $</td>
                            {currentYears.map(y => {
                                const metaAnual = getMetaPesosAnual(y);
                                const hasOverride = overrides[`${y}-annual`]?.metaPesosAnual !== undefined && overrides[`${y}-annual`]?.metaPesosAnual !== '';
                                return <td key={y} onDoubleClick={() => openMetaAnualModalFor(y)} className="py-2.5 px-4 text-center border-r border-slate-800/50 cursor-pointer hover:bg-emerald-400/10 transition-colors">
                                    <span className={hasOverride ? "text-emerald-400 underline decoration-dotted" : ""}>
                                        {hideRecaudacion ? '******' : (metaAnual > 0 ? `$${metaAnual.toLocaleString('es-CL')}` : '-')}
                                    </span>
                                </td>;
                            })}
                        </tr>
                        <tr className="bg-[#1C2541] text-white font-black border-t border-slate-600">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide bg-slate-800/50">Diferencia $</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                filteredMonths.forEach(({ idx: m }) => {
                                    if (isDateInRange(y, m)) totalYear += getPesos(y, m);
                                });
                                const metaAnual = getMetaPesosAnual(y);
                                if(totalYear === 0 || metaAnual === 0) return <td key={y} className="py-2.5 px-4 border-r border-slate-800 text-center bg-slate-800/30">-</td>;
                                const diff = totalYear - metaAnual;
                                return <td key={y} className={cn("py-2.5 px-4 text-center border-r border-slate-800", diff < 0 ? "text-rose-400 bg-rose-500/5" : "text-green-400 bg-green-500/5")}>{hideRecaudacion ? '******' : `${diff > 0 ? '+' : ''}$${diff.toLocaleString('es-CL')}`}</td>;
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* GRÁFICO PESOS INTEGRADO */}
            <div className="pt-4 border-t border-slate-700/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h4 className="text-slate-400 font-bold text-[11px] uppercase tracking-widest pl-1">Estacionalidad Recaudación</h4>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-[#0D1527] p-1 rounded-lg border border-slate-700 gap-1">
                            {(['month', 'quarter', 'year'] as const).map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setPesosScale(p)} 
                                    className={cn(
                                        "px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all", 
                                        pesosScale === p ? "bg-emerald-500 text-[#0F172A]" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trim' : 'Año'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div id="chart-pesos" className="h-64 md:h-72 w-full bg-[#0D1527] rounded-xl p-4 border border-slate-700/50 pt-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData(currentYears, pesosScale, 'pesos')} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} opacity={0.5} />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `$${(v/1000)}k`} width={50} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px' }} itemStyle={{ fontWeight: 700 }} formatter={(val: number) => `$${val.toLocaleString('es-CL')}`} cursor={{ fill: '#1E293B', opacity: 0.4 }} />
                            {pesosScale === 'month' ? (
                                currentYears.map((y, i) => (
                                    <Bar key={y} dataKey={String(y)} name={String(y)} fill={['#10B981', '#38BDF8', '#6366F1', '#EC4899', '#F59E0B'][i % 5]} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                ))
                            ) : (
                                <Bar dataKey="valor" name="Pesos" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        )}

        {/* MODAL GESTION DATOS */}
        {showModal && (
            <div className="fixed inset-0 z-[100] bg-[#0D1527]/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-[#1C2541] rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl relative">
                    <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors bg-[#0D1527] p-2 rounded-full border border-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Gestión de Datos</h2>
                    <p className="text-sm text-slate-400 mb-6 border-b border-slate-700 pb-4">Ajustes directos sobre métricas mensuales por sistema.</p>
                    
                    <form onSubmit={handleSaveModal} className="space-y-6">
                        <div className="flex gap-4 p-4 bg-[#0D1527] rounded-xl border border-slate-700 shadow-inner">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 tracking-widest uppercase">Año</label>
                                <select 
                                    className="w-full bg-white text-[#0F172A] border border-slate-700 rounded-lg p-2.5 font-bold outline-none"
                                    value={modalForm.year} onChange={e => setModalForm({...modalForm, year: Number(e.target.value)})}
                                >
                                    {ALL_YEARS.map(y => <option key={y} value={y} className="text-[#0F172A] bg-white">{y}</option>)}
                                </select>
                            </div>
                            <div className="w-px bg-slate-700"></div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 tracking-widest uppercase">Mes</label>
                                <select 
                                    className="w-full bg-white text-[#0F172A] border border-slate-700 rounded-lg p-2.5 font-bold outline-none"
                                    value={modalForm.month} onChange={e => setModalForm({...modalForm, month: Number(e.target.value)})}
                                >
                                    {MONTHS.map((m, i) => <option key={i} value={i} className="text-[#0F172A] bg-white">{m}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-yellow-400 mb-3 text-sm flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Frascos (Unidades)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Volumen Real <span className="text-[9px] italic">(fórmula/número)</span></label>
                                    <input 
                                        type="text"
                                        placeholder="Valor o fórmula"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none"
                                        value={modalForm.frascos} onChange={e => setModalForm({...modalForm, frascos: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Meta Mensual</label>
                                    <input 
                                        type="text"
                                        placeholder="Ej: 700"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none"
                                        value={modalForm.metaFrascos} onChange={e => setModalForm({...modalForm, metaFrascos: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <h4 className="font-bold text-emerald-400 mb-3 text-sm flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Pesos (Recaudación)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Monto Real ($) <span className="text-[9px] font-normal italic">(fórmula/p. ej: 100+20)</span></label>
                                    <input 
                                        type="text"
                                        placeholder="Monto o fórmula"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all outline-none"
                                        value={modalForm.pesos} onChange={e => setModalForm({...modalForm, pesos: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Meta Mensual ($)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ej: 10000000"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all outline-none"
                                        value={modalForm.metaPesos} onChange={e => setModalForm({...modalForm, metaPesos: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full p-3.5 mt-2 bg-[#38BDF8] text-[#0F172A] font-black tracking-wide rounded-xl hover:bg-[#7DDBFF] transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-[#38BDF8]/20"
                        >
                            <Save className="w-5 h-5"/> Guardar Modificaciones
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL META ANUAL */}
        {showMetaAnualModal && (
            <div className="fixed inset-0 z-[100] bg-[#0D1527]/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-[#1C2541] rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl relative">
                    <button onClick={() => setShowMetaAnualModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors bg-[#0D1527] p-2 rounded-full border border-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Metas Anuales {metaAnualForm.year}</h2>
                    <p className="text-sm text-slate-400 mb-6 border-b border-slate-700 pb-4">Define los objetivos globales para el año.</p>
                    
                    <form onSubmit={handleSaveMetaAnual} className="space-y-6">
                        <div>
                            <h4 className="font-bold text-yellow-400 mb-3 text-sm flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Frascos (Unidades)</h4>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Meta Anual Unidades</label>
                                <input 
                                    type="number"
                                    placeholder="Ej: 2400"
                                    className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none"
                                    value={metaAnualForm.metaFrascosAnual} onChange={e => setMetaAnualForm({...metaAnualForm, metaFrascosAnual: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <h4 className="font-bold text-emerald-400 mb-3 text-sm flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Pesos (Recaudación)</h4>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Meta Anual ($)</label>
                                <input 
                                    type="number"
                                    placeholder="Ej: 30000000"
                                    className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all outline-none"
                                    value={metaAnualForm.metaPesosAnual} onChange={e => setMetaAnualForm({...metaAnualForm, metaPesosAnual: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full p-3.5 mt-2 bg-indigo-500 text-white font-black tracking-wide rounded-xl hover:bg-indigo-400 transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            <Save className="w-5 h-5"/> Guardar Metas Anuales
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}

