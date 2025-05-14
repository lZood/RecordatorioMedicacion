// src/services/medications.ts
import { supabase } from '../lib/supabase';
import { Medication } from '../types'; // Tu tipo Medication usa camelCase

export const medicationService = {
  async create(medicationDataFromApp: Omit<Medication, 'id'>): Promise<Medication | null> {
    console.log("medicationService: Recibido para crear (camelCase):", medicationDataFromApp);

    // Mapear a snake_case para la inserción en la base de datos
    const dataToInsert = {
      name: medicationDataFromApp.name,
      active_ingredient: medicationDataFromApp.activeIngredient, // snake_case
      expiration_date: medicationDataFromApp.expirationDate,     // snake_case
      description: medicationDataFromApp.description ?? null,      // Usa null para campos opcionales indefinidos
    };
    console.log("medicationService: Insertando (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('medications')
      .insert(dataToInsert) // Enviamos el objeto con claves en snake_case
      .select() // Supabase debería devolver los datos con claves convertidas a camelCase
      .single();

    if (error) {
      console.error("medicationService: Error de Supabase al crear:", error);
      throw error;
    }
    console.log("medicationService: Creación exitosa, datos devueltos (deberían ser camelCase por el cliente):", data);
    return data as Medication | null; // Hacemos cast al tipo Medication (camelCase)
  },

  async getAll(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*') // El cliente Supabase convierte snake_case de la DB a camelCase
      .order('name', { ascending: true });

    if (error) {
      console.error("medicationService: Error de Supabase al obtener todos:", error);
      throw error;
    }
    return (data as Medication[]) || [];
  },

  async getById(id: string): Promise<Medication | null> {
    const { data, error } = await supabase
      .from('medications')
      .select('*') // Convierte a camelCase
      .eq('id', id)
      .single();

    if (error) {
      console.error(`medicationService: Error de Supabase al obtener por ID ${id}:`, error);
      throw error;
    }
    return data as Medication | null;
  },

  async update(id: string, medicationUpdateData: Partial<Medication>): Promise<Medication | null> {
    console.log(`medicationService: Recibido para actualizar (ID: ${id}, camelCase):`, medicationUpdateData);

    // Mapear a snake_case para la actualización
    const dataToUpdate: { [key: string]: any } = {};
    if (medicationUpdateData.name !== undefined) dataToUpdate.name = medicationUpdateData.name;
    if (medicationUpdateData.activeIngredient !== undefined) dataToUpdate.active_ingredient = medicationUpdateData.activeIngredient;
    if (medicationUpdateData.expirationDate !== undefined) dataToUpdate.expiration_date = medicationUpdateData.expirationDate;
    if (medicationUpdateData.description !== undefined) dataToUpdate.description = medicationUpdateData.description ?? null;
    // No incluir 'id' en el payload de actualización

    console.log("medicationService: Actualizando (snake_case):", dataToUpdate);

    const { data, error } = await supabase
      .from('medications')
      .update(dataToUpdate)
      .eq('id', id)
      .select() // Convierte a camelCase
      .single();

    if (error) {
      console.error(`medicationService: Error de Supabase al actualizar ID ${id}:`, error);
      throw error;
    }
    console.log("medicationService: Actualización exitosa, datos devueltos (camelCase):", data);
    return data as Medication | null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`medicationService: Error de Supabase al eliminar ID ${id}:`, error);
      throw error;
    }
  }
};