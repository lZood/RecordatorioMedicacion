// src/services/medications.ts
import { supabase } from '../lib/supabase';
import { Medication } from '../types';

// Función para mapear de camelCase (app) a snake_case (DB)
const mapMedicationToDb = (medicationData: Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (medicationData.name !== undefined) dbData.name = medicationData.name;
  if (medicationData.activeIngredient !== undefined) dbData.active_ingredient = medicationData.activeIngredient;
  if (medicationData.expirationDate !== undefined) dbData.expiration_date = medicationData.expirationDate;
  if (medicationData.description !== undefined) dbData.description = medicationData.description;
  if (medicationData.doctorId !== undefined) dbData.doctor_id = medicationData.doctorId;
  // Nuevo flag
  if (medicationData.notificacion_stock_expirando_enviada !== undefined) {
    dbData.notificacion_stock_expirando_enviada = medicationData.notificacion_stock_expirando_enviada;
  }
  return dbData;
};

// Función para mapear de snake_case (DB) a camelCase (app)
const mapDbToMedication = (dbRecord: any): Medication | null => {
  if (!dbRecord) return null;
  const medication: Medication = {
    id: dbRecord.id,
    name: dbRecord.name,
    activeIngredient: dbRecord.active_ingredient,
    expirationDate: dbRecord.expiration_date,
    description: dbRecord.description,
    doctorId: dbRecord.doctor_id,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    notificacion_stock_expirando_enviada: dbRecord.notificacion_stock_expirando_enviada, // Nuevo flag
  };
  return medication;
};

export const medicationService = {
  async create(medicationDataFromApp: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>): Promise<Medication | null> {
     // Asegurar que el flag se inicialice si es necesario, aunque la BD tiene DEFAULT FALSE
    const dataToInsert = mapMedicationToDb({
        ...medicationDataFromApp,
        notificacion_stock_expirando_enviada: false
    });

    const { data, error } = await supabase
      .from('medications')
      .insert(dataToInsert)
      .select()
      .single();
      
    if (error) {
      console.error("medicationService: Error creando medicamento:", error);
      throw error;
    }
    return data ? mapDbToMedication(data) : null;
  },

  async getAll(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error("medicationService: Error obteniendo todos los medicamentos:", error);
      throw error;
    }
    return data ? data.map(mapDbToMedication).filter(m => m !== null) as Medication[] : [];
  },

  async getById(id: string): Promise<Medication | null> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error(`medicationService: Error obteniendo medicamento ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToMedication(data) : null;
  },

  async update(id: string, medicationUpdateData: Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Medication | null> {
    const dataToUpdate = mapMedicationToDb(medicationUpdateData);
    
    const { data, error } = await supabase
      .from('medications')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`medicationService: Error actualizando medicamento ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToMedication(data) : null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`medicationService: Error eliminando medicamento ID ${id}:`, error);
      throw error;
    }
  }
};
