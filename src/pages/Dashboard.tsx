// src/pages/Dashboard.tsx
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
  CalendarDays, // Cambiado de Calendar para citas
  Clock, 
  Users, 
  Pill, 
  Activity, // Para Signos Vitales
  ArrowRight, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle,
  PlusCircle, // Para acciones rápidas
  BarChart3, // Para estadísticas si se añaden gráficos
  FileText // Para reportes
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, differenceInDays, addDays, isWithinInterval, startOfDay } from 'date-fns'; // Para manejo de fechas
import { es } from 'date-fns/locale'; // Para formato de fecha en español

// Componente StatCard rediseñado
interface StatCardProps {
  title: string;
  value: string | number; // Puede ser string si formateas el número
  icon: React.ReactNode;
  linkTo: string;
  bgColorClass: string; // e.g., 'from-blue-500 to-blue-400'
  textColorClass: string; // e.g., 'text-blue-50'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, linkTo, bgColorClass, textColorClass }) => (
  <Link 
    to={linkTo} 
    className={`block p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br ${bgColorClass} ${textColorClass}`}
  >
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      <div className="p-3 bg-white/20 rounded-lg">
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
      </div>
    </div>
    <div className="mt-4 text-xs opacity-70 flex items-center">
      Ver más <ArrowRight size={14} className="ml-1" />
    </div>
  </Link>
);

// Componente para Acciones Rápidas
interface QuickActionProps {
  title: string;
  icon: React.ReactNode;
  linkTo: string;
  colorClasses: string; // e.g., "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon, linkTo, colorClasses }) => (
    <Link
        to={linkTo}
        className={`flex flex-col items-center justify-center p-4 rounded-lg shadow hover:shadow-md transition-all duration-200 aspect-square ${colorClasses}`}
    >
        {React.cloneElement(icon as React.ReactElement, { size: 32, className: "mb-2" })}
        <span className="text-sm font-medium text-center">{title}</span>
    </Link>
);


