import React, { useState } from 'react';
import { Campaign } from '../../../types';
import { CampaignService } from '../../../services/crm/CampaignService';

const AVAILABLE_VARIABLES = ['{nombre}', '{categoria}', '{promedioMensual}', '{beneficio}'];

export const CampaignEditor: React.FC<{ onSave: () => void }> = ({ onSave }) => {
  const [campaign, setCampaign] = useState<Partial<Campaign>>({
    name: '',
    type: 'email',
    body: '',
    targetSegment: 'todos'
  });

  const handleSave = async () => {
    if (!campaign.name || !campaign.body) return;
    await CampaignService.createCampaign(campaign as Campaign);
    onSave();
  };

  const insertVariable = (variable: string) => {
    setCampaign({ ...campaign, body: (campaign.body || '') + variable });
  };

  return (
    <div className="bg-[#152a42] p-6 rounded-2xl border border-[#1e3a5f] text-white">
      <h2 className="text-xl font-bold mb-4">Editor de Campañas</h2>
      <div className="space-y-4">
        <input 
          placeholder="Nombre de la campaña" 
          className="w-full bg-slate-800 p-2 rounded text-white"
          value={campaign.name}
          onChange={e => setCampaign({...campaign, name: e.target.value})}
        />
        <select 
          className="w-full bg-slate-800 p-2 rounded text-white"
          value={campaign.type}
          onChange={e => setCampaign({...campaign, type: e.target.value as any})}
        >
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
            className="w-full bg-slate-800 p-2 rounded text-white"
            value={campaign.targetSegment}
            onChange={e => setCampaign({...campaign, targetSegment: e.target.value})}
        >
            <option value="todos">Todos los clientes</option>
            <option value="cercaSubir">Cerca de subir categoría</option>
            <option value="riesgo">Clientes en riesgo</option>
        </select>
        
        <div className="flex gap-2">
            {AVAILABLE_VARIABLES.map(v => (
                <button key={v} onClick={() => insertVariable(v)} className="bg-slate-700 text-xs px-2 py-1 rounded hover:bg-slate-600">
                    {v}
                </button>
            ))}
        </div>

        <textarea 
          placeholder="Cuerpo del mensaje..."
          className="w-full h-40 bg-slate-800 p-2 rounded text-white"
          value={campaign.body}
          onChange={e => setCampaign({...campaign, body: e.target.value})}
        />
        <button 
          onClick={handleSave}
          className="bg-sky-600 text-white px-4 py-2 rounded font-bold hover:bg-sky-500"
        >
          Guardar y Enviar
        </button>
      </div>
    </div>
  );
};
