// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import clsx from 'clsx';

const Layout: React.FC = () => {
  // Estado para el colapso *persistente* del sidebar en escritorio
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

  const handleDesktopSidebarHoverChange = (isHovered: boolean) => {
    setIsDesktopSidebarHovered(isHovered);
  };

  // Determina el padding izquierdo para el contenido principal en escritorio
  const getDesktopLeftPadding = () => {
    // Si está permanentemente colapsado Y NO está hovereado -> padding 0 (sidebar oculto)
    if (isDesktopSidebarPermanentlyCollapsed && !isDesktopSidebarHovered) {
      return 'md:pl-0';
    }
    // En cualquier otro caso donde el sidebar de escritorio sea visible y expandido
    // (permanentemente expandido O colapsado pero con hover)
    return 'md:pl-64';
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar 
        isDesktopInitiallyCollapsed={isDesktopSidebarPermanentlyCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
        onDesktopHoverChange={handleDesktopSidebarHoverChange}
      />

      <div className={clsx(
        "flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out",
        getDesktopLeftPadding() // Aplicar padding dinámico
      )}>
        <Header 
            toggleMobileSidebar={toggleMobileSidebar} 
            isMobileSidebarOpen={isMobileSidebarOpen}
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