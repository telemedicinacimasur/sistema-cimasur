import React, { useState } from 'react';
import { ClubClient, classifyClients } from '../../lib/crmLogic';
import { Mail, Phone, Users, Laptop } from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';

export const CimasurCRM: React.FC<{ clients: ClubClient[] }> = ({ clients }) => {
  const [activeTab, setActiveTab] = useState<'club' | 'intranet'>('club');
  const { clientesARecuperar, veterinariosIntranet, subitDeCategoria, zonaVIP } = classifyClients(clients);
  const { benefits } = useBenefits();

  const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

  const getMessage = (client: ClubClient, pillar: string) => {
    const name = client.name;
    const cat = (client.categoria || 'sin categoría').toLowerCase();
    const beneficio = benefits[cat] || '';
    const body = pillar === 'recuperar' ? `Estimado/a ${name}, le extrañamos en CIMASUR. ¿Le gustaría renovar su stock de Echinac A o Silimarina? ${beneficio}` :
                 pillar === 'intranet' ? `Estimado/a ${name}, active su acceso médico a la Intranet de CIMASUR.` :
                 pillar === 'subir' ? `Estimado/a ${name}, está a pasos de subir de categoría. ${beneficio}` :
                 `Estimado/a ${name}, gracias por ser parte de nuestra zona VIP Platinum. ${beneficio}`;
    return `subject=Cimasur Comercial&body=${body}`;
  };

  const renderClientRow = (client: ClubClient, pillar: string, status: 'normal' | 'critico' | 'sin_compra' | 'vip') => (
    <tr key={client.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
      <td className="p-4">
        <div className="font-extrabold text-white text-xs">{client.clinica}</div>
        <div className="text-[10.5px] text-slate-400">{client.name}</div>
        <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{client.rut}</div>
      </td>
      <td className="p-4 text-right font-mono font-bold text-white text-xs">
        {formatCLP((client.ventas?.v2026 || 0))}
      </td>
      <td className="p-4 text-center">
        <span className={`font-bold block px-2.5 py-1 rounded-lg text-[10px] w-fit mx-auto border ${status === 'critico' ? 'bg-red-950/40 text-red-400 border-red-900/30' : status === 'sin_compra' ? 'bg-slate-800 text-slate-350 border-slate-700' : status === 'vip' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-950/40 text-green-400 border-green-900/30'}`}>
          {status === 'critico' ? 'Crítico 🔴' : status === 'sin_compra' ? 'Sin Compra ⚫' : status === 'vip' ? 'Platinum 👑' : 'Normal 🟢'}
        </span>
      </td>
      <td className="p-4 text-center text-slate-300 text-xs font-medium">
        {pillar === 'subir' ? `${(client as any).metaFaltante || 0} frascos` : '-'}
      </td>
      <td className="p-4">
        <div className="flex gap-2 justify-center">
            <a href={`mailto:${client.email}?${getMessage(client, pillar)}`} className="bg-slate-800 hover:bg-sky-600 text-slate-300 p-2 rounded-lg transition-colors"><Mail size={14}/></a>
            <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-green-600 text-slate-300 p-2 rounded-lg transition-colors"><Phone size={14}/></a>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#050914] text-slate-200 min-h-screen">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('club')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase ${activeTab === 'club' ? 'bg-sky-500 text-slate-950' : 'bg-[#0d162d] text-slate-400 border border-slate-800'}`}><Users size={16}/>Club Comercial</button>
        <button onClick={() => setActiveTab('intranet')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase ${activeTab === 'intranet' ? 'bg-sky-500 text-slate-950' : 'bg-[#0d162d] text-slate-400 border border-slate-800'}`}><Laptop size={16}/>Intranet Prospectos</button>
      </div>

      <div className="bg-[#0d162d] border border-slate-850 rounded-2xl p-2">
        <table className="w-full">
          <thead>
            <tr className="text-slate-400 uppercase font-extrabold text-[10px] tracking-wider text-left border-b border-slate-800">
              <th className="p-4">Cliente Veterinario</th>
              <th className="p-4 text-right">Facturación</th>
              <th className="p-4 text-center">Estatus</th>
              <th className="p-4 text-center">Brecha</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === 'club' ? (
              <>
                {clientesARecuperar.map(c => renderClientRow(c, 'recuperar', 'critico'))}
                {subitDeCategoria.map(c => renderClientRow(c, 'subir', 'normal'))}
                {zonaVIP.map(c => renderClientRow(c, 'vip', 'vip'))}
              </>
            ) : (
                veterinariosIntranet.map(c => renderClientRow(c, 'intranet', 'sin_compra'))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
