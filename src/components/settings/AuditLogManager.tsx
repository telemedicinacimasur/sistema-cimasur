import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { formatDateTimeChile } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function AuditLogManager() {
  const [records, setRecords] = useState<any[]>([]);
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];
  const isAdmin = userRoles.includes('admin');

  useEffect(() => {
    if (isAdmin) {
      localDB.getCollection('audit_logs').then(setRecords);
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="bg-[#152035] rounded-xl border border-[#1E293B] shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#001736] p-4 text-white font-bold flex items-center gap-2">
        <FileText className="w-5 h-5" /> Registro de Auditoría Global
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0D1527] text-left border-b font-black text-slate-500 uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Usuario</th>
              <th className="p-4">Email</th>
              <th className="p-4">Módulo</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(r => (
              <tr key={r.id || r.timestamp} className="hover:bg-[#0D1527] transition-colors italic">
                <td className="p-4">{formatDateTimeChile(r.timestamp)}</td>
                <td className="p-4 font-bold">{r.displayName}</td>
                <td className="p-4 text-slate-500">{r.email}</td>
                <td className="p-4 font-black text-[#001736]">{r.module}</td>
                <td className="p-4">{r.action}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">No hay registros de auditoría aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
