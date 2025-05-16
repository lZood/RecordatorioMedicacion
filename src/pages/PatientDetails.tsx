// src/pages/PatientDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Patient, Medication, VitalSign, MedicationIntake } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes'; // Tipo enriquecido
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Calendar as CalendarIcon, Pill, Activity, FileText,
  PlusCircle, CheckSquare, XSquare, Trash2, Clock, ListChecks, HeartPulse
} from 'lucide-react';
import toast from 'react-hot-toast';

// Definición de tipo para el formulario de toma de medicamento
type MedicationIntakeFormData = Omit<MedicationIntake, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>;

const PatientDetails: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const {
    getPatientById,
    medications = [], // Lista de medicamentos del doctor para el selector
    addMedicationIntake,
    updateMedicationIntake,
    deleteMedicationIntake,
    fetchMedicationIntakesForPatient, // Para cargar las tomas del paciente actual
    fetchVitalSignsForPatient,       // Para cargar los signos vitales del paciente actual
    userProfile,
    currentUser
  } = useAppContext();

  const [patient, setPatient] = useState<Patient | null | undefined>(null);
  const [patientMedicationIntakes, setPatientMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  const [patientVitalSigns, setPatientVitalSigns] = useState<VitalSign[]>([]);
  const [loadingIntakes, setLoadingIntakes] = useState(false);
  const [loadingVitals, setLoadingVitals] = useState(false);

  const [showAddIntakeModal, setShowAddIntakeModal] = useState(false);
  const [intakeFormData, setIntakeFormData] = useState<Partial<MedicationIntakeFormData>>({
    medicationId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0,5),
    taken: false,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (patientId) {
      const currentPatient = getPatientById(patientId);
      setPatient(currentPatient);

      const loadPatientSpecificData = async () => {
        if (userProfile?.role === 'doctor') {
            setLoadingIntakes(true);
            setLoadingVitals(true);
            try {
                const intakes = await fetchMedicationIntakesForPatient(patientId);
                setPatientMedicationIntakes(intakes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
            } catch (error) { console.error("Error fetching intakes for patient:", error); }
            finally { setLoadingIntakes(false); }

            try {
                const vitals = await fetchVitalSignsForPatient(patientId);
                setPatientVitalSigns(vitals.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
            } catch (error) { console.error("Error fetching vitals for patient:", error); }
            finally { setLoadingVitals(false); }
        }
      };
      loadPatientSpecificData();
    }
  }, [patientId, getPatientById, fetchMedicationIntakesForPatient, fetchVitalSignsForPatient, userProfile?.role]);

  const handleIntakeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setIntakeFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setIntakeFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddIntakeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId || !intakeFormData.medicationId || !intakeFormData.date || !intakeFormData.time) {
      toast.error("Medication, Date, and Time are required for medication plan.");
      return;
    }
    setFormSubmitting(true);
    try {
      const newIntakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: patientId,
        medicationId: intakeFormData.medicationId,
        date: intakeFormData.date,
        time: intakeFormData.time,
        taken: intakeFormData.taken || false,
      };
      const addedIntake = await addMedicationIntake(newIntakeData);
      if (addedIntake) {
        setPatientMedicationIntakes(prev => [addedIntake, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
        setShowAddIntakeModal(false);
        setIntakeFormData({ medicationId: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5), taken: false });
      }
    } catch (error) {
      console.error("Error adding medication intake:", error);
      // Toast de error ya se maneja en AppContext
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleIntakeTakenStatus = async (intake: MedicationIntakeWithMedication) => {
    try {
      const updatedIntake = await updateMedicationIntake(intake.id, { taken: !intake.taken });
      if (updatedIntake) {
        setPatientMedicationIntakes(prev =>
          prev.map(i => (i.id === intake.id ? updatedIntake : i))
        );
        toast.success(`Medication intake marked as ${updatedIntake.taken ? 'taken' : 'not taken'}.`);
      }
    } catch (error) {
      console.error("Error updating intake status:", error);
    }
  };
  
  const handleDeleteIntake = async (intakeId: string) => {
    if (window.confirm("Are you sure you want to delete this medication intake record?")) {
        try {
            await deleteMedicationIntake(intakeId);
            setPatientMedicationIntakes(prev => prev.filter(i => i.id !== intakeId));
        } catch (error) {
            console.error("Error deleting medication intake:", error);
        }
    }
  };


  const adherenceRate = useMemo(() => {
    if (!patientMedicationIntakes || patientMedicationIntakes.length === 0) return 0;
    const takenCount = patientMedicationIntakes.filter(intake => intake.taken).length;
    return (takenCount / patientMedicationIntakes.length) * 100;
  }, [patientMedicationIntakes]);


  if (!patient && patient !== undefined) { // Muestra loader si patient es null (cargando)
    return <div className="flex justify-center items-center h-screen">Loading patient details...</div>;
  }
  if (patient === undefined) { // Muestra no encontrado si patient es undefined
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Patient not found.</p>
        <Link to="/patients" className="text-indigo-600 mt-4 inline-block hover:underline">
          Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Patient Info Card (similar al que tenías, puedes adaptarlo) */}
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
            <Link to="/patients" className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                <ArrowLeft size={18} className="mr-1" /> Back to Patients
            </Link>
        </div>
      </div>

      {/* Sección de Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Medication Adherence</h3>
                <p className={`text-2xl font-bold ${adherenceRate >= 75 ? 'text-green-600' : adherenceRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {adherenceRate.toFixed(0)}%
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
            onClick={() => setShowAddIntakeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            <PlusCircle size={18} /> Add Medication Intake
          </button>
        </div>
        {loadingIntakes ? (<p className="text-gray-500">Loading medication intakes...</p>) :
         patientMedicationIntakes.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {patientMedicationIntakes.map(intake => (
              <div key={intake.id} className={`p-3 rounded-md border flex items-center justify-between ${intake.taken ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div>
                  <p className="font-semibold text-gray-800">{intake.medication?.name || 'Unknown Medication'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(intake.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {month:'short', day:'numeric', year:'numeric'})} at {intake.time}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleIntakeTakenStatus(intake)}
                          title={intake.taken ? "Mark as Not Taken" : "Mark as Taken"}
                          className={`p-2 rounded-full transition-colors ${intake.taken ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}>
                    {intake.taken ? <CheckSquare size={18}/> : <XSquare size={18}/>}
                  </button>
                   <button onClick={() => handleDeleteIntake(intake.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors" title="Delete Intake">
                        <Trash2 size={18}/>
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
                <button onClick={() => setShowAddIntakeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
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
          {/* Botón para agregar signo vital podría redirigir a la página VitalSigns o abrir un modal aquí */}
          <Link to="/vitals" state={{ preselectedPatientId: patientId }} // Pasar patientId a la página de VitalSigns
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
            <PlusCircle size={18} /> Record New Vital Sign
          </Link>
        </div>
        {loadingVitals ? (<p className="text-gray-500">Loading vital signs...</p>) :
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
                {/* Podrías añadir botones de editar/eliminar aquí si no quieres que se haga solo en la página VitalSigns */}
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
