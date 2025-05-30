// src/pages/PatientDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // useNavigate importado
import { useAppContext } from '../contexts/AppContext';
import { Patient, Medication, VitalSign, MedicationIntake } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes';
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Calendar as CalendarIcon, Pill, Activity, FileText,
  PlusCircle, CheckSquare, XSquare, Trash2, Clock, ListChecks, HeartPulse, X // Asegúrate de que X esté importado
} from 'lucide-react';
import toast from 'react-hot-toast';

type MedicationIntakeFormData = Omit<MedicationIntake, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>;

const PatientDetails: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Hook para navegación
  const {
    getPatientById,
    medications = [],
    addMedicationIntake,
    updateMedicationIntake,
    deleteMedicationIntake,
    fetchMedicationIntakesForPatient,
    fetchVitalSignsForPatient,
    userProfile,
    currentUser
  } = useAppContext();

  const [patient, setPatient] = useState<Patient | null | undefined>(null); // null: cargando, undefined: no encontrado
  const [patientMedicationIntakes, setPatientMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  const [patientVitalSigns, setPatientVitalSigns] = useState<VitalSign[]>([]);
  
  // Estados de carga locales para las secciones específicas de esta página
  const [loadingIntakes, setLoadingIntakes] = useState(true); // Iniciar en true
  const [loadingVitals, setLoadingVitals] = useState(true);   // Iniciar en true

  const [showAddIntakeModal, setShowAddIntakeModal] = useState(false);
  const [intakeFormData, setIntakeFormData] = useState<Partial<MedicationIntakeFormData>>({
    medicationId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0,5),
    taken: false,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    // Cargar los datos del paciente
    if (patientId) {
      const currentPatient = getPatientById(patientId);
      setPatient(currentPatient); // Puede ser null inicialmente si la lista de pacientes aún no ha cargado en AppContext

      // Cargar datos específicos del paciente (intakes y vitals)
      const loadPatientSpecificData = async () => {
        if (userProfile?.role === 'doctor' && currentPatient) { // Solo cargar si el paciente existe y el usuario es doctor
          setLoadingIntakes(true);
          setLoadingVitals(true);
          try {
            const intakes = await fetchMedicationIntakesForPatient(patientId);
            setPatientMedicationIntakes(intakes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
          } catch (error) { 
            console.error("PatientDetails: Error fetching intakes for patient:", error);
            toast.error("Could not load medication intakes.");
          } finally {
            setLoadingIntakes(false); // Asegurar que se establece a false
          }

          try {
            const vitals = await fetchVitalSignsForPatient(patientId);
            setPatientVitalSigns(vitals.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
          } catch (error) { 
            console.error("PatientDetails: Error fetching vitals for patient:", error);
            toast.error("Could not load vital signs.");
          } finally {
            setLoadingVitals(false); // Asegurar que se establece a false
          }
        } else {
          // Si no es doctor o no hay paciente, limpiar y detener carga
          setPatientMedicationIntakes([]);
          setPatientVitalSigns([]);
          setLoadingIntakes(false);
          setLoadingVitals(false);
        }
      };
      
      // Solo llamar a loadPatientSpecificData si tenemos el perfil del usuario y es un doctor
      if (userProfile) { // Esperar a que userProfile esté disponible
          loadPatientSpecificData();
      } else if (currentUser && !userProfile) {
          // Si hay currentUser pero userProfile aún no (podría estar cargando en AppContext)
          // podrías esperar o basar la lógica en una carga de perfil completa.
          // Por ahora, si userProfile no está, no cargamos datos específicos.
          setLoadingIntakes(false);
          setLoadingVitals(false);
      }

    } else {
      setPatient(undefined); // No hay patientId
      setLoadingIntakes(false);
      setLoadingVitals(false);
    }
  // Dependencias: patientId, getPatientById (que depende de `patients` en AppContext),
  // userProfile (para la verificación de rol), y las funciones de fetch.
  // Si `patients` en AppContext cambia, getPatientById podría devolver un nuevo objeto `currentPatient`.
  }, [patientId, getPatientById, fetchMedicationIntakesForPatient, fetchVitalSignsForPatient, userProfile, currentUser]);


  const handleIntakeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setIntakeFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setIntakeFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetIntakeForm = () => {
    setIntakeFormData({
        medicationId: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0,5),
        taken: false,
    });
  };

  const handleAddIntakeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Only doctors can add medication intakes."); return;
    }
    if (!patientId || !intakeFormData.medicationId || !intakeFormData.date || !intakeFormData.time) {
      toast.error("Medication, Date, and Time are required for medication plan.");
      return;
    }
    setFormSubmitting(true);
    try {
      const newIntakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: patientId,
        medicationId: intakeFormData.medicationId!, // ! asume que medicationId no será vacío por la validación
        date: intakeFormData.date!,
        time: intakeFormData.time!,
        taken: intakeFormData.taken || false,
      };
      const addedIntake = await addMedicationIntake(newIntakeData);
      if (addedIntake) {
        setPatientMedicationIntakes(prev => [addedIntake, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
        setShowAddIntakeModal(false);
        resetIntakeForm();
      }
    } catch (error) {
      console.error("PatientDetails: Error adding medication intake:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleIntakeTakenStatus = async (intake: MedicationIntakeWithMedication) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Only doctors can update medication intakes."); return;
    }
    try {
      const updatedIntake = await updateMedicationIntake(intake.id, { taken: !intake.taken });
      if (updatedIntake) {
        setPatientMedicationIntakes(prev =>
          prev.map(i => (i.id === intake.id ? updatedIntake : i))
        );
        toast.success(`Medication intake marked as ${updatedIntake.taken ? 'taken' : 'not taken'}.`);
      }
    } catch (error) {
      console.error("PatientDetails: Error updating intake status:", error);
    }
  };
  
  const handleDeleteIntake = async (intakeId: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Only doctors can delete medication intakes."); return;
    }
    if (window.confirm("Are you sure you want to delete this medication intake record?")) {
        try {
            await deleteMedicationIntake(intakeId);
            setPatientMedicationIntakes(prev => prev.filter(i => i.id !== intakeId));
        } catch (error) {
            console.error("PatientDetails: Error deleting medication intake:", error);
        }
    }
  };

  const adherenceRate = useMemo(() => {
    if (!patientMedicationIntakes || patientMedicationIntakes.length === 0) return 0;
    const takenCount = patientMedicationIntakes.filter(intake => intake.taken).length;
    return Math.round((takenCount / patientMedicationIntakes.length) * 100);
  }, [patientMedicationIntakes]);


  if (patient === null && !patientId) { // Si no hay patientId en la URL, no hay nada que cargar
    return <Navigate to="/patients" replace />; // O a una página de error
  }
  if (patient === null && patientId) { // patientId existe, pero `patient` aún es null (cargando desde AppContext)
    return <div className="flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin"></div><p className="ml-3">Loading patient data...</p></div>;
  }
  if (patient === undefined) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Patient not found or you do not have access.</p>
        <Link to="/patients" className="text-indigo-600 mt-4 inline-block hover:underline">
          Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Patient Info Card */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold text-indigo-700">{patient.name}</h1>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                    <Mail size={16} className="mr-2"/> {patient.email}
                    <span className="mx-2">|</span>
                    <Phone size={16} className="mr-2"/> {patient.phone}
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                    <MapPin size={16} className="mr-2"/> {patient.address}
                </div>
            </div>
            <Link to="/patients" className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium self-start sm:self-center">
                <ArrowLeft size={18} className="mr-1" /> Back to Patients
            </Link>
        </div>
      </div>

      {/* Sección de Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Medication Adherence</h3>
                <p className={`text-2xl font-bold ${adherenceRate >= 75 ? 'text-green-600' : adherenceRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {adherenceRate}%
                </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Scheduled Intakes</h3>
                <p className="text-2xl font-bold text-blue-600">{patientMedicationIntakes.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Vital Signs Logged</h3>
                <p className="text-2xl font-bold text-purple-600">{patientVitalSigns.length}</p>
            </div>
        </div>

      {/* Sección Plan de Medicación y Cumplimiento */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center"><ListChecks size={24} className="mr-2 text-indigo-600"/>Medication Plan & Compliance</h2>
          <button
            onClick={() => { resetIntakeForm(); setShowAddIntakeModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            disabled={!patientId || userProfile?.role !== 'doctor'}
          >
            <PlusCircle size={18} /> Add Medication Intake
          </button>
        </div>
        {loadingIntakes ? (<div className="text-center py-4"><p className="text-gray-500">Loading medication intakes...</p></div>) :
         patientMedicationIntakes.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {patientMedicationIntakes.map(intake => (
              <div key={intake.id} className={`p-3 rounded-md border flex items-center justify-between ${intake.taken ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div>
                  <p className="font-semibold text-gray-800">{intake.medication?.name || 'Unknown Medication'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(intake.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {month:'short', day:'numeric', year:'numeric'})} at {intake.time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleIntakeTakenStatus(intake)}
                          title={intake.taken ? "Mark as Not Taken" : "Mark as Taken"}
                          className={`p-1.5 rounded-full transition-colors ${intake.taken ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}>
                    {intake.taken ? <CheckSquare size={16}/> : <XSquare size={16}/>}
                  </button>
                   <button onClick={() => handleDeleteIntake(intake.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors" title="Delete Intake">
                        <Trash2 size={16}/>
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-4">No medication intakes scheduled or recorded for this patient.</p>
        )}
      </div>

      {/* Modal para Agregar Toma de Medicamento */}
      {showAddIntakeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add Medication Intake</h2>
                <button onClick={() => setShowAddIntakeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button> {/* Ícono X importado */}
            </div>
            <form onSubmit={handleAddIntakeSubmit} className="space-y-4">
              <div>
                <label htmlFor="medicationId" className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
                <select name="medicationId" id="medicationId" value={intakeFormData.medicationId} onChange={handleIntakeFormChange} required
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3">
                  <option value="" disabled>Select a medication</option>
                  {medications.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" name="date" id="date" value={intakeFormData.date} onChange={handleIntakeFormChange} required
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"/>
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" name="time" id="time" value={intakeFormData.time} onChange={handleIntakeFormChange} required
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"/>
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="taken" id="taken" checked={intakeFormData.taken || false} onChange={handleIntakeFormChange}
                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                <label htmlFor="taken" className="ml-2 block text-sm text-gray-900">Mark as taken</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddIntakeModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" disabled={formSubmitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300" disabled={formSubmitting}>
                  {formSubmitting ? "Saving..." : "Add Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sección Historial de Signos Vitales */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center"><HeartPulse size={24} className="mr-2 text-purple-600"/>Vital Signs History</h2>
          <Link to="/vitals" state={{ preselectedPatientId: patientId }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                aria-disabled={!patientId || userProfile?.role !== 'doctor'}
                onClick={(e) => { if (!patientId || userProfile?.role !== 'doctor') e.preventDefault(); }} // Prevenir navegación si está deshabilitado
            >
            <PlusCircle size={18} /> Record New Vital Sign
          </Link>
        </div>
        {loadingVitals ? (<div className="text-center py-4"><p className="text-gray-500">Loading vital signs...</p></div>) :
         patientVitalSigns.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {patientVitalSigns.map(vs => (
              <div key={vs.id} className="p-3 rounded-md border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="font-semibold text-gray-700">{vs.type}:</span> {vs.value} {vs.unit}
                    </div>
                    <span className="text-xs text-gray-500">
                        {new Date(vs.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {month:'short', day:'numeric', year:'numeric'})}, {vs.time}
                    </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-4">No vital signs recorded for this patient.</p>
        )}
      </div>
    </div>
  );
};

export default PatientDetails;
