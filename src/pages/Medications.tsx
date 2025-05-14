// src/pages/Medications.tsx
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import MedicationCard from '../components/MedicationCard';
import { Plus, Search, Pill as PillIcon, Calendar as CalendarIcon, Info } from 'lucide-react'; // Renombra iconos si es necesario
import { Medication } from '../types'; // Importa el tipo Medication
import toast from 'react-hot-toast';

const Medications: React.FC = () => {
  const { medications, addMedication } = useAppContext(); // Obtén addMedication
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);

  // Estados para el formulario del nuevo medicamento
  const [newMedName, setNewMedName] = useState('');
  const [newMedActiveIngredient, setNewMedActiveIngredient] = useState('');
  const [newMedExpirationDate, setNewMedExpirationDate] = useState(''); // Formato YYYY-MM-DD
  const [newMedDescription, setNewMedDescription] = useState('');


  const filteredMedications = medications.filter(medication =>
    medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetFormFields = () => {
    setNewMedName('');
    setNewMedActiveIngredient('');
    setNewMedExpirationDate('');
    setNewMedDescription('');
  };

  const handleSaveMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newMedName || !newMedActiveIngredient || !newMedExpirationDate) {
      toast.error("Name, Active Ingredient, and Expiration Date are required.");
      return;
    }

    // Validar formato de fecha YYYY-MM-DD (puedes usar una librería o regex más robusto)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newMedExpirationDate)) {
        toast.error("Expiration Date must be in YYYY-MM-DD format.");
        return;
    }

    const medicationData: Omit<Medication, 'id'> = { // 'id' será generado por Supabase
      name: newMedName,
      activeIngredient: newMedActiveIngredient,
      expirationDate: newMedExpirationDate,
      description: newMedDescription || undefined, // Asegúrate de que description sea opcional o string vacío
    };

    try {
      await addMedication(medicationData);
      setShowAddMedicationModal(false);
      resetFormFields();
    } catch (error) {
      // El toast de error ya se maneja en AppContext
      console.error("Failed to save medication from page:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Medications</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
            />
          </div>

          <button
            onClick={() => {
              resetFormFields();
              setShowAddMedicationModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <Plus size={18} />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* Medication Status Filters - Puedes implementar la lógica de filtrado después */}
      <div className="flex flex-wrap gap-3">
        {/* ... tus botones de filtro ... */}
      </div>

      {filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map(medication => (
            <MedicationCard key={medication.id} medication={medication} />
            // Aquí podrías pasar funciones de update/delete a MedicationCard si quieres botones allí
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No medications found matching your search." : "No medications available. Add a new one!"}
          </p>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMedicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Medication</h2>
                <button onClick={() => setShowAddMedicationModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} /> {/* Asumiendo que tienes el icono X de lucide-react */}
                </button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveMedication}>
              <div>
                <label htmlFor="medName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <PillIcon size={16} className="mr-2 text-gray-400" /> Name
                </label>
                <input
                  type="text"
                  id="medName"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="medActiveIngredient" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Info size={16} className="mr-2 text-gray-400" /> Active Ingredient
                </label>
                <input
                  type="text"
                  id="medActiveIngredient"
                  value={newMedActiveIngredient}
                  onChange={(e) => setNewMedActiveIngredient(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="medExpirationDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CalendarIcon size={16} className="mr-2 text-gray-400" /> Expiration Date
                </label>
                <input
                  type="date" // Usa type="date" para un selector de fecha nativo
                  id="medExpirationDate"
                  value={newMedExpirationDate}
                  onChange={(e) => setNewMedExpirationDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="medDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="medDescription"
                  value={newMedDescription}
                  onChange={(e) => setNewMedDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMedicationModal(false);
                    resetFormFields();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medications;