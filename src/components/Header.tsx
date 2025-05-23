// src/components/Header.tsx
import React, { useState } from 'react';
import { Bell, Search, User as UserIcon, Menu, X as CloseIcon } from 'lucide-react'; // Añadir Menu y X
import { useAppContext } from '../contexts/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface HeaderProps {
  toggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileSidebar, isMobileSidebarOpen }) => {
  const { currentUser, userProfile, loadingProfile, loadingAuth, notifications, updateNotificationStatus } = useAppContext();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const navigate = useNavigate();

  const isLoadingInfo = loadingAuth || (currentUser && loadingProfile);
  const displayName = userProfile?.name || currentUser?.user_metadata?.name || "Doctor";
  const displaySpecialtyOrRole = userProfile?.specialty || (userProfile?.role ? `Rol: ${userProfile.role}` : "Especialista");
  
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
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Botón de Menú para Móviles y Búsqueda */}
      <div className="flex items-center gap-3">
        {/* Botón de Hamburguesa (solo visible en móviles) */}
        <button 
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
          aria-label="Abrir menú"
        >
          {isMobileSidebarOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
        </button>
        
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
      
      {/* Iconos de Usuario y Notificaciones */}
      <div className="flex items-center space-x-3 md:space-x-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center border-2 border-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div 
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-xl z-50 border border-slate-200" // Elevado z-index
              onMouseLeave={() => setShowNotificationsDropdown(false)}
            >
              <div className="p-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Notificaciones Recientes</h3>
              </div>
              {recentNotifications.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto">
                  {recentNotifications.map(notification => (
                    <li key={notification.id} className="border-b border-slate-100 last:border-b-0">
                      <div className={`p-3 hover:bg-slate-50 cursor-pointer ${notification.status === 'pending' || notification.status === 'sent' ? 'bg-indigo-50' : ''}`}
                               onClick={() => {
                                 handleMarkAsRead(notification.id);
                                 // if (notification.type === 'appointment_reminder' && notification.appointmentId) {
                                 //   navigate(`/appointments/${notification.appointmentId}`);
                                 //   setShowNotificationsDropdown(false);
                                 // }
                               }}
                      >
                        <p className="text-xs text-slate-500 mb-0.5">
                          {notification.type === 'appointment_reminder' ? 'Recordatorio de Cita' : 'Notificación'}
                            - <span className="capitalize">{notification.status}</span>
                        </p>
                        <p className="text-sm text-slate-800 leading-tight">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(notification.createdAt!).toLocaleString(navigator.language || 'es-ES', { dateStyle: 'short', timeStyle: 'short'})}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-slate-500 text-center">No tiene notificaciones nuevas.</p>
              )}
              <div className="p-2 border-t border-slate-200 text-center">
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
        
        {/* Perfil del Usuario */}
        {currentUser ? (
          <div className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {isLoadingInfo && !userProfile ? 'L' : userInitials}
            </div>
            {(!isLoadingInfo && userProfile) && ( // Siempre mostrar si no está cargando y hay perfil
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[150px]" title={displaySpecialtyOrRole}>
                  {displaySpecialtyOrRole}
                </p>
              </div>
            )}
            {isLoadingInfo && !userProfile && ( 
                   <div className="hidden md:block">
                      <div className="h-4 bg-slate-200 rounded w-24 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-slate-200 rounded w-16 animate-pulse"></div>
                  </div>
            )}
              {(!isLoadingInfo && !userProfile && currentUser) && ( // Caso: logueado pero sin perfil cargado
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold text-slate-800" title={currentUser.email || 'User'}>
                        {currentUser.email ? currentUser.email.split('@')[0] : 'Usuario'}
                    </p>
                    <p className="text-xs text-red-500">Perfil no disponible</p>
                  </div>
            )}
          </div>
        ) : ( // Caso: No logueado
          <div className="w-9 h-9 bg-slate-300 rounded-full flex items-center justify-center">
            <UserIcon size={18} className="text-slate-600"/>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
