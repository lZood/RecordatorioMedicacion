// src/components/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const ProtectedRoute: React.FC = () => {
  const { currentUser, userProfile, loadingAuth, loadingProfile, signOut } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    // Si la autenticación y la carga del perfil han terminado,
    // y hay un usuario autenticado con un perfil, pero el rol NO es 'doctor',
    // entonces cierra la sesión.
    if (!loadingAuth && currentUser && !loadingProfile && userProfile && userProfile.role !== 'doctor') {
      const handleSignOutAndRedirect = async () => {
        // Evitar toasts duplicados si ya se mostró uno en Login
        if (location.state?.message !== "Access Denied: Doctor role required.") {
            toast.error("Access Denied: This portal is for doctors only. Logging out.", { id: "protected-route-role-error" });
        }
        await signOut(); // Llama a la función signOut del contexto
        // La navegación a /login ocurrirá por el cambio de currentUser a null en AppContext
      };
      handleSignOutAndRedirect();
    }
  }, [loadingAuth, currentUser, loadingProfile, userProfile, signOut, location.state, location.pathname]); // Añadido location.pathname para re-evaluar si la ruta cambia


  if (loadingAuth || (currentUser && loadingProfile)) {
    // Muestra un loader si:
    // 1. Se está verificando la autenticación inicial (loadingAuth).
    // 2. Hay un usuario de autenticación (currentUser) Y su perfil aún está cargando (loadingProfile).
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-md font-medium text-gray-600">Loading session & profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // No hay usuario de autenticación, redirigir a login
    console.log("ProtectedRoute: No currentUser, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hay currentUser de autenticación. Ahora verifica el perfil y el rol.
  // Esta verificación se hace después de que loadingProfile es false.
  if (!userProfile) {
    // Esto podría ocurrir si el trigger no funcionó o hubo un error cargando el perfil.
    console.warn("ProtectedRoute: currentUser exists, but no userProfile found after loading. Forcing logout and redirecting to login.");
    // El useEffect anterior debería haber manejado el signOut si el rol no es correcto.
    // Si llegamos aquí y no hay perfil, es un estado problemático.
    // Para evitar bucles, podrías mostrar un mensaje de error o redirigir.
    // Si signOut se llama aquí directamente, puede causar un bucle si no se maneja con cuidado.
    // Una mejor aproximación es que la página de Login también verifique esto.
    // Por ahora, una redirección con mensaje es más segura.
    return <Navigate to="/login" state={{ message: "User profile could not be loaded. Please try logging in again or contact support if the issue persists." }} replace />;
  }

  if (userProfile.role !== 'doctor') {
    // El usuario tiene un perfil, pero no es un doctor.
    // El useEffect de arriba ya debería haber iniciado el signOut y mostrado un toast.
    // Esta redirección es un fallback para asegurar que el usuario no acceda.
    console.warn(`ProtectedRoute: Access denied. User role is '${userProfile.role}', not 'doctor'. Redirecting to login.`);
    return <Navigate to="/login" state={{ message: "Access Denied: Doctor role required." }} replace />;
  }

  // Si currentUser existe, userProfile existe, y el rol es 'doctor', permite el acceso.
  console.log("ProtectedRoute: Access granted to doctor:", currentUser.id, "Profile:", userProfile);
  return <Outlet />;
};

export default ProtectedRoute;
