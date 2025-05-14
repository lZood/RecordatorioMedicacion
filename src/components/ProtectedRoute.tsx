// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const ProtectedRoute: React.FC = () => {
  const { currentUser, loadingAuth } = useAppContext();

  if (loadingAuth) {
    // Mientras se verifica la sesión, muestra un loader
    return <div className="flex justify-center items-center h-screen">Loading session...</div>;
  }

  if (!currentUser) {
    // Si la carga de autenticación terminó Y no hay currentUser, redirige a /login
    return <Navigate to="/login" replace />;
  }

  // Si la carga de autenticación terminó Y hay currentUser, muestra el contenido protegido
  return <Outlet />;
};

export default ProtectedRoute;