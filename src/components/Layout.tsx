// src/components/Layout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* El Sidebar ahora maneja su propia visibilidad en desktop y móvil.
        Le pasamos el estado y el toggle para el comportamiento móvil.
      */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />
      
      {/* Contenedor principal que se ajusta si el sidebar de desktop está fijado.
        En móvil, el sidebar es un overlay, por lo que el contenido principal no necesita cambiar de margen.
      */}
      <div 
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out md:ml-20"
        // Si quieres que el contenido se empuje cuando el sidebar está fijado en desktop, 
        // necesitarías una clase condicional aquí basada en el estado `isPinnedOpen` del sidebar,
        // lo cual requeriría elevar ese estado aquí o usar Context.
        // Por ahora, el sidebar de desktop (hover o pinned) será un overlay sobre el margen ml-20.
        // O, si el sidebar fijado no es overlay, este margen debería ser `md:ml-64` cuando esté fijado.
        // Para el efecto de "expand on hover" sobre el contenido, el sidebar debe tener un z-index mayor
        // y este div un padding-left que coincida con el sidebar colapsado.
      >
        <Header toggleMobileMenu={toggleMobileMenu} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
