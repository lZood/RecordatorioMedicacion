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
  Bell,
  Pin, // Importar el icono de Pin
  Menu, // Importar el icono de Menu para el botón de toggle en el sidebar
  X as CloseIcon // Importar el icono de cerrar
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import clsx from 'clsx';

// Definición de las propiedades del componente Sidebar
interface SidebarProps {
  isMobileOpen: boolean; // Indica si el sidebar móvil está abierto
  toggleMobileSidebar: () => void; // Función para alternar el estado del sidebar móvil
  isPinned: boolean; // Indica si el sidebar de escritorio está fijado (expandido permanentemente)
  setIsPinned: (pinned: boolean) => void; // Función para cambiar el estado de fijado
  onDesktopHoverChange: (isHovered: boolean) => void; // Callback para notificar al Layout sobre el estado de hover del escritorio
}

// Elementos de navegación del sidebar
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
  isMobileOpen,
  toggleMobileSidebar,
  isPinned,
  setIsPinned,
  onDesktopHoverChange
}) => {
  const { signOut, currentUser, userProfile } = useAppContext();
  const navigate = useNavigate();
  
  // Estado local para saber si el cursor está sobre el sidebar en escritorio
  // Solo se activa si el sidebar NO está fijado
  const [isDesktopHovered, setIsDesktopHovered] = React.useState(false);

  // Manejador para el cierre de sesión
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      if (isMobileOpen) {
        toggleMobileSidebar(); // Cierra el sidebar móvil si está abierto al cerrar sesión
      }
    } catch (error) {
      console.error("Logout failed from Sidebar:", error);
    }
  };
  
  // Obtiene el nombre y rol del usuario para mostrar en el perfil
  const userName = userProfile?.name || currentUser?.email?.split('@')[0] || "Usuario";
  const userRole = userProfile?.specialty || userProfile?.role || "Rol no definido";

  // Determina si el sidebar debe mostrar el texto (expandido)
  // Es expandido si es móvil, o si está fijado, o si no está fijado pero se está haciendo hover
  const isEffectivelyExpanded = isMobileOpen || isPinned || isDesktopHovered;
  
  // Determina si estamos en modo escritorio realmente colapsado (para centrar íconos)
  // Esto es cuando el sidebar NO está fijado Y NO está siendo hovereado Y NO es móvil.
  const isTrulyCollapsedDesktop = !isPinned && !isDesktopHovered && !isMobileOpen;

  // Clases CSS para el sidebar, controlando su ancho y visibilidad
  const sidebarClasses = clsx(
    'fixed top-0 left-0 h-full bg-slate-800 text-slate-100 flex flex-col',
    'transition-all duration-300 ease-in-out shadow-2xl z-40',
    // Móvil: siempre w-64, se mueve con translate-x
    'md:hidden', 
    isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full',
    
    // Escritorio:
    {
      'hidden md:flex': true, // Asegura que solo sea flex en escritorio
      'md:translate-x-0': true, // Siempre visible en X en escritorio
      'md:w-20': !isEffectivelyExpanded, // Colapsado (ancho 20)
      'md:w-64': isEffectivelyExpanded, // Expandido (ancho 64)
    }
  );
  
  return (
    <aside
      className={sidebarClasses}
      // Manejadores de eventos para el efecto hover en escritorio
      onMouseEnter={() => {
        // Solo aplica el hover si no está fijado y es una pantalla de escritorio
        if (window.innerWidth >= 768 && !isPinned) {
          setIsDesktopHovered(true);
          onDesktopHoverChange(true); // Notifica al Layout
        }
      }}
      onMouseLeave={() => {
        // Solo aplica el hover si no está fijado y es una pantalla de escritorio
        if (window.innerWidth >= 768 && !isPinned) {
          setIsDesktopHovered(false);
          onDesktopHoverChange(false); // Notifica al Layout
        }
      }}
    >
      {/* Logo y Título */}
      <div className={clsx(
        "flex items-center p-4 h-16 border-b border-slate-700 shrink-0",
        { "justify-center": !isEffectivelyExpanded } // Centra el logo si está colapsado
      )}>
        <Briefcase size={isEffectivelyExpanded ? 26 : 28} className="text-indigo-400 flex-shrink-0" />
        {isEffectivelyExpanded && (
          <span className="text-xl font-semibold whitespace-nowrap ml-2">MediRemind</span>
        )}
        {/* Botón para alternar el sidebar móvil (solo visible en móvil) */}
        <button 
          onClick={toggleMobileSidebar}
          className="md:hidden ml-auto p-2 rounded-md hover:bg-slate-700 text-slate-300"
          aria-label="Toggle sidebar"
        >
          <CloseIcon size={24} />
        </button>
      </div>

      {/* Botón de Pin para fijar/desfijar el sidebar (solo visible en escritorio) */}
      <div className={clsx(
        "hidden md:flex items-center justify-end p-2",
        { "justify-center": !isEffectivelyExpanded } // Centra el botón si está colapsado
      )}>
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={clsx(
            "p-2 rounded-full text-slate-300 hover:bg-slate-700",
            { "bg-slate-700": isPinned } // Resalta el botón si está fijado
          )}
          title={isPinned ? "Desfijar Sidebar" : "Fijar Sidebar"}
          aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          <Pin size={20} strokeWidth={1.75} className={clsx({ "rotate-45": !isPinned })} /> {/* Gira el icono si no está fijado */}
        </button>
      </div>


      {/* Perfil del Usuario */}
      {isEffectivelyExpanded && currentUser && (
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
                onClick={isMobileOpen ? toggleMobileSidebar : undefined} // Cierra el sidebar móvil al hacer clic en un enlace
                className={({ isActive }) => clsx(
                  "flex items-center py-3 text-sm transition-colors duration-200",
                  {
                    "px-4": isEffectivelyExpanded, // Padding horizontal si está expandido
                    "justify-center h-14": !isEffectivelyExpanded, // Centra verticalmente si está colapsado
                    "bg-indigo-600 text-white font-medium shadow-inner": isActive, // Estilo activo
                    "text-slate-300 hover:bg-slate-700 hover:text-white": !isActive, // Estilo inactivo
                  }
                )}
                title={!isEffectivelyExpanded ? item.label : ""} // Muestra tooltip si está colapsado
              >
                <span className={clsx("flex-shrink-0", { "mr-3": isEffectivelyExpanded })}>
                  {React.cloneElement(item.icon as React.ReactElement, { strokeWidth: 1.75 })}
                </span>
                {isEffectivelyExpanded && (
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
            title={!isEffectivelyExpanded ? "Logout" : ""} // Muestra tooltip si está colapsado
            className={clsx(
              "w-full flex items-center text-sm transition-colors duration-200 rounded-md",
              "text-slate-300 hover:bg-red-600 hover:text-white",
              {
                "px-4 py-3": isEffectivelyExpanded, // Padding horizontal si está expandido
                "justify-center h-12": !isEffectivelyExpanded, // Centra verticalmente si está colapsado
              }
            )}
          >
            <LogOut size={20} strokeWidth={1.75} className={clsx({ "mr-3": isEffectivelyExpanded })} />
            {isEffectivelyExpanded && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
