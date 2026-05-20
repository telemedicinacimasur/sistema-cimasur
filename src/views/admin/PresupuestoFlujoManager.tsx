import React, { useState, useEffect, useRef } from 'react';
import { localDB } from '../../lib/auth';
import { formatCurrency, cn } from '../../lib/utils';
import { Save, Plus, Trash2, FileSpreadsheet, RefreshCw, Download, Upload, FileText, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addAuditLog } from '../../lib/auth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthData {
  p: number;
  g: number;
}

interface BudgetRow {
  id: string;
  year: number;
  glosa: string;
  saldoInicial: number;
  months: MonthData[]; // 12 elements
  type: 'income' | 'expense';
}

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function PresupuestoFlujoManager() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string, field: string, monthIdx?: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    const data = await localDB.getCollection('presupuesto_records');
    
    // Extract unique years from all records
    const yearsInDB = Array.from(new Set(data.map((r: any) => r.year))).filter(Boolean) as number[];
    const allYears = Array.from(new Set([...yearsInDB, selectedYear])).sort((a, b) => a - b);
    setAvailableYears(allYears);

    const filteredData = data.filter((r: any) => r.year === selectedYear);
    
    if (filteredData.length === 0) {
      // Default initial rows for the selected year
      const initialRows: BudgetRow[] = [
        {
          id: crypto.randomUUID(),
          year: selectedYear,
          glosa: 'Ventas Proyectadas',
          saldoInicial: 0,
          months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
          type: 'income'
        },
        {
          id: crypto.randomUUID(),
          year: selectedYear,
          glosa: 'Gastos Operacionales',
          saldoInicial: 0,
          months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
          type: 'expense'
        }
      ];
      for (const row of initialRows) {
        await localDB.saveToCollection('presupuesto_records', row);
      }
      setRows(initialRows);
    } else {
      setRows(filteredData);
    }
    setLoading(false);
  };

  const handleCreateNewYear = () => {
    const yearStr = prompt('Ingrese el año que desea crear (ej: 2026):');
    if (!yearStr) return;
    const year = parseInt(yearStr);
    if (isNaN(year) || year < 2000 || year > 2100) {
      alert('Por favor ingrese un año válido.');
      return;
    }
    if (availableYears.includes(year)) {
      alert('El año ya existe.');
      setSelectedYear(year);
      return;
    }
    setSelectedYear(year);
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`¿Está seguro de eliminar el año ${year} y TODOS sus registros asociados? Esta acción no se puede deshacer.`)) return;
    
    setLoading(true);
    const data = await localDB.getCollection('presupuesto_records');
    const toDelete = data.filter((r: any) => r.year === year);
    
    for (const record of toDelete) {
      await localDB.deleteFromCollection('presupuesto_records', record.id);
    }
    
    if (user) await addAuditLog(user, `Eliminó el año presupuestario ${year}`, 'Administración');
    
    // Switch to another year if we deleted the current one
    if (selectedYear === year) {
      const remainingYears = availableYears.filter(y => y !== year);
      const nextYear = remainingYears.length > 0 ? remainingYears[0] : new Date().getFullYear();
      setSelectedYear(nextYear);
    } else {
      await loadData();
    }
  };

  const handleAddRow = async (type: 'income' | 'expense') => {
    const newRow: BudgetRow = {
      id: crypto.randomUUID(),
      year: selectedYear,
      glosa: type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Ítem de Gasto',
      saldoInicial: 0,
      months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
      type
    };
    const saved = await localDB.saveToCollection('presupuesto_records', newRow);
    setRows(prev => [...prev, saved]);
    if (user) await addAuditLog(user, `Añadió nueva fila de ${type === 'income' ? 'Ingreso' : 'Gasto'} (${selectedYear})`, 'Administración');
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta fila?')) return;
    await localDB.deleteFromCollection('presupuesto_records', id);
    setRows(prev => prev.filter(r => r.id !== id));
    if (user) await addAuditLog(user, 'Eliminó fila de Matriz de Presupuesto', 'Administración');
  };

  const updateRow = async (id: string, updates: Partial<BudgetRow>) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const updatedRow = { ...row, ...updates };
    try {
      await localDB.saveToCollection('presupuesto_records', updatedRow);
      setRows(prev => prev.map(r => r.id === id ? updatedRow : r));
    } catch (err) {
      console.error('Error al actualizar fila:', err);
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleValueChange = (rowId: string, value: string, field: string, monthIdx?: number) => {
    if (field === 'glosa') {
      updateRow(rowId, { glosa: value });
    } else if (field === 'saldoInicial') {
      updateRow(rowId, { saldoInicial: Number(value) || 0 });
    } else if (monthIdx !== undefined) {
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const newMonths = [...row.months];
        newMonths[monthIdx] = {
          ...newMonths[monthIdx],
          [field === 'p' ? 'p' : 'g']: Number(value) || 0
        };
        updateRow(rowId, { months: newMonths });
      }
    }
  };

  const getRowTotals = (row: BudgetRow) => {
    const totalP_months = row.months.reduce((sum, m) => sum + m.p, 0);
    const totalP = row.saldoInicial + totalP_months;
    const totalG = row.months.reduce((sum, m) => sum + m.g, 0);
    const saldo = totalP - totalG;
    return { totalP, totalG, saldo };
  };

  const getCategoryTotals = (type: 'income' | 'expense') => {
    const categoryRows = rows.filter(r => r.type === type);
    const totals = {
      saldoInicial: categoryRows.reduce((sum, r) => sum + r.saldoInicial, 0),
      months: Array.from({ length: 12 }, (_, i) => ({
        p: categoryRows.reduce((sum, r) => sum + r.months[i].p, 0),
        g: categoryRows.reduce((sum, r) => sum + r.months[i].g, 0)
      }))
    };
    
    const sumP = totals.saldoInicial + totals.months.reduce((sum, m) => sum + m.p, 0);
    const sumG = totals.months.reduce((sum, m) => sum + m.g, 0);
    
    return { ...totals, sumP, sumG };
  };

  const incomeTotals = getCategoryTotals('income');
  const expenseTotals = getCategoryTotals('expense');

  // Export & Import Logic
  const downloadTemplate = () => {
    const headers = [
      'Glosa', 'Saldo Inicial', 
      ...MONTH_NAMES.flatMap(m => [`${m}_P`, `${m}_G`]),
      'Tipo (income/expense)'
    ];
    
    const exampleData = [
      ['Ventas Ejemplo', 0, ...Array(24).fill(0), 'income'],
      ['Gastos Ejemplo', 0, ...Array(24).fill(0), 'expense']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
    XLSX.writeFile(wb, `Plantilla_Presupuesto_${selectedYear}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      // Skip header
      const rowsToImport = data.slice(1);
      const newRows: BudgetRow[] = rowsToImport.map(r => {
        const months: MonthData[] = [];
        for (let i = 0; i < 12; i++) {
          months.push({
            p: Number(r[2 + i*2]) || 0,
            g: Number(r[3 + i*2]) || 0
          });
        }
        return {
          id: crypto.randomUUID(),
          year: selectedYear,
          glosa: String(r[0] || 'Nuevo Item'),
          saldoInicial: Number(r[1]) || 0,
          months,
          type: (r[26] === 'income' ? 'income' : 'expense') as 'income' | 'expense'
        };
      });

      for (const row of newRows) {
        await localDB.saveToCollection('presupuesto_records', row);
      }
      setRows(prev => [...prev, ...newRows]);
      alert('Importación completada con éxito');
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    
    doc.setFontSize(18);
    doc.text(`Matriz de Control Presupuestario - Año ${selectedYear}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    const tableBody: any[] = [];

    // Incomes
    tableBody.push([{ content: 'INGRESOS', colSpan: 28, styles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
    rows.filter(r => r.type === 'income').forEach(row => {
      const { totalP, totalG, saldo } = getRowTotals(row);
      const rowData = [
        row.glosa,
        row.saldoInicial.toLocaleString('es-CL'),
        ...row.months.flatMap(m => [m.p.toLocaleString('es-CL'), m.g.toLocaleString('es-CL')]),
        totalP.toLocaleString('es-CL'),
        totalG.toLocaleString('es-CL'),
        saldo.toLocaleString('es-CL')
      ];
      tableBody.push(rowData);
    });

    // Income Totals
    tableBody.push([
      { content: 'TOTAL INGRESOS', styles: { fillColor: [30, 41, 59], textColor: [16, 185, 129], fontStyle: 'bold' } },
      incomeTotals.saldoInicial.toLocaleString('es-CL'),
      ...incomeTotals.months.flatMap(m => [m.p.toLocaleString('es-CL'), m.g.toLocaleString('es-CL')]),
      incomeTotals.sumP.toLocaleString('es-CL'),
      incomeTotals.sumG.toLocaleString('es-CL'),
      (incomeTotals.sumP - incomeTotals.sumG).toLocaleString('es-CL')
    ]);

    // Expenses
    tableBody.push([{ content: 'EGRESOS', colSpan: 28, styles: { fillColor: [69, 10, 10], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
    rows.filter(r => r.type === 'expense').forEach(row => {
      const { totalP, totalG, saldo } = getRowTotals(row);
      const rowData = [
        row.glosa,
        row.saldoInicial.toLocaleString('es-CL'),
        ...row.months.flatMap(m => [m.p.toLocaleString('es-CL'), m.g.toLocaleString('es-CL')]),
        totalP.toLocaleString('es-CL'),
        totalG.toLocaleString('es-CL'),
        saldo.toLocaleString('es-CL')
      ];
      tableBody.push(rowData);
    });

    // Expense Totals
    tableBody.push([
      { content: 'TOTAL EGRESOS', styles: { fillColor: [30, 41, 59], textColor: [248, 113, 113], fontStyle: 'bold' } },
      expenseTotals.saldoInicial.toLocaleString('es-CL'),
      ...expenseTotals.months.flatMap(m => [m.p.toLocaleString('es-CL'), m.g.toLocaleString('es-CL')]),
      expenseTotals.sumP.toLocaleString('es-CL'),
      expenseTotals.sumG.toLocaleString('es-CL'),
      (expenseTotals.sumP - expenseTotals.sumG).toLocaleString('es-CL')
    ]);

    // Net Totals
    tableBody.push([
      { content: 'SALDOS NETOS', styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' } },
      (incomeTotals.saldoInicial - expenseTotals.saldoInicial).toLocaleString('es-CL'),
      ...MONTH_NAMES.map((_, i) => (incomeTotals.months[i].p - expenseTotals.months[i].p).toLocaleString('es-CL')),
      ...MONTH_NAMES.map((_, i) => (incomeTotals.months[i].g - expenseTotals.months[i].g).toLocaleString('es-CL')),
      (incomeTotals.sumP - expenseTotals.sumP).toLocaleString('es-CL'),
      (incomeTotals.sumG - expenseTotals.sumG).toLocaleString('es-CL'),
      ((incomeTotals.sumP - incomeTotals.sumG) - (expenseTotals.sumP - expenseTotals.sumG)).toLocaleString('es-CL')
    ]);

    const headers = [
      'Glosa', 'Sal. Ini',
      ...MONTH_NAMES.flatMap(m => [m+'_P', m+'_G']),
      'Tot. P', 'Tot. G', 'Saldo'
    ];

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
      columnStyles: { 0: { halign: 'left', cellWidth: 35 } }
    });

    doc.save(`Matriz_Presupuesto_${selectedYear}.pdf`);
  };

  const renderEditableCell = (rowId: string, field: string, value: any, type: 'number' | 'text' = 'number', monthIdx?: number) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.field === field && editingCell?.monthIdx === monthIdx;

    if (isEditing) {
      return (
        <input 
          autoFocus
          type={type}
          className="w-full h-full p-2 bg-[#1E293B] text-white outline-none font-mono text-center"
          defaultValue={value}
          onBlur={(e) => {
            handleValueChange(rowId, e.target.value, field, monthIdx);
            handleCellBlur();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      );
    }

    return (
      <div 
        className="p-2 cursor-pointer hover:bg-white/5 truncate text-center font-mono"
        onClick={() => setEditingCell({ rowId, field, monthIdx })}
      >
        {type === 'number' ? (value === 0 ? '-' : value.toLocaleString('es-CL')) : value}
      </div>
    );
  };

  const renderRow = (row: BudgetRow) => {
    const { totalP, totalG, saldo } = getRowTotals(row);
    return (
      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors group/row">
        <td className="sticky left-0 z-10 p-0 border border-slate-800 bg-[#0F172A] group-hover/row:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
          {renderEditableCell(row.id, 'glosa', row.glosa, 'text')}
        </td>
        <td className="p-0 border border-slate-800 bg-[#152035]/30">
          {renderEditableCell(row.id, 'saldoInicial', row.saldoInicial)}
        </td>
        {row.months.map((m, idx) => (
          <React.Fragment key={idx}>
            <td className="p-0 border border-slate-800 text-blue-400/80">
              {renderEditableCell(row.id, 'p', m.p, 'number', idx)}
            </td>
            <td className="p-0 border border-slate-800 text-emerald-400 font-bold">
              {renderEditableCell(row.id, 'g', m.g, 'number', idx)}
            </td>
          </React.Fragment>
        ))}
        <td className="p-2 border border-slate-800 text-center font-mono text-blue-300 font-bold bg-[#1E293B]/50">
          {formatCurrency(totalP)}
        </td>
        <td className="p-2 border border-slate-800 text-center font-mono text-emerald-400 font-bold bg-[#1E293B]/50">
          {formatCurrency(totalG)}
        </td>
        <td className={cn(
          "p-2 border border-slate-800 text-center font-mono font-black bg-[#1E293B]",
          saldo >= 0 ? "text-purple-400" : "text-rose-500"
        )}>
          {formatCurrency(saldo)}
        </td>
        <td className="p-2 border border-slate-800 text-center">
          <button onClick={() => handleDeleteRow(row.id)} className="text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando matriz...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        className="hidden" 
        accept=".xlsx,.xls"
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#152035] p-6 rounded-2xl border border-[#1E293B]">
        <div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase italic flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            Matriz de Presupuesto {selectedYear}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Años disponibles:
            </p>
            <div className="flex flex-wrap gap-1">
              {availableYears.map(y => (
                <div key={y} className="flex items-center">
                  <button
                    onClick={() => setSelectedYear(y)}
                    className={cn(
                      "px-3 py-1 rounded-l-md text-[10px] font-black transition-all",
                      selectedYear === y 
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" 
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    {y}
                  </button>
                  <button
                    onClick={() => handleDeleteYear(y)}
                    className={cn(
                      "px-1.5 py-1 rounded-r-md text-[10px] border-l border-slate-700 transition-all",
                      selectedYear === y
                        ? "bg-purple-700 text-white hover:bg-red-600"
                        : "bg-slate-800 text-slate-500 hover:bg-red-900/40 hover:text-red-400"
                    )}
                    title={`Eliminar año ${y}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleCreateNewYear}
                className="px-3 py-1 rounded-md text-[10px] font-black bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/30 flex items-center gap-1"
                title="Crear nuevo año"
              >
                <Plus className="w-3 h-3" />
                NUEVO AÑO
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => handleAddRow('income')} 
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Ingreso
          </button>
          <button 
            onClick={() => handleAddRow('expense')} 
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Gasto
          </button>
          <div className="w-px h-8 bg-slate-700 mx-1 hidden md:block" />
          <button 
            onClick={downloadTemplate}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            title="Descargar Plantilla Excel"
          >
            <Download className="w-3.5 h-3.5" /> Plantilla
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            title="Importar desde Excel"
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button 
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            title="Exportar a PDF"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button 
            onClick={loadData} 
            className="p-2 hover:bg-[#1E293B] rounded-full transition-colors text-slate-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-spacing-0 text-[11.5px] table-fixed">
            <thead>
              <tr className="bg-[#1E3A5F] text-white">
                <th rowSpan={2} className="sticky left-0 z-20 p-2 border border-slate-700 w-64 bg-[#1E3A5F] text-left font-black uppercase shadow-[2px_0_5px_rgba(0,0,0,0.3)]">PRESUPUESTO / GLOSA</th>
                <th rowSpan={2} className="p-2 border border-slate-700 w-28 text-center font-black uppercase text-blue-300">SALDO INICIAL</th>
                {MONTH_NAMES.map(m => (
                  <th key={m} colSpan={2} className="p-2 border-x border-t border-slate-700 text-center font-black uppercase text-[10px]">{m}</th>
                ))}
                <th rowSpan={2} className="p-2 border border-slate-700 w-32 text-center font-black uppercase">TOTAL PPTO</th>
                <th rowSpan={2} className="p-2 border border-slate-700 w-32 text-center font-black uppercase">TOTAL GASTO</th>
                <th rowSpan={2} className="p-2 border border-slate-700 w-32 text-center font-black uppercase">SALDO</th>
                <th rowSpan={2} className="p-2 border border-slate-700 w-10"></th>
              </tr>
              <tr className="bg-[#1E3A5F]/80 text-white font-black text-[9px]">
                {MONTH_NAMES.map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="p-1 border border-slate-700 w-14 text-center text-blue-300">P</th>
                    <th className="p-1 border border-slate-700 w-14 text-center text-emerald-300">G</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[#0F172A] divide-y divide-slate-800">
              {/* SECCIÓN INGRESOS */}
              <tr className="bg-[#064E3B]/40 text-emerald-400 font-black text-[10px] uppercase">
                <td colSpan={2 + 24 + 3 + 1} className="p-1 pl-4 border border-slate-800">INGRESOS</td>
              </tr>
              {rows.filter(r => r.type === 'income').map(r => renderRow(r))}
              
              {/* TOTAL INGRESOS PIE */}
              <tr className="bg-[#1E293B] text-emerald-400 font-black text-[10px] uppercase">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-[#1E293B]">TOTAL INGRESOS</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(incomeTotals.saldoInicial)}</td>
                {MONTH_NAMES.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className="p-1 border border-slate-700 text-center font-mono">{incomeTotals.months[i].p.toLocaleString('es-CL')}</td>
                    <td className="p-1 border border-slate-700 text-center font-mono">{incomeTotals.months[i].g.toLocaleString('es-CL')}</td>
                  </React.Fragment>
                ))}
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(incomeTotals.sumP)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(incomeTotals.sumG)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(incomeTotals.sumP - incomeTotals.sumG)}</td>
                <td className="p-2 border border-slate-700"></td>
              </tr>

              {/* SECCIÓN EGRESOS */}
              <tr className="bg-[#450A0A]/40 text-red-400 font-black text-[10px] uppercase">
                <td colSpan={2 + 24 + 3 + 1} className="p-1 pl-4 border border-slate-800">EGRESOS</td>
              </tr>
              {rows.filter(r => r.type === 'expense').map(r => renderRow(r))}

              {/* TOTAL EGRESOS PIE */}
              <tr className="bg-[#1E293B] text-red-400 font-black text-[10px] uppercase">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-[#1E293B]">TOTAL EGRESOS</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(expenseTotals.saldoInicial)}</td>
                {MONTH_NAMES.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className="p-1 border border-slate-700 text-center font-mono">{expenseTotals.months[i].p.toLocaleString('es-CL')}</td>
                    <td className="p-1 border border-slate-700 text-center font-mono">{expenseTotals.months[i].g.toLocaleString('es-CL')}</td>
                  </React.Fragment>
                ))}
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(expenseTotals.sumP)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(expenseTotals.sumG)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(expenseTotals.sumP - expenseTotals.sumG)}</td>
                <td className="p-2 border border-slate-700"></td>
              </tr>

              {/* SALDOS (INGRESO - EGRESO) */}
              <tr className="bg-slate-900 text-white font-black text-[11px] border-t-2 border-slate-600">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-slate-900">SALDOS NETOS</td>
                <td className="p-2 border border-slate-700 text-center font-mono">{formatCurrency(incomeTotals.saldoInicial - expenseTotals.saldoInicial)}</td>
                {MONTH_NAMES.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className={cn("p-1 border border-slate-700 text-center font-mono", (incomeTotals.months[i].p - expenseTotals.months[i].p) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {(incomeTotals.months[i].p - expenseTotals.months[i].p).toLocaleString('es-CL')}
                    </td>
                    <td className={cn("p-1 border border-slate-700 text-center font-mono font-black", (incomeTotals.months[i].g - expenseTotals.months[i].g) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {(incomeTotals.months[i].g - expenseTotals.months[i].g).toLocaleString('es-CL')}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-2 border border-slate-700 text-center font-mono text-blue-300">{formatCurrency(incomeTotals.sumP - expenseTotals.sumP)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono text-emerald-300">{formatCurrency(incomeTotals.sumG - expenseTotals.sumG)}</td>
                <td className="p-2 border border-slate-700 text-center font-mono text-purple-400">{formatCurrency((incomeTotals.sumP - incomeTotals.sumG) - (expenseTotals.sumP - expenseTotals.sumG))}</td>
                <td className="p-2 border border-slate-700"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

