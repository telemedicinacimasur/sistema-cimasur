import React, { useState, useEffect } from 'react';
import { FileText, Loader2, ChevronDown } from 'lucide-react';
import { dbInstance as db, isFirebaseReady } from '../../lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { localDB } from '../../lib/auth';
import { formatDateTimeChile } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 20;

export function AuditLogManager() {
  const [records, setRecords] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];
  const isAdmin = userRoles.includes('admin');

  // Load first page of 20 items
  const loadInitialLogs = async () => {
    setLoading(true);
    try {
      if (isFirebaseReady() && db) {
        const q = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          limit(PAGE_SIZE)
        );
        const snapshot = await getDocs(q);
        const fetchedDocs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRecords(fetchedDocs);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } else {
        const localData = await localDB.getCollection('audit_logs', { limitCount: PAGE_SIZE });
        const sorted = (localData || []).sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRecords(sorted.slice(0, PAGE_SIZE));
        setHasMore(sorted.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error("Error loading initial audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load next 20 items on "Cargar más"
  const loadMoreLogs = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      if (isFirebaseReady() && db && lastDoc) {
        const q = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
        const snapshot = await getDocs(q);
        const nextDocs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRecords(prev => [...prev, ...nextDocs]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } else {
        const localData = await localDB.getCollection('audit_logs');
        const sorted = (localData || []).sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const currentLength = records.length;
        const nextChunk = sorted.slice(currentLength, currentLength + PAGE_SIZE);
        setRecords(prev => [...prev, ...nextChunk]);
        setHasMore(currentLength + nextChunk.length < sorted.length);
      }
    } catch (err) {
      console.error("Error loading more audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadInitialLogs();
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="bg-[#152035] rounded-xl border border-[#1E293B] shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#001736] p-4 text-white font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-400" /> Registro de Auditoría Global
        </div>
        <span className="text-xs font-normal text-slate-400">
          Mostrando {records.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="bg-[#0D1527] text-left border-b border-[#1E293B] font-black text-slate-400 uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Usuario</th>
              <th className="p-4">Email</th>
              <th className="p-4">Módulo</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {records.map(r => (
              <tr key={r.id || r.timestamp} className="hover:bg-[#0D1527] transition-colors italic">
                <td className="p-4 text-slate-400">{formatDateTimeChile(r.timestamp)}</td>
                <td className="p-4 font-bold text-white">{r.displayName}</td>
                <td className="p-4 text-slate-400">{r.email}</td>
                <td className="p-4 font-black text-sky-400">{r.module}</td>
                <td className="p-4">{r.action}</td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">No hay registros de auditoría aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="p-4 bg-[#0D1527] border-t border-[#1E293B] flex justify-center">
          <button
            onClick={loadMoreLogs}
            disabled={loading}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Cargar más (20 registros)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
