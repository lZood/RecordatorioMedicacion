import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

export const appointmentService = {
  async create(appointment: Omit<Appointment, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  async update(id: string, appointment: Partial<Appointment>) {
    const { data, error } = await supabase
      .from('appointments')
      .update(appointment)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};