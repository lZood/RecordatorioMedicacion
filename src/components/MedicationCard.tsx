// src/components/MedicationCard.tsx
import React from 'react';
import { Medication } from '../types'; // Tu tipo Medication sigue siendo camelCase, lo que es un poco inconsistente aquí
import { Calendar, Info } from 'lucide-react';

interface MedicationCardProps {
  // La prop 'medication' podría necesitar un tipo que refleje lo que realmente recibe (snake_case)
  // o hacemos el acceso condicional en el JSX. Por ahora, mantendremos el tipo Medication
  // y accederemos a las propiedades de forma que funcione.
  medication: any; // Cambiado a 'any' temporalmente para evitar errores de tipo con snake_case
                    // O podrías crear un tipo específico para la prop si siempre viene en snake_case
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication }) => {
  console.log("MedicationCard: Props recibidas - medication:", medication);

  // Acceder a las propiedades usando snake_case como vienen del log
  const activeIngredient = medication.active_ingredient;
  const expirationDateString = medication.expiration_date; // String 'YYYY-MM-DD'

  let displayExpirationDate = 'N/A';
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  let isExpired = false;

  if (expirationDateString) {
    const expDate = new Date(expirationDateString);
    if (!isNaN(expDate.getTime())) {
      // Ajustar la fecha para evitar problemas de zona horaria al comparar solo la fecha
      // Esto es importante porque new Date('YYYY-MM-DD') crea la fecha a medianoche UTC.
      // Si tu zona horaria local es, por ejemplo, UTC-6, al obtener la fecha podría ser el día anterior.
      // Para formatear y calcular diferencias de días, es mejor ser explícito.
      const year = expDate.getUTCFullYear();
      const month = expDate.getUTCMonth(); // 0-11
      const day = expDate.getUTCDate();
      
      const localExpDate = new Date(year, month, day); // Crea la fecha en la zona horaria local a medianoche

      displayExpirationDate = localExpDate.toLocaleDateString(navigator.language || 'es-ES', { // Usar el idioma del navegador o un fallback
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      // Usar localExpDate para el cálculo de días
      daysUntilExpiration = Math.ceil((localExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      isExpired = daysUntilExpiration < 0;
      isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

    } else {
      displayExpirationDate = 'Invalid Date';
      console.warn("MedicationCard: Invalid expiration_date format for medication:", medication.name, expirationDateString);
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
            <span>{activeIngredient}</span> {/* Usa la variable activeIngredient */}
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

      <div className="bg-gray-50 px-5 py-3 flex justify-between">
        <button className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors duration-200">
          View Details
        </button>
        <button className="text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors duration-200">
          Edit
        </button>
      </div>
    </div>
  );
};

export default MedicationCard;