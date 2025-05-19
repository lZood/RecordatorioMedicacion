// src/components/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Pill,
  Calendar,
  Activity,
  FileText,
  LogOut,
  Briefcase, // Ícono para el logo
  Settings, // Ícono de ejemplo para "Configuración"
  Bell // Ícono para "Notificaciones"
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface SidebarProps {
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean; // Para controlar la visibilidad en móviles desde Layout
  toggleMobileSidebar?: () => void; // Para cerrar desde un ítem de menú si es necesario
}

const navItems = [
  { to: '/', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
  { to: '/patients', icon: <Users size={22} />, label: 'Pacientes' },
  { to: '/medications', icon: <Pill size={22} />, label: 'Medicamentos' },
  { to: '/appointments', icon: <Calendar size={22} />, label: 'Citas' },
  { to: '/notifications', icon: <Bell size={22}/>, label: 'Notificaciones'},
  { to: '/vitals', icon: <Activity size={22} />, label: 'Signos Vitales' },
  { to: '/reports', icon: <FileText size={22} />, label: 'Reportes' },
  // Puedes añadir más items aquí, por ejemplo:
  // { to: '/settings', icon: <Settings size={22} />, label: 'Configuración' },
];

const Sidebar: React.FC<SidebarProps> = ({
  isDesktopCollapsed,
  setIsDesktopCollapsed,
  isMobileOpen,
  toggleMobileSidebar
}) => {
  const { signOut, currentUser, userProfile } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      if (isMobileOpen && toggleMobileSidebar) {
        toggleMobileSidebar(); // Cerrar sidebar móvil después del logout
      }
    } catch (error) {
      console.error("Logout failed from Sidebar:", error);
    }
  };
  
  const userName = userProfile?.name || currentUser?.email?.split('@')[0] || "Usuario";
  const userRole = userProfile?.specialty || userProfile?.role || "Rol no definido";


  // Clases base para el sidebar
  const baseSidebarClasses = `
    fixed top-0 left-0 h-full bg-slate-800 text-slate-100 flex flex-col
    transition-all duration-300 ease-in-out shadow-xl z-40
  `;

  // Clases para escritorio
  const desktopSidebarClasses = `
    hidden md:flex 
    ${isDesktopCollapsed ? 'w-20 hover:w-64' : 'w-64'}
  `;
  
  // Clases para móvil (controlado por isMobileOpen desde Layout)
  const mobileSidebarClasses = `
     md:hidden
     ${isMobileOpen ? 'w-64 transform translate-x-0' : 'w-64 transform -translate-x-full'}
  `;


  return (
    <aside
      className={`${baseSidebarClasses} ${desktopSidebarClasses} ${mobileSidebarClasses}`}
      onMouseEnter={() => setIsDesktopCollapsed(false)}
      onMouseLeave={() => setIsDesktopCollapsed(true)}
    >
      {/* Logo y Título */}
      <div className={`flex items-center p-4 h-16 border-b border-slate-700 ${isDesktopCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-2 ${ (isDesktopCollapsed && !isMobileOpen) ? 'md:group-hover:flex' : ''}`}>
          <Briefcase size={isDesktopCollapsed && !isMobileOpen ? 28 : 26} className="text-indigo-400 flex-shrink-0" />
          {(!isDesktopCollapsed || isMobileOpen) && (
            <span className="text-xl font-semibold whitespace-nowrap">MediRemind</span>
          )}
        </div>
      </div>

      {/* Perfil del Usuario (Opcional, mejor en Header para móviles) */}
      {(!isDesktopCollapsed || isMobileOpen) && currentUser && (
        <div className="p-4 border-b border-slate-700">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mb-2 mx-auto">
                {userName.substring(0,2).toUpperCase()}
            </div>
            <p className="text-sm font-medium text-center truncate" title={userName}>{userName}</p>
            <p className="text-xs text-slate-400 text-center truncate" title={userRole}>{userRole}</p>
        </div>
      )}


      {/* Navegación Principal */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={isMobileOpen ? toggleMobileSidebar : undefined} // Cerrar en móvil al hacer clic
                className={({ isActive }) => `
                  flex items-center py-3 text-sm transition-colors duration-200 group
                  ${isDesktopCollapsed && !isMobileOpen ? 'px-0 justify-center w-20 h-14' : 'px-4'}
                  ${isActive 
                    ? 'bg-indigo-600 text-white font-medium shadow-inner' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
                title={isDesktopCollapsed && !isMobileOpen ? item.label : ""} // Tooltip para modo colapsado
              >
                <span className={`flex-shrink-0 ${isDesktopCollapsed && !isMobileOpen ? '' : 'mr-3'}`}>
                    {React.cloneElement(item.icon as React.ReactElement, { strokeWidth: 1.75 })}
                </span>
                {(!isDesktopCollapsed || isMobileOpen) && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sección de Logout */}
      {currentUser && (
        <div className={`p-4 border-t border-slate-700 ${isDesktopCollapsed && !isMobileOpen ? 'w-20' : 'w-auto'}`}>
          <button
            onClick={handleLogout}
            title={isDesktopCollapsed && !isMobileOpen ? "Logout" : ""}
            className={`
              w-full flex items-center text-sm transition-colors duration-200 group
              ${isDesktopCollapsed && !isMobileOpen ? 'px-0 justify-center h-12' : 'px-4 py-3'}
              text-slate-300 hover:bg-red-600 hover:text-white rounded-md
            `}
          >
            <LogOut size={20} strokeWidth={1.75} className={`${isDesktopCollapsed && !isMobileOpen ? '' : 'mr-3'}`} />
            {(!isDesktopCollapsed || isMobileOpen) && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;