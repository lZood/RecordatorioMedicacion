// src/pages/NotificationsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Notification, Patient } from '../types';
import { BellRing, Check, XCircle, Filter, AlertCircle, CalendarDays, User } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loadingNotifications,
    updateNotificationStatus,
    patients, // Necesitaremos los pacientes para mostrar sus nombres
    userProfile
  } = useAppContext();

  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'pending', 'sent', 'read', 'archived'
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'appointment_reminder', etc.
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Mapear patientId a nombre de paciente para fácil acceso
  const patientNameMap = useMemo(() => {
    return patients.reduce((acc, patient) => {
      acc[patient.id] = patient.name;
      return acc;
    }, {} as Record<string, string>);
  }, [patients]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .map(n => ({
        ...n,
        patientName: patientNameMap[n.patientId] || 'Desconocido',
      }))
      .filter(notification => {
        const matchesStatus = filterStatus === 'all' || notification.status === filterStatus;
        const matchesType = filterType === 'all' || notification.type === filterType;
        const matchesSearch = searchTerm === '' ||
          notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notification.patientName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesType && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }, [notifications, filterStatus, filterType, searchTerm, patientNameMap]);

  const handleUpdateStatus = async (notificationId: string, newStatus: Notification['status']) => {
    if (userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden actualizar notificaciones.");
      return;
    }
    try {
      await updateNotificationStatus(notificationId, newStatus);
      // El toast de éxito ya se maneja en AppContext
    } catch (error) {
      console.error("Error updating notification status from page:", error);
      // El toast de error ya se maneja en AppContext
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'read': return 'bg-green-100 text-green-800 border-green-300';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const notificationTypes = useMemo(() => {
    return Array.from(new Set(notifications.map(n => n.type)));
  }, [notifications]);


  if (userProfile && userProfile.role !== 'doctor') {
    return <div className="p-6 text-center"><h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1><p className="text-gray-700">Esta sección es solo para doctores autorizados.</p></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Historial de Notificaciones</h1>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Estado</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending">Pendiente</option>
              <option value="sent">Enviada</option>
              <option value="read">Leída</option>
              <option value="archived">Archivada</option>
            </select>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Tipo</label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
            >
              <option value="all">Todos los Tipos</option>
              {notificationTypes.map(type => (
                <option key={type} value={type} className="capitalize">
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              id="search-term"
              placeholder="Mensaje o paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loadingNotifications ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin mx-auto mb-2"></div>
          Cargando notificaciones...
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="bg-white shadow overflow-hidden rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredNotifications.map(notification => (
              <li key={notification.id} className={`p-4 hover:bg-gray-50 ${getStatusColor(notification.status)} border-l-4`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-0.5">
                    {notification.type === 'appointment_reminder' ? <CalendarDays className="h-5 w-5 text-blue-500" /> : 
                     notification.type === 'medication_reminder' ? <BellRing className="h-5 w-5 text-green-500" /> :
                     <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} para {notification.patientName}
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(notification.createdAt!).toLocaleString(navigator.language || 'es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                    <div className="mt-2 flex items-center space-x-3">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(notification.status).split(' ')[0]} ${getStatusColor(notification.status).split(' ')[1]}`}>
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </span>
                      {notification.status !== 'read' && (
                        <button
                          onClick={() => handleUpdateStatus(notification.id, 'read')}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Marcar como leída
                        </button>
                      )}
                      {notification.status !== 'archived' && (
                         <button
                          onClick={() => handleUpdateStatus(notification.id, 'archived')}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Archivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-10">
          <BellRing size={48} className="mx-auto text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notificaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? "No se encontraron notificaciones con los filtros actuales."
              : "Aún no se han generado notificaciones."}
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
