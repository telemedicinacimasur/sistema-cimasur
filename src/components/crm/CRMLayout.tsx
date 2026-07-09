
import React from 'react';
import { LayoutDashboard, Users, Zap, Mail, Bot, CalendarDays, Settings, FilePlus, Laptop } from 'lucide-react';

export const CRMLayout: React.FC<{ children: React.ReactNode, activeView: string, setActiveView: (v: string) => void }> = ({ children, activeView, setActiveView }) => {
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'crm_register', label: 'Ficha Registro', icon: FilePlus },
    { id: 'crm_list', label: 'Cartera Clientes', icon: Users },
    { id: 'crm_activities', label: 'Registro Actividades', icon: CalendarDays },
    { id: 'crm_club', label: 'Club Social', icon: Zap },
    { id: 'crm_intranet', label: 'Intranet', icon: Laptop },
    { id: 'ia', label: 'IA Comercial', icon: Bot },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#050914] text-slate-200">
      <nav className="w-56 bg-[#0D1527] border-r border-[#1E293B] p-4 flex flex-col gap-2">
        <div className="text-xl font-bold text-white mb-6 p-2">Cimasur CRM</div>
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeView === item.id ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
};
