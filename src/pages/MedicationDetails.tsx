// src/pages/MedicationDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Medication } from '../types';
import { ArrowLeft, Edit3, Trash2, Pill, Info, Calendar as CalendarIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const MedicationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMedicationById, updateMedication, deleteMedication } = useAppContext(); // Asegúrate de tener estas en AppContext

  const [medication, setMedication] = useState<Medication | null | undefined>(null); // null para carga, undefined si no se encuentra
  const [isEditing, setIsEditing] = useState(false);

  // Estados para el formulario de edición
  const [editName, setEditName] = useState('');
  const [editActiveIngredient, setEditActiveIngredient] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (id) {
      const med = getMedicationById(id); // Asume que esto viene de AppContext y puede ser snake_case
      if (med) {
        // Convertir a camelCase si es necesario o asegurarse que getMedicationById ya lo haga
        // Para este ejemplo, asumimos que getMedicationById devuelve un objeto Medication (camelCase)
        // o que la lógica dentro de getMedicationById maneja la conversión si es necesario.
        // Si 'med' viene con snake_case de getMedicationById, necesitas convertirlo aquí.
        // Por coherencia con la solución anterior de MedicationCard, vamos a asumir que puede venir snake_case
        // y lo manejamos.
        const medicationData: Medication = {
            id: med.id,
            name: med.name,
            activeIngredient: (med as any).active_ingredient || med.activeIngredient,
            expirationDate: (med as any).expiration_date || med.expirationDate,
            description: med.description
        };
        setMedication(med);
      setEditName(med.name);
      setEditActiveIngredient(med.activeIngredient);
      setEditExpirationDate(med.expirationDate);
      setEditDescription(med.description || '');
      } else {
        setMedication(undefined); // No encontrado
      }
    }
}, [id, getMedicationById, medications]);


 const handleOpenEditModal = () => {
  if (medication) {
    // Asegúrate de que los datos que cargas en el formulario de edición
    // sean los correctos (camelCase si tu estado medication es camelCase)
    setEditName(medication.name);
    setEditActiveIngredient(medication.activeIngredient); // Asume camelCase
    setEditExpirationDate(medication.expirationDate); // Asume camelCase y formato YYYY-MM-DD
    setEditDescription(medication.description || '');
    setIsEditing(true);
  }
};

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !medication) return;

    if (!editName || !editActiveIngredient || !editExpirationDate) {
        toast.error("Name, Active Ingredient, and Expiration Date are required.");
        return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editExpirationDate)) {
        toast.error("Expiration Date must be in YYYY-MM-DD format.");
        return;
    }

    const updatedMedData: Partial<Medication> = { // Esto está bien, Partial<Medication> es camelCase
    name: editName,
    activeIngredient: editActiveIngredient,
    expirationDate: editExpirationDate,
    description: editDescription,
  };

    try {
      await updateMedication(id, updatedMedData);
      toast.success('Medication updated successfully!');
      setIsEditing(false);
      // Actualizar el estado local del medicamento si es necesario, o confiar en que AppContext lo haga y se propague
      setMedication(prev => prev ? { ...prev, ...updatedMedData } : null);
    } catch (error) {
      console.error("Failed to update medication:", error);
      // El toast de error ya se maneja en AppContext
    }
  };

  const handleDelete = async () => {
    if (!id || !medication) return;
    if (window.confirm(`Are you sure you want to delete ${medication.name}?`)) {
      try {
        await deleteMedication(id);
        toast.success('Medication deleted successfully!');
        navigate('/medications'); // Redirigir después de eliminar
      } catch (error) {
        console.error("Failed to delete medication:", error);
        // El toast de error ya se maneja en AppContext
      }
    }
  };


  if (medication === null) {
    return <div className="text-center py-12">Loading medication details...</div>;
  }
  if (medication === undefined) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Medication not found.</p>
        <Link to="/medications" className="text-indigo-600 mt-4 inline-block hover:underline">
          Back to Medications
        </Link>
      </div>
    );
  }

  // Lógica para mostrar la fecha de expiración formateada (similar a MedicationCard)
  let displayExpirationDate = 'N/A';
  if (medication.expirationDate) {
    const expDate = new Date(medication.expirationDate);
    if (!isNaN(expDate.getTime())) {
        const year = expDate.getUTCFullYear();
        const month = expDate.getUTCMonth();
        const day = expDate.getUTCDate();
        const localExpDate = new Date(year, month, day);
        displayExpirationDate = localExpDate.toLocaleDateString(navigator.language || 'es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } else {
        displayExpirationDate = 'Invalid Date';
    }
  }


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/medications" className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Medication Details</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold text-indigo-700">{medication.name}</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleOpenEditModal}
                className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                title="Edit Medication"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                title="Delete Medication"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="flex items-start">
              <Pill size={18} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-500">Name</p>
                <p className="text-gray-700">{medication.name}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Info size={18} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-500">Active Ingredient</p>
                <p className="text-gray-700">{medication.activeIngredient}</p>
              </div>
            </div>
            <div className="flex items-start">
              <CalendarIcon size={18} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-500">Expiration Date</p>
                <p className="text-gray-700">{displayExpirationDate}</p>
              </div>
            </div>
            {medication.description && (
              <div className="flex items-start md:col-span-2">
                <FileText size={18} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{medication.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Edit Medication</h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <X size={24}/> {/* Asegúrate de tener X importado de lucide-react */}
                </button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              <div>
                <label htmlFor="editMedName" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" id="editMedName" value={editName} onChange={(e) => setEditName(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="editMedActiveIngredient" className="block text-sm font-medium text-gray-700 mb-1">Active Ingredient</label>
                <input type="text" id="editMedActiveIngredient" value={editActiveIngredient} onChange={(e) => setEditActiveIngredient(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="editMedExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input type="date" id="editMedExpirationDate" value={editExpirationDate} onChange={(e) => setEditExpirationDate(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="editMedDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea id="editMedDescription" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationDetails;