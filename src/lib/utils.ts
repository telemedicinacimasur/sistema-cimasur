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

export function formatDate(dateStr: any) {
  if (!dateStr || typeof dateStr !== 'string') return '--';
  return dateStr.split('-').reverse().join('/');
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
