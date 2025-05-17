// src/services/notificationService.ts
import { supabase } from '../lib/supabase';
import { Notification } from '../types';

// Helper para mapear de camelCase (app) a snake_case (DB) para creación/actualización
const mapNotificationToDb = (notificationData: Partial<Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (notificationData.patientId !== undefined) dbData.patient_id = notificationData.patientId;
  if (notificationData.appointmentId !== undefined) dbData.appointment_id = notificationData.appointmentId;
  if (notificationData.message !== undefined) dbData.message = notificationData.message;
  if (notificationData.type !== undefined) dbData.type = notificationData.type;
  if (notificationData.status !== undefined) dbData.status = notificationData.status;
  if (notificationData.sendAt !== undefined) dbData.send_at = notificationData.sendAt;
  // createdAt y updatedAt son manejados por la DB
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app) al leer datos
const mapDbToNotification = (dbRecord: any): Notification | null => {
  if (!dbRecord) return null;
  const notification: Notification = {
    id: dbRecord.id,
    patientId: dbRecord.patient_id,
    appointmentId: dbRecord.appointment_id,
    message: dbRecord.message,
    type: dbRecord.type,
    status: dbRecord.status,
    sendAt: dbRecord.send_at,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    // Ejemplo de cómo podrías mapear datos anidados si los solicitas
    // patient: dbRecord.patients ? { id: dbRecord.patients.id, name: dbRecord.patients.name, email: dbRecord.patients.email } : null,
    // appointment: dbRecord.appointments ? { id: dbRecord.appointments.id, date: dbRecord.appointments.date, time: dbRecord.appointments.time, specialty: dbRecord.appointments.specialty } : null,
  };
  return notification;
};

export const notificationService = {
  async create(notificationDataFromApp: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | null> {
    const dataToInsert = mapNotificationToDb(notificationDataFromApp);
    console.log("notificationService: Insertando notificación (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('notifications')
      .insert(dataToInsert)
      // Podrías añadir .select con joins si quieres devolver datos anidados inmediatamente
      // Ejemplo: .select('*, patient:patients(id, name, email), appointment:appointments(id, date, time, specialty)')
      .select() 
      .single();
      
    if (error) {
      console.error("notificationService: Error creando notificación:", error);
      throw error;
    }
    console.log("notificationService: Notificación creada, datos crudos de Supabase:", data);
    return data ? mapDbToNotification(data) : null;
  },

  async getAll(): Promise<Notification[]> {
    // Podrías querer filtrar por doctor o paciente aquí dependiendo de las RLS y necesidades
    const { data, error } = await supabase
      .from('notifications')
      .select('*') // O con joins: '*, patient:patients(id, name), appointment:appointments(id, date, time)'
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("notificationService: Error obteniendo todas las notificaciones:", error);
      throw error;
    }
    return data ? data.map(mapDbToNotification).filter(n => n !== null) as Notification[] : [];
  },

  async getByPatient(patientId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*') // O con joins
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error(`notificationService: Error obteniendo notificaciones para paciente ${patientId}:`, error);
      throw error;
    }
    return data ? data.map(mapDbToNotification).filter(n => n !== null) as Notification[] : [];
  },

  async update(id: string, notificationUpdateData: Partial<Omit<Notification, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>>): Promise<Notification | null> {
    const dataToUpdate = mapNotificationToDb(notificationUpdateData);
    console.log(`notificationService: Actualizando notificación (ID: ${id}, snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('notifications')
      .update(dataToUpdate)
      .eq('id', id)
      .select() // O con joins
      .single();
      
    if (error) {
      console.error(`notificationService: Error actualizando notificación ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToNotification(data) : null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`notificationService: Error eliminando notificación ID ${id}:`, error);
      throw error;
    }
  }
};
