// src/components/AppointmentCard.tsx
import React from 'react';
import { Appointment } from '../types'; // O tu tipo AppointmentWithDetails
import { Calendar, Clock, User as UserIcon, Tag, Edit3, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

// Asume que Appointment puede tener patient y doctor anidados si el servicio los trae
interface AppointmentCardProps {
  appointment: any; // Usa 'any' temporalmente o un tipo AppointmentWithDetails
  onEdit: (appointment: any) => void; // Función para abrir el modal de edición en la página de lista
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onEdit }) => {
  // Acceder a patient.name y doctor.name si están disponibles
  const patientName = appointment.patient?.name || appointment.patientId || 'Unknown Patient';
  const doctorName = appointment.doctor?.name || appointment.doctorId || 'Unknown Doctor';

  let statusColor = 'bg-blue-100 text-blue-800';
  if (appointment.status === 'completed') {
    statusColor = 'bg-green-100 text-green-800';
  } else if (appointment.status === 'cancelled') {
    statusColor = 'bg-red-100 text-red-800';
  }

  // Formatear hora para visualización
  let displayTime = 'N/A';
    if (appointment.time) {
        const [hours, minutes] = appointment.time.split(':');
        if (hours && minutes) {
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
            displayTime = timeDate.toLocaleTimeString(navigator.language || 'es-ES', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }
    }
  
  // Formatear fecha para visualización
  let displayDate = 'N/A';
  if (appointment.date) {
    const dateObj = new Date(appointment.date + 'T00:00:00'); // Asegurar que se interprete como fecha local
    if (!isNaN(dateObj.getTime())) {
      displayDate = dateObj.toLocaleDateString(navigator.language || 'es-ES', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
  }


  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-indigo-700 leading-tight">
            {appointment.specialty}
          </h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusColor}`}>
            {appointment.status}
          </span>
        </div>
        <p className="text-sm text-gray-500">With: {patientName}</p>
      </div>

      <div className="p-5 space-y-3 flex-grow">
        <div className="flex items-center text-sm text-gray-600">
          <UserIcon size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span>Dr. {doctorName}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span>{displayTime}</span>
        </div>
        {appointment.diagnosis && (
          <div className="flex items-start text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
            <Tag size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="italic">Diagnosis: {appointment.diagnosis}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-5 py-3 flex justify-between items-center border-t">
        <Link
          to={`/appointments/${appointment.id}`}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <Eye size={16} className="mr-1" /> View Details
        </Link>
        {appointment.status === 'scheduled' && ( // Solo mostrar si está programada
          <button
            onClick={() => onEdit(appointment)} // Llama a la función onEdit pasada por props
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Edit3 size={16} className="mr-1" /> Reschedule
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
