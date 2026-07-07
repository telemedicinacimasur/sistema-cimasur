import React from 'react';
import { ClientCommercialProfile } from '../types';
import { ArrowLeft, User, TrendingUp } from 'lucide-react';

export function Client360View({ client, onClose, onSave }: { client: ClientCommercialProfile; onClose: () => void; onSave: () => void }) {
  const [activeTab, setActiveTab] = React.useState<'general' | 'marketing'>('general');

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#152035] w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#1E293B] p-8">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onClose} className="text-sky-400 flex items-center gap-2 font-bold text-sm"><ArrowLeft className="w-4 h-4"/> Cerrar Expediente</button>
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'general' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>General</button>
                <button onClick={() => setActiveTab('marketing')} className={`px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'marketing' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>Marketing</button>
            </div>
        </div>
      
        {activeTab === 'general' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dossier Header */}
            <div className="lg:col-span-3 bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-700 p-4 rounded-full"><User className="w-8 h-8 text-sky-400"/></div>
                    <div>
                        <h2 className="text-3xl font-black text-white">{client.name}</h2>
                        <p className="text-slate-400 text-sm">Origen: {client.isCRM ? '✓ CRM' : ''} {client.isIntranet ? '✓ Intranet' : ''}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 text-xs">Categoría Facturación</p>
                    <p className="text-2xl font-black text-amber-400">{client.categoriaFacturacion}</p>
                    <p className="text-slate-400 text-xs mt-2">Categoría Frascos</p>
                    <p className="text-2xl font-black text-emerald-400">{client.categoriaFrascos}</p>
                </div>
            </div>

            {/* Commercial Metrics */}
            <div className="bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f] space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2"><TrendingUp className="text-sky-400"/> Inteligencia Comercial</h3>
                <p>Venta Mensual: ${client.ventaMensual.toLocaleString()}</p>
                <p>Frascos Mensuales: {client.frascosMensuales}</p>
                <div className="bg-slate-800 p-4 rounded-xl">
                    <p className="text-xs text-slate-400">Progreso a {client.siguienteCategoriaFacturacion} (Fact)</p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${client.progresoFacturacion}%` }}></div>
                    </div>
                    <p className="text-[10px] mt-1">Faltan ${client.dineroFaltante.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-2">Progreso a {client.siguienteCategoriaFrascos} (Frascos)</p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${client.progresoFrascos}%` }}></div>
                    </div>
                    <p className="text-[10px] mt-1">Faltan {client.frascosFaltantes} frascos</p>
                </div>
            </div>

            {/* Actions & IA */}
            <div className="bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f]">
                <h3 className="text-lg font-black text-white mb-4">Acciones Recomendadas (IA)</h3>
                <div className="bg-sky-900/30 p-4 rounded-xl border border-sky-800 text-sm text-sky-100">
                    <p className="font-bold">{client.aiRecommendation?.action}</p>
                    <p className="text-xs mt-2 text-sky-200">{client.aiRecommendation?.justification}</p>
                </div>
            </div>
            
            {/* Beneficios */}
            <div className="bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f]">
                <h3 className="text-lg font-black text-white mb-4">Gestión de Beneficios</h3>
                <ul className="text-sm text-slate-300 space-y-2">
                    {client.beneficiosAsignados && client.beneficiosAsignados.map((b, i) => <li key={i}>✓ {b}</li>)}
                </ul>
            </div>
        </div>
        ) : (
            <div className="bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f] text-slate-300">
                <h3 className="text-lg font-black text-white mb-4">Historial de Marketing</h3>
                <div className="space-y-4">
                    {client.timeline
                        .filter(e => ['campana', 'email', 'whatsapp', 'beneficio'].includes(e.type))
                        .map((e, i) => (
                            <div key={i} className="bg-slate-800 p-3 rounded-lg border-l-4 border-sky-500">
                                <p className="text-xs text-slate-400">{e.date}</p>
                                <p className="font-bold text-white">{e.description}</p>
                                <p className="text-xs text-sky-300">Tipo: {e.type}</p>
                            </div>
                        ))}
                    {client.timeline.filter(e => ['campana', 'email', 'whatsapp', 'beneficio'].includes(e.type)).length === 0 && (
                        <p>No hay historial de marketing disponible.</p>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
