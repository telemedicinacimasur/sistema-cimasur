import React from 'react';
import { useBenefits } from '../../context/BenefitsContext';

export const ConfigView: React.FC = () => {
  const { benefits, updateBenefit } = useBenefits();

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-bold text-white">Configuración - Beneficios</h2>
      <div className="grid gap-4">
        {Object.entries(benefits).map(([cat, desc]) => (
          <div key={cat} className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B]">
            <label className="text-sky-400 font-bold capitalize block mb-2">{cat}</label>
            <textarea 
              value={desc}
              onChange={(e) => updateBenefit(cat, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm"
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
