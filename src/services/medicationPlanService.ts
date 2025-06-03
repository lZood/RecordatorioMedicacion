// src/services/medicationPlanService.ts
import { supabase } from '../lib/supabase';
import { MedicationPlan, MedicationPlanCreationData } from '../types';

// Helper para mapear de camelCase (app) a snake_case (DB) para creación
const mapPlanToDb = (planData: MedicationPlanCreationData & { doctor_id: string; patient_id: string; start_date: string; is_active: boolean }) => {
  return {
    patient_id: planData.patient_id,
    doctor_id: planData.doctor_id,
    medication_id: planData.medication_id,
    start_date: planData.start_date, // Asegúrate que esté en YYYY-MM-DD
    duration_days: planData.duration_days,
    frequency_hours: planData.frequency_hours,
    first_intake_time: planData.first_intake_time, // Asegúrate que esté en HH:MM o HH:MM:SS
    instructions: planData.instructions,
    is_active: planData.is_active,
  };
};

// Helper para mapear de snake_case (DB) a camelCase (app) al leer datos
const mapDbToPlan = (dbRecord: any): MedicationPlan | null => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    patient_id: dbRecord.patient_id,
    doctor_id: dbRecord.doctor_id,
    medication_id: dbRecord.medication_id,
    start_date: dbRecord.start_date,
    duration_days: dbRecord.duration_days,
    frequency_hours: dbRecord.frequency_hours,
    first_intake_time: dbRecord.first_intake_time,
    instructions: dbRecord.instructions,
    is_active: dbRecord.is_active,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
    // Los campos anidados patient y medication se cargarían con un select con join si es necesario
    patient: dbRecord.patients ? { id: dbRecord.patients.id, name: dbRecord.patients.name } : undefined,
    medication: dbRecord.medications ? { id: dbRecord.medications.id, name: dbRecord.medications.name } : undefined,
  };
};

export const medicationPlanService = {
  async create(
    planData: MedicationPlanCreationData,
    patientId: string, // ID del paciente de la tabla 'patients'
    doctorId: string   // ID del doctor (auth.uid)
  ): Promise<MedicationPlan | null> {
    
    const dataToInsert = mapPlanToDb({
      ...planData,
      patient_id: patientId,
      doctor_id: doctorId,
      start_date: planData.start_date || new Date().toISOString().split('T')[0], // Default a hoy si no se provee
      is_active: true, // Por defecto, un nuevo plan está activo
    });

    console.log("medicationPlanService: Insertando plan (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('medication_plans')
      .insert(dataToInsert)
      .select(
        `*, 
        patients(id, name), 
        medications(id, name)`
      ) // Devolver el plan creado con datos anidados
      .single();

    if (error) {
      console.error("medicationPlanService: Error creando plan de medicación:", error);
      toast.error(`Error al crear plan: ${error.message}`);
      throw error;
    }
    console.log("medicationPlanService: Plan creado, datos crudos de Supabase:", data);
    return data ? mapDbToPlan(data) : null;
  },

  async getPlansForPatientByDoctor(patientId: string, doctorId: string): Promise<MedicationPlan[]> {
    const { data, error } = await supabase
      .from('medication_plans')
      .select(
        `*, 
        patients(id, name), 
        medications(id, name)`
      )
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId) // Asegurar que el doctor solo vea los planes que él creó para ese paciente
      .order('created_at', { ascending: false });

    if (error) {
      console.error("medicationPlanService: Error obteniendo planes para paciente:", error);
      toast.error(`Error al obtener planes: ${error.message}`);
      throw error;
    }
    return data ? data.map(mapDbToPlan).filter(p => p !== null) as MedicationPlan[] : [];
  },
  
  async updatePlanStatus(planId: string, isActive: boolean): Promise<MedicationPlan | null> {
    const { data, error } = await supabase
      .from('medication_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select('*, patients(id, name), medications(id, name)')
      .single();

    if (error) {
      console.error(`medicationPlanService: Error actualizando estado del plan ${planId}:`, error);
      toast.error(`Error al actualizar plan: ${error.message}`);
      throw error;
    }
    return data ? mapDbToPlan(data) : null;
  }

  // Podrías añadir funciones para getPlanById, deletePlan (si es necesario), etc.
};
