// src/components/AppointmentCard.tsx
import React from 'react';
// Asegúrate de que tu tipo Appointment o AppointmentWithDetails esté correctamente definido
// en ../types para incluir opcionalmente patient y doctor como objetos.
import { Appointment as AppointmentType } from '../types'; 
import { Calendar, Clock, User as UserIcon, Tag, Edit3, Eye, CheckSquare, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AppointmentCardProps {
  // Es mejor usar un tipo más específico que 'any' si es posible.
  // Este tipo debería reflejar la estructura de una cita, incluyendo
  // potencialmente los detalles anidados del paciente y del doctor.
  appointment: AppointmentType & { 
    patient?: { id: string; name: string; } | null;
    doctor?: { id: string; name: string; specialty?: string; } | null;
  };
  onEdit: (appointment: AppointmentType) => void;
  onMarkAsCompleted: (appointment: AppointmentType) => void;
  onDelete: (appointmentId: string) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onEdit, onMarkAsCompleted, onDelete }) => {
  // Accede a patient.name y doctor.name si están disponibles
  // Proporciona un valor predeterminado o maneja el caso en que patient o doctor no estén definidos.
  const patientName = appointment.patient?.name || `Patient ID: ${appointment.patientId}` || 'Unknown Patient';
  const doctorName = appointment.doctor?.name || `Doctor ID: ${appointment.doctorId}` || 'Unknown Doctor';

  let statusColor = 'bg-blue-100 text-blue-800';
  if (appointment.status === 'completed') {
    statusColor = 'bg-green-100 text-green-800';
  } else if (appointment.status === 'cancelled') {
    statusColor = 'bg-red-100 text-red-800';
  }

  // Formatear hora para visualización
  let displayTime = 'N/A';
  if (appointment.time) {
    const timeParts = appointment.time.split(':');
    if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
            const timeDate = new Date();
            timeDate.setHours(hours, minutes, 0);
            displayTime = timeDate.toLocaleTimeString(navigator.language || 'es-ES', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }
    }
  }
  
  // Formatear fecha para visualización
  let displayDate = 'N/A';
  if (appointment.date) {
    // Asegurar que la fecha se interprete correctamente como UTC si es necesario, o local.
    // Si la fecha de la DB es solo YYYY-MM-DD, agregar T00:00:00 ayuda a interpretarla como local.
    const dateObj = new Date(appointment.date + 'T00:00:00'); 
    if (!isNaN(dateObj.getTime())) {
      displayDate = dateObj.toLocaleDateString(navigator.language || 'es-ES', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {/* Card Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-indigo-700 leading-tight truncate" title={appointment.specialty}>
            {appointment.specialty}
          </h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusColor}`}>
            {appointment.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate" title={`With: ${patientName}`}>With: {patientName}</p>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-3 flex-grow">
        <div className="flex items-center text-sm text-gray-600">
          <UserIcon size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate" title={`Dr. ${doctorName}`}>Dr. {doctorName}</span>
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
            <span className="italic truncate" title={`Diagnosis: ${appointment.diagnosis}`}>Diagnosis: {appointment.diagnosis}</span>
          </div>
        )}
      </div>

      {/* Card Footer with Actions */}
      <div className="bg-gray-50 px-5 py-3 flex flex-wrap justify-between items-center border-t gap-2">
        <Link
          to={`/appointments/${appointment.id}`}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          title="View Appointment Details"
        >
          <Eye size={16} className="mr-1" /> View Details
        </Link>
        
        <div className="flex items-center gap-2"> {/* Contenedor para los botones de acción */}
          {appointment.status === 'scheduled' && (
            <>
              <button
                onClick={() => onMarkAsCompleted(appointment)}
                className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium transition-colors p-1 hover:bg-green-50 rounded"
                title="Mark as Completed"
              >
                <CheckSquare size={16} className="mr-1" /> Complete
              </button>
              <button
                onClick={() => onEdit(appointment)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors p-1 hover:bg-blue-50 rounded"
                title="Reschedule Appointment"
              >
                <Edit3 size={16} className="mr-1" /> Reschedule
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(appointment.id)}
            className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium transition-colors p-1 hover:bg-red-50 rounded"
            title="Delete Appointment"
          >
            <Trash2 size={16} className="mr-1" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
