import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext'; // Asegúrate que la ruta es correcta
import PatientCard from '../components/PatientCard'; // Asegúrate que la ruta es correcta
import { UserPlus, Search } from 'lucide-react';
import { Patient } from '../types'; // Importa el tipo Patient

const Patients: React.FC = () => {
  const { patients, addPatient } = useAppContext(); // Obtén addPatient del contexto
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  // Estados para los campos del formulario del nuevo paciente
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientAddress, setNewPatientAddress] = useState('');

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) || // Verifica que email exista
    (patient.phone && patient.phone.includes(searchTerm)) // Verifica que phone exista
  );

  const resetFormFields = () => {
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setNewPatientAddress('');
  };

  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevenir el envío tradicional del formulario

    if (!newPatientName || !newPatientPhone || !newPatientEmail || !newPatientAddress) {
      // Aquí podrías añadir una notificación al usuario de que todos los campos son requeridos
      alert("Todos los campos son requeridos.");
      return;
    }

    const patientData: Omit<Patient, 'id' | 'createdAt'> = {
      name: newPatientName,
      phone: newPatientPhone,
      address: newPatientAddress,
      email: newPatientEmail,
    };

    try {
      await addPatient(patientData); // Llama a la función addPatient del contexto
      setShowAddPatientModal(false); // Cierra el modal
      resetFormFields(); // Limpia los campos del formulario
      // Podrías añadir una notificación de éxito aquí (ej. con react-hot-toast)
    } catch (error) {
      console.error("Error al guardar el paciente:", error);
      // Podrías añadir una notificación de error aquí
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Patients</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
            />
          </div>

          <button
            onClick={() => {
              resetFormFields(); // Limpia el formulario antes de mostrarlo
              setShowAddPatientModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <UserPlus size={18} />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No patients found matching your search." : "No patients available. Add a new patient!"}
          </p>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Add New Patient</h2>
            {/* El atributo onSubmit se añade al <form> */}
            <form className="space-y-4" onSubmit={handleSavePatient}>
              <div>
                <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="patientName"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="patientPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="patientPhone"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="patientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="patientEmail"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="patientAddress"
                  value={newPatientAddress}
                  onChange={(e) => setNewPatientAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button" // Importante: este es tipo "button" para no enviar el formulario
                  onClick={() => {
                    setShowAddPatientModal(false);
                    resetFormFields(); // Limpia también al cancelar
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit" // Este es el botón que envía el formulario
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save Patient
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