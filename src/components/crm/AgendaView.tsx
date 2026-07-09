import React from 'react';
import { CalendarDays, Phone, Mail } from 'lucide-react';

export const AgendaView: React.FC = () => (
  <div className="p-8 space-y-6">
    <h2 className="text-xl font-bold text-white flex items-center gap-2"><CalendarDays className="text-sky-400" /> Agenda Comercial</h2>
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
         <span className="text-white">Llamada a Veterinaria Caldera</span>
         <Phone className="text-green-400" size={18}/>
      </div>
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
         <span className="text-white">Enviar correo a Clinica Biofilia</span>
         <Mail className="text-sky-400" size={18}/>
      </div>
    </div>
  </div>
);
