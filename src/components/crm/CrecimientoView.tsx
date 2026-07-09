import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Target, Zap, Eye, RefreshCw, AlertTriangle, Sparkles, Star } from 'lucide-react';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { Client } from '../../services/crm/types';

interface CrecimientoViewProps {
  onViewClient?: (id: string) => void;
}

export const CrecimientoView: React.FC<CrecimientoViewProps> = ({ onViewClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await clientService.getAllClients();
      setClients(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    window.addEventListener('db-change', loadClients);
    return () => {
      window.removeEventListener('db-change', loadClients);
    };
  }, []);

  const metrics = useMemo(() => {
    const total = clients.length;
    const vip = clients.filter(c => c.categoria === 'Platinum' || c.categoria === 'Oro').length;
    const alert = clients.filter(c => !c.actividadComercial || c.actividadComercial === 'Inactivo').length;
    
    // Sum gaps from clients
    const totalGap = clients.reduce((sum, c) => sum + (c.brechaEconomica || 0), 0);

    return { total, vip, alert, totalGap };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (selectedCategory === 'all') return clients;
    return clients.filter(c => c.categoria === selectedCategory);
  }, [clients, selectedCategory]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="text-emerald-400 font-black" size={32} />
            Motor de Crecimiento
          </h1>
          <p className="text-slate-400 mt-1">Estimulación del desarrollo de la cartera y recuperación de brechas comerciales</p>
        </div>
        <button 
          onClick={loadClients}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Users size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Clientes Registrados</div>
            <div className="text-2xl font-bold text-white">{metrics.total}</div>
          </div>
        </div>

        <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-400">
            <Star size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Socios Preferentes VIP</div>
            <div className="text-2xl font-bold text-white">{metrics.vip}</div>
          </div>
        </div>

        <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">En Alerta / Inactivos</div>
            <div className="text-2xl font-bold text-white">{metrics.alert}</div>
          </div>
        </div>

        <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Brecha Recuperable Total</div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.totalGap)}</div>
          </div>
        </div>
      </div>

      {/* Segment Filter and Table */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Oportunidades de Desarrollo de Cartera</h2>
            <p className="text-slate-400 text-xs mt-1">Análisis por segmento y categoría comercial</p>
          </div>
          
          <div className="flex gap-2">
            {['all', 'Platinum', 'Oro', 'Plata', 'Bronce'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-sky-600 text-white border-sky-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Socio Comercial</th>
                <th className="px-6 py-4">RUT</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Estado Journey</th>
                <th className="px-6 py-4 text-right">Brecha Comercial</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Procesando clientes y brechas comerciales...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron socios comerciales en esta categoría.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {client.name}
                        {client.categoria === 'Platinum' && (
                          <span className="p-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 text-[10px]">VIP</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{client.clinicName || 'Clínica Veterinaria'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{client.rut || 'Sin RUT'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        client.categoria === 'Platinum' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        client.categoria === 'Oro' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        client.categoria === 'Plata' ? 'bg-slate-400/10 text-slate-300 border border-slate-400/20' :
                        'bg-yellow-800/10 text-yellow-600 border border-yellow-800/20'
                      }`}>
                        {client.categoria || 'Sin Categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 text-xs font-semibold">{client.estadoJourney || 'Desarrollo'}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(client.brechaEconomica || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {onViewClient && (
                        <button
                          onClick={() => onViewClient(client.id)}
                          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-sky-600/20 text-slate-300 hover:text-sky-400 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                        >
                          <Eye size={12} /> Ver Ficha 360°
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
