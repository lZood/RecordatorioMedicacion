// src/pages/PatientDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Patient, Medication, VitalSign, MedicationIntake, MedicationPlan, MedicationPlanCreationData } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Pill,
  Activity,
  PlusCircle,
  ListChecks,
  HeartPulse,
  X,
  ListPlus, // Para sección de Planes
  Power,    // Para activar plan
  PowerOff, // Para desactivar plan
  // Edit3, // Para un futuro editar plan (no implementado en este paso)
  // Trash2 // Para un futuro eliminar plan (no implementado en este paso)
} from 'lucide-react';
import toast from 'react-hot-toast';

const PatientDetails: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();

  const {
    getPatientById,
    medications = [],
    fetchMedicationIntakesForPatient,
    // Funciones y estados para MedicationPlan
    addMedicationPlan,
    fetchMedicationPlansForPatient,
    medicationPlans = [], 
    loadingMedicationPlans,
    updateMedicationPlanStatus,
    // Estados y funciones existentes
    userProfile,
    currentUser,
  } = useAppContext();

  const [patient, setPatient] = useState<Patient | null | undefined>(null);
  const [patientMedicationIntakes, setPatientMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  
  const [loadingIntakes, setLoadingIntakes] = useState(true);

  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planMedicationId, setPlanMedicationId] = useState<string>('');
  const [planDurationDays, setPlanDurationDays] = useState<string>('7');
  const [planFrequencyHours, setPlanFrequencyHours] = useState<string>('8'); 
  const [planFirstIntakeTime, setPlanFirstIntakeTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [planInstructions, setPlanInstructions] = useState<string>('');
  const [planStartDate, setPlanStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSubmittingPlan, setFormSubmittingPlan] = useState(false);

  const currentPatientMedicationPlans = useMemo(() => {
    if (!patientId || !medicationPlans) { 
      return [];
    }
    return medicationPlans.filter(plan => plan.patient_id === patientId)
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [medicationPlans, patientId]);


  useEffect(() => {
    if (patientId) {
      const currentPatientData = getPatientById(patientId);
      setPatient(currentPatientData);

      if (userProfile?.role === 'doctor' && currentPatientData) {
        setLoadingIntakes(true);

        fetchMedicationPlansForPatient(patientId).catch(err => {
          console.error("Error fetching medication plans on mount:", err);
          toast.error("No se pudieron cargar los planes de medicación.");
        });

        fetchMedicationIntakesForPatient(patientId)
          .then(intakes => setPatientMedicationIntakes(intakes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time))))
          .catch(error => {
            console.error("PatientDetails: Error fetching intakes:", error);
            toast.error("No se pudieron cargar las tomas de medicación.");
          })
          .finally(() => setLoadingIntakes(false));

      } else {
        setPatientMedicationIntakes([]);
        setLoadingIntakes(false);
      }
    } else {
      setPatient(undefined);
      setLoadingIntakes(false);
    }
  }, [patientId, getPatientById, userProfile, fetchMedicationIntakesForPatient, fetchMedicationPlansForPatient]);


  const resetPlanForm = () => {
    setPlanMedicationId('');
    setPlanDurationDays('7');
    setPlanFrequencyHours('8');
    const now = new Date();
    setPlanFirstIntakeTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    setPlanInstructions('');
    setPlanStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleCreatePlanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor' || !patient) {
      toast.error("Acción no autorizada o paciente no cargado.");
      return;
    }
    if (!planMedicationId || !planDurationDays || !planFrequencyHours || !planFirstIntakeTime || !planStartDate) {
      toast.error("Medicamento, fecha de inicio, duración, frecuencia y hora de inicio son requeridos para el plan.");
      return;
    }
    const duration = parseInt(planDurationDays, 10);
    const frequency = parseInt(planFrequencyHours, 10);

    if (isNaN(duration) || duration <= 0) {
      toast.error("La duración debe ser un número positivo."); return;
    }
    if (isNaN(frequency) || frequency <= 0 || (frequency < 24 && 24 % frequency !== 0) || frequency > 168 ) {
        if (frequency <=0) {
            toast.error("La frecuencia debe ser un número positivo."); return;
        }
        if (frequency < 24 && 24 % frequency !== 0) {
             toast.error("La frecuencia (si es menor a 24h) debe ser un divisor de 24 (ej. 4, 6, 8, 12)."); return;
        }
        if (frequency > 168) { 
            toast.error("La frecuencia es demasiado alta (máx. 1 toma por hora durante 7 días)."); return;
        }
    }
     if (!/^\d{2}:\d{2}(:\d{2})?$/.test(planFirstIntakeTime)) {
      toast.error("La hora de inicio debe estar en formato HH:MM."); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planStartDate)) {
      toast.error("La fecha de inicio debe estar en formato yyyy-MM-dd."); return;
    }


    setFormSubmittingPlan(true);
    const planData: MedicationPlanCreationData = {
      patient_id: patient.id,
      medication_id: planMedicationId,
      start_date: planStartDate,
      duration_days: duration,
      frequency_hours: frequency,
      first_intake_time: planFirstIntakeTime.length === 5 ? `${planFirstIntakeTime}:00` : planFirstIntakeTime, 
      instructions: planInstructions.trim() || undefined,
    };

    try {
      const newPlan = await addMedicationPlan(planData, patient.id);
      if (newPlan) {
        setShowCreatePlanModal(false);
        resetPlanForm();
        if (patientId) {
          toast("Actualizando lista de planes y tomas..."); // <--- CORRECCIÓN AQUÍ
          await fetchMedicationPlansForPatient(patientId);
          await fetchMedicationIntakesForPatient(patientId)
            .then(intakes => setPatientMedicationIntakes(intakes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time))))
            .finally(() => setLoadingIntakes(false)); 
        }
      }
    } catch (error) {
      console.error("PatientDetails: Error creando plan de medicación:", error);
      // El toast de error ya se maneja en AppContext o en el servicio si se relanza
    } finally {
      setFormSubmittingPlan(false);
    }
  };
  
  const handleTogglePlanStatus = async (plan: MedicationPlan) => {
    if (!currentUser || userProfile?.role !== 'doctor' || !patientId) return;
    const newStatus = !plan.is_active;
    if (window.confirm(`¿Está seguro de que desea ${newStatus ? 'ACTIVAR' : 'DESACTIVAR'} este plan de medicación? ${!newStatus ? 'Las tomas ya generadas no se eliminarán.' : '' }`)) {
      try {
        await updateMedicationPlanStatus(plan.id, newStatus);
        await fetchMedicationPlansForPatient(patientId); 
      } catch (error) {
        toast.error("Error al actualizar el estado del plan.");
      }
    }
  };
  

  if (patient === null && patientId) { return <div className="flex justify-center items-center h-screen">Cargando detalles del paciente...</div>; }
  if (patient === undefined) { return <div className="text-center py-10">Paciente no encontrado o no tienes acceso. <Link to="/patients" className="text-indigo-600 hover:underline">Volver a Pacientes</Link></div>; }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Tarjeta de Información del Paciente */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold text-indigo-700">{patient.name}</h1>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                    <Mail size={16} className="mr-2"/> {patient.email}
                    <span className="mx-2">|</span>
                    <Phone size={16} className="mr-2"/> {patient.phone || 'N/A'}
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                    <MapPin size={16} className="mr-2"/> {patient.address || 'N/A'}
                </div>
            </div>
            <Link to="/patients" className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium self-start sm:self-center whitespace-nowrap">
                <ArrowLeft size={18} className="mr-1" /> Volver a Pacientes
            </Link>
        </div>
      </div>

      {/* SECCIÓN: Planes de Medicación */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center">
            <ListPlus size={24} className="mr-3 text-green-600"/>Planes de Medicación
          </h2>
          <button
            onClick={() => { resetPlanForm(); setShowCreatePlanModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            disabled={!patientId || userProfile?.role !== 'doctor'}
          >
            <PlusCircle size={18} /> Crear Nuevo Plan
          </button>
        </div>
        {loadingMedicationPlans ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div><p className="mt-2 text-sm text-gray-500">Cargando planes...</p></div>
        ) : currentPatientMedicationPlans.length > 0 ? (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {currentPatientMedicationPlans.map(plan => (
              <div key={plan.id} className={`p-4 rounded-lg border-l-4 ${plan.is_active ? 'bg-green-50 border-green-500' : 'bg-gray-100 border-gray-400 opacity-80'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1">
                        <p className="font-semibold text-lg text-gray-800">{plan.medication?.name || `ID Med: ${plan.medication_id}`}</p>
                        <p className="text-sm text-gray-600">
                            Cada {plan.frequency_hours} horas por {plan.duration_days} días.
                        </p>
                        <p className="text-sm text-gray-600">
                            Inicia: {new Date(plan.start_date + 'T00:00:00Z').toLocaleDateString(navigator.language || 'es-ES', {month:'long', day:'numeric', year:'numeric'})}
                            {' '}a las {plan.first_intake_time.slice(0,5)}
                        </p>
                        {plan.instructions && <p className="text-xs text-gray-500 mt-1 italic">"{plan.instructions}"</p>}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2 sm:ml-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${plan.is_active ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {plan.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                            onClick={() => handleTogglePlanStatus(plan)}
                            title={plan.is_active ? "Desactivar Plan" : "Activar Plan"}
                            className={`p-2 rounded-full transition-colors text-white ${plan.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                            {plan.is_active ? <PowerOff size={18}/> : <Power size={18}/>}
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-6 text-center">No hay planes de medicación creados para este paciente.</p>
        )}
      </div>

      {/* Sección Tomas de Medicación Programadas (Existente) */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center"><ListChecks size={24} className="mr-3 text-indigo-600"/>Tomas de Medicación Programadas</h2>
        </div>
        {loadingIntakes ? (<div className="text-center py-4"><p className="text-gray-500">Cargando tomas...</p></div>) :
         patientMedicationIntakes.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {patientMedicationIntakes.map(intake => (
              <div key={intake.id} className={`p-3 rounded-md border flex items-center justify-between ${intake.taken ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
                <div>
                  <p className="font-semibold text-gray-800">{intake.medication?.name || 'Medicamento Desconocido'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(intake.date + 'T00:00:00Z').toLocaleDateString(navigator.language || 'es-ES', {month:'short', day:'numeric', year:'numeric'})} a las {intake.time.slice(0,5)}
                    {intake.medication_plan_id && <span className="ml-2 text-indigo-500 text-xs">(Planificado)</span>}
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${intake.taken ? 'bg-green-200 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {intake.taken ? 'Tomado' : 'Pendiente'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-4">No hay tomas de medicación programadas para este paciente.</p>
        )}
      </div>

      {/* MODAL PARA CREAR PLAN DE MEDICACIÓN */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Crear Plan de Medicación para {patient?.name}</h2>
                <button onClick={() => {setShowCreatePlanModal(false); resetPlanForm();}} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <X size={24}/>
                </button>
            </div>
            <form onSubmit={handleCreatePlanSubmit} className="space-y-5">
              <div>
                <label htmlFor="planMedicationId" className="block text-sm font-medium text-gray-700 mb-1.5">Medicamento</label>
                <select name="planMedicationId" id="planMedicationId" value={planMedicationId}
                        onChange={(e) => setPlanMedicationId(e.target.value)} required
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2.5 px-3">
                  <option value="" disabled>Seleccione un medicamento</option>
                  {medications.map(med => <option key={med.id} value={med.id}>{med.name} ({med.activeIngredient})</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Inicio del Plan</label>
                <input type="date" name="planStartDate" id="planStartDate" value={planStartDate}
                       onChange={(e) => setPlanStartDate(e.target.value)} required
                       className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2.5 px-3"/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                <div>
                    <label htmlFor="planDurationDays" className="block text-sm font-medium text-gray-700 mb-1.5">Duración (días)</label>
                    <input type="number" name="planDurationDays" id="planDurationDays" value={planDurationDays}
                           onChange={(e) => setPlanDurationDays(e.target.value)} required min="1"
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2.5 px-3"/>
                </div>
                <div>
                    <label htmlFor="planFrequencyHours" className="block text-sm font-medium text-gray-700 mb-1.5">Frecuencia (cada X horas)</label>
                    <select name="planFrequencyHours" id="planFrequencyHours" value={planFrequencyHours}
                            onChange={(e) => setPlanFrequencyHours(e.target.value)} required
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2.5 px-3">
                        {[1, 2, 3, 4, 6, 8, 12, 24, 48].map(h => <option key={h} value={h.toString()}>{h} hora{h > 1 ? 's' : ''}</option>)}
                    </select>
                </div>
              </div>
              <div>
                <label htmlFor="planFirstIntakeTime" className="block text-sm font-medium text-gray-700 mb-1.5">Hora de la Primera Toma del Día Inicial</label>
                <input type="time" name="planFirstIntakeTime" id="planFirstIntakeTime" value={planFirstIntakeTime}
                       onChange={(e) => setPlanFirstIntakeTime(e.target.value)} required
                       className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2.5 px-3"/>
              </div>
              <div>
                <label htmlFor="planInstructions" className="block text-sm font-medium text-gray-700 mb-1.5">Instrucciones (Opcional)</label>
                <textarea name="planInstructions" id="planInstructions" value={planInstructions}
                          onChange={(e) => setPlanInstructions(e.target.value)} rows={3}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"/>
              </div>

              <div className="flex justify-end gap-3 pt-5">
                <button type="button" onClick={() => {setShowCreatePlanModal(false); resetPlanForm();}} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" disabled={formSubmittingPlan}>Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 transition-colors" disabled={formSubmittingPlan}>
                  {formSubmittingPlan ? "Guardando Plan..." : "Crear Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
