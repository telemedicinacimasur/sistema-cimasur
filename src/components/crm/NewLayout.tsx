
import React from 'react';
import { LayoutDashboard, Users, Mail, Bot, CalendarDays, Settings, FilePlus, Laptop, BarChart3, Rocket, Zap, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

export const NewLayout: React.FC<{ children: React.ReactNode, activeView: string, setActiveView: (v: string) => void }> = ({ children, activeView, setActiveView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Comercial', icon: LayoutDashboard },
    { id: 'clientes', label: 'Cartera Comercial', icon: Users },
    { id: 'marketing', label: 'Marketing', icon: Mail },
    { id: 'oportunidades', label: 'Oportunidades', icon: Rocket },
    { id: 'fidelizacion', label: 'Club Comercial', icon: Zap },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050914] text-slate-200">
      <header className="bg-[#0D1527] border-b border-[#1E293B] p-4 flex items-center gap-6">
        <div className="text-xl font-bold text-white px-4 tracking-tight">Cimasur Pro CRM</div>
        <nav className="flex items-center gap-2">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                activeView === item.id 
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-auto bg-[#050914]">
        {children}
      </main>
    </div>
  );
};
