import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FlaskConical, 
  GraduationCap, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardView() {
  const { user } = useAuth();
  
  React.useEffect(() => {
    console.log("DashboardView - Current User:", user);
  }, [user]);

  const allModules = [
    {
      name: 'Laboratorio',
      description: 'Gestión técnica, registros de elaboración y protocolos.',
      icon: FlaskConical,
      path: '/laboratorio',
      color: 'bg-[#a9c7ff]/10 text-[#001736]',
      roles: ['admin', 'lab', 'viewer_lab']
    },
    {
      name: 'Administración',
      description: 'Seguimiento de cotizaciones, ingreso de documentos y registro de unidades.',
      icon: ShieldCheck,
      path: '/administracion',
      color: 'bg-[#002b5b]/10 text-[#001736]',
      roles: ['admin']
    },
    {
      name: 'Comercial CRM',
      description: 'Gestión de clientes, registros de interacción y seguimiento.',
      icon: TrendingUp,
      path: '/crm',
      color: 'bg-[#91cef1]/10 text-[#001736]',
      roles: ['admin', 'crm', 'viewer_crm']
    },
    {
      name: 'Escuela CIMASUR',
      description: 'Gestión Integral del Alumno (Matrícula, Seguimiento y Control Académico).',
      icon: GraduationCap,
      path: '/escuela',
      color: 'bg-primary/10 text-primary',
      roles: ['admin', 'school', 'viewer_school']
    }
  ];

  const modules = allModules.filter(m => {
    if (user?.role === 'admin' || user?.roles?.includes('admin')) return true;
    console.log("Checking module:", m.name, "roles required:", m.roles, "user roles:", user?.roles);
    const hasAccess = m.roles.some(r => user?.roles?.includes(r) || user?.role === r);
    console.log("Module:", m.name, "Has Access:", hasAccess);
    return hasAccess;
  });

  return (
    <div className="space-y-10 py-6">
      <div className="text-left">
        <h2 className="text-3xl font-bold text-[#001736] mb-2">Sistema CIMASUR</h2>
        <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
          Acceda al modulo correspondiente y a sus herramientas administrativas para la gestión eficiente del laboratorio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className="group bg-white p-8 rounded-2xl border border-slate-200 hover:border-[#60a5fa] hover:shadow-xl transition-all duration-300 flex flex-col text-left relative overflow-hidden"
          >
            <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200`}>
              <module.icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#001736] mb-2">{module.name}</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              {module.description}
            </p>
            <div className="mt-auto flex items-center text-[#60a5fa] font-bold text-[10px] uppercase tracking-widest gap-2">
              Ingresar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden h-[400px] shadow-2xl group">
        <img 
          src="https://cimasur.cl/wp-content/uploads/2023/12/Portada-web-1.jpg" 
          alt="Lab Banner" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001736]/90 to-transparent flex flex-col justify-center px-12">
          <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Gestión de datos</h2>
          <p className="text-blue-100/70 max-w-md text-sm leading-relaxed">
            Consolidación integral de procesos de laboratorio y administrativos. Potenciando la precisión institucional.
          </p>
        </div>
      </div>
      
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div className="flex gap-8">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Online</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SQL Database: Persistence Active</span>
           </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
           v4.5.0 © 2024 CIMASUR BIOTECHNOLOGY
        </div>
      </div>
    </div>
  );
}
