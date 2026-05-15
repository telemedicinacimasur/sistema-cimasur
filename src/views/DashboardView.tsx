import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FlaskConical, 
  GraduationCap, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  Activity,
  DollarSign,
  Receipt,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { localDB } from '../lib/auth';
import { formatCurrency } from '../lib/utils';

export default function DashboardView() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    quotesCount: 0,
    quotesTotal: 0,
    salesCount: 0,
    salesTotal: 0,
    dteCount: 0,
    schoolTotal: 0
  });
  
  useEffect(() => {
     const loadStats = async () => {
        try {
           const [quotes, sales, dtes, school] = await Promise.all([
             localDB.getCollection('quotes'),
             localDB.getCollection('sales'),
             localDB.getCollection('dte_records'),
             localDB.getCollection('school_payments')
           ]);
           
           const quotesTotal = quotes.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total || 0)), 0);
           const salesTotal = sales.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total || 0)), 0);
           const schoolTotal = school.reduce((acc: number, curr: any) => acc + (parseFloat(curr.abono_mes_1 || 0) + parseFloat(curr.abono_mes_2 || 0)), 0); // simplification for summary
           
           setStats({
              quotesCount: quotes.length,
              quotesTotal,
              salesCount: sales.length,
              salesTotal,
              dteCount: dtes.length,
              schoolTotal
           });
        } catch (e) {
           console.error("Error loading stats", e);
        }
     };
     if (!loading) {
        loadStats();
     }
  }, [loading]);

  if (loading) {
     return <div>Cargando...</div>;
  }

  const allModules = [
    {
      name: 'Laboratorio',
      description: 'Gestión técnica, registros de elaboración y protocolos.',
      icon: FlaskConical,
      path: '/laboratorio',
      color: 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      roles: ['admin', 'lab']
    },
    {
      name: 'Administración',
      description: 'Seguimiento de cotizaciones, ingreso de documentos y registro de unidades.',
      icon: ShieldCheck,
      path: '/administracion',
      color: 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]',
      roles: ['admin', 'manager']
    },
    {
      name: 'Comercial CRM',
      description: 'Gestión de clientes, registros de interacción y seguimiento.',
      icon: TrendingUp,
      path: '/crm',
      color: 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      roles: ['admin', 'crm']
    },
    {
      name: 'Gestión',
      description: 'Módulo de gestión y seguimiento de clientes estratégicos.',
      icon: TrendingUp,
      path: '/gestion',
      color: 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
      roles: ['admin', 'gestion']
    },
    {
      name: 'Escuela CIMASUR',
      description: 'Gestión Integral del Alumno (Matrícula, Seguimiento y Control Académico).',
      icon: GraduationCap,
      path: '/escuela',
      color: 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]',
      roles: ['admin', 'school']
    }
  ];

  const modules = allModules.filter(m => {
    if (user?.role === 'admin' || user?.roles?.includes('admin')) return true;
    const userRoles = user?.roles || [user?.role];
    return m.roles.some(r => userRoles.includes(r));
  });

  return (
    <div className="space-y-10 py-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className="group bg-[#152a42] p-6 rounded-3xl border border-[#1e3a5f] hover:border-[#38bdf8]/50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 flex flex-col text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
               <module.icon className="w-24 h-24 text-white" />
            </div>
            <div className={`w-14 h-14 rounded-2xl ${module.color.replace('bg-', 'bg-white/10 ').split(' ').filter(c => !c.startsWith('bg-')).join(' ')} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
              <module.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">{module.name}</h3>
            <p className="text-slate-300 text-xs font-bold leading-relaxed mb-6">
              {module.description}
            </p>
            <div className="mt-auto flex items-center text-[#38bdf8] font-black text-[10px] uppercase tracking-widest gap-2">
              Ingresar al Módulo <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      <div className="relative rounded-3xl overflow-hidden h-[400px] shadow-sm group border border-[#1e3a5f]">
        <img 
          src="https://cimasur.cl/wp-content/uploads/2023/12/Portada-web-1.jpg" 
          alt="Lab Banner" 
          className="w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1527]/90 via-[#0D1527]/60 to-transparent flex flex-col justify-center px-16">
          <div className="w-16 h-1 bg-white mb-8 rounded-full" />
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic drop-shadow-sm leading-tight">SISTEMA<br/>CIMASUR</h2>
        </div>
      </div>
            {/* Parte de abajo (Footer contextual) */}
      <div className="flex justify-between items-center bg-[#152a42] border border-[#1e3a5f] p-6 rounded-3xl shadow-sm text-white">
        <div className="flex gap-8">
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">System Online</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Modules Synchronized</span>
           </div>
        </div>
        <div className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
           <Activity className="w-3 h-3" /> v4.5.0 © 2026 CIMASUR BIOTECHNOLOGY
        </div>
      </div>
    </div>
  );
}
