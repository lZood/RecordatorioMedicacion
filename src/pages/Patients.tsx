// src/pages/Patients.tsx
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import PatientCard from '../components/PatientCard';
import { UserPlus, Search, X } from 'lucide-react'; // Lock, Eye, EyeOff eliminados
import { Patient } from '../types';
import toast from 'react-hot-toast';

const Patients: React.FC = () => {
  const {
    patients = [],
    addPatient, // Esta función en AppContext ahora solo debería tomar datos demográficos
    loadingData,
    loadingProfile,
    currentUser,
    userProfile
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  // Estados del formulario para datos demográficos
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState(''); // Email informativo
  const [newPatientAddress, setNewPatientAddress] = useState('');

  // Se eliminan los estados relacionados con la contraseña del paciente
  // const [newPatientPassword, setNewPatientPassword] = useState('');
  // const [confirmNewPatientPassword, setConfirmNewPatientPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false);
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formSubmitting, setFormSubmitting] = useState(false);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (patient.phone && patient.phone.includes(searchTerm))
  );

  const resetFormFields = () => {
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setNewPatientAddress('');
    // Se elimina el reseteo de campos de contraseña
    // setNewPatientPassword('');
    // setConfirmNewPatientPassword('');
    // setShowPassword(false);
    // setShowConfirmPassword(false);
  };

  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Only authorized doctors can add patients.");
        setFormSubmitting(false);
        return;
    }

    // Validación solo para campos demográficos
    if (!newPatientName.trim() || !newPatientPhone.trim() || !newPatientEmail.trim() || !newPatientAddress.trim()) {
      toast.error("Name, Phone, Email, and Address are required.");
      setFormSubmitting(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newPatientEmail)) {
        toast.error("Please enter a valid email address for patient information.");
        setFormSubmitting(false);
        return;
    }
    // Se eliminan validaciones de contraseña

    setFormSubmitting(true);
    const patientDataDemographics: Omit<Patient, 'id' | 'createdAt' | 'doctorId'> = {
      name: newPatientName.trim(),
      phone: newPatientPhone.trim(),
      address: newPatientAddress.trim(),
      email: newPatientEmail.trim().toLowerCase(), // Email informativo
    };

    try {
      // La función addPatient en AppContext ahora SÓLO debería tomar los datos demográficos.
      // El doctorId se añade dentro de la función addPatient en AppContext.
      const newPatient = await addPatient(patientDataDemographics);
      if (newPatient) {
        setShowAddPatientModal(false);
        resetFormFields();
        // El toast de éxito ya se maneja en AppContext
      } else {
        // El toast de error ya se maneja en AppContext o en addPatient
      }
    } catch (error) {
      console.error("PatientsPage: Error saving patient record:", error);
      // El toast de error ya se maneja en AppContext o en addPatient
    } finally {
        setFormSubmitting(false);
    }
  };

  if ((loadingData && !patients.length) || (currentUser && loadingProfile && !userProfile)) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin"></div>
            <p className="ml-4 text-lg">Loading data...</p>
        </div>
    );
  }
 
  if (currentUser && !loadingProfile && userProfile && userProfile.role !== 'doctor') {
      return (
        <div className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-700">This section is for authorized doctors only.</p>
            <p className="text-sm text-gray-500 mt-2">Your role: {userProfile.role}</p>
        </div>
      );
  }
   if (currentUser && !loadingProfile && !userProfile) {
    return (
        <div className="p-6 text-center">
            <h1 className="text-2xl font-bold text-orange-600 mb-4">Profile Issue</h1>
            <p className="text-gray-700">Could not load user profile. Please try logging out and in again, or contact support.</p>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">My Patients</h1>
        {userProfile?.role === 'doctor' && (
            <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                type="text"
                placeholder="Search my patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
                />
            </div>
            <button
                onClick={() => { resetFormFields(); setShowAddPatientModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
            >
                <UserPlus size={18} />
                <span>Add Patient</span>
            </button>
            </div>
        )}
      </div>

      {loadingData && patients.length === 0 && userProfile?.role === 'doctor' ? (
         <div className="text-center py-12"><p className="text-gray-500 text-lg">Loading patients...</p></div>
      ) : filteredPatients.length > 0 && userProfile?.role === 'doctor' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      ) : (
        userProfile?.role === 'doctor' &&
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No patients found matching your search." : "You have no patients yet. Click 'Add Patient' to get started."}
          </p>
        </div>
      )}

      {showAddPatientModal && userProfile?.role === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add New Patient</h2>
                <button onClick={() => {setShowAddPatientModal(false); resetFormFields();}} className="text-gray-400 hover:text-gray-600">
                    <X size={24}/>
                </button>
            </div>
            <form className="space-y-4" onSubmit={handleSavePatient}>
              <div>
                <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" id="patientName" value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="patientEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (Informative)</label>
                <input type="email" id="patientEmail" value={newPatientEmail} onChange={(e) => setNewPatientEmail(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              {/* Campos de contraseña eliminados del formulario del doctor */}
              <div>
                <label htmlFor="patientPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" id="patientPhone" value={newPatientPhone} onChange={(e) => setNewPatientPhone(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div>
                <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea id="patientAddress" value={newPatientAddress} onChange={(e) => setNewPatientAddress(e.target.value)} rows={3} required
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => {setShowAddPatientModal(false); resetFormFields();}}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" disabled={formSubmitting}>
                  Cancel
                </button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={formSubmitting}>
                  {formSubmitting ? "Saving..." : "Save Patient Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;