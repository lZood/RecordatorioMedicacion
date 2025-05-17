// src/pages/Dashboard.tsx
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Calendar, Clock, Users, Pill, Activity, ArrowRight, BellRing, CheckCircle2, AlertTriangle } from 'lucide-react'; // Añadido BellRing, CheckCircle2, AlertTriangle
import { Link } from 'react-router-dom';
import { Notification } from '../types'; // Importar el tipo Notification

const Dashboard: React.FC = () => {
  const { 
    patients, 
    medications, 
    appointments, 
    vitalSigns,
    notifications, // Obtener notificaciones del contexto
    loadingNotifications, // Estado de carga para notificaciones
    updateNotificationStatus // Para marcar como leída
  } = useAppContext();
  
  const upcomingAppointments = appointments
    .filter(appointment => appointment.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  const today = new Date();
  const expiringMedications = medications.filter(medication => {
    const expDate = new Date(medication.expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  });

  // Filtrar y ordenar notificaciones para el dashboard (ej. las 5 más recientes pendientes o enviadas)
  const recentNotificationsForDashboard = notifications
    .filter(n => n.status === 'pending' || n.status === 'sent')
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    // Aquí podrías llamar a una función del contexto para actualizar el estado de la notificación
    // Por ejemplo: await updateNotificationStatus(notificationId, 'read');
    await updateNotificationStatus(notificationId, 'read');
    // El estado global de notificaciones se actualizará y la UI debería reflejar el cambio.
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pacientes" 
          value={patients.length} 
          icon={<Users className="text-indigo-600" />} 
          linkTo="/patients"
        />
        <StatCard 
          title="Medicamentos" 
          value={medications.length} 
          icon={<Pill className="text-teal-600" />} 
          linkTo="/medications"
        />
        <StatCard 
          title="Citas" 
          value={appointments.length} 
          icon={<Calendar className="text-blue-600" />} 
          linkTo="/appointments"
        />
        <StatCard 
          title="Signos Vitales" 
          value={vitalSigns.length} 
          icon={<Activity className="text-rose-600" />} 
          linkTo="/vitals"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Próximas Citas</h2>
            <Link to="/appointments" className="text-indigo-600 text-sm flex items-center hover:text-indigo-800">
              Ver Todas <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <div key={appointment.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="p-2 bg-indigo-100 rounded-full mr-4">
                    <Calendar size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{appointment.specialty} Appointment</p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar size={14} className="mr-1" />
                      <span className="mr-3">{new Date(appointment.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {month: 'short', day: 'numeric'})}</span>
                      <Clock size={14} className="mr-1" />
                      <span>{new Date(`1970-01-01T${appointment.time}`).toLocaleTimeString(navigator.language || 'es-ES', {hour: '2-digit', minute: '2-digit', hour12: true})}</span>
                    </div>
                  </div>
                  <Link to={`/appointments/${appointment.id}`} className="text-sm text-indigo-600 px-3 py-1 border border-indigo-200 rounded-full hover:bg-indigo-50">
                    Detalles
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 py-4 text-center">No hay próximas citas programadas.</p>
          )}
        </div>
        
        {/* Alerts & Recent Notifications Section */}
        <div className="space-y-6">
            {/* Alerts Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertas Importantes</h2>
              <div className="space-y-4">
                <div className={`p-4 rounded ${expiringMedications.length > 0 ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-green-50 border-l-4 border-green-400'}`}>
                  <div className="flex items-start">
                    {expiringMedications.length > 0 ? <AlertTriangle className="text-yellow-600 mr-3 mt-0.5" size={20} /> : <CheckCircle2 className="text-green-600 mr-3 mt-0.5" size={20} />}
                    <div>
                      <p className={`font-medium ${expiringMedications.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>Medicamentos por Vencer</p>
                      <p className={`text-sm ${expiringMedications.length > 0 ? 'text-yellow-600' : 'text-green-600'} mt-1`}>
                        {expiringMedications.length > 0 ? `${expiringMedications.length} medicamentos vencerán en los próximos 30 días.` : "No hay medicamentos por vencer pronto."}
                      </p>
                      {expiringMedications.length > 0 && (
                        <Link to="/medications" className="text-xs text-yellow-800 font-medium mt-2 inline-block hover:underline">
                          Revisar Medicamentos
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                {/* Puedes añadir más alertas aquí */}
              </div>
            </div>

            {/* Recent Notifications Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Notificaciones Recientes</h2>
                {/* <Link to="/notifications" className="text-indigo-600 text-sm flex items-center hover:text-indigo-800">
                  Ver Todas <ArrowRight size={16} className="ml-1" />
                </Link> */}
                 <button 
                  onClick={() => toast.info("Página de todas las notificaciones aún no implementada.")} 
                  className="text-indigo-600 text-sm flex items-center hover:text-indigo-800"
                >
                  Ver Todas <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
              {loadingNotifications ? (
                <p className="text-gray-500 py-4 text-center">Cargando notificaciones...</p>
              ) : recentNotificationsForDashboard.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {recentNotificationsForDashboard.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${notification.status === 'pending' || notification.status === 'sent' ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'}`}
                      onClick={() => handleMarkNotificationAsRead(notification.id)}
                      title="Marcar como leída"
                    >
                      <div className="flex items-start">
                        <BellRing size={18} className={`mr-3 mt-0.5 flex-shrink-0 ${notification.status === 'pending' || notification.status === 'sent' ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${notification.status === 'pending' || notification.status === 'sent' ? 'text-indigo-700' : 'text-gray-500'}`}>
                            {notification.type === 'appointment_reminder' ? 'Recordatorio de Cita' : 'Notificación General'}
                          </p>
                          <p className="text-sm text-gray-700 leading-snug">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt!).toLocaleString(navigator.language || 'es-ES', { dateStyle: 'short', timeStyle: 'short'})}
                            {notification.status !== 'read' && <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">Nueva</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 py-4 text-center">No hay notificaciones recientes.</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  linkTo: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, linkTo }) => (
  <Link to={linkTo} className="bg-white rounded-lg shadow p-6 transition-transform duration-300 hover:transform hover:-translate-y-1 block">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className="bg-gray-50 p-3 rounded-full">
        {icon}
      </div>
    </div>
  </Link>
);

export default Dashboard;
