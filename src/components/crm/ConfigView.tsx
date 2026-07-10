import React from 'react';
import { useBenefits } from '../../context/BenefitsContext';
import { localDB } from '../../lib/auth';

export const ConfigView: React.FC = () => {
  const { benefits, updateBenefit } = useBenefits();

  const clearDemoData = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar los clientes de demostración? Esta acción no se puede deshacer.')) return;
    
    const demoRutList = ['11.111.111-1', '22.222.222-2', '33.333.333-3', '44.444.444-4', '55.555.555-5'];
    const allContacts = await localDB.getCollection('contacts');
    
    for (const contact of allContacts) {
      if (demoRutList.includes(contact.rut)) {
        await localDB.deleteFromCollection('contacts', contact.id);
      }
    }
    alert('Clientes de demostración eliminados.');
    window.dispatchEvent(new Event('db-change'));
  };

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
      
      <div className="bg-[#0D1527] p-6 rounded-2xl border border-[#1E293B] mt-8">
        <h3 className="text-white font-bold mb-4">Mantenimiento</h3>
        <button onClick={clearDemoData} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
          Eliminar Clientes de Demostración
        </button>
      </div>
    </div>
  );
};
