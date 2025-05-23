// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
// No es necesario importar Menu y X aquí, ya que se usan en Header y Sidebar

const Layout: React.FC = () => {
  // Estado para el sidebar de escritorio: si está fijado (expandido permanentemente)
  const [isPinned, setIsPinned] = useState(false);
  // Estado para el sidebar de escritorio: si el mouse está sobre él (solo si no está fijado)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Estado para el sidebar móvil: cerrado por defecto
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Cerrar el sidebar móvil cuando cambia la ruta
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  // Función para alternar el estado del sidebar móvil
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Función para manejar el cambio de estado de hover del sidebar de escritorio
  const handleDesktopHoverChange = (isHovered: boolean) => {
    setIsSidebarHovered(isHovered);
  };

  // Determina el ancho efectivo del sidebar para ajustar el margen del contenido principal
  // Si está fijado O si no está fijado pero se está haciendo hover, el ancho es 64 (expandido).
  // De lo contrario, el ancho es 20 (colapsado).
  const sidebarEffectiveWidthClass = isPinned || isSidebarHovered ? 'md:ml-64' : 'md:ml-20';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
        isPinned={isPinned}
        setIsPinned={setIsPinned}
        onDesktopHoverChange={handleDesktopHoverChange} // Pasa el callback para el hover
      />

      {/* Contenedor Principal del Contenido */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out ${sidebarEffectiveWidthClass}`}>
        {/* Header con botón de menú para móviles */}
        <Header toggleMobileSidebar={toggleMobileSidebar} isMobileSidebarOpen={isMobileSidebarOpen}/>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay para cerrar el sidebar móvil al hacer clic fuera (opcional pero recomendado) */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
    </div>
  );
};

export default Layout;
