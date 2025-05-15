// src/services/vitalSigns.ts
import { supabase } from '../lib/supabase';
import { VitalSign } from '../types';

// Helper para mapear de camelCase (app) a snake_case (DB) para la creación/actualización
const mapVitalSignToDb = (vitalSignData: Partial<Omit<VitalSign, 'id'>>) => {
  const dbData: { [key: string]: any } = {};
  if (vitalSignData.patientId !== undefined) dbData.patient_id = vitalSignData.patientId;
  if (vitalSignData.type !== undefined) dbData.type = vitalSignData.type;
  if (vitalSignData.value !== undefined) dbData.value = vitalSignData.value;
  if (vitalSignData.unit !== undefined) dbData.unit = vitalSignData.unit;
  if (vitalSignData.date !== undefined) dbData.date = vitalSignData.date;
  if (vitalSignData.time !== undefined) dbData.time = vitalSignData.time;
  // created_at y updated_at son manejados por la DB
  return dbData;
};

export const vitalSignService = {
  async create(vitalSignDataFromApp: Omit<VitalSign, 'id'>): Promise<VitalSign | null> {
    // El tipo VitalSign no incluye createdAt, así que Omit<VitalSign, 'id'> está bien.
    // El servicio de Supabase espera un objeto con claves que coincidan con las columnas de la DB.
    // Si pasamos patientId (camelCase), el cliente Supabase debería convertirlo a patient_id (snake_case).
    // Sin embargo, para ser explícitos y consistentes con otros servicios, mapearemos.
    const dataToInsert = mapVitalSignToDb(vitalSignDataFromApp);
    console.log("vitalSignService: Insertando (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('vital_signs')
      .insert(dataToInsert)
      .select() // Debería devolver las columnas convertidas a camelCase
      .single();
      
    if (error) {
      console.error("vitalSignService: Error creando vital sign:", error);
      throw error;
    }
    console.log("vitalSignService: Creación exitosa, datos devueltos (deberían ser camelCase):", data);
    return data as VitalSign | null;
  },

  async getAll(): Promise<VitalSign[]> {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*') // El cliente Supabase convierte a camelCase
      .order('date', { ascending: false })
      .order('time', { ascending: false });
      
    if (error) {
      console.error("vitalSignService: Error obteniendo todos los vital signs:", error);
      throw error;
    }
    return (data as VitalSign[]) || [];
  },

  async getByPatient(patientId: string): Promise<VitalSign[]> {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*') // El cliente Supabase convierte a camelCase
      .eq('patient_id', patientId) // Usar snake_case para la columna de la DB en la consulta
      .order('date', { ascending: false })
      .order('time', { ascending: false });
      
    if (error) {
      console.error(`vitalSignService: Error obteniendo vital signs para paciente ${patientId}:`, error);
      throw error;
    }
    return (data as VitalSign[]) || [];
  },

  async update(id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>): Promise<VitalSign | null> {
    const dataToUpdate = mapVitalSignToDb(vitalSignUpdateData);
    console.log(`vitalSignService: Actualizando (ID: ${id}, snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('vital_signs')
      .update(dataToUpdate)
      .eq('id', id)
      .select() // Debería devolver las columnas convertidas a camelCase
      .single();
      
    if (error) {
      console.error(`vitalSignService: Error actualizando vital sign ID ${id}:`, error);
      throw error;
    }
    console.log("vitalSignService: Actualización exitosa, datos devueltos (camelCase):", data);
    return data as VitalSign | null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('vital_signs')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`vitalSignService: Error eliminando vital sign ID ${id}:`, error);
      throw error;
    }
  }
};