const Dashboard: React.FC = () => {
  const { 
    patients, 
    medications, 
    appointments, 
    vitalSigns,
    notifications,
    loadingAppointments,
    loadingMedications,
    loadingNotifications,
    userProfile, // Para personalizar el saludo
  } = useAppContext();
  
  const today = startOfDay(new Date()); // Fecha de hoy al inicio del día para comparaciones

  const upcomingAppointments = appointments
    .filter(appointment => {
      try {
        const appointmentDate = startOfDay(parseISO(appointment.date)); // Parsea la fecha y la lleva al inicio del día
        return appointment.status === 'scheduled' && appointmentDate >= today;
      } catch (e) {
        console.warn("Fecha de cita inválida:", appointment.date, e);
        return false;
      }
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || a.time.localeCompare(b.time))
    .slice(0, 5); // Mostrar las próximas 5 citas
  
  const expiringMedications = medications.filter(medication => {
    try {
      const expDate = parseISO(medication.expirationDate);
      const daysUntilExpiration = differenceInDays(expDate, today);
      return daysUntilExpiration >= 0 && daysUntilExpiration <= 30; // Vence en los próximos 30 días (o hoy)
    } catch (e) {
      console.warn("Fecha de expiración inválida:", medication.expirationDate, e);
      return false;
    }
  });

  const recentNotificationsForDashboard = notifications
    .filter(n => n.status === 'pending' || n.status === 'sent')
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 3); // Mostrar las 3 notificaciones más recientes
    
  const greeting = userProfile?.name ? `¡Hola de nuevo, Dr(a). ${userProfile.name.split(' ')[0]}!` : "Dashboard";

  return (
    <div className="space-y-8 p-1"> {/* Menos padding general si los componentes internos lo manejan */}
      <h1 className="text-3xl font-bold text-gray-800">{greeting}</h1>
      <p className="text-gray-500">Aquí tienes un resumen de la actividad reciente y alertas importantes.</p>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pacientes Activos" 
          value={patients.length} 
          icon={<Users />} 
          linkTo="/patients"
          bgColorClass="from-blue-500 to-blue-400"
          textColorClass="text-white"
        />
        <StatCard 
          title="Medicamentos en Stock" 
          value={medications.length} 
          icon={<Pill />} 
          linkTo="/medications"
          bgColorClass="from-green-500 to-green-400"
          textColorClass="text-white"
        />
        <StatCard 
          title="Citas Programadas" 
          // Contar solo las citas futuras o activas
          value={appointments.filter(a => a.status === 'scheduled' && parseISO(a.date) >= today).length} 
          icon={<CalendarDays />} 
          linkTo="/appointments"
          bgColorClass="from-purple-500 to-purple-400"
          textColorClass="text-white"
        />
        <StatCard 
          title="Registros Vitales" 
          value={vitalSigns.length} 
          icon={<Activity />} 
          linkTo="/vitals"
          bgColorClass="from-red-500 to-red-400"
          textColorClass="text-white"
        />
      </div>

      {/* Acciones Rápidas */}
       <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <QuickAction 
                    title="Nuevo Paciente" 
                    icon={<Users />} 
                    linkTo="/patients" // Podrías pasar un estado para abrir el modal directamente
                    colorClasses="bg-blue-50 text-blue-700 hover:bg-blue-100"
                />
                <QuickAction 
                    title="Agendar Cita" 
                    icon={<CalendarDays />} 
                    linkTo="/appointments" // Podrías pasar un estado para abrir el modal
                    colorClasses="bg-purple-50 text-purple-700 hover:bg-purple-100"
                />
                <QuickAction 
                    title="Añadir Medicamento" 
                    icon={<Pill />} 
                    linkTo="/medications" // Podrías pasar un estado para abrir el modal
                    colorClasses="bg-green-50 text-green-700 hover:bg-green-100"
                />
                <QuickAction 
                    title="Ver Reportes" 
                    icon={<FileText />} 
                    linkTo="/reports"
                    colorClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
                />
            </div>
        </div>
      
      {/* Main Content Grid: Citas y Alertas/Notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Próximas Citas</h2>
            <Link to="/appointments" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
              Ver Todas <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          {loadingAppointments ? (
            <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div><p className="mt-2 text-sm text-gray-500">Cargando citas...</p></div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => {
                const patientName = patients.find(p => p.id === appointment.patientId)?.name || 'Paciente Desconocido';
                const appointmentDate = parseISO(appointment.date);
                const daysRemaining = differenceInDays(appointmentDate, today);
                let dateDisplay;
                if (daysRemaining === 0) dateDisplay = "Hoy";
                else if (daysRemaining === 1) dateDisplay = "Mañana";
                else dateDisplay = `en ${daysRemaining} días`;

                return (
                  <Link to={`/appointments/${appointment.id}`} key={appointment.id} className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200 hover:border-indigo-300 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-indigo-700 truncate">{appointment.specialty} con {patientName}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                            <CalendarDays size={14} className="mr-1.5 flex-shrink-0" />
                            <span>{format(appointmentDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                            <span className="mx-1.5">·</span>
                            <Clock size={14} className="mr-1.5 flex-shrink-0" />
                            <span>{new Date(`1970-01-01T${appointment.time}`).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit', hour12: true})}</span>
                            </div>
                        </div>
                        <div className="ml-4 text-right flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                daysRemaining <= 1 ? 'bg-red-100 text-red-700' : 
                                daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                            }`}>
                                {dateDisplay}
                            </span>
                        </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 py-8 text-center text-sm">No hay próximas citas programadas.</p>
          )}
        </div>
        
        {/* Alerts & Recent Notifications Section */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Alertas Importantes</h2>
              {loadingMedications ? (
                <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto"></div></div>
              ) : expiringMedications.length > 0 ? (
                <div className="space-y-3">
                  {expiringMedications.slice(0,2).map(med => ( // Mostrar solo 2 por brevedad
                    <Link to={`/medications/${med.id}`} key={med.id} className="block p-3 rounded-lg bg-yellow-50 border border-yellow-300 hover:bg-yellow-100">
                      <div className="flex items-start">
                        <AlertTriangle className="text-yellow-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-sm font-medium text-yellow-700">{med.name} por vencer</p>
                          <p className="text-xs text-yellow-600">
                            Vence el: {format(parseISO(med.expirationDate), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {expiringMedications.length > 2 && (
                     <Link to="/medications" className="text-xs text-yellow-700 font-medium mt-2 inline-block hover:underline">
                        Ver todos ({expiringMedications.length})
                     </Link>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-green-50 border border-green-300">
                    <div className="flex items-start">
                        <CheckCircle2 className="text-green-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                        <p className="font-medium text-sm text-green-700">Todo en Orden</p>
                        <p className="text-xs text-green-600 mt-1">No hay medicamentos por vencer pronto.</p>
                        </div>
                    </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Notificaciones</h2>
                <Link to="/notifications" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Ver Todas
                </Link>
              </div>
              {loadingNotifications ? (
                 <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div></div>
              ) : recentNotificationsForDashboard.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Scroll para muchas notificaciones */}
                  {recentNotificationsForDashboard.map(notification => (
                    <div 
                      key={notification.id} 
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start">
                        <BellRing size={18} className="mr-3 mt-0.5 flex-shrink-0 text-indigo-500" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-indigo-600">
                            {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-sm text-gray-700 leading-snug mt-0.5 line-clamp-2" title={notification.message}>{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt!).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short'})}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">No hay notificaciones recientes.</p>
              )}
            </div>
        </div>
      </div>

      {/* Aquí podrías añadir una sección para gráficos si lo deseas */}
      {/* <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Estadísticas Visuales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            Contenido del Gráfico 1 (Ej: Distribución de pacientes por alguna condición)
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            Contenido del Gráfico 2 (Ej: Citas por mes)
          </div>
        </div>
      </div> 
      */}

    </div>
  );
};

export default Dashboard;
