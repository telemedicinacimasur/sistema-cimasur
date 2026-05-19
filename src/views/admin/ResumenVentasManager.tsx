import React, { useState, useEffect } from 'react';
import { localDB } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area
} from 'recharts';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Search, FileText, FileSpreadsheet, Download, Upload } from 'lucide-react';
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
  
  // Pagination global (controls both)
  const [page, setPage] = useState(2); // Defaults to 2022-2025 initially
  
  // View Filter
  const [viewFilter, setViewFilter] = useState<'all' | 'frascos' | 'pesos'>('all');

  // Chart Windows
  const [frascosWindowIndex, setFrascosWindowIndex] = useState(0);
  const [pesosWindowIndex, setPesosWindowIndex] = useState(0);
  const [frascosScale, setFrascosScale] = useState<'month' | 'quarter' | 'year'>('month');
  const [pesosScale, setPesosScale] = useState<'month' | 'quarter' | 'year'>('month');

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

  const currentYears = YEAR_BLOCKS[page];

  // Filtro de meses para no mostrar los que no coinciden con search si se usa
  const filteredMonths = MONTHS.map((m, idx) => ({ m, idx })).filter(({ m, idx }) => {
     if (!searchTerm) return true;
     const term = searchTerm.toLowerCase();
     if (m.toLowerCase().includes(term)) return true;
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
      years.forEach(y => {
          if (scale === 'year') {
              let val = 0;
              for(let m=0; m<12; m++) val += type === 'frascos' ? getFrascos(y, m) : getPesos(y, m);
              data.push({ name: String(y), valor: val });
          } else if (scale === 'quarter') {
              for(let q=0; q<4; q++){
                  let val = 0;
                  for(let m=0; m<3; m++) val += type === 'frascos' ? getFrascos(y, q*3+m) : getPesos(y, q*3+m);
                  data.push({ name: `${y} Q${q+1}`, valor: val });
              }
          } else {
              MONTHS.forEach((mon, m) => {
                  data.push({ name: `${mon} \`${y.toString().slice(2)}`, valor: type === 'frascos' ? getFrascos(y, m) : getPesos(y, m) });
              });
          }
      });
      return data;
  };

  const handleSaveModal = async (e: React.FormEvent) => {
      e.preventDefault();
      const id = `${modalForm.year}-${modalForm.month}`;
      const payload = {
          id,
          frascos: modalForm.frascos,
          pesos: modalForm.pesos,
          metaFrascos: modalForm.metaFrascos,
          metaPesos: modalForm.metaPesos
      };
      await localDB.saveToCollection('ventas_overrides', payload);
      setOverrides({...overrides, [id]: payload});
      setShowModal(false);
  };

  const handleSaveMetaAnual = async (e: React.FormEvent) => {
      e.preventDefault();
      const id = `${metaAnualForm.year}-annual`;
      const payload = {
          id,
          year: metaAnualForm.year,
          metaFrascosAnual: metaAnualForm.metaFrascosAnual,
          metaPesosAnual: metaAnualForm.metaPesosAnual
      };
      await localDB.saveToCollection('ventas_overrides', payload);
      setOverrides({...overrides, [id]: payload});
      setShowMetaAnualModal(false);
  };

  const openMetaAnualModalFor = (y: number) => {
      const exist = overrides[`${y}-annual`] || {};
      setMetaAnualForm({
          year: y,
          metaFrascosAnual: exist.metaFrascosAnual || '',
          metaPesosAnual: exist.metaPesosAnual || ''
      });
      setShowMetaAnualModal(true);
  };

  const openModalFor = (y: number, m: number) => {
      const exist = overrides[`${y}-${m}`] || {};
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

        // Capture frascos chart
        if (viewFilter === 'all' || viewFilter === 'frascos') {
             const chartF = document.getElementById('chart-frascos');
             if (chartF) {
                 const dataUrl = await toPng(chartF, { backgroundColor: '#0D1527', pixelRatio: 2 });
                 images.push(dataUrl);
             }

             // Frascos Table rows
             const frascosRows = [];
             MONTHS.forEach((m, idx) => {
                 frascosRows.push([
                     m.toUpperCase(),
                     ...currentYears.map(y => getFrascos(y, idx) || '-')
                 ]);
             });
             const arrTotalsFrascos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) t += getFrascos(y, i); return t || '-';
             });
             frascosRows.push(['TOTAL ANUAL', ...arrTotalsFrascos]);
             
             const arrMetaFrascos = currentYears.map(y => {
                 return getMetaFrascosAnual(y) || '-';
             });
             frascosRows.push(['META ANUAL', ...arrMetaFrascos]);
             
             const arrDiffFrascos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) { t += getFrascos(y, i); }
                 const ma = getMetaFrascosAnual(y); if(t===0 || ma===0) return '-'; return String(t - ma);
             });
             frascosRows.push(['DIFERENCIA', ...arrDiffFrascos]);

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
                 const dataUrl = await toPng(chartP, { backgroundColor: '#0D1527', pixelRatio: 2 });
                 images.push(dataUrl);
             }

             // Pesos Table rows
             const pesosRows = [];
             MONTHS.forEach((m, idx) => {
                 pesosRows.push([
                     m.toUpperCase(),
                     ...currentYears.map(y => {
                         const v = getPesos(y, idx); return v > 0 ? `$${v.toLocaleString('es-CL')}` : '-';
                     })
                 ]);
             });
             const arrTotalsPesos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) t += getPesos(y, i); return t > 0 ? `$${t.toLocaleString('es-CL')}` : '-';
             });
             pesosRows.push(['TOTAL ANUAL $', ...arrTotalsPesos]);
             
             const arrMetaPesos = currentYears.map(y => {
                 const m = getMetaPesosAnual(y); return m > 0 ? `$${m.toLocaleString('es-CL')}` : '-';
             });
             pesosRows.push(['META ANUAL $', ...arrMetaPesos]);
             
             const arrDiffPesos = currentYears.map(y => {
                 let t = 0; for(let i=0; i<12; i++) { t += getPesos(y, i); }
                 const ma = getMetaPesosAnual(y); if(t===0 || ma===0) return '-'; return `$${(t - ma).toLocaleString('es-CL')}`;
             });
             pesosRows.push(['DIFERENCIA $', ...arrDiffPesos]);

             tables.push({
                 title: `Recaudación: Pesos (${currentYears[0]} - ${currentYears[currentYears.length-1]})`,
                 headers,
                 rows: pesosRows
             });
        }

        exportExpedienteToPDF(
            'REPORTE ANALÍTICO DE VENTAS',
            [
                { label: 'Rango Visual', value: `${currentYears[0]} a ${currentYears[currentYears.length-1]}` },
                { label: 'Filtro Activo', value: viewFilter === 'all' ? 'Unidades y Pesos' : viewFilter === 'frascos' ? 'Solo Unidades' : 'Solo Pesos' },
                { label: 'Fecha de Emisión', value: new Date().toLocaleDateString('es-CL') }
            ],
            `analisis_ventas_${Date.now()}`,
            tables,
            'l', // HORIZONTAL
            9, 16, 11, 8,
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
                const mesStr = String(row['MES'] || '').toLowerCase().trim();
                const m = MONTHS.findIndex(mon => mon.toLowerCase() === mesStr);
                
                if (isNaN(y) || y < 2014 || y > 2026 || m < 0 || m > 11) continue;

                const key = `${y}-${m}`;
                const f = row['FRASCOS'] !== undefined ? Number(row['FRASCOS']) : undefined;
                const p = row['PESOS'] !== undefined ? Number(row['PESOS']) : undefined;
                const mfAnual = row['META_FRASCOS_ANUAL'] !== undefined ? Number(row['META_FRASCOS_ANUAL']) : undefined;
                const mpAnual = row['META_PESOS_ANUAL'] !== undefined ? Number(row['META_PESOS_ANUAL']) : undefined;

                const current = overrides[key] || {};
                
                const newData = {
                    id: key,
                    year: y,
                    month: m,
                    frascos: f !== undefined ? f : (current.frascos || ''),
                    pesos: p !== undefined ? p : (current.pesos || ''),
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1C2541] p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div>
                <h1 className="text-white font-bold text-2xl tracking-tight">Dashboard Analítico</h1>
                <p className="text-slate-400 text-sm mt-1">Control integral de unidades productivas y recaudación</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                    onClick={() => openModalFor(2026, new Date().getMonth())}
                    className="w-full md:w-auto bg-[#38BDF8] text-[#0F172A] font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#7DDBFF] shadow-lg border border-[#38BDF8] transition-all active:scale-95"
                >
                    <Edit3 className="w-4 h-4" /> Gestión de Datos
                </button>
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
                {/* GLOBAL YEAR SELECTOR */}
                <div className="flex items-center bg-[#0D1527] p-1 rounded-lg border border-slate-700 shadow-inner">
                    <button 
                        disabled={page === 0} 
                        onClick={() => setPage(page-1)}
                        className="p-1.5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                    ><ChevronLeft className="w-4 h-4" /></button>
                    <span className="font-bold text-[13px] text-white px-4 tracking-wider min-w-[120px] text-center">
                        &lt; {currentYears[0]} - {currentYears[currentYears.length-1]} &gt;
                    </span>
                    <button 
                        disabled={page === YEAR_BLOCKS.length - 1} 
                        onClick={() => setPage(page+1)}
                        className="p-1.5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                    ><ChevronRight className="w-4 h-4" /></button>
                </div>

                <div className="flex gap-2 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    <button onClick={exportPDF} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-rose-500/20 whitespace-nowrap">
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={exportExcel} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-emerald-500/20 whitespace-nowrap">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadImportTemplate} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-blue-500/20 whitespace-nowrap">
                        <Download className="w-4 h-4" /> Plantilla
                    </button>
                    <button className="flex-1 sm:flex-none relative flex justify-center items-center gap-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors border border-indigo-500/20 whitespace-nowrap overflow-hidden">
                        <Upload className="w-4 h-4" /> Importar
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={importExcel}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </button>
                </div>
            </div>
        </div>

        {/* SECCIÓN 1: MÓDULO DE UNIDADES (FRASCOS) */}
        {(viewFilter === 'all' || viewFilter === 'frascos') && (
        <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
            <h3 className="text-[17px] font-black text-yellow-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Módulo de Unidades: Frascos
            </h3>
            
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
                                    const hasOverride = overrides[`${y}-${idx}`]?.frascos !== undefined && overrides[`${y}-${idx}`]?.frascos !== '';
                                    return (
                                        <td key={y} onDoubleClick={() => openModalFor(y, idx)} className="py-2 px-4 text-center cursor-pointer hover:bg-yellow-400/10 border-r border-slate-800/60 transition-colors">
                                            <span className={cn("font-medium", hasOverride && "text-yellow-400 underline decoration-dotted")}>{val || '-'}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        
                        {/* TOTAL / META / DIFERENCIA FRASCOS */}
                        <tr className="bg-yellow-400/10 text-yellow-500 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Total Anual</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                for(let m=0; m<12; m++) totalYear += getFrascos(y, m);
                                return <td key={y} className="py-2.5 px-4 text-center border-r border-slate-800/50">{totalYear > 0 ? totalYear.toLocaleString('es-CL') : '-'}</td>;
                            })}
                        </tr>
                        <tr className="bg-[#0D1527] text-slate-300 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Meta Anual</td>
                            {currentYears.map(y => {
                                const metaAnual = getMetaFrascosAnual(y);
                                const hasOverride = overrides[`${y}-annual`]?.metaFrascosAnual !== undefined && overrides[`${y}-annual`]?.metaFrascosAnual !== '';
                                return <td key={y} onDoubleClick={() => openMetaAnualModalFor(y)} className="py-2.5 px-4 text-center border-r border-slate-800/50 cursor-pointer hover:bg-yellow-400/10 transition-colors">
                                    <span className={hasOverride ? "text-yellow-400 underline decoration-dotted" : ""}>
                                        {metaAnual > 0 ? metaAnual.toLocaleString('es-CL') : '-'}
                                    </span>
                                </td>;
                            })}
                        </tr>
                        <tr className="bg-[#1C2541] text-white font-black border-t border-slate-600">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide bg-slate-800/50">Diferencia</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                for(let m=0; m<12; m++) { totalYear += getFrascos(y, m); }
                                const metaAnual = getMetaFrascosAnual(y);
                                if(totalYear === 0 || metaAnual === 0) return <td key={y} className="py-2.5 px-4 border-r border-slate-800 text-center bg-slate-800/30">-</td>;
                                const diff = totalYear - metaAnual;
                                return <td key={y} className={cn("py-2.5 px-4 text-center border-r border-slate-800", diff < 0 ? "text-rose-400 bg-rose-500/5" : "text-green-400 bg-green-500/5")}>{diff > 0 ? '+' : ''}{diff.toLocaleString('es-CL')}</td>;
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
                        <select 
                            value={frascosWindowIndex} 
                            onChange={e => setFrascosWindowIndex(Number(e.target.value))}
                            className="bg-white text-[#0F172A] p-2 rounded-lg cursor-pointer outline-none font-bold text-[11px] border border-slate-700 shadow-sm"
                        >
                            {CHART_WINDOWS.map((win, idx) => <option key={idx} value={idx} className="text-[#0F172A] bg-white">{win.label}</option>)}
                        </select>
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
                        <BarChart data={getChartData(CHART_WINDOWS[frascosWindowIndex].years, frascosScale, 'frascos')} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={10} tickCount={5} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px' }} itemStyle={{ color: '#FBBF24', fontWeight: 700 }} cursor={{ fill: '#1E293B', opacity: 0.4 }} />
                            <Bar dataKey="valor" name="Frascos" fill="#FBBF24" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        )}

        {/* SECCIÓN 2: MÓDULO MONETARIO (PESOS) */}
        {(viewFilter === 'all' || viewFilter === 'pesos') && (
        <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
            <h3 className="text-[17px] font-black text-emerald-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Módulo Monetario: Recaudación $
            </h3>
            
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
                                    const hasOverride = overrides[`${y}-${idx}`]?.pesos !== undefined && overrides[`${y}-${idx}`]?.pesos !== '';
                                    return (
                                        <td key={y} onDoubleClick={() => openModalFor(y, idx)} className="py-2 px-4 text-center cursor-pointer hover:bg-emerald-400/10 border-r border-slate-800/60 transition-colors">
                                            <span className={cn("font-medium", hasOverride ? "text-yellow-400 border-b border-dashed border-yellow-400" : "text-emerald-300/90")}>
                                                {val > 0 ? `$${val.toLocaleString('es-CL')}` : '-'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        
                        {/* TOTAL / META / DIFERENCIA PESOS */}
                        <tr className="bg-emerald-500/10 text-emerald-400 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Total Anual $</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                for(let m=0; m<12; m++) totalYear += getPesos(y, m);
                                return <td key={y} className="py-2.5 px-4 text-center border-r border-slate-800/50">{totalYear > 0 ? `$${totalYear.toLocaleString('es-CL')}` : '-'}</td>;
                            })}
                        </tr>
                        <tr className="bg-[#0D1527] text-slate-300 font-bold border-b border-slate-800/50">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide">Meta Anual $</td>
                            {currentYears.map(y => {
                                const metaAnual = getMetaPesosAnual(y);
                                const hasOverride = overrides[`${y}-annual`]?.metaPesosAnual !== undefined && overrides[`${y}-annual`]?.metaPesosAnual !== '';
                                return <td key={y} onDoubleClick={() => openMetaAnualModalFor(y)} className="py-2.5 px-4 text-center border-r border-slate-800/50 cursor-pointer hover:bg-emerald-400/10 transition-colors">
                                    <span className={hasOverride ? "text-emerald-400 underline decoration-dotted" : ""}>
                                        {metaAnual > 0 ? `$${metaAnual.toLocaleString('es-CL')}` : '-'}
                                    </span>
                                </td>;
                            })}
                        </tr>
                        <tr className="bg-[#1C2541] text-white font-black border-t border-slate-600">
                            <td className="py-2.5 px-4 border-r border-slate-700 text-[11px] uppercase tracking-wide bg-slate-800/50">Diferencia $</td>
                            {currentYears.map(y => {
                                let totalYear = 0;
                                for(let m=0; m<12; m++) { totalYear += getPesos(y, m); }
                                const metaAnual = getMetaPesosAnual(y);
                                if(totalYear === 0 || metaAnual === 0) return <td key={y} className="py-2.5 px-4 border-r border-slate-800 text-center bg-slate-800/30">-</td>;
                                const diff = totalYear - metaAnual;
                                return <td key={y} className={cn("py-2.5 px-4 text-center border-r border-slate-800", diff < 0 ? "text-rose-400 bg-rose-500/5" : "text-green-400 bg-green-500/5")}>{diff > 0 ? '+' : ''}${diff.toLocaleString('es-CL')}</td>;
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
                        <select 
                            value={pesosWindowIndex} 
                            onChange={e => setPesosWindowIndex(Number(e.target.value))}
                            className="bg-white text-[#0F172A] p-2 rounded-lg cursor-pointer outline-none font-bold text-[11px] border border-slate-700 shadow-sm"
                        >
                            {CHART_WINDOWS.map((win, idx) => <option key={idx} value={idx} className="text-[#0F172A] bg-white">{win.label}</option>)}
                        </select>
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
                        <AreaChart data={getChartData(CHART_WINDOWS[pesosWindowIndex].years, pesosScale, 'pesos')} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                            <defs>
                                <linearGradient id="colorPesos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} opacity={0.5} />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `$${(v/1000)}k`} width={50} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px' }} itemStyle={{ color: '#10B981', fontWeight: 700 }} formatter={(val: number) => `$${val.toLocaleString('es-CL')}`} cursor={{ stroke: '#1E293B', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="valor" name="Pesos" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPesos)" activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
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
                                    <label className="block text-xs text-slate-400 mb-1">Volumen Real</label>
                                    <input 
                                        type="number"
                                        placeholder="Auto"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none"
                                        value={modalForm.frascos} onChange={e => setModalForm({...modalForm, frascos: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Meta Mensual</label>
                                    <input 
                                        type="number"
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
                                    <label className="block text-xs text-slate-400 mb-1">Monto Real ($)</label>
                                    <input 
                                        type="number"
                                        placeholder="Auto"
                                        className="w-full bg-[#0D1527] border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all outline-none"
                                        value={modalForm.pesos} onChange={e => setModalForm({...modalForm, pesos: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Meta Mensual ($)</label>
                                    <input 
                                        type="number"
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

