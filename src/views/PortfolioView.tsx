import React, { useState, useEffect } from 'react';
import { localDB } from '../lib/auth';
import { Client, ClientCommercialProfile } from '../types';
import { CommercialEngine } from '../services/crm/CommercialEngine';
import { User, Filter, ArrowRight } from 'lucide-react';

export function PortfolioView({ onViewClient }: { onViewClient: (id: string) => void }) {
  const [profiles, setProfiles] = useState<ClientCommercialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [crmContacts, intranetClients] = await Promise.all([
        localDB.getCollection('contacts'),
        localDB.getCollection('intranet_clients')
      ]);

      // Unify logic (Simplified)
      const unified: Client[] = [
        ...crmContacts.map(c => ({
          ...c,
          id: c.id,
          name: c.name,
          rut: c.rut,
          email: c.email,
          phone: c.phone,
          region: c.region,
          type: c.type,
          categoria: c.categoria,
          intranet: c.intranet as 'Si' | 'No',
          compraAnual: Number(c.compraAnual || 0),
          historialUnificado: c.historialUnificado,
          responsable: c.responsable,
          fechaIngreso: c.fechaIngreso,
          comoLlego: c.comoLlego,
          isGestionCustomer: c.isGestionCustomer,
          isCRM: true,
          isIntranet: c.intranet === 'Si',
          // Dummy data for new fields for now
          frascosMensuales: 10,
          metaFrascos: 20,
          metaMonto: 100000,
          nextCategoria: 'Plata',
          diasSinCompra: 15,
          proximaAccion: 'Llamar para webinar',
          iaScore: 85,
          beneficiosDisponibles: ['Envío Gratis']
        })),
        ...intranetClients.map(ic => ({
          id: ic.id,
          name: ic.name,
          rut: 'Sin RUT',
          email: ic.email,
          phone: '',
          region: 'Metropolitana',
          type: 'Veterinario',
          categoria: 'Sin compra',
          intranet: 'Si',
          compraAnual: 0,
          historialUnificado: ic.historialUnificado,
          responsable: ic.responsable,
          fechaIngreso: ic.fechaIngreso,
          comoLlego: 'Intranet',
          isGestionCustomer: false,
          isCRM: false,
          isIntranet: true,
          // Dummy data for new fields
          frascosMensuales: 0,
          metaFrascos: 5,
          metaMonto: 50000,
          nextCategoria: 'Bronce',
          diasSinCompra: 90,
          proximaAccion: 'Convertir a CRM',
          iaScore: 40,
          interestScore: 60,
          beneficiosDisponibles: []
        }))
      ];
      const profiles = unified.map(c => CommercialEngine.calculateClientProfile(c));
      setProfiles(profiles);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-6 text-white">Cargando cartera...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white">Cartera Comercial Unificada</h2>
        <div className="flex gap-2">
            <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Filter className="w-4 h-4"/> Filtrar</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => (
          <div key={p.id} className="bg-[#152a42] p-4 rounded-2xl border border-[#1e3a5f] hover:border-[#38bdf8] transition-colors cursor-pointer" onClick={() => onViewClient(p.id)}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-700 p-2 rounded-full"><User className="w-5 h-5 text-sky-400"/></div>
                    <div>
                        <h3 className="text-white font-bold">{p.name}</h3>
                        <div className="flex gap-1 text-[10px] text-slate-400 mt-1">
                           {p.isCRM && <span className="bg-sky-900/50 text-sky-300 px-1 rounded">✓ CRM</span>}
                           {p.isIntranet && <span className="bg-emerald-900/50 text-emerald-300 px-1 rounded">✓ Intranet</span>}
                        </div>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.scoreComercial > 70 ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'}`}>
                    Score: {p.scoreComercial}
                </div>
            </div>
            <div className="text-xs text-slate-300 space-y-2 mb-4">
                <p>Cat. Fact: <span className="font-bold text-amber-400">{p.categoriaFacturacion}</span></p>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${p.progresoFacturacion}%` }}></div>
                </div>
                <p>Cat. Frascos: <span className="font-bold text-amber-400">{p.categoriaFrascos}</span></p>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${p.progresoFrascos}%` }}></div>
                </div>
                <p className="text-[10px] text-white">IA: <span className="font-bold text-sky-400">{p.aiRecommendation?.action}</span></p>
            </div>
            <button className="w-full text-[10px] font-black text-sky-400 flex items-center justify-center gap-2 hover:text-sky-300">
                VER EXPEDIENTE 360° <ArrowRight className="w-3 h-3"/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
