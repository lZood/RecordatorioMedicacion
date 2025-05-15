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
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app) al leer datos
const mapDbToVitalSign = (dbRecord: any): VitalSign => {
  return {
    id: dbRecord.id,
    patientId: dbRecord.patient_id, // Conversión clave
    type: dbRecord.type,
    value: dbRecord.value,
    unit: dbRecord.unit,
    date: dbRecord.date,
    time: dbRecord.time,
    // Si tuvieras createdAt/updatedAt en tu tipo VitalSign y los seleccionaras:
    // createdAt: dbRecord.created_at,
    // updatedAt: dbRecord.updated_at,
  };
};

export const vitalSignService = {
  async create(vitalSignDataFromApp: Omit<VitalSign, 'id'>): Promise<VitalSign | null> {
    const dataToInsert = mapVitalSignToDb(vitalSignDataFromApp);
    console.log("vitalSignService: Insertando (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('vital_signs')
      .insert(dataToInsert)
      .select()
      .single();
      
    if (error) {
      console.error("vitalSignService: Error creando vital sign:", error);
      throw error;
    }
    console.log("vitalSignService: Datos crudos de Supabase tras crear:", data);
    return data ? mapDbToVitalSign(data) : null; // Mapear a camelCase
  },

  async getAll(): Promise<VitalSign[]> {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });
      
    if (error) {
      console.error("vitalSignService: Error obteniendo todos los vital signs:", error);
      throw error;
    }
    console.log("vitalSignService: Datos crudos de Supabase en getAll:", data);
    return data ? data.map(mapDbToVitalSign) : []; // Mapear cada registro a camelCase
  },

  async getByPatient(patientId: string): Promise<VitalSign[]> {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
      
    if (error) {
      console.error(`vitalSignService: Error obteniendo vital signs para paciente ${patientId}:`, error);
      throw error;
    }
    return data ? data.map(mapDbToVitalSign) : []; // Mapear cada registro a camelCase
  },

  async update(id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>): Promise<VitalSign | null> {
    const dataToUpdate = mapVitalSignToDb(vitalSignUpdateData); // camelCase a snake_case para enviar
    console.log(`vitalSignService: Actualizando (ID: ${id}, snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('vital_signs')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`vitalSignService: Error actualizando vital sign ID ${id}:`, error);
      throw error;
    }
    console.log("vitalSignService: Datos crudos de Supabase tras actualizar:", data);
    return data ? mapDbToVitalSign(data) : null; // Mapear a camelCase
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
