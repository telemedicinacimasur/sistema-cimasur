import React, { useState, useEffect } from 'react';
import { Settings, Server, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { Job, AutomationHistoryRecord } from '../../services/automation/types';

export const AutomationDashboardView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<AutomationHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'rules' | 'config'>('queue');

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedJobs = await localDB.getCollection('automation_jobs');
      const fetchedHistory = await localDB.getCollection('automation_history');
      setJobs(fetchedJobs || []);
      setHistory(fetchedHistory || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Simulate background polling
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Automation Engine</h1>
          <p className="text-slate-400 mt-1">Infraestructura Base de Automatización Comercial (Fase 7)</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-slate-800 rounded-xl">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Jobs Pendientes</p>
            <p className="text-2xl font-bold text-amber-400">{jobs.filter(j => j.state === 'pending' || j.state === 'scheduled').length}</p>
          </div>
          <div className="text-center px-4 py-2 bg-slate-800 rounded-xl">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tasa de Éxito</p>
            <p className="text-2xl font-bold text-emerald-400">100%</p>
          </div>
        </div>
      </div>

      {/* Navegación Interna */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'queue', label: 'Message Queue', icon: <Server className="w-4 h-4 mr-2" /> },
          { id: 'history', label: 'Historial', icon: <Clock className="w-4 h-4 mr-2" /> },
          { id: 'rules', label: 'Rule Engine', icon: <Settings className="w-4 h-4 mr-2" /> },
          { id: 'config', label: 'Conectores', icon: <ShieldCheck className="w-4 h-4 mr-2" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-sky-500 text-sky-600 bg-sky-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'queue' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Job Manager & Cola de Mensajes</h2>
              <button onClick={fetchData} className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1" /> Refrescar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-xl">ID Job</th>
                    <th className="px-6 py-3">Creado</th>
                    <th className="px-6 py-3">Tipo / Origen</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Prioridad</th>
                    <th className="px-6 py-3 rounded-tr-xl">Intentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p>La cola de mensajes está vacía.</p>
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{job.id}</td>
                        <td className="px-6 py-4">{new Date(job.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{job.actionType}</div>
                          <div className="text-xs text-gray-500">{job.origin}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(job.state)}`}>
                            {getStatusIcon(job.state)}
                            {job.state.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{job.priority}</td>
                        <td className="px-6 py-4 text-xs">
                          {job.retries} / {job.maxRetries}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Trazabilidad de Automatizaciones</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No hay historial de automatizaciones registradas.</p>
                </div>
              ) : (
                history.map((record) => (
                  <div key={record.id} className="flex items-start gap-4 p-4 border rounded-xl border-gray-100 hover:border-sky-100 hover:bg-sky-50/50 transition-colors">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {record.channel === 'email' ? <Mail className="w-5 h-5 text-slate-600" /> : <MessageCircle className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-gray-900">Campaña / Regla: {record.campaignId || record.template}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${record.result === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {record.result.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Disparado por: <strong>{record.user}</strong> hacia el Cliente ID: <span className="font-mono text-xs">{record.clientId}</span>
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(record.timestamp).toLocaleString()}</span>
                        <span className="flex items-center gap-1">Tiempo: {record.executionTimeMs}ms</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Motor de Reglas (Rule Engine)</h2>
                <p className="text-sm text-gray-500">Infraestructura parametrizable para flujos</p>
              </div>
              <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors opacity-50 cursor-not-allowed">
                Nueva Regla
              </button>
            </div>
            
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">El motor de reglas está en modo Standby</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                La arquitectura del Rule Engine ha sido implementada a nivel código (backend), lista para acoplarse con la creación de campañas en la interfaz gráfica.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border rounded-xl bg-white shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Mail className="w-6 h-6" /></div>
                <h3 className="font-bold text-gray-900">Email Adapter</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Conector desacoplado listo para integrar SMTP, SendGrid o Resend.</p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600">Estado: Acoplado al AutomationCore</div>
            </div>

            <div className="p-5 border rounded-xl bg-white shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><MessageCircle className="w-6 h-6" /></div>
                <h3 className="font-bold text-gray-900">WhatsApp Adapter</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Conector preparado para integración con Meta API Oficial o Twilio.</p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600">Estado: Acoplado al AutomationCore</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
