// src/services/appointments.ts
import { supabase } from '../lib/supabase';
import { Appointment } from '../types'; // Tu tipo Appointment usa camelCase

// Helper para mapear de camelCase (app) a snake_case (DB)
const mapAppointmentToDb = (appointmentData: Partial<Omit<Appointment, 'id'>>) => {
  const dbData: { [key: string]: any } = {};
  if (appointmentData.patientId !== undefined) dbData.patient_id = appointmentData.patientId;
  if (appointmentData.doctorId !== undefined) dbData.doctor_id = appointmentData.doctorId;
  if (appointmentData.specialty !== undefined) dbData.specialty = appointmentData.specialty;
  if (appointmentData.date !== undefined) dbData.date = appointmentData.date;
  if (appointmentData.time !== undefined) dbData.time = appointmentData.time;
  if (appointmentData.diagnosis !== undefined) dbData.diagnosis = appointmentData.diagnosis ?? null;
  if (appointmentData.status !== undefined) dbData.status = appointmentData.status;
  // created_at y updated_at son manejados por la DB
  return dbData;
};


export const appointmentService = {
  async create(appointmentDataFromApp: Omit<Appointment, 'id'>): Promise<Appointment | null> {
    const dataToInsert = mapAppointmentToDb(appointmentDataFromApp);
    console.log("appointmentService: Insertando (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('appointments')
      .insert(dataToInsert)
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `) // Solicitar datos anidados también en la creación
      .single();

    if (error) {
      console.error("appointmentService: Error de Supabase al crear cita:", error);
      throw error;
    }
    console.log("appointmentService: Creación exitosa, datos devueltos (deberían ser camelCase):", data);
    // El cliente Supabase debería convertir las claves a camelCase, incluyendo las anidadas.
    // Realiza un cast explícito si es necesario para que coincida con tu tipo Appointment enriquecido.
    return data as any | null; // Usar 'any' temporalmente si el tipo Appointment no incluye patient/doctor anidados
  },

  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `) // El cliente Supabase convierte a camelCase, incluyendo los objetos anidados
      .order('date', { ascending: true })
      .order('time', { ascending: true });


    if (error) {
      console.error("appointmentService: Error de Supabase al obtener todas las citas:", error);
      throw error;
    }
    console.log("appointmentService: Datos de getAll (deberían ser camelCase):", data);
    return (data as any[]) || []; // Usar 'any[]' temporalmente
  },

  async getById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`appointmentService: Error de Supabase al obtener cita por ID ${id}:`, error);
      throw error;
    }
    return data as any | null; // Usar 'any | null' temporalmente
  },

  async getByPatient(patientId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error(`appointmentService: Error de Supabase al obtener citas para paciente ${patientId}:`, error);
      throw error;
    }
    return (data as any[]) || [];
  },


  async update(id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>): Promise<Appointment | null> {
    const dataToUpdate = mapAppointmentToDb(appointmentUpdateData);
    console.log(`appointmentService: Actualizando (ID: ${id}, snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('appointments')
      .update(dataToUpdate)
      .eq('id', id)
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `) // Solicitar datos anidados también en la actualización
      .single();

    if (error) {
      console.error(`appointmentService: Error de Supabase al actualizar cita ID ${id}:`, error);
      throw error;
    }
    console.log("appointmentService: Actualización exitosa, datos devueltos (camelCase):", data);
    return data as any | null; // Usar 'any | null' temporalmente
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`appointmentService: Error de Supabase al eliminar cita ID ${id}:`, error);
      throw error;
    }
  }
};
