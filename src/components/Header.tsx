// src/components/Header.tsx
import React from 'react';
import { Bell, Search, User as UserIcon } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Header: React.FC = () => {
  const { currentUser, userProfile, loadingProfile, loadingAuth } = useAppContext();

  const isLoadingInfo = loadingAuth || (currentUser && loadingProfile);

  const displayName = userProfile?.name || currentUser?.user_metadata?.name || "Doctor";
  const displaySpecialtyOrRole = userProfile?.specialty || (userProfile?.role ? `Role: ${userProfile.role}` : "Specialist");
  
  const userInitials = displayName?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || <UserIcon size={16} />;

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex items-center justify-between">
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>
      
      <div className="flex items-center space-x-3 md:space-x-4">
        <button className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center border-2 border-white">
            3 
          </span>
        </button>
        
        {currentUser ? (
          <div className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {isLoadingInfo && !userProfile ? 'L' : userInitials}
            </div>
            {!isLoadingInfo && userProfile && (
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]" title={displaySpecialtyOrRole}>
                  {displaySpecialtyOrRole}
                </p>
              </div>
            )}
            {isLoadingInfo && !userProfile && ( // Muestra placeholder si el perfil está cargando y aún no está disponible
                 <div className="hidden md:block">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
            )}
             {!isLoadingInfo && !userProfile && currentUser && ( // Si hay auth user pero no perfil (error o no es doctor)
                 <div className="hidden md:block">
                    <p className="text-sm font-semibold text-gray-800" title={currentUser.email || 'User'}>
                        {currentUser.email ? currentUser.email.split('@')[0] : 'User'}
                    </p>
                    <p className="text-xs text-red-500">Profile unavailable</p>
                </div>
            )}
          </div>
        ) : (
          <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center">
            <UserIcon size={18} className="text-gray-600"/>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
