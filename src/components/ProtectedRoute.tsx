// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const ProtectedRoute: React.FC = () => {
  const { currentUser, userProfile, loadingAuth, loadingProfile, signOut } = useAppContext();
  const location = useLocation();

  if (loadingAuth || (currentUser && loadingProfile)) {
    // Muestra un loader si se está verificando la autenticación
    // o si hay un usuario de autenticación pero su perfil aún está cargando.
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // No hay usuario de autenticación, redirigir a login
    console.log("ProtectedRoute: No currentUser, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hay un currentUser de autenticación, ahora verifica el perfil y el rol
  if (!userProfile) {
    // Hay usuario de autenticación, pero no se encontró perfil (o aún no cargó completamente y loadingProfile es false).
    // Esto podría ser un estado transitorio o un error si el trigger no funcionó.
    // Por seguridad, si no hay perfil después de la carga, no se permite el acceso.
    console.warn("ProtectedRoute: currentUser exists, but no userProfile found. Signing out and redirecting to login.");
    // Forzar cierre de sesión si el perfil no se encuentra para un usuario autenticado puede ser una medida de seguridad.
    // Sin embargo, asegúrate de que loadingProfile realmente haya terminado.
    // Si signOut se llama aquí, el onAuthStateChange en AppContext se activará.
    // signOut(); // Considera si esto es necesario o si solo redirigir es suficiente.
    // Si solo rediriges, el usuario podría volver a intentarlo.
    // Si llamas a signOut, la sesión se limpia.
    
    // Para evitar bucles si signOut causa un re-render inmediato,
    // es mejor solo redirigir y dejar que la lógica de login maneje la falta de perfil.
    // O, si el perfil es ABSOLUTAMENTE necesario y no se encuentra, el signOut es más seguro.
    // Por ahora, redirigimos. Si el usuario intenta loguearse y el perfil sigue sin existir,
    // la página de Login lo manejará.
    return <Navigate to="/login" state={{ message: "User profile not found. Please contact support or try logging in again." }} replace />;
  }

  if (userProfile.role !== 'doctor') {
    // El usuario tiene un perfil, pero no es un doctor.
    console.warn(`ProtectedRoute: Access denied. User role is '${userProfile.role}', not 'doctor'. Signing out.`);
    // Es importante llamar a signOut aquí para limpiar la sesión de Supabase
    // y el estado local, ya que el usuario está autenticado pero no autorizado para esta app.
    // signOut(); // Esto podría causar un re-render. Es mejor manejarlo de forma que no cree un bucle.
    // Una forma es que signOut no cause una navegación inmediata desde AppContext, sino que solo limpie el estado.
    // La redirección la hace este componente.
    
    // Solución más simple: redirigir y mostrar un mensaje.
    // La próxima vez que el usuario intente acceder, será redirigido de nuevo.
    // Si la sesión de Supabase sigue activa, el login podría ser automático y volver aquí.
    // Por eso, es mejor que la página de Login también haga la verificación de rol.
    
    // Forzar signOut y luego redirigir:
    // Esto es un poco más complejo de manejar sin causar re-renders no deseados.
    // La lógica en Login.tsx que llama a signOut si el rol no es doctor es más directa.
    // Aquí, simplemente redirigimos.
    return <Navigate to="/login" state={{ message: "Access Denied: Doctor role required." }} replace />;
  }

  // Si currentUser existe, userProfile existe, y el rol es 'doctor', permite el acceso.
  return <Outlet />;
};

export default ProtectedRoute;
