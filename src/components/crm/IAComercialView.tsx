import React, { useState, useEffect, useMemo } from 'react';
import { Bot, Search, Eye, Users, RefreshCw } from 'lucide-react';
import { ChatComponent } from './ChatComponent';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { Client } from '../../services/crm/types';

interface IAComercialViewProps {
  dashboardData: any;
  onViewClient?: (id: string) => void;
  onNavigateToEditor?: (text: string) => void;
}

export const IAComercialView: React.FC<IAComercialViewProps> = ({ dashboardData, onViewClient, onNavigateToEditor }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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
  }, []);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.clinicName || '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Bot className="text-sky-400 font-black" size={32} />
          IA Comercial - Copiloto Estratégico
        </h1>
        <p className="text-slate-400 mt-1">Chat interactivo con Gemini y panel rápido de consulta 360°</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col h-[600px] lg:h-auto min-h-0">
          <ChatComponent contextData={dashboardData} onNavigateToEditor={onNavigateToEditor} />
        </div>

        {/* Quick look-up side panel */}
        <div className="bg-[#0D1527] border border-slate-800 rounded-2xl p-5 flex flex-col h-[400px] lg:h-auto min-h-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users size={16} className="text-sky-400" />
              Socio Rápido
            </h2>
            <button onClick={loadClients} className="text-slate-500 hover:text-white transition-colors cursor-pointer" title="Recargar socios">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Buscar socio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredClients.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6">No se encontraron socios.</div>
            ) : (
              filteredClients.map(client => (
                <div key={client.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{client.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{client.clinicName || 'Clínica Veterinaria'}</div>
                    <div className="text-[9px] mt-1">
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        client.categoria === 'Platinum' ? 'bg-purple-500/10 text-purple-400' :
                        client.categoria === 'Oro' ? 'bg-amber-500/10 text-amber-400' :
                        client.categoria === 'Plata' ? 'bg-slate-400/10 text-slate-300' :
                        'bg-yellow-800/10 text-yellow-600'
                      }`}>
                        {client.categoria || 'Bronce'}
                      </span>
                    </div>
                  </div>
                  {onViewClient && (
                    <button
                      onClick={() => onViewClient(client.id)}
                      className="p-1.5 bg-slate-800 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-lg border border-slate-750 transition-all cursor-pointer shrink-0"
                      title="Ver Ficha 360°"
                    >
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
