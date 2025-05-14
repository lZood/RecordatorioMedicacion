import React from 'react';
import { Appointment } from '../types';
import { Calendar, Clock, User, Tag } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface AppointmentCardProps {
  appointment: Appointment;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const { getPatientById } = useAppContext();
  const patient = getPatientById(appointment.patientId);
  
  let statusColor = 'bg-blue-100 text-blue-800';
  if (appointment.status === 'completed') {
    statusColor = 'bg-green-100 text-green-800';
  } else if (appointment.status === 'cancelled') {
    statusColor = 'bg-red-100 text-red-800';
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {appointment.specialty} Appointment
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColor}`}>
            {appointment.status}
          </span>
        </div>
      </div>
      
      <div className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <User size={16} className="mr-2 text-gray-400" />
          <span>Patient: {patient?.name || 'Unknown'}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400" />
          <span>Date: {appointment.date}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={16} className="mr-2 text-gray-400" />
          <span>Time: {appointment.time}</span>
        </div>
        
        {appointment.diagnosis && (
          <div className="flex items-center text-sm text-gray-600">
            <Tag size={16} className="mr-2 text-gray-400" />
            <span>Diagnosis: {appointment.diagnosis}</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-5 py-3 flex justify-between">
        <button 
          className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors duration-200"
        >
          View Details
        </button>
        <button 
          className="text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors duration-200"
        >
          {appointment.status === 'scheduled' ? 'Reschedule' : 'Add Notes'}
        </button>
      </div>
    </div>
  );
};

export default AppointmentCard;