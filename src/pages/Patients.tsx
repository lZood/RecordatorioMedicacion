// src/pages/Patients.tsx
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import PatientCard from '../components/PatientCard';
import { UserPlus, Search, X, Mail, Lock } from 'lucide-react'; // Añadir Mail y Lock
import { Patient, UserProfile } from '../types'; // Asumimos que UserProfile podría usarse, aunque no directamente en este snippet
import toast from 'react-hot-toast';
import { CreatePatientFullData } from '../contexts/AppContext'; // Importar el tipo

const Patients: React.FC = () => {
  const { 
    patients = [],
    addPatient, 
    loadingData, 
    loadingProfile,
    currentUser, 
    userProfile 
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  // Estados para el formulario de nuevo paciente
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientContactEmail, setNewPatientContactEmail] = useState(''); // Email de contacto
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAddress, setNewPatientAddress] = useState('');
  const [newPatientLoginEmail, setNewPatientLoginEmail] = useState(''); // Email para login
  const [newPatientTempPassword, setNewPatientTempPassword] = useState('');
  const [newPatientConfirmTempPassword, setNewPatientConfirmTempPassword] = useState('');
  
  const [formSubmitting, setFormSubmitting] = useState(false);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (patient.phone && patient.phone.includes(searchTerm))
  );

  const resetFormFields = () => {
    setNewPatientName('');
    setNewPatientContactEmail('');
    setNewPatientPhone('');
    setNewPatientAddress('');
    setNewPatientLoginEmail('');
    setNewPatientTempPassword('');
    setNewPatientConfirmTempPassword('');
  };

  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Only authorized doctors can add patients.");
        setFormSubmitting(false);
        return;
    }

    // Validaciones básicas
    if (!newPatientName.trim() || !newPatientPhone.trim() || !newPatientContactEmail.trim() || !newPatientAddress.trim() || !newPatientLoginEmail.trim() || !newPatientTempPassword.trim()) {
      toast.error("Name, Contact Email, Phone, Address, Login Email, and Temporary Password are required.");
      setFormSubmitting(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newPatientLoginEmail)) {
        toast.error("Please enter a valid Login Email address.");
        setFormSubmitting(false);
        return;
    }
    if (newPatientTempPassword.length < 6) {
        toast.error("Temporary Password must be at least 6 characters long.");
        setFormSubmitting(false);
        return;
    }
    if (newPatientTempPassword !== newPatientConfirmTempPassword) {
        toast.error("Passwords do not match.");
        setFormSubmitting(false);
        return;
    }

    setFormSubmitting(true);
    
    // Preparar los datos para la función addPatient del contexto
    const patientFullData: CreatePatientFullData = {
      name: newPatientName.trim(),
      phone: newPatientPhone.trim(),
      address: newPatientAddress.trim(),
      email: newPatientContactEmail.trim(), // Email de contacto
      loginEmail: newPatientLoginEmail.trim(), // Email para la cuenta de autenticación
      temporaryPassword: newPatientTempPassword,
    };

    try {
      const newPatient = await addPatient(patientFullData); // Llamar a la función del contexto
      if (newPatient) {
        setShowAddPatientModal(false);
        resetFormFields();
        // El toast de éxito ya se maneja en AppContext
      } else {
        // El toast de error ya se maneja en AppContext o en authService
      }
    } catch (error) {
      console.error("PatientsPage: Error saving patient from handleSavePatient:", error);
      // El toast de error ya se maneja en AppContext o en authService
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

      {/* Modal para Añadir Paciente */}
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
                <label htmlFor="patientLoginEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (for login)</label>
                <input type="email" id="patientLoginEmail" value={newPatientLoginEmail} onChange={(e) => setNewPatientLoginEmail(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="patient.login@example.com"/>
              </div>

              <div>
                <label htmlFor="patientTempPassword" className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input type="password" id="patientTempPassword" value={newPatientTempPassword} onChange={(e) => setNewPatientTempPassword(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Min. 6 characters"/>
              </div>

              <div>
                <label htmlFor="patientConfirmTempPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Temporary Password</label>
                <input type="password" id="patientConfirmTempPassword" value={newPatientConfirmTempPassword} onChange={(e) => setNewPatientConfirmTempPassword(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              <hr className="my-6"/> {/* Separador visual */}

              <div>
                <label htmlFor="patientContactEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (Informative/Contact)</label>
                <input type="email" id="patientContactEmail" value={newPatientContactEmail} onChange={(e) => setNewPatientContactEmail(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="patient.contact@example.com"/>
              </div>
              
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

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => {setShowAddPatientModal(false); resetFormFields();}}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" disabled={formSubmitting}>
                  Cancel
                </button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={formSubmitting}>
                  {formSubmitting ? "Saving..." : "Save Patient & Create Account"}
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

