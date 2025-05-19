// src/components/Header.tsx
import React, { useState } from 'react';
import { Bell, Search, User as UserIcon, Menu } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { Link } from 'react-router-dom'; // <--- ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ EXACTAMENTE ASÍ

interface HeaderProps {
  toggleMobileMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileMenu }) => {
  const { currentUser, userProfile, loadingProfile, loadingAuth, notifications, updateNotificationStatus } = useAppContext();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const isLoadingInfo = loadingAuth || (currentUser && loadingProfile);

  const displayName = userProfile?.name || currentUser?.user_metadata?.name || "Doctor";
  const displaySpecialtyOrRole = userProfile?.specialty || (userProfile?.role ? `${userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}` : "Especialista");
  
  const userInitials = displayName?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || <UserIcon size={16} />;

  const unreadNotificationsCount = notifications.filter(n => n.status === 'pending' || n.status === 'sent').length;
  const recentNotifications = notifications
    .filter(n => n.status === 'pending' || n.status === 'sent')
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  const handleMarkAsRead = async (notificationId: string) => {
    if (userProfile?.role === 'doctor') {
      await updateNotificationStatus(notificationId, 'read');
      // Considerar cerrar el dropdown si se marca como leída
      // setShowNotificationsDropdown(false); 
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Botón de Menú Móvil y Búsqueda */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
      
      {/* Acciones del Usuario y Notificaciones */}
      <div className="flex items-center space-x-3 md:space-x-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center border-2 border-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div 
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-xl z-20 border border-gray-200"
            >
              <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Notificaciones</h3>
                 <button onClick={() => setShowNotificationsDropdown(false)} className="text-xs text-indigo-600 hover:underline">Cerrar</button>
              </div>
              {recentNotifications.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto">
                  {recentNotifications.map(notification => (
                    <li key={notification.id} className="border-b border-gray-100 last:border-b-0">
                      <div className={`p-3 hover:bg-gray-50 cursor-pointer ${notification.status === 'pending' || notification.status === 'sent' ? 'bg-indigo-50' : ''}`}
                           onClick={() => {
                             handleMarkAsRead(notification.id);
                           }}
                      >
                        <p className="text-xs text-gray-500 mb-0.5">
                          {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                           - <span className="capitalize">{notification.status}</span>
                        </p>
                        <p className="text-sm text-gray-800 leading-tight">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt!).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short'})}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-gray-500 text-center">No tiene notificaciones nuevas.</p>
              )}
              <div className="p-2 border-t border-gray-200 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotificationsDropdown(false)} 
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            </div>
          )}
        </div>
        
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
