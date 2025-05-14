import { supabase } from '../lib/supabase';
import { VitalSign } from '../types';

export const vitalSignService = {
  async create(vitalSign: Omit<VitalSign, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('vital_signs')
      .insert([vitalSign])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async update(id: string, vitalSign: Partial<VitalSign>) {
    const { data, error } = await supabase
      .from('vital_signs')
      .update(vitalSign)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('vital_signs')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};