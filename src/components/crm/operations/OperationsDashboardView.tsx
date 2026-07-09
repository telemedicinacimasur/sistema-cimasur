import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Users, DollarSign, Zap, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { CampaignEngineService, Campaign } from '../../../services/automation/CampaignEngineService';
import { ClientService } from '../../../services/crm/ClientService';
import { localDB } from '../../../lib/auth';
import { Client } from '../../../services/crm/types';

const campaignEngine = new CampaignEngineService();

interface OperationsDashboardViewProps {
  onViewClient?: (id: string) => void;
}

export const OperationsDashboardView: React.FC<OperationsDashboardViewProps> = ({ onViewClient }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  
  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  const loadData = async () => {
    const data = await campaignEngine.getCampaignHistory();
    setCampaigns(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    
    const clientData = await clientService.getAllClients();
    setClients(clientData || []);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-change', loadData);
    window.addEventListener('campaign-executed', loadData);
    return () => {
      window.removeEventListener('db-change', loadData);
      window.removeEventListener('campaign-executed', loadData);
    };
  }, []);

  const runningCount = campaigns.filter(c => c.status === 'running').length;
  const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length;
  const completedCount = campaigns.filter(c => c.status === 'completed').length;
  const errorCount = campaigns.filter(c => c.status === 'error' || c.status === 'cancelled').length;
  
  const totalImpacted = campaigns.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.metrics.sent, 0);
  const totalROI = campaigns.filter(c => c.status === 'completed').reduce((sum, c) => sum + (c.metrics.roi || 0), 0);
  const totalGapRecovered = campaigns.filter(c => c.status === 'completed').reduce((sum, c) => sum + (c.metrics.revenueGenerated || 0), 0);
  const totalPendingPotential = campaigns.filter(c => c.status !== 'completed').reduce((sum, c) => sum + (c.potentialRevenue || 0), 0);

  const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

  const getMatchedClientsForSegment = (segmentName: string) => {
    if (!segmentName) return [];
    return clients.filter(c => c.categoria === segmentName);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-indigo-400 font-black" size={32} />
            Panel de Operaciones
          </h1>
          <p className="text-slate-400 mt-1">Monitoreo en tiempo real de ejecuciones comerciales y colas de entrega</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard title="Ejecutándose" value={runningCount} icon={<Activity className="text-sky-400"/>} color="border-sky-500/30" />
        <StatusCard title="Programadas" value={scheduledCount} icon={<Clock className="text-amber-400"/>} color="border-amber-500/30" />
        <StatusCard title="Finalizadas" value={completedCount} icon={<CheckCircle className="text-emerald-400"/>} color="border-emerald-500/30" />
        <StatusCard title="Errores" value={errorCount} icon={<XCircle className="text-red-400"/>} color="border-red-500/30" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Clientes Impactados" value={totalImpacted.toLocaleString()} icon={<Users size={20} className="text-slate-400"/>} />
        <MetricCard title="ROI Acumulado" value={formatCurrency(totalROI)} icon={<Zap size={20} className="text-sky-400"/>} />
        <MetricCard title="Ventas Recuperadas" value={formatCurrency(totalGapRecovered)} icon={<TrendingUp size={20} className="text-emerald-400"/>} />
        <MetricCard title="Potencial Pendiente" value={formatCurrency(totalPendingPotential)} icon={<DollarSign size={20} className="text-amber-400"/>} />
      </div>

      <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">Cola de Ejecución</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4">Campaña</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Canal Target</th>
              <th className="px-6 py-4 text-right">Métricas</th>
              <th className="px-6 py-4 text-right">Destinatarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay operaciones en registro.
                </td>
              </tr>
            ) : (
              campaigns.flatMap((c) => {
                const matchedClients = getMatchedClientsForSegment(c.segment);
                const isExpanded = expandedCampaignId === c.id;

                return [
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white mb-1">{c.name}</div>
                      <div className="text-xs text-slate-500">Segmento: <span className="text-sky-400 font-semibold">{c.segment || 'Todos'}</span></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="uppercase text-xs font-bold text-slate-400">{c.channel}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs">
                      {c.status === 'completed' ? (
                        <div>
                          <div className="text-slate-300">Env: {c.metrics.sent} | Ape: {c.metrics.opened}</div>
                          <div className="text-emerald-400 font-bold mt-1">ROI: ${(c.metrics.roi || 0).toLocaleString('es-CL')}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setExpandedCampaignId(isExpanded ? null : c.id)}
                        className="inline-flex items-center gap-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                      >
                        {matchedClients.length} Clientes
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${c.id}-expanded`} className="bg-slate-950/40">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="border-l-2 border-sky-500/50 pl-4 py-2 space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes del Segmento {c.segment} Impactados:</h4>
                          {matchedClients.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No hay clientes registrados en este segmento.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {matchedClients.map(client => (
                                <div key={client.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center">
                                  <div>
                                    <div className="text-xs font-bold text-white">{client.name}</div>
                                    <div className="text-[10px] text-slate-500">{client.clinicName || 'Clínica Veterinaria'}</div>
                                  </div>
                                  {onViewClient && (
                                    <button
                                      onClick={() => onViewClient(client.id)}
                                      className="p-1 bg-slate-850 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded border border-slate-750 cursor-pointer flex items-center justify-center shrink-0"
                                      title="Ver Ficha 360°"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatusCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <div className={`bg-[#0D1527] p-6 rounded-2xl border ${color} hover:bg-slate-800/30 transition-all`}>
    <div className="flex justify-between items-start mb-4 text-slate-400">
      <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      {icon}
    </div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
);

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-[#0D1527] p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
    <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
      {icon}
    </div>
    <div>
      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    ready: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    scheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    running: 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse',
    paused: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  
  const labels: Record<string, string> = {
    draft: 'Borrador',
    ready: 'Lista',
    scheduled: 'Programada',
    running: 'Ejecutando',
    paused: 'Pausada',
    completed: 'Finalizada',
    cancelled: 'Cancelada',
    error: 'Error'
  };

  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};
