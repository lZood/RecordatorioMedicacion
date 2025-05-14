import React from 'react';
import { Link } from 'react-router-dom';
import { Patient } from '../types';
import { Phone, Mail, MapPin, Calendar } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient }) => {
  const createdDate = new Date(patient.createdAt).toLocaleDateString();
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{patient.name}</h3>
          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">Patient</span>
        </div>
      </div>
      
      <div className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Phone size={16} className="mr-2 text-gray-400" />
          <span>{patient.phone}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Mail size={16} className="mr-2 text-gray-400" />
          <span>{patient.email}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={16} className="mr-2 text-gray-400" />
          <span className="truncate">{patient.address}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400" />
          <span>Registered on {createdDate}</span>
        </div>
      </div>
      
      <div className="bg-gray-50 px-5 py-3">
        <Link 
          to={`/patients/${patient.id}`}
          className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors duration-200"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
};

export default PatientCard;