import React from 'react';
import { Medication } from '../types';
import { Calendar, Info } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication }) => {
  const expDate = new Date(medication.expirationDate);
  const today = new Date();
  const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpiringSoon = daysUntilExpiration <= 30;
  const isExpired = daysUntilExpiration <= 0;
  
  let statusColor = 'bg-green-100 text-green-800';
  let statusText = 'Valid';
  
  if (isExpired) {
    statusColor = 'bg-red-100 text-red-800';
    statusText = 'Expired';
  } else if (isExpiringSoon) {
    statusColor = 'bg-yellow-100 text-yellow-800';
    statusText = 'Expiring Soon';
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{medication.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>
      
      <div className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Info size={16} className="mr-2 text-gray-400" />
          <span>{medication.activeIngredient}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400" />
          <span>
            Expires: {new Date(medication.expirationDate).toLocaleDateString()}
            {isExpiringSoon && !isExpired && ` (${daysUntilExpiration} days left)`}
            {isExpired && ' (Expired)'}
          </span>
        </div>
        
        {medication.description && (
          <p className="text-sm text-gray-600 mt-2">
            {medication.description}
          </p>
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
          Edit
        </button>
      </div>
    </div>
  );
};

export default MedicationCard;