import React from 'react';
import { Medication } from '../types';
import { Calendar, Info } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication }) => {
  // CONSOLE LOG PARA VER LA PROP medication
  console.log("MedicationCard_Rocky: Props recibidas - medication:", medication);

  // Manejo de la fecha de expiración
  let displayExpirationDate = 'N/A';
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  let isExpired = false;

  if (medication.expirationDate) { // Verifica que expirationDate exista
    const expDate = new Date(medication.expirationDate);
    // Verificar si la fecha es válida. new Date('string invalida') da "Invalid Date"
    // y getTime() en una fecha inválida da NaN.
    if (!isNaN(expDate.getTime())) {
      displayExpirationDate = expDate.toLocaleDateString('es-ES', { // O 'en-US' o el locale que prefieras
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Para comparar solo fechas, sin la hora
      expDate.setHours(0,0,0,0); // Asegurar que la fecha de expiración también está a medianoche para la comparación

      daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      isExpired = daysUntilExpiration < 0; // Si es negativo, ya expiró
      isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 30; // Expira en 30 días o menos y no ha expirado

    } else {
      displayExpirationDate = 'Invalid Date'; // Como se ve en tu imagen
      console.warn("MedicationCard: Invalid expirationDate format for medication:", medication.name, medication.expirationDate);
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
        {/* Mostrar Active Ingredient */}
        {medication.activeIngredient ? (
          <div className="flex items-center text-sm text-gray-600">
            <Info size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            {/* Accede directamente a medication.activeIngredient */}
            <span>{medication.activeIngredient}</span>
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-400">
            <Info size={16} className="mr-2 flex-shrink-0" />
            <span>No active ingredient listed</span>
          </div>
        )}

        {/* Mostrar Expiration Date */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-gray-400 flex-shrink-0" />
          <span>
            Expires: {displayExpirationDate}
            {/* Información adicional sobre expiración */}
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