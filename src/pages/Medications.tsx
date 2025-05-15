// src/pages/Medications.tsx
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import MedicationCard from '../components/MedicationCard';
import { Plus, Search, Pill as PillIcon, Calendar as CalendarIcon, Info, X, Edit3 } from 'lucide-react';
import { Medication } from '../types';
import toast from 'react-hot-toast';

const Medications: React.FC = () => {
  const { 
    medications = [], 
    addMedication, 
    updateMedication, // Para el modal de edición
    deleteMedication, // Para el modal de edición o card
    loadingData, 
    loadingProfile, 
    currentUser, 
    userProfile 
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Estados para el formulario de "Añadir"
  const [newMedName, setNewMedName] = useState('');
  const [newMedActiveIngredient, setNewMedActiveIngredient] = useState('');
  const [newMedExpirationDate, setNewMedExpirationDate] = useState('');
  const [newMedDescription, setNewMedDescription] = useState('');
  
  // Estados para el formulario de "Editar"
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [editMedName, setEditMedName] = useState('');
  const [editMedActiveIngredient, setEditMedActiveIngredient] = useState('');
  const [editMedExpirationDate, setEditMedExpirationDate] = useState('');
  const [editMedDescription, setEditMedDescription] = useState('');

  const [formSubmitting, setFormSubmitting] = useState(false);

  // La lista 'medications' ya viene filtrada por RLS si el usuario es un doctor.
  const filteredMedications = medications.filter(medication =>
    medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (medication.activeIngredient && medication.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetAddForm = () => {
    setNewMedName('');
    setNewMedActiveIngredient('');
    setNewMedExpirationDate('');
    setNewMedDescription('');
  };

  const handleOpenAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const handleSaveNewMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Only doctors can add medications."); return;
    }
    if (!newMedName.trim() || !newMedActiveIngredient.trim() || !newMedExpirationDate) {
      toast.error("Name, Active Ingredient, and Expiration Date are required."); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newMedExpirationDate)) {
      toast.error("Expiration Date must be in YYYY-MM-DD format."); return;
    }
    setFormSubmitting(true);
    // doctorId se añadirá en AppContext.addMedication
    const medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'> = {
      name: newMedName.trim(),
      activeIngredient: newMedActiveIngredient.trim(),
      expirationDate: newMedExpirationDate,
      description: newMedDescription.trim() || undefined,
    };
    try {
      await addMedication(medicationData);
      setShowAddModal(false);
    } catch (error) { console.error("MedicationsPage: Error saving new medication:", error); }
    finally { setFormSubmitting(false); }
  };

  const handleOpenEditModal = (med: Medication) => {
    setEditingMed(med);
    setEditMedName(med.name);
    setEditMedActiveIngredient(med.activeIngredient);
    setEditMedExpirationDate(med.expirationDate); // Asume YYYY-MM-DD
    setEditMedDescription(med.description || '');
    setShowEditModal(true);
  };

  const handleSaveEditMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMed || !currentUser || userProfile?.role !== 'doctor') {
      toast.error("Cannot edit medication."); return;
    }
    if (!editMedName.trim() || !editMedActiveIngredient.trim() || !editMedExpirationDate) {
      toast.error("Name, Active Ingredient, and Expiration Date are required."); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editMedExpirationDate)) {
      toast.error("Expiration Date must be in YYYY-MM-DD format."); return;
    }
    setFormSubmitting(true);
    const updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>> = {
      name: editMedName.trim(),
      activeIngredient: editMedActiveIngredient.trim(),
      expirationDate: editMedExpirationDate,
      description: editMedDescription.trim() || undefined,
    };
    try {
      await updateMedication(editingMed.id, updatedData);
      setShowEditModal(false);
      setEditingMed(null);
    } catch (error) { console.error("MedicationsPage: Error updating medication:", error); }
    finally { setFormSubmitting(false); }
  };

  const handleDeleteMedication = async (medId: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Only doctors can delete medications."); return;
    }
    if (window.confirm("Are you sure you want to delete this medication?")) {
      try {
        await deleteMedication(medId);
      } catch (error) { console.error("MedicationsPage: Error deleting medication:", error); }
    }
  };
  
  if ((loadingData && !medications.length) || (currentUser && loadingProfile && !userProfile)) {
    return <div className="flex justify-center items-center h-screen"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin"></div><p className="ml-4 text-lg">Loading data...</p></div>;
  }
  if (currentUser && !loadingProfile && userProfile && userProfile.role !== 'doctor') {
      return <div className="p-6 text-center"><h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1><p className="text-gray-700">This section is for authorized doctors only.</p></div>;
  }
   if (currentUser && !loadingProfile && !userProfile) {
    return <div className="p-6 text-center"><h1 className="text-2xl font-bold text-orange-600 mb-4">Profile Issue</h1><p className="text-gray-700">Could not load user profile.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">My Medications</h1>
        {userProfile?.role === 'doctor' && (
            <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Search my medications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"/>
            </div>
            <button onClick={handleOpenAddModal}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200">
                <Plus size={18} />
                <span>Add Medication</span>
            </button>
            </div>
        )}
      </div>

      {/* Medication Status Filters (opcional) */}
      {/* <div className="flex flex-wrap gap-3"> ... </div> */}

      {loadingData && medications.length === 0 && userProfile?.role === 'doctor' ? (
         <div className="text-center py-12"><p className="text-gray-500 text-lg">Loading medications...</p></div>
      ) : filteredMedications.length > 0 && userProfile?.role === 'doctor' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map(med => (
            <MedicationCard 
                key={med.id} 
                medication={med} 
                onEditClick={() => handleOpenEditModal(med)}
                onDeleteClick={() => handleDeleteMedication(med.id)} // Pasar onDeleteClick
            />
          ))}
        </div>
      ) : (
        userProfile?.role === 'doctor' && 
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No medications found matching your search." : "You have no medications yet. Click 'Add Medication' to get started."}
          </p>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && userProfile?.role === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Medication</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveNewMedication}>
              <div>
                <label htmlFor="newMedName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><PillIcon size={16} className="mr-2 text-gray-400" /> Name</label>
                <input type="text" id="newMedName" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="newMedActiveIngredient" className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Info size={16} className="mr-2 text-gray-400" /> Active Ingredient</label>
                <input type="text" id="newMedActiveIngredient" value={newMedActiveIngredient} onChange={(e) => setNewMedActiveIngredient(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="newMedExpirationDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><CalendarIcon size={16} className="mr-2 text-gray-400" /> Expiration Date</label>
                <input type="date" id="newMedExpirationDate" value={newMedExpirationDate} onChange={(e) => setNewMedExpirationDate(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="newMedDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea id="newMedDescription" value={newMedDescription} onChange={(e) => setNewMedDescription(e.target.value)} rows={3} className="w-full input-style"/>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" disabled={formSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>{formSubmitting ? "Saving..." : "Save Medication"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {showEditModal && editingMed && userProfile?.role === 'doctor' && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Edit Medication</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEditMedication}>
              <div>
                <label htmlFor="editMedName" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" id="editMedName" value={editMedName} onChange={(e) => setEditMedName(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="editMedActiveIngredient" className="block text-sm font-medium text-gray-700 mb-1">Active Ingredient</label>
                <input type="text" id="editMedActiveIngredient" value={editMedActiveIngredient} onChange={(e) => setEditMedActiveIngredient(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="editMedExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input type="date" id="editMedExpirationDate" value={editMedExpirationDate} onChange={(e) => setEditMedExpirationDate(e.target.value)} required className="w-full input-style"/>
              </div>
              <div>
                <label htmlFor="editMedDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea id="editMedDescription" value={editMedDescription} onChange={(e) => setEditMedDescription(e.target.value)} rows={3} className="w-full input-style"/>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" disabled={formSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>{formSubmitting ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Define some base styles for inputs and buttons if you haven't already in index.css
// e.g., in index.css or a global style sheet:
// .input-style { @apply w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm; }
// .btn-primary { @apply px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400; }
// .btn-secondary { @apply px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-200; }

export default Medications;
