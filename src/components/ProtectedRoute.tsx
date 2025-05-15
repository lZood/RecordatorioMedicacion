// src/components/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const ProtectedRoute: React.FC = () => {
  const { currentUser, userProfile, loadingAuth, loadingProfile, signOut } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    if (!loadingAuth && currentUser && !loadingProfile && userProfile && userProfile.role !== 'doctor') {
      const handleSignOutAndRedirect = async () => {
        if (location.state?.message !== "Access Denied: Doctor role required.") {
            toast.error("Access Denied: This portal is for doctors only. Logging out.", { id: "protected-route-role-error" });
        }
        await signOut();
      };
      handleSignOutAndRedirect();
    }
  }, [loadingAuth, currentUser, loadingProfile, userProfile, signOut, location.state, location.pathname]);


  if (loadingAuth || (currentUser && loadingProfile)) {
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
    console.log("ProtectedRoute: No currentUser, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!userProfile) {
    console.warn("ProtectedRoute: currentUser exists, but no userProfile found after loading. Forcing logout and redirecting to login.");
    return <Navigate to="/login" state={{ message: "User profile could not be loaded. Please try logging in again or contact support." }} replace />;
  }

  if (userProfile.role !== 'doctor') {
    console.warn(`ProtectedRoute: Access denied. User role is '${userProfile.role}', not 'doctor'. Redirecting to login.`);
    return <Navigate to="/login" state={{ message: "Access Denied: Doctor role required." }} replace />;
  }

  console.log("ProtectedRoute: Access granted to doctor:", currentUser.id, "Profile:", userProfile);
  return <Outlet />;
};

export default ProtectedRoute;
