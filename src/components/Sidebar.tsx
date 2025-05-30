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
  // Settings, // Comentado si no se usa
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

  // Determina si el sidebar está efectivamente expandido en escritorio
  const isEffectivelyExpandedDesktop = !isDesktopInitiallyCollapsed || (isDesktopInitiallyCollapsed && isDesktopHovered);
  // Determina si el texto debe ser visible
  const showText = isMobileOpen || isEffectivelyExpandedDesktop;
  // Determina si estamos en modo escritorio realmente colapsado (para centrar íconos)
  const isTrulyCollapsedDesktopAndNotMobile = isDesktopInitiallyCollapsed && !isDesktopHovered && !isMobileOpen;


  const sidebarClasses = clsx(
    'fixed top-0 left-0 h-full bg-slate-800 text-slate-100 flex flex-col',
    'transition-all duration-300 ease-in-out', // transition-all para ancho y transform
    'shadow-2xl z-40',

    // Comportamiento Móvil: se desliza, ancho fijo
    isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',

    // Comportamiento Escritorio (md: y superior)
    // Anula la transformación y el ancho móvil por defecto para escritorio.
    // Siempre en pantalla horizontalmente para escritorio.
    'md:translate-x-0', 
    {
      // Estado colapsado (solo íconos)
      'md:w-20': isDesktopInitiallyCollapsed && !isDesktopHovered,
      // Estado expandido (ancho completo)
      // Se aplica si no está colapsado por defecto, O si está colapsado por defecto Y está siendo hovereado.
      'md:w-64': !isDesktopInitiallyCollapsed || (isDesktopInitiallyCollapsed && isDesktopHovered),
    }
  );
  
  return (
    <aside
      className={sidebarClasses}
      onMouseEnter={() => {
        // Solo activar hover en escritorio si está en modo colapsable inicial
        if (window.innerWidth >= 768 && isDesktopInitiallyCollapsed) {
          setIsDesktopHovered(true);
          if (onDesktopHoverChange) onDesktopHoverChange(true);
        }
      }}
      onMouseLeave={() => {
        // Solo desactivar hover en escritorio si está en modo colapsable inicial
        if (window.innerWidth >= 768 && isDesktopInitiallyCollapsed) {
          setIsDesktopHovered(false);
          if (onDesktopHoverChange) onDesktopHoverChange(false);
        }
      }}
    >
      {/* Logo y Título */}
      <div className={clsx(
        "flex items-center p-4 h-16 border-b border-slate-700 shrink-0",
        { "justify-center": isTrulyCollapsedDesktopAndNotMobile } // Centrar logo si está verdaderamente colapsado en escritorio
      )}>
        <Briefcase size={isTrulyCollapsedDesktopAndNotMobile ? 28 : 26} className="text-indigo-400 flex-shrink-0" />
        {showText && (
          <span className="text-xl font-semibold whitespace-nowrap ml-2">MediRemind</span>
        )}
      </div>

      {/* Perfil del Usuario - solo mostrar si el texto es visible (sidebar expandido) */}
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
                    "px-4": showText, // Padding para texto
                    "justify-center h-14": isTrulyCollapsedDesktopAndNotMobile, // Centrar íconos si está verdaderamente colapsado
                    "bg-indigo-600 text-white font-medium shadow-inner": isActive,
                    "text-slate-300 hover:bg-slate-700 hover:text-white": !isActive,
                  }
                )}
                title={isTrulyCollapsedDesktopAndNotMobile ? item.label : ""} // Tooltip para íconos
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
            title={isTrulyCollapsedDesktopAndNotMobile ? "Logout" : ""}
            className={clsx(
              "w-full flex items-center text-sm transition-colors duration-200 rounded-md",
              "text-slate-300 hover:bg-red-600 hover:text-white",
              {
                "px-4 py-3": showText,
                "justify-center h-12": isTrulyCollapsedDesktopAndNotMobile,
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