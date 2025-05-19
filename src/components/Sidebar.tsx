// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Pill,
  Calendar,
  Activity,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase, // Para el logo
  X, // Para cerrar en móvil
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, toggleMobileMenu }) => {
  // Estado para controlar si el sidebar está "fijado" como abierto en desktop
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  // Estado para controlar si el cursor está sobre el sidebar (solo para desktop cuando no está fijado)
  const [isHovering, setIsHovering] = useState(false);
  
  const { signOut, currentUser, userProfile } = useAppContext();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { to: '/patients', icon: <Users size={22} />, label: 'Pacientes' },
    { to: '/medications', icon: <Pill size={22} />, label: 'Medicamentos' },
    { to: '/appointments', icon: <Calendar size={22} />, label: 'Citas' },
    { to: '/vitals', icon: <Activity size={22} />, label: 'Signos Vitales' },
    { to: '/reports', icon: <FileText size={22} />, label: 'Reportes' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      if (isMobileMenuOpen) { // Cerrar menú móvil si está abierto al hacer logout
        toggleMobileMenu();
      }
    } catch (error) {
      console.error("Logout failed from Sidebar:", error);
    }
  };

  // Determinar si el sidebar debe estar visualmente expandido en desktop
  const isDesktopExpanded = isPinnedOpen || isHovering;

  // Efecto para cerrar el menú móvil si la pantalla se agranda
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) { // 768px es el breakpoint 'md' de Tailwind
        toggleMobileMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen, toggleMobileMenu]);


  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Encabezado del Sidebar */}
      <div className={`flex items-center p-4 border-b border-indigo-700 ${isMobile || isDesktopExpanded ? 'justify-between' : 'justify-center'}`}>
        {(isMobile || isDesktopExpanded) && (
          <Link to="/" className="flex items-center gap-2" onClick={isMobile ? toggleMobileMenu : undefined}>
            <Briefcase size={isMobile ? 28 : 32} className="text-white" />
            <h1 className="text-xl font-bold text-white">MediRemind</h1>
          </Link>
        )}
        {isMobile && (
          <button
            onClick={toggleMobileMenu}
            className="p-1 text-indigo-200 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        )}
        {!isMobile && ( // Botón de fijar/minimizar para desktop
          <button
            onClick={() => setIsPinnedOpen(!isPinnedOpen)}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={isPinnedOpen ? "Minimizar sidebar" : "Fijar sidebar"}
          >
            {isPinnedOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        )}
      </div>

      {/* Perfil del Doctor (opcional) */}
      {currentUser && userProfile && (isMobile || isDesktopExpanded) && (
        <div className="p-4 border-b border-indigo-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-700 font-semibold">
              {userProfile.name?.substring(0, 1) || currentUser.email?.substring(0,1)?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate">{userProfile.name || 'Doctor'}</p>
              <p className="text-xs text-indigo-200 truncate">{userProfile.specialty || userProfile.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Elementos de Navegación */}
      <nav className="flex-grow py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={isMobile ? toggleMobileMenu : undefined} // Cerrar menú móvil al hacer clic
                className={({ isActive }) => `
                  flex items-center py-2.5 px-3 rounded-md text-sm font-medium group
                  transition-colors duration-150 ease-in-out
                  ${isActive 
                    ? 'bg-indigo-700 text-white shadow-inner' 
                    : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'}
                  ${(isMobile || isDesktopExpanded) ? '' : 'justify-center'}
                `}
                title={item.label} // Mostrar tooltip cuando está colapsado
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {(isMobile || isDesktopExpanded) && <span className="ml-3 truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Botón de Logout */}
      {currentUser && (
        <div className="p-2 border-t border-indigo-700 mt-auto">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2.5 px-3 rounded-md text-sm font-medium text-indigo-200 hover:bg-red-600 hover:text-white group transition-colors duration-150 ease-in-out ${(isMobile || isDesktopExpanded) ? '' : 'justify-center'}`}
            title="Cerrar Sesión"
          >
            <LogOut size={22} />
            {(isMobile || isDesktopExpanded) && <span className="ml-3 truncate">Cerrar Sesión</span>}
          </button>
        </div>
      )}
    </>
  );

  // Renderizado para Desktop
  return (
    <>
      {/* Sidebar para Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-indigo-800 text-white shadow-lg fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out
                    ${isPinnedOpen ? 'w-64' : 'w-20'} hover:w-64 group/sidebar`}
        onMouseEnter={() => { if (!isPinnedOpen) setIsHovering(true); }}
        onMouseLeave={() => { if (!isPinnedOpen) setIsHovering(false); }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Sidebar para Móvil (Overlay) */}
      <div
        className={`md:hidden fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden" onClick={toggleMobileMenu} aria-hidden="true"></div>
        <div className="relative flex flex-col w-64 max-w-[calc(100%-3rem)] h-full bg-indigo-800 text-white shadow-xl">
          {sidebarContent(true)}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
