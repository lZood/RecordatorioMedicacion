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
  Briefcase,
  Settings,
  Bell
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import clsx from 'clsx';

interface SidebarProps {
  isDesktopInitiallyCollapsed: boolean;
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
  onDesktopHoverChange?: (isHovered: boolean) => void;
}

const navItems = [
  { to: '/', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
  { to: '/patients', icon: <Users size={22} />, label: 'Pacientes' },
  { to: '/medications', icon: <Pill size={22} />, label: 'Medicamentos' },
  { to: '/appointments', icon: <Calendar size={22} />, label: 'Citas' },
  { to: '/notifications', icon: <Bell size={22}/>, label: 'Notificaciones'},
  { to: '/vitals', icon: <Activity size={22} />, label: 'Signos Vitales' },
  { to: '/reports', icon: <FileText size={22} />, label: 'Reportes' },
  // { to: '/settings', icon: <Settings size={22} />, label: 'Configuración' },
];

const Sidebar: React.FC<SidebarProps> = ({
  isDesktopInitiallyCollapsed,
  isMobileOpen,
  toggleMobileSidebar,
  onDesktopHoverChange
}) => {
  const { signOut, currentUser, userProfile } = useAppContext();
  const navigate = useNavigate();
  const [isDesktopHovered, setIsDesktopHovered] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      if (isMobileOpen) {
        toggleMobileSidebar();
      }
    } catch (error) {
      console.error("Logout failed from Sidebar:", error);
    }
  };
  
  const userName = userProfile?.name || currentUser?.email?.split('@')[0] || "Usuario";
  const userRole = userProfile?.specialty || userProfile?.role || "Rol no definido";

  const isEffectivelyExpandedDesktop = isDesktopInitiallyCollapsed ? isDesktopHovered : !isDesktopInitiallyCollapsed;
  const showText = isMobileOpen || isEffectivelyExpandedDesktop;

  const sidebarClasses = clsx(
    'fixed top-0 left-0 h-full bg-slate-800 text-slate-100 flex flex-col', // Clases base siempre aplicadas
    'transition-transform duration-300 ease-in-out', // Transición para el deslizamiento
    'shadow-2xl z-40', // Asegura que esté sobre el contenido y el overlay móvil

    // ---- ESTADO MÓVIL (<md) ----
    // Aplica transformaciones para mostrar/ocultar. El ancho es fijo.
    // Estas clases son las predeterminadas y serán anuladas por las clases 'md:' en escritorio.
    isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',

    // ---- ESTADO ESCRITORIO (md y superior) ----
    // Anula la transformación de 'translate-x' móvil por defecto para escritorio.
    'md:translate-x-0', 
    {
      // Si está colapsado por defecto en escritorio Y NO está siendo hovereado:
      // se oculta deslizándose fuera de la pantalla. El ancho no importa mucho aquí.
      'md:-translate-x-full': isDesktopInitiallyCollapsed && !isDesktopHovered,

      // Si está permanentemente expandido, O si está colapsado por defecto PERO SÍ está siendo hovereado:
      // Se muestra expandido a w-64 y se asegura que esté en translate-x-0.
      'md:w-64 md:translate-x-0': !isDesktopInitiallyCollapsed || (isDesktopInitiallyCollapsed && isDesktopHovered),
    }
  );
  
  return (
    <aside
      className={sidebarClasses}
      onMouseEnter={() => {
        if (window.innerWidth >= 768 && isDesktopInitiallyCollapsed) {
          setIsDesktopHovered(true);
          if (onDesktopHoverChange) onDesktopHoverChange(true);
        }
      }}
      onMouseLeave={() => {
        if (window.innerWidth >= 768 && isDesktopInitiallyCollapsed) {
          setIsDesktopHovered(false);
          if (onDesktopHoverChange) onDesktopHoverChange(false);
        }
      }}
    >
      {/* Logo y Título */}
      <div className={clsx(
        "flex items-center p-4 h-16 border-b border-slate-700 shrink-0",
      )}>
        <Briefcase size={showText ? 26 : 28} className="text-indigo-400 flex-shrink-0" />
        {showText && (
          <span className="text-xl font-semibold whitespace-nowrap ml-2">MediRemind</span>
        )}
      </div>

      {/* Perfil del Usuario */}
      {showText && currentUser && (
        <div className="p-4 border-b border-slate-700 shrink-0">
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
                onClick={isMobileOpen ? toggleMobileSidebar : undefined}
                className={({ isActive }) => clsx(
                  "flex items-center py-3 text-sm transition-colors duration-200",
                  {
                    "px-4": showText,
                    "bg-indigo-600 text-white font-medium shadow-inner": isActive,
                    "text-slate-300 hover:bg-slate-700 hover:text-white": !isActive,
                  }
                )}
                title={!showText && !isMobileOpen && isDesktopInitiallyCollapsed && !isDesktopHovered ? item.label : ""}
              >
                <span className={clsx("flex-shrink-0", { "mr-3": showText })}>
                  {React.cloneElement(item.icon as React.ReactElement, { strokeWidth: 1.75 })}
                </span>
                {showText && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sección de Logout */}
      {currentUser && (
        <div className={clsx("p-4 border-t border-slate-700 shrink-0")}>
          <button
            onClick={handleLogout}
            title={!showText && !isMobileOpen && isDesktopInitiallyCollapsed && !isDesktopHovered ? "Logout" : ""}
            className={clsx(
              "w-full flex items-center text-sm transition-colors duration-200 rounded-md",
              "text-slate-300 hover:bg-red-600 hover:text-white",
              {
                "px-4 py-3": showText,
              }
            )}
          >
            <LogOut size={20} strokeWidth={1.75} className={clsx({ "mr-3": showText })} />
            {showText && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;