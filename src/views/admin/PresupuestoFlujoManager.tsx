import React, { useState, useEffect, useRef } from 'react';
import { localDB } from '../../lib/auth';
import { formatCurrency, cn } from '../../lib/utils';
import { Save, Plus, Trash2, FileSpreadsheet, RefreshCw, Download, Upload, FileText, X, ChevronRight, ChevronDown, Pencil, Filter, Eye, EyeOff } from 'lucide-react';
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
  isGroup?: boolean;
  parentId?: string | null;
  canAddChildren?: boolean;
}

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function PresupuestoFlujoManager() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [newYearValue, setNewYearValue] = useState<string>((new Date().getFullYear() + 1).toString());
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string, field: string, monthIdx?: number } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [visibleMonths, setVisibleMonths] = useState<number[]>([0,1,2,3,4,5,6,7,8,9,10,11]);
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showTotals, setShowTotals] = useState({ ppto: true, gasto: true, saldo: true });

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(collapsedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setCollapsedGroups(newSet);
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const generateExpenseCategories = (y: number): BudgetRow[] => {
    const cats = [
        { id: `cat_1_${y}`, glosa: '1 RECURSOS HUMANOS', parentId: null, canAddChildren: true },
        { id: `cat_1_1_${y}`, glosa: '1.1 ADMINISTRACION', parentId: `cat_1_${y}`, canAddChildren: true },
        { id: `cat_1_2_${y}`, glosa: '1.2 LABORATORIO', parentId: `cat_1_${y}`, canAddChildren: true },
        { id: `cat_1_3_${y}`, glosa: '1.3 GESTION COMERCIAL', parentId: `cat_1_${y}`, canAddChildren: true },
        { id: `cat_1_4_${y}`, glosa: '1.4 DIRECTORIO', parentId: `cat_1_${y}`, canAddChildren: true },
        { id: `cat_2_${y}`, glosa: '2 GASTOS', parentId: null, canAddChildren: true },
        { id: `cat_2_1_${y}`, glosa: '2.1 GASTOS DE ADMINISTRACIÓN', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_2_2_${y}`, glosa: '2.2 OTROS ADMINISTRACION', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_2_3_${y}`, glosa: '2.3 GASTOS DE LABORATORIO', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_2_4_${y}`, glosa: '2.4 GASTOS GESTIÓN Y REPRESENTACION COMERCIAL', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_2_5_${y}`, glosa: '2.5 GESTION DE MARKETING', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_2_6_${y}`, glosa: '2.6 GASTOS DIRECTORIO (INVESTIGACION Y FORMACION)', parentId: `cat_2_${y}`, canAddChildren: true },
        { id: `cat_3_${y}`, glosa: '3 IMPREVISTOS', parentId: null, canAddChildren: true },
        { id: `cat_3_1_${y}`, glosa: '3.1 OTROS IMPREVISTOS', parentId: `cat_3_${y}`, canAddChildren: true }
    ];
    return cats.map(c => ({
      id: c.id,
      year: y,
      glosa: c.glosa,
      saldoInicial: 0,
      months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
      type: 'expense',
      isGroup: true,
      parentId: c.parentId,
      canAddChildren: c.canAddChildren
    }));
  };

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
        ...generateExpenseCategories(selectedYear)
      ];
      for (const row of initialRows) {
        await localDB.saveToCollection('presupuesto_records', row);
      }
      setRows(initialRows);
    } else {
      // Inject groups if they don't exist for backward compatibility
      const hasExpenseGroups = filteredData.some((r: any) => r.type === 'expense' && r.isGroup);
      if (!hasExpenseGroups) {
          const newGroups = generateExpenseCategories(selectedYear);
          for (const g of newGroups) {
              await localDB.saveToCollection('presupuesto_records', g);
              filteredData.push(g);
          }
      }
      setRows(filteredData);
    }
    setLoading(false);
  };

  const confirmCreateNewYear = async () => {
    if (!newYearValue) return;
    const year = parseInt(newYearValue);
    if (isNaN(year) || year < 2000 || year > 2100) {
      alert('Por favor ingrese un año válido.');
      return;
    }
    if (availableYears.includes(year)) {
      alert('El año ya existe.');
      setSelectedYear(year);
      setShowNewYearModal(false);
      return;
    }
    
    setLoading(true);
    setShowNewYearModal(false);
    // Create default rows immediately to ensure DB has data for this year
    const initialRows: BudgetRow[] = [
      {
        id: crypto.randomUUID(),
        year: year,
        glosa: 'Ventas Proyectadas',
        saldoInicial: 0,
        months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
        type: 'income'
      },
      ...generateExpenseCategories(year)
    ];

    for (const r of initialRows) {
      await localDB.saveToCollection('presupuesto_records', r);
    }
    
    setAvailableYears(prev => [...prev, year].sort((a, b) => a - b));
    setSelectedYear(year);
    setLoading(false);
  };

  const handleCreateNewYear = async () => {
    setShowNewYearModal(true);
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
      type,
      isGroup: true,
      canAddChildren: true
    };
    const saved = await localDB.saveToCollection('presupuesto_records', newRow);
    setRows(prev => [...prev, saved]);
    if (user) await addAuditLog(user, `Añadió nueva fila de ${type === 'income' ? 'Ingreso' : 'Gasto'} (${selectedYear})`, 'Administración');
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta fila y todo su contenido?')) return;
    
    const childrenToDel = rows.filter(r => r.parentId === id);
    for (const child of childrenToDel) {
      await localDB.deleteFromCollection('presupuesto_records', child.id);
    }
    await localDB.deleteFromCollection('presupuesto_records', id);
    
    setRows(prev => prev.filter(r => r.id !== id && r.parentId !== id));
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

  const getGroupTotals = (groupId: string): { saldoInicial: number, months: MonthData[], totalP: number, totalG: number, saldo: number } => {
    const self = rows.find(r => r.id === groupId);
    let saldoInicial = self ? self.saldoInicial : 0;
    const months = self ? JSON.parse(JSON.stringify(self.months)) : Array.from({ length: 12 }, () => ({ p: 0, g: 0 }));
    
    const children = rows.filter(r => r.parentId === groupId);
    for (const child of children) {
        let childVals = { saldoInicial: child.saldoInicial, months: child.months };
        if (child.isGroup) {
            const grandChildVals = getGroupTotals(child.id);
            childVals = { saldoInicial: grandChildVals.saldoInicial, months: grandChildVals.months };
        }
        saldoInicial += childVals.saldoInicial;
        for (let i = 0; i < 12; i++) {
            months[i].p += childVals.months[i].p;
            months[i].g += childVals.months[i].g;
        }
    }
    const totalP = saldoInicial + months.reduce((sum, m) => sum + m.p, 0);
    const totalG = months.reduce((sum, m) => sum + m.g, 0);
    return { saldoInicial, months, totalP, totalG, saldo: totalP - totalG };
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
      if (type === 'text') {
        return (
          <textarea 
            autoFocus
            className="w-full h-full min-h-[40px] p-2 bg-[#1E293B] text-white outline-none font-sans text-xs text-left whitespace-pre-wrap resize-none"
            defaultValue={value}
            onBlur={(e) => {
              handleValueChange(rowId, e.target.value, field, monthIdx);
              handleCellBlur();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        );
      }
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
        className={cn(
          "p-2 cursor-pointer hover:bg-white/5",
          type === 'number' ? "truncate text-center font-mono" : "text-left whitespace-normal break-words leading-snug font-sans text-[11px]"
        )}
        onClick={() => setEditingCell({ rowId, field, monthIdx })}
      >
        {type === 'number' ? (value === 0 ? '-' : value.toLocaleString('es-CL')) : value}
      </div>
    );
  };

  const renderTree = (type: 'income' | 'expense') => {
    const parentRows = rows.filter(r => r.type === type && !r.parentId);
    
    const checkMatch = (r: BudgetRow): boolean => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (r.glosa.toLowerCase().includes(term)) return true;
      const rChildren = rows.filter(c => c.parentId === r.id);
      return rChildren.some(checkMatch);
    };

    const renderNode = (row: BudgetRow, level: number = 0): React.ReactNode[] => {
      if (!checkMatch(row)) return [];

      const children = rows.filter(r => r.parentId === row.id);
      // If there is a search term, auto-expand to show matching children
      const isCollapsed = searchTerm ? false : collapsedGroups.has(row.id);
      
      const isGroup = row.isGroup;

      
      let vals = { saldoInicial: row.saldoInicial, months: row.months, totalP: 0, totalG: 0, saldo: 0 };
      if (isGroup) {
        vals = getGroupTotals(row.id);
      } else {
        const rowTotals = getRowTotals(row);
        vals = { ...vals, ...rowTotals };
      }

      const paddingLeft = level * 16 + 8;
      
      const handleAddChild = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        let newGlosa = 'Nuevo Ítem';
        const parentPrefixMatch = row.glosa.match(/^(\d+(?:\.\d+)*)/);
        if (parentPrefixMatch) {
            const numChildren = children.length;
            newGlosa = `${parentPrefixMatch[1]}.${numChildren + 1} Nuevo Ítem`;
        }

        const newRow: BudgetRow = {
          id: crypto.randomUUID(),
          year: selectedYear,
          glosa: newGlosa,
          saldoInicial: 0,
          months: Array.from({ length: 12 }, () => ({ p: 0, g: 0 })),
          type: row.type,
          parentId: row.id
        };
        const saved = await localDB.saveToCollection('presupuesto_records', newRow);
        setRows(prev => [...prev, saved]);
        if (user) await addAuditLog(user, `Añadió nueva sub-fila a ${row.glosa} (${selectedYear})`, 'Administración');
        
        const newSet = new Set(collapsedGroups);
        newSet.delete(row.id);
        setCollapsedGroups(newSet);
      };

      const rowElement = (
        <tr key={row.id} className={cn("hover:bg-slate-800/30 transition-colors group/row", isGroup ? "bg-blue-900/10 border-y-2 border-blue-500/30" : "")}>
          <td className={cn("sticky left-0 z-10 p-0 border border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]", isGroup ? "bg-blue-900/30" : "bg-[#0F172A] group-hover/row:bg-slate-800")}>
            <div className="flex items-start pt-1.5" style={{ paddingLeft: `${paddingLeft}px` }}>
              {isGroup && children.length > 0 && (
                <button 
                  onClick={() => toggleGroup(row.id)}
                  className="w-4 h-4 mr-1 flex items-center justify-center text-slate-400 hover:text-white transition-colors mt-0.5"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                </button>
              )}
              {(!isGroup || children.length === 0) && <div className="w-5" />}
              <div className={cn("flex-1", isGroup && "font-black text-blue-300 uppercase")}>
                {renderEditableCell(row.id, 'glosa', row.glosa, 'text')}
              </div>
              {row.canAddChildren && (
                 <button onClick={handleAddChild} title="Agregar Sub-ítem" className="p-1 hover:text-emerald-400 text-slate-400 bg-slate-800/50 hover:bg-slate-700 rounded transition-all mr-2 flex items-center justify-center shadow">
                   <Plus className="w-3.5 h-3.5"/>
                 </button>
              )}
              {isGroup && (
                  <div className="mr-2 opacity-50" title="Categoría Editable">
                     <Pencil className="w-3 h-3 text-blue-400" />
                  </div>
              )}
            </div>
          </td>
          {row.months.map((m, idx) => visibleMonths.includes(idx) ? (
            <React.Fragment key={idx}>
              <td className="p-0 border border-slate-800 text-blue-400/80 relative">
                {renderEditableCell(row.id, 'p', m.p, 'number', idx)}
                {isGroup && children.length > 0 && (
                   <div className="absolute right-1 bottom-0.5 text-[8px] text-blue-300 font-mono tracking-widest uppercase pointer-events-none opacity-60">
                      {vals.months[idx].p.toLocaleString('es-CL')}
                   </div>
                )}
              </td>
              <td className="p-0 border border-slate-800 text-emerald-400 font-bold relative">
                {renderEditableCell(row.id, 'g', m.g, 'number', idx)}
                {isGroup && children.length > 0 && (
                   <div className="absolute right-1 bottom-0.5 text-[8px] text-emerald-400/80 font-mono tracking-widest uppercase pointer-events-none opacity-60">
                      {vals.months[idx].g.toLocaleString('es-CL')}
                   </div>
                )}
              </td>
            </React.Fragment>
          ) : null)}
          {showTotals.ppto && (
            <td className="p-1.5 border border-slate-800 text-right font-mono text-blue-300 font-bold bg-[#1E293B]/50 text-[10px]">
              {formatCurrency(vals.totalP)}
            </td>
          )}
          {showTotals.gasto && (
            <td className="p-1.5 border border-slate-800 text-right font-mono text-emerald-400 font-bold bg-[#1E293B]/50 text-[10px]">
              {formatCurrency(vals.totalG)}
            </td>
          )}
          {showTotals.saldo && (
            <td className={cn(
              "p-1.5 border border-slate-800 text-right font-mono font-black bg-[#1E293B] text-[10px]",
              vals.saldo >= 0 ? "text-purple-400" : "text-rose-500"
            )}>
              {formatCurrency(vals.saldo)}
            </td>
          )}
          <td className="p-2 border border-slate-800 text-center">
              <button title="Borrar Fila" onClick={() => handleDeleteRow(row.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
          </td>
        </tr>
      );

      let result = [rowElement];
      if (!isCollapsed) {
         for (const child of children) {
            result = result.concat(renderNode(child, level + 1));
         }
      }
      return result;
    };

    let result: React.ReactNode[] = [];
    for (const r of parentRows) {
        result = result.concat(renderNode(r, 0));
    }
    return result;
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
          
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="BUSCAR GLOSA..."
              className="w-full bg-[#0F172A] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs font-bold text-white uppercase outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap flex-col md:flex-row gap-2 w-full md:w-auto">
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
          
          <div className="relative">
             <button 
               onClick={() => setShowMonthFilter(!showMonthFilter)}
               className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
               title="Filtrar Meses"
             >
               <Filter className="w-3.5 h-3.5" /> MESES
             </button>
             {showMonthFilter && (
               <div className="absolute top-full mt-2 right-0 w-48 bg-[#152035] border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                 <div className="flex justify-between items-center mb-2 px-2">
                   <span className="text-xs font-bold text-slate-300">Mostrar Meses</span>
                   <div className="flex gap-2">
                     <button onClick={() => setVisibleMonths([0,1,2,3,4,5,6,7,8,9,10,11])} className="text-[10px] text-blue-400 hover:text-white">Todos</button>
                     <button onClick={() => setVisibleMonths([])} className="text-[10px] text-blue-400 hover:text-white">Ninguno</button>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-1 text-xs">
                   {MONTH_NAMES.map((m, idx) => (
                     <label key={m} className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-slate-300">
                       <input 
                         type="checkbox" 
                         checked={visibleMonths.includes(idx)}
                         onChange={(e) => {
                           if (e.target.checked) setVisibleMonths(prev => [...prev, idx].sort((a,b) => a-b));
                           else setVisibleMonths(prev => prev.filter(v => v !== idx));
                         }}
                         className="accent-blue-500"
                       />
                       {m}
                     </label>
                   ))}
                 </div>
               </div>
             )}
          </div>
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
                <th rowSpan={2} className="sticky left-0 z-20 p-2 border border-slate-700 w-48 bg-[#1E3A5F] text-left font-black uppercase shadow-[2px_0_5px_rgba(0,0,0,0.3)]">PRESUPUESTO / GLOSA</th>
                {MONTH_NAMES.map((m, i) => visibleMonths.includes(i) ? (
                  <th key={m} colSpan={2} className="p-2 border-x border-t border-slate-700 text-center font-black uppercase text-xs tracking-wider group cursor-pointer hover:bg-slate-700/50" onClick={() => setVisibleMonths(prev => prev.filter(v => v !== i))}>
                    <div className="flex items-center justify-center gap-1">{m} <EyeOff className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100" /></div>
                  </th>
                ) : null)}
                {showTotals.ppto && (
                  <th rowSpan={2} className="p-1.5 border border-slate-700 w-24 text-center font-black uppercase text-[9px] group cursor-pointer hover:bg-slate-700/50" onClick={() => setShowTotals({...showTotals, ppto: false})}>
                    <div className="flex items-center justify-center gap-1">TOTAL PPTO <EyeOff className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100" /></div>
                  </th>
                )}
                {showTotals.gasto && (
                  <th rowSpan={2} className="p-1.5 border border-slate-700 w-24 text-center font-black uppercase text-[9px] group cursor-pointer hover:bg-slate-700/50" onClick={() => setShowTotals({...showTotals, gasto: false})}>
                    <div className="flex items-center justify-center gap-1">TOTAL GASTO <EyeOff className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100" /></div>
                  </th>
                )}
                {showTotals.saldo && (
                  <th rowSpan={2} className="p-1.5 border border-slate-700 w-24 text-center font-black uppercase text-[9px] group cursor-pointer hover:bg-slate-700/50" onClick={() => setShowTotals({...showTotals, saldo: false})}>
                    <div className="flex items-center justify-center gap-1">SALDO <EyeOff className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100" /></div>
                  </th>
                )}
                <th rowSpan={2} className="p-2 border border-slate-700 w-12 text-center text-slate-500">
                  {(!showTotals.ppto || !showTotals.gasto || !showTotals.saldo) && (
                     <button onClick={() => setShowTotals({ppto: true, gasto: true, saldo: true})} title="Restaurar Totales" className="hover:text-sky-400">
                       <Eye className="w-3.5 h-3.5" />
                     </button>
                  )}
                </th>
              </tr>
              <tr className="bg-[#1E3A5F]/80 text-white font-black text-[10px]">
                {MONTH_NAMES.map((_, i) => visibleMonths.includes(i) ? (
                  <React.Fragment key={i}>
                    <th className="p-1.5 border border-slate-700 w-32 text-center text-blue-300">Ppto</th>
                    <th className="p-1.5 border border-slate-700 w-32 text-center text-emerald-300">Real</th>
                  </React.Fragment>
                ) : null)}
              </tr>
            </thead>
            <tbody className="bg-[#0F172A] divide-y divide-slate-800">
              {/* SECCIÓN INGRESOS */}
              <tr className="bg-[#064E3B]/40 text-emerald-400 font-black text-[10px] uppercase">
                <td colSpan={1 + 24 + 3 + 1} className="p-1 pl-4 border border-slate-800">INGRESOS</td>
              </tr>
              {renderTree('income')}
              
              {/* TOTAL INGRESOS PIE */}
              <tr className="bg-[#1E293B] text-emerald-400 font-black text-[10px] uppercase">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-[#1E293B]">TOTAL INGRESOS</td>
                {MONTH_NAMES.map((_, i) => visibleMonths.includes(i) ? (
                  <React.Fragment key={i}>
                    <td className="p-1.5 border border-slate-700 text-right font-mono text-[9px]">{incomeTotals.months[i].p.toLocaleString('es-CL')}</td>
                    <td className="p-1.5 border border-slate-700 text-right font-mono text-[9px]">{incomeTotals.months[i].g.toLocaleString('es-CL')}</td>
                  </React.Fragment>
                ) : null)}
                {showTotals.ppto && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(incomeTotals.sumP)}</td>}
                {showTotals.gasto && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(incomeTotals.sumG)}</td>}
                {showTotals.saldo && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(incomeTotals.sumP - incomeTotals.sumG)}</td>}
                <td className="p-2 border border-slate-700"></td>
              </tr>

              {/* SECCIÓN EGRESOS */}
              <tr className="bg-[#450A0A]/40 text-red-400 font-black text-[10px] uppercase">
                <td colSpan={1 + 24 + 3 + 1} className="p-1 pl-4 border border-slate-800">EGRESOS</td>
              </tr>
              {renderTree('expense')}

              {/* TOTAL EGRESOS PIE */}
              <tr className="bg-[#1E293B] text-red-400 font-black text-[10px] uppercase">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-[#1E293B]">TOTAL EGRESOS</td>
                {MONTH_NAMES.map((_, i) => visibleMonths.includes(i) ? (
                  <React.Fragment key={i}>
                    <td className="p-1.5 border border-slate-700 text-right font-mono text-[9px]">{expenseTotals.months[i].p.toLocaleString('es-CL')}</td>
                    <td className="p-1.5 border border-slate-700 text-right font-mono text-[9px]">{expenseTotals.months[i].g.toLocaleString('es-CL')}</td>
                  </React.Fragment>
                ) : null)}
                {showTotals.ppto && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(expenseTotals.sumP)}</td>}
                {showTotals.gasto && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(expenseTotals.sumG)}</td>}
                {showTotals.saldo && <td className="p-1.5 border border-slate-700 text-right font-mono text-[10px]">{formatCurrency(expenseTotals.sumP - expenseTotals.sumG)}</td>}
                <td className="p-2 border border-slate-700"></td>
              </tr>

              {/* SALDOS (INGRESO - EGRESO) */}
              <tr className="bg-slate-900 text-white font-black text-[11px] border-t-2 border-slate-600">
                <td className="sticky left-0 z-10 p-2 border border-slate-700 bg-slate-900">SALDOS NETOS</td>
                {MONTH_NAMES.map((_, i) => visibleMonths.includes(i) ? (
                  <React.Fragment key={i}>
                    <td className={cn("p-1.5 border border-slate-700 text-right font-mono text-[9px]", (incomeTotals.months[i].p - expenseTotals.months[i].p) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {(incomeTotals.months[i].p - expenseTotals.months[i].p).toLocaleString('es-CL')}
                    </td>
                    <td className={cn("p-1.5 border border-slate-700 text-right font-mono font-black text-[9px]", (incomeTotals.months[i].g - expenseTotals.months[i].g) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {(incomeTotals.months[i].g - expenseTotals.months[i].g).toLocaleString('es-CL')}
                    </td>
                  </React.Fragment>
                ) : null)}
                {showTotals.ppto && <td className="p-1.5 border border-slate-700 text-right font-mono text-blue-300 text-[10px]">{formatCurrency(incomeTotals.sumP - expenseTotals.sumP)}</td>}
                {showTotals.gasto && <td className="p-1.5 border border-slate-700 text-right font-mono text-emerald-300 text-[10px]">{formatCurrency(incomeTotals.sumG - expenseTotals.sumG)}</td>}
                {showTotals.saldo && <td className="p-1.5 border border-slate-700 text-right font-mono text-purple-400 text-[10px]">{formatCurrency((incomeTotals.sumP - incomeTotals.sumG) - (expenseTotals.sumP - expenseTotals.sumG))}</td>}
                <td className="p-2 border border-slate-700"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showNewYearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#152035] p-6 rounded-3xl border border-[#1E293B] shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Crear Nuevo Año</h3>
            <p className="text-sm text-slate-400 mb-4">Ingrese el año que desea crear (ej: {new Date().getFullYear() + 1}).</p>
            <input
              type="number"
              value={newYearValue}
              onChange={(e) => setNewYearValue(e.target.value)}
              className="w-full bg-[#0F172A] border border-blue-500/30 rounded-xl p-3 text-white font-mono mb-6 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="YYYY"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewYearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmCreateNewYear}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> CREAR AÑO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

