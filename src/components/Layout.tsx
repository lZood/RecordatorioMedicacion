// src/components/Layout.tsx
import React, { useState, useEffect } from 'react'; // React ya está importado arriba
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar'; // Sidebar ya está importado arriba
import Header from './Header';
// import clsx from 'clsx'; // clsx ya está importado arriba

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
  const getDesktopMainContentPadding = () => {
    // Si el sidebar está configurado para estar "permanentemente colapsado" (modo icono-por-defecto)
    if (isDesktopSidebarPermanentlyCollapsed) {
      // Si está hovereado, se expande a w-64, así que el padding del contenido es pl-64.
      // De lo contrario (no hovereado), está en w-20 (solo iconos), así que el padding es pl-20.
      return isDesktopSidebarHovered ? 'md:pl-64' : 'md:pl-20';
    }
    // Si no está "permanentemente colapsado" (es decir, está fijado abierto a ancho completo)
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
        // Para móvil, el padding es siempre 0 ya que el sidebar se superpone o está fuera de pantalla
        'pl-0', 
        // Para escritorio, aplicar padding dinámico
        getDesktopMainContentPadding()
      )}>
        <Header 
            toggleMobileSidebar={toggleMobileSidebar} 
            isMobileSidebarOpen={isMobileSidebarOpen}
            // Aquí podrías pasar una función para cambiar `isDesktopSidebarPermanentlyCollapsed`
            // si añades un botón en el Header para ello. Ejemplo:
            // toggleDesktopPin={() => setIsDesktopSidebarPermanentlyCollapsed(prev => !prev)}
            // isDesktopPinned={!isDesktopSidebarPermanentlyCollapsed}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay para cerrar el sidebar en móvil */}
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
