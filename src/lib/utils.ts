import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(amount);
}

export function formatDate(dateInput: any) {
  if (!dateInput) return '--';

  // Support for string inputs
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If it's a string in YYYY-MM-DD format, display it directly to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day}-${month}-${year}`;
    }
  }

  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    return '--';
  }

  if (isNaN(date.getTime())) return '--';

  return `${date.getUTCDate().toString().padStart(2, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCFullYear()}`;
}

export function formatDateForExcel(dateInput: any) {
  const formatted = formatDate(dateInput);
  if (formatted === '--') return '';
  return formatted;
}

export function parseExcelDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  // 1. Date object (usually from XLSX cellDates: true)
  if (rawDate instanceof Date) {
    const d = new Date(rawDate.getTime());
    // Force UTC 12:00 to avoid any local timezone shifts during display
    d.setUTCHours(12, 0, 0, 0);
    return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`;
  }

  // 2. Number (Excel serial)
  if (typeof rawDate === 'number') {
     const date = new Date((rawDate - 25569) * 86400 * 1000);
     date.setUTCHours(12, 0, 0, 0);
     return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
  }
  
  // 3. String
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return new Date().toISOString().split('T')[0];

    // Attempt DD/MM/YYYY or DD-MM-YYYY
    const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    
    // Fallback: try parsing as ISO (YYYY-MM-DD)
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
       return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      d.setUTCHours(12, 0, 0, 0);
      return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`;
    }
  }

  return new Date().toISOString().split('T')[0];
}

export function formatDateTimeChile(dateStr: any) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';
  
  return date.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function safe(val: any) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return JSON.stringify(val);
    } catch {
      return '[Objeto]';
    }
  }
  return String(val);
}
