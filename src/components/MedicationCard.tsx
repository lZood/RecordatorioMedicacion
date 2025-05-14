// src/components/MedicationCard.tsx
import React from 'react';
// import { Medication } from '../types'; // Comentado si usas 'any' para la prop
import { Calendar, Info, Edit3, Eye } from 'lucide-react';
import { Link } from 'react-router-dom'; // Eliminé useNavigate porque no se usa aquí directamente

interface MedicationCardProps {
  medication: any; // Sigue siendo 'any' por el snake_case o define un tipo apropiado
  onEditClick: (medication: any) => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onEditClick }) => {
  // console.log("MedicationCard: Props recibidas - medication:", medication); // Puedes mantener este log para depurar

  // Acceder a las propiedades usando snake_case como vienen del log
  // Estas son las ÚNICAS declaraciones necesarias para estas variables
  const activeIngredient = medication.active_ingredient;
  const expirationDateString = medication.expiration_date;

  let displayExpirationDate = 'N/A';
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  let isExpired = false;

  if (expirationDateString) {
    const expDate = new Date(expirationDateString);
    if (!isNaN(expDate.getTime())) {
      const year = expDate.getUTCFullYear();
      const month = expDate.getUTCMonth();
      const day = expDate.getUTCDate();
      const localExpDate = new Date(year, month, day);

      displayExpirationDate = localExpDate.toLocaleDateString(navigator.language || 'es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      daysUntilExpiration = Math.ceil((localExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      isExpired = daysUntilExpiration < 0;
      isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

    } else {
      displayExpirationDate = 'Invalid Date';
      // console.warn("MedicationCard: Invalid expiration_date format for medication:", medication.name, expirationDateString);
    }
  }

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
        {activeIngredient ? (
          <div className="flex items-center text-sm text-gray-600">
            <Info size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            <span>{activeIngredient}</span>
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-400">
            <Info size={16} className="mr-2 flex-shrink-0" />
            <span>No active ingredient listed</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span>
            Expires: {displayExpirationDate}
            {daysUntilExpiration !== null && !isExpired && isExpiringSoon && ` (${daysUntilExpiration} days left)`}
            {isExpired && ' (Expired)'}
          </span>
        </div>

        {medication.description && (
          <p className="text-sm text-gray-600 mt-2 break-words">
            {medication.description}
          </p>
        )}
      </div>

      <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
        <Link
          to={`/medications/${medication.id}`}
          className="flex items-center text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors duration-200"
        >
          <Eye size={16} className="mr-1" /> View Details
        </Link>
        <button
          onClick={() => onEditClick(medication)}
          className="flex items-center text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors duration-200"
        >
          <Edit3 size={16} className="mr-1" /> Edit
        </button>
      </div>
    </div>
  );
};

export default MedicationCard;