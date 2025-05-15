// src/services/medications.ts
import { supabase } from '../lib/supabase';
import { Medication } from '../types';

// Helper para mapear de camelCase (app) a snake_case (DB)
const mapMedicationToDb = (medicationData: Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (medicationData.name !== undefined) dbData.name = medicationData.name;
  if (medicationData.activeIngredient !== undefined) dbData.active_ingredient = medicationData.activeIngredient;
  if (medicationData.expirationDate !== undefined) dbData.expiration_date = medicationData.expirationDate;
  if (medicationData.description !== undefined) dbData.description = medicationData.description ?? null;
  if (medicationData.doctorId !== undefined) dbData.doctor_id = medicationData.doctorId;
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app)
const mapDbToMedication = (dbRecord: any): Medication | null => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    activeIngredient: dbRecord.active_ingredient,
    expirationDate: dbRecord.expiration_date,
    description: dbRecord.description,
    doctorId: dbRecord.doctor_id, // doctorId is now expected to be non-null from DB for a valid medication
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
};

export const medicationService = {
  // The type Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> now implies doctorId is required
  // because Medication has doctorId: string (non-optional)
  async create(medicationDataFromApp: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication | null> {
    // The explicit check for doctorId can be removed if TypeScript enforces it,
    // but it's a good safeguard if types are ever loosened.
    // For now, with doctorId: string in Medication type, this check is redundant if TS is respected.
    // if (!medicationDataFromApp.doctorId) {
    //   console.error("medicationService.create: doctorId is missing.");
    //   throw new Error("doctorId is required to create a medication.");
    // }
    const dataToInsert = mapMedicationToDb(medicationDataFromApp); // medicationDataFromApp now must have doctorId
    console.log("medicationService: Insertando medicamento (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('medications')
      .insert(dataToInsert)
      .select()
      .single();
      
    if (error) {
      console.error("medicationService: Error creando medicamento:", error);
      throw error;
    }
    console.log("medicationService: Medicamento creado, datos crudos de Supabase:", data);
    return data ? mapDbToMedication(data) : null;
  },

  async getAll(): Promise<Medication[]> {
    console.log("medicationService.getAll: Fetching medications (RLS will filter)...");
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error("medicationService.getAll: Error obteniendo todos los medicamentos:", error);
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
      if (error.code === 'PGRST116') return null;
      console.error(`medicationService.getById: Error obteniendo medicamento por ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToMedication(data) : null;
  },

  // For update, doctorId is not part of the updatable fields directly by user here
  async update(id: string, medicationUpdateData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<Medication | null> {
    const dataToUpdate = mapMedicationToDb(medicationUpdateData);
    // doctor_id should not be updatable through this generic update, RLS handles ownership.
    if (dataToUpdate.doctor_id) delete dataToUpdate.doctor_id; 

    const { data, error } = await supabase
      .from('medications')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`medicationService.update: Error actualizando medicamento ID ${id}:`, error);
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
      console.error(`medicationService.delete: Error eliminando medicamento ID ${id}:`, error);
      throw error;
    }
  }
};
