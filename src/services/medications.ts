import { supabase } from '../lib/supabase';
import { Medication } from '../types';

export const medicationService = {
  async create(medication: Omit<Medication, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('medications')
      .insert([medication])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, medication: Partial<Medication>) {
    const { data, error } = await supabase
      .from('medications')
      .update(medication)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};