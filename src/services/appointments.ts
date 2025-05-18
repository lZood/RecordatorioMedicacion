// src/services/appointments.ts
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentPatientInfo, AppointmentDoctorInfo } from '../types';

// Función para mapear de camelCase (app) a snake_case (DB)
const mapAppointmentToDb = (appointmentData: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor'>>) => {
  const dbData: { [key: string]: any } = {};
  if (appointmentData.patientId !== undefined) dbData.patient_id = appointmentData.patientId;
  if (appointmentData.doctorId !== undefined) dbData.doctor_id = appointmentData.doctorId;
  if (appointmentData.specialty !== undefined) dbData.specialty = appointmentData.specialty;
  if (appointmentData.date !== undefined) dbData.date = appointmentData.date;
  if (appointmentData.time !== undefined) dbData.time = appointmentData.time;
  if (appointmentData.diagnosis !== undefined) dbData.diagnosis = appointmentData.diagnosis;
  if (appointmentData.status !== undefined) dbData.status = appointmentData.status;
  if (appointmentData.notificacion_recordatorio_24h_enviada !== undefined) {
    dbData.notificacion_recordatorio_24h_enviada = appointmentData.notificacion_recordatorio_24h_enviada;
  }
  return dbData;
};

// Función para mapear de snake_case (DB) a camelCase (app)
const mapDbToAppointment = (dbRecord: any): Appointment | null => {
  if (!dbRecord) return null;
  
  let patientInfo: AppointmentPatientInfo | null = null;
  if (dbRecord.patients) {
    patientInfo = {
      id: dbRecord.patients.id,
      name: dbRecord.patients.name,
      email: dbRecord.patients.email,
    };
  }

  let doctorInfo: AppointmentDoctorInfo | null = null;
  // dbRecord.doctor contendrá el objeto del perfil del doctor si el select es correcto.
  if (dbRecord.doctor) { // El alias que usamos en el SELECT es 'doctor'
    doctorInfo = {
      id: dbRecord.doctor.id,
      name: dbRecord.doctor.name,
      specialty: dbRecord.doctor.specialty,
    };
  }

  const appointment: Appointment = {
    id: dbRecord.id,
    patientId: dbRecord.patient_id,
    doctorId: dbRecord.doctor_id,
    specialty: dbRecord.specialty,
    date: dbRecord.date,
    time: dbRecord.time,
    diagnosis: dbRecord.diagnosis,
    status: dbRecord.status,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    patient: patientInfo,
    doctor: doctorInfo,
    notificacion_recordatorio_24h_enviada: dbRecord.notificacion_recordatorio_24h_enviada,
  };
  return appointment;
};

export const appointmentService = {
  async create(appointmentDataFromApp: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>): Promise<Appointment | null> {
    const dataToInsert = mapAppointmentToDb({
        ...appointmentDataFromApp,
        notificacion_recordatorio_24h_enviada: false 
    });
    
    const { data, error } = await supabase
      .from('appointments')
      .insert(dataToInsert)
      .select(`
        *,
        patient:patients (id, name, email),
        doctor:profiles (id, name, specialty) 
      `) // MODIFICADO AQUÍ
      .single();
      
    if (error) {
      console.error("appointmentService: Error creando cita:", error);
      throw error;
    }
    return data ? mapDbToAppointment(data) : null;
  },

  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients (id, name, email),
        doctor:profiles (id, name, specialty)
      `) // MODIFICADO AQUÍ
      .order('date', { ascending: false })
      .order('time', { ascending: false });
      
    if (error) {
      console.error("appointmentService: Error obteniendo todas las citas:", error);
      throw error;
    }
    return data ? data.map(mapDbToAppointment).filter(a => a !== null) as Appointment[] : [];
  },

  async getById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients (id, name, email),
        doctor:profiles (id, name, specialty)
      `) // MODIFICADO AQUÍ
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; 
      console.error(`appointmentService: Error obteniendo cita ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToAppointment(data) : null;
  },

  async update(id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor'>>): Promise<Appointment | null> {
    const dataToUpdate = mapAppointmentToDb(appointmentUpdateData);
    
    const { data, error } = await supabase
      .from('appointments')
      .update(dataToUpdate)
      .eq('id', id)
      .select(`
        *,
        patient:patients (id, name, email),
        doctor:profiles (id, name, specialty)
      `) // MODIFICADO AQUÍ
      .single();
      
    if (error) {
      console.error(`appointmentService: Error actualizando cita ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToAppointment(data) : null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`appointmentService: Error eliminando cita ID ${id}:`, error);
      throw error;
    }
  }
};