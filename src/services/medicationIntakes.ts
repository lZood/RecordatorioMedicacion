import { supabase } from '../lib/supabase';
import { MedicationIntake } from '../types';

export const medicationIntakeService = {
  async create(intake: Omit<MedicationIntake, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('medication_intakes')
      .insert([intake])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('medication_intakes')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('medication_intakes')
      .select('*, medications(*)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async update(id: string, intake: Partial<MedicationIntake>) {
    const { data, error } = await supabase
      .from('medication_intakes')
      .update(intake)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('medication_intakes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};