// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import clsx from 'clsx';

const Layout: React.FC = () => {
  // Estado para el colapso *persistente* del sidebar en escritorio (controlado por un botón futuro, por ejemplo)
  const [isDesktopSidebarPermanentlyCollapsed, setIsDesktopSidebarPermanentlyCollapsed] = useState(true);
  
  // Estado para saber si el cursor está sobre el sidebar en escritorio (para el efecto hover)
  const [isDesktopSidebarHovered, setIsDesktopSidebarHovered] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileSidebarOpen(false); 
  }, [location]);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Función para que Sidebar notifique al Layout sobre el hover
  const handleDesktopSidebarHoverChange = (isHovered: boolean) => {
    setIsDesktopSidebarHovered(isHovered);
  };

  // Determina el padding izquierdo para el contenido principal en escritorio
  // Se basa en si el sidebar está permanentemente colapsado Y si no está siendo hovereado (si el hover lo expande)
  const getDesktopLeftPadding = () => {
    if (isDesktopSidebarPermanentlyCollapsed) {
      return isDesktopSidebarHovered ? 'md:pl-64' : 'md:pl-20';
    }
    return 'md:pl-64'; // Si no está permanentemente colapsado, siempre es ancho
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar 
        isDesktopInitiallyCollapsed={isDesktopSidebarPermanentlyCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
        onDesktopHoverChange={handleDesktopSidebarHoverChange} // Pasar el callback
      />

      <div className={clsx(
        "flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out",
        getDesktopLeftPadding() // Aplicar padding dinámico
      )}>
        <Header 
            toggleMobileSidebar={toggleMobileSidebar} 
            isMobileSidebarOpen={isMobileSidebarOpen}
            // Aquí podrías pasar una función para cambiar `isDesktopSidebarPermanentlyCollapsed`
            // si añades un botón en el Header para ello.
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
    </div>
  );
};

export default Layout;
