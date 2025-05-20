import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu, X as CloseIcon } from 'lucide-react'; // Importar Menu y X

const Layout: React.FC = () => {
  // Estado para el sidebar de escritorio: colapsado por defecto
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);
  
  // Estado para el sidebar móvil: cerrado por defecto
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Cerrar el sidebar móvil cuando cambia la ruta
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 relative">
      {/* Sidebar */}
      <Sidebar 
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* Contenedor Principal del Contenido */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out ${!isDesktopCollapsed ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header con botón de menú para móviles */}
        <Header toggleMobileSidebar={toggleMobileSidebar} isMobileSidebarOpen={isMobileSidebarOpen}/>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay para cerrar el sidebar móvil al hacer clic fuera (opcional pero recomendado) */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
    </div>
  );
};

export default Layout;