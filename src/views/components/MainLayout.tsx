import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FlaskConical, 
  ShieldCheck, 
  TrendingUp, 
  GraduationCap, 
  HelpCircle, 
  LogOut,
  Bell,
  Settings,
  Search,
  FileText,
  Home,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatDate } from '../../lib/utils';
import { exportTableToPDF } from '../../lib/pdfUtils';
import { localDB } from '../../lib/auth';
import { UserSettingsDialog } from '../../components/UserSettingsDialog';
import { NotificationsDialog } from '../../components/NotificationsDialog';
import { DataBackup } from '../../components/DataBackup';
import { subscribeToNotifications, Notification } from '../../lib/notifications';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    if (user) {
      const userRoles = user.roles || [user.role || 'viewer'];
      const unsubscribe = subscribeToNotifications(userRoles, (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleGlobalExport = async () => {
    const path = location.pathname;
    
    if (path === '/laboratorio') {
      const records = await localDB.getCollection('lab_records');
      const data = records.map(r => [formatDate(new Date().toISOString()), r.type, r.producto || r.nroRegistro || r.nroIngreso, r.responsable || r.elaborador || '']);
      exportTableToPDF('Reporte Maestro: Laboratorio', ['Fecha', 'Tipo', 'Detalle/Producto', 'Responsable'], data, 'reporte_maestro_laboratorio');
    } else if (path === '/escuela') {
      const students = await localDB.getCollection('students');
      const data = students.map(s => [s.name, s.diplomado, s.pago, `${s.avance}%`]);
      exportTableToPDF('Reporte Maestro: Escuela', ['Alumno', 'Programa', 'Pago', 'Avance'], data, 'reporte_maestro_escuela');
    } else if (path === '/crm') {
      const contacts = await localDB.getCollection('contacts');
      const data = contacts.map(c => [c.name, c.rut, c.region, c.categoria, c.type]);
      exportTableToPDF('Cartera de Clientes CRM', ['Razón Social', 'RUT', 'Región', 'Categoría', 'Tipo'], data, 'crm_cartera_clientes');
    } else {
      alert('Esta vista no soporta exportación global por el momento. Use los botones de exportación dentro de cada módulo.');
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'lab', 'crm', 'school', 'gestion'] },
    { name: 'Laboratorio', icon: FlaskConical, path: '/laboratorio', roles: ['admin', 'lab'] },
    { name: 'Administración', icon: ShieldCheck, path: '/administracion', roles: ['admin', 'manager'] },
    { name: 'CRM Comercial', icon: TrendingUp, path: '/crm', roles: ['admin', 'crm'] },
    { name: 'Gestión', icon: Activity, path: '/gestion', roles: ['admin', 'gestion'] },
    { name: 'Escuela CIMASUR', icon: GraduationCap, path: '/escuela', roles: ['admin', 'school'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;
    const userRoles = user.roles || [user.role];
    return item.roles.some(r => userRoles.includes(r));
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    return item ? item.name : 'CIMASUR';
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-[#001736] border-r border-[#1e3a8a]/20 shadow-xl flex flex-col py-6 px-4 z-40">
        <div className="px-2 mb-8 flex flex-col items-center">
          <div className="flex flex-col items-center justify-center w-full relative drop-shadow-md">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1FA2D6] to-[#002b5b] rounded-full flex items-center justify-center mb-2 shadow-lg border-2 border-[#1FA2D6]">
              <span className="text-white font-serif text-3xl font-black italic">C</span>
            </div>
            <div className="text-white font-serif text-2xl tracking-widest z-10 font-black drop-shadow-sm uppercase">
              Cimasur
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group text-sm font-medium",
                location.pathname === item.path 
                  ? "bg-[#1e40af] text-white border-l-4 border-[#60a5fa] shadow-md" 
                  : "text-blue-100/70 hover:text-white hover:bg-[#1e40af]/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "scale-105" : "group-hover:scale-110 duration-150")} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#1e40af]/30 flex flex-col gap-1">
          <a href="mailto:formacion@cimasur.cl" className="flex items-center gap-3 text-blue-100/70 hover:text-white px-4 py-2 hover:bg-[#1e40af]/50 transition-all rounded-lg text-left text-sm font-medium">
            <HelpCircle className="w-5 h-5" />
            <span>Soporte</span>
          </a>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-blue-100/70 hover:text-white px-4 py-2 hover:bg-[#1e40af]/50 transition-all rounded-lg text-left text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 ml-64 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#e2e8f0] h-16 sticky top-0 z-50 flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 text-[#001736] font-semibold hover:bg-slate-50 transition-colors rounded-lg"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm tracking-tight text-slate-500 font-bold uppercase">Menú</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <h2 className="text-xl font-bold tracking-wider text-[#001736] uppercase">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGlobalExport}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" 
                title="Exportar PDF"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button onClick={() => setIsNotificationsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block overflow-hidden max-w-[150px]">
                  <p className="text-xs font-bold text-[#001736] leading-tight truncate">{user?.displayName || user?.email}</p>
                  <p className="text-[10px] text-slate-500 leading-tight uppercase font-medium truncate" title={(user?.roles || [user?.role]).join(' / ')}>
                    {(user?.roles || [user?.role]).join(' / ')}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-blue-100 border border-blue-200 overflow-hidden shadow-sm">
                  {user?.photoURL ? (
                    <img alt="User" className="w-full h-full object-cover" src={user.photoURL} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#001736] text-xs">
                      {user?.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </main>
      <DataBackup />
      <UserSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} onUpdate={() => window.location.reload()} />
      <NotificationsDialog isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}
