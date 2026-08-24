import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
  extraInfo?: React.ReactNode;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  className,
  itemLabel = 'registros',
  extraInfo
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Calcula el rango de páginas numeradas visibles (hasta 5 números)
  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, safeCurrentPage - 2);
      let end = Math.min(totalPages, start + 4);
      if (end - start < 4) {
        start = Math.max(1, end - 4);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn("p-3.5 border-t border-[#1E293B] bg-[#0F172A]/80 flex flex-wrap items-center justify-between gap-3 select-none", className)}>
      {/* Texto de conteo */}
      <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
        <span>
          Mostrando <strong className="text-white font-bold">{startItem}</strong> a <strong className="text-white font-bold">{endItem}</strong> de <strong className="text-[#38BDF8] font-black">{totalItems}</strong> {itemLabel}
        </span>
        {extraInfo}
      </div>

      {/* Controles de Navegación con Primero, Anterior, Páginas, Siguiente, Último */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Botón Primero */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="px-2.5 py-1.5 rounded-lg bg-[#152035] hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-all border border-[#1E293B] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
          title="Ir a la primera página"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Primero</span>
        </button>

        {/* Botón Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className="px-2.5 py-1.5 rounded-lg bg-[#152035] hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-all border border-[#1E293B] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
          title="Ir a la página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Botones Numerados */}
        <div className="flex items-center gap-1 mx-0.5">
          {pageNumbers.map(pageNum => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                safeCurrentPage === pageNum
                  ? "bg-[#38BDF8] text-slate-950 shadow font-black scale-105"
                  : "bg-[#152035] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-[#1E293B]"
              )}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Botón Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg bg-[#152035] hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-all border border-[#1E293B] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
          title="Ir a la página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Botón Último */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg bg-[#152035] hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-all border border-[#1E293B] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
          title="Ir a la última página"
        >
          <span className="hidden sm:inline">Último</span>
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook reutilizable para calcular paginación de 20 en 20 de cualquier lista
 */
export function usePagination<T>(items: T[], pageSize: number = 20) {
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const resetPage = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    totalItems: items?.length || 0,
    paginatedItems,
    resetPage
  };
}
