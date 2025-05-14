// src/pages/Medications.tsx
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import MedicationCard from '../components/MedicationCard';
import { Plus, Search, Pill as PillIcon, Calendar as CalendarIcon, Info, X, Edit3 } from 'lucide-react';
import { Medication } from '../types';
import toast from 'react-hot-toast';

const Medications: React.FC = () => {
  const { medications, addMedication, updateMedication } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de "Añadir"
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedActiveIngredient, setNewMedActiveIngredient] = useState('');
  const [newMedExpirationDate, setNewMedExpirationDate] = useState('');
  const [newMedDescription, setNewMedDescription] = useState('');

  // Modal de "Editar"
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMed, setEditingMed] = useState<any | null>(null); // O usa tu tipo Medication si manejas la conversión
  const [editName, setEditName] = useState('');
  const [editActiveIngredient, setEditActiveIngredient] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // ... (filteredMedications y resetFormFields para el modal de añadir) ...
  const resetAddFormFields = () => {
    setNewMedName('');
    setNewMedActiveIngredient('');
    setNewMedExpirationDate('');
    setNewMedDescription('');
  };


  const handleSaveNewMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ... (validaciones para el nuevo medicamento)
    if (!newMedName || !newMedActiveIngredient || !newMedExpirationDate) {
        toast.error("Name, Active Ingredient, and Expiration Date are required.");
        return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newMedExpirationDate)) {
        toast.error("Expiration Date must be in YYYY-MM-DD format.");
        return;
    }

    const medicationData: Omit<Medication, 'id'> = {
      name: newMedName,
      activeIngredient: newMedActiveIngredient,
      expirationDate: newMedExpirationDate,
      description: newMedDescription || undefined,
    };
    try {
      await addMedication(medicationData);
      setShowAddModal(false);
      resetAddFormFields();
    } catch (error) {
      console.error("Failed to save new medication:", error);
    }
  };

  const handleOpenEditModal = (med: any) => { // med puede venir con snake_case
    setEditingMed(med);
    // Usar los nombres de propiedad snake_case que vienen de la card
    setEditName(med.name || '');
    setEditActiveIngredient(med.active_ingredient || med.activeIngredient || '');
    setEditExpirationDate(med.expiration_date || med.expirationDate || ''); // Formato YYYY-MM-DD
    setEditDescription(med.description || '');
    setShowEditModal(true);
  };

  const handleSaveEditMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMed) return;

    // ... (validaciones para editar medicamento)
    if (!editName || !editActiveIngredient || !editExpirationDate) {
        toast.error("Name, Active Ingredient, and Expiration Date are required.");
        return;
    }
     if (!/^\d{4}-\d{2}-\d{2}$/.test(editExpirationDate)) {
        toast.error("Expiration Date must be in YYYY-MM-DD format.");
        return;
    }

    const updatedMedData: Partial<Medication> = { // Usa Partial<Medication> para camelCase
      name: editName,
      activeIngredient: editActiveIngredient,
      expirationDate: editExpirationDate,
      description: editDescription,
    };

    try {
      await updateMedication(editingMed.id, updatedMedData); // updateMedication espera camelCase
      setShowEditModal(false);
      setEditingMed(null);
      // El estado global se actualizará a través de AppContext
    } catch (error) {
      console.error("Failed to update medication:", error);
    }
  };
  
  // Lógica de filteredMedications (asegúrate de que funcione con snake_case o camelCase según lo que tengas en el estado)
  // Si 'medications' en AppContext está en camelCase, el filtro debería estar bien.
  // Si está en snake_case, ajusta el filtro. Asumamos que está en camelCase después de la carga inicial.
  const filteredMedications = medications.filter(medication => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = medication.name.toLowerCase().includes(searchTermLower);
    // Si medication.activeIngredient puede no existir o ser null:
    const ingredient = (medication as any).active_ingredient || medication.activeIngredient;
    const ingredientMatch = ingredient ? ingredient.toLowerCase().includes(searchTermLower) : false;
    return nameMatch || ingredientMatch;
  });


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Medications</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* ... (Input de búsqueda) ... */}
          <button
            onClick={() => {
              resetAddFormFields(); // o resetFormFields si solo tienes un conjunto de estados de formulario
              setShowAddModal(true); // o setShowAddMedicationModal(true)
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <Plus size={18} />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* ... (Filtros de estado) ... */}

      {filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map(med => (
            <MedicationCard
              key={med.id}
              medication={med} // med aquí es el objeto del estado de AppContext
              onEditClick={handleOpenEditModal} // Pasa la función para abrir el modal de edición
            />
          ))}
        </div>
      ) : (
        // ... (mensaje de no medicamentos) ...
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No medications found matching your search." : "No medications available. Add a new one!"}
          </p>
        </div>
      )}

      {/* Modal para Añadir Medicamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Medication</h2>
                <button onClick={() => { setShowAddModal(false); resetAddFormFields();}} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                </button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveNewMedication}>
              {/* Campos del formulario de añadir (name, activeIngredient, expirationDate, description) */}
              {/* ... (similar al modal de edición pero con estados newMed...) */}
               <div>
                <label htmlFor="newMedName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <PillIcon size={16} className="mr-2 text-gray-400" /> Name
                </label>
                <input type="text" id="newMedName" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="newMedActiveIngredient" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Info size={16} className="mr-2 text-gray-400" /> Active Ingredient
                </label>
                <input type="text" id="newMedActiveIngredient" value={newMedActiveIngredient} onChange={(e) => setNewMedActiveIngredient(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="newMedExpirationDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CalendarIcon size={16} className="mr-2 text-gray-400" /> Expiration Date
                </label>
                <input type="date" id="newMedExpirationDate" value={newMedExpirationDate} onChange={(e) => setNewMedExpirationDate(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="newMedDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea id="newMedDescription" value={newMedDescription} onChange={(e) => setNewMedDescription(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetAddFormFields(); }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Medication</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Medicamento */}
      {showEditModal && editingMed && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Edit Medication</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                </button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEditMedication}>
              {/* Campos del formulario de edición (pre-llenados con editName, editActiveIngredient, etc.) */}
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
                <button type="button" onClick={() => setShowEditModal(false)}
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

export default Medications;