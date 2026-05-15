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
  Home,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { UserSettingsDialog } from '../../components/UserSettingsDialog';
import { NotificationsDialog } from '../../components/NotificationsDialog';
import { subscribeToNotifications, Notification } from '../../lib/notifications';
import { BackToTop } from '../../components/BackToTop';

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
      const unsubscribe = subscribeToNotifications(userRoles, user.displayName || user.email || 'Sistema', (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const menuItems = [
    { name: 'CPANEL SISTEMA', icon: ShieldCheck, path: '/cpanel', roles: ['admin'] },
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
    <div className="flex h-screen bg-[#0D1527] text-white font-[Inter,sans-serif] antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0D1527] border-r border-[#1E293B] flex flex-col py-6 px-4 z-40 relative shadow-xl">
        <div className="px-2 mb-8 flex flex-col items-center flex-shrink-0">
          <div className="flex flex-col items-center justify-center w-full relative">
            <div className="w-16 h-16 bg-[#1a2e59] rounded-2xl flex items-center justify-center mb-3 border border-[#334155] shadow-lg group hover:border-[#38BDF8] transition-colors">
              <span className="text-white font-sans text-3xl font-black italic">C</span>
            </div>
            <div className="text-white font-sans text-xl tracking-widest z-10 font-black uppercase">
              Cimasur
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-[12px] font-black uppercase",
                location.pathname === item.path 
                  ? "bg-[#38BDF8] text-black shadow-[0_4px_20px_rgba(56,189,248,0.2)]" 
                  : "text-slate-400 hover:text-white hover:bg-[#1E293B]"
              )}
            >
              <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-black" : "text-slate-400 group-hover:text-white")} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#1E293B] flex flex-col gap-2 flex-shrink-0">
          <a href="mailto:formacion@cimasur.cl" className="flex items-center gap-3 text-slate-400 hover:text-white px-4 py-3 hover:bg-[#1E293B] transition-all rounded-xl text-left text-[12px] font-black border border-transparent">
            <HelpCircle className="w-5 h-5" />
            <span>Soporte</span>
          </a>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-slate-400 hover:text-white px-4 py-3 hover:bg-[#1E293B] transition-all rounded-xl text-left text-[12px] font-black border border-transparent"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 h-20 flex-shrink-0 z-50 flex justify-between items-center px-8 sticky top-0 shadow-sm">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 p-2 text-slate-500 hover:text-[#1E293B] hover:bg-slate-100 rounded-xl transition-all"
            >
              <Home className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <h2 className="text-xl font-bold tracking-wider text-[#1E293B] uppercase">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsNotificationsOpen(true)} className="p-2.5 text-slate-500 hover:text-[#1E293B] hover:bg-slate-100 rounded-xl transition-all relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-slate-500 hover:text-[#1E293B] hover:bg-slate-100 rounded-xl transition-all group relative">
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                <div className="text-right hidden sm:block overflow-hidden max-w-[150px]">
                  <p className="text-sm font-bold text-[#1E293B] leading-tight truncate">{user?.displayName || user?.email}</p>
                  <p className="text-[10px] text-[#1E293B] leading-tight uppercase font-black tracking-widest truncate mt-0.5">
                    {(user?.roles || [user?.role]).join(' / ')}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                  {user?.photoURL ? (
                    <img alt="User" className="w-full h-full object-cover" src={user.photoURL} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#1E293B] text-sm">
                      {user?.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 overflow-auto flex-1 custom-scrollbar text-white">
          {children}
        </div>
      </main>
      <BackToTop />
      <UserSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} onUpdate={() => window.location.reload()} />
      <NotificationsDialog isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}
