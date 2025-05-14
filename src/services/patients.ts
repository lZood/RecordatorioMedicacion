import { supabase } from '../lib/supabase';
import { Patient } from '../types';

export const patientService = {
  async create(patient: Omit<Patient, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, patient: Partial<Patient>) {
    const { data, error } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};