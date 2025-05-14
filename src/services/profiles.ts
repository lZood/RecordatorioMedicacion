import { supabase } from '../lib/supabase';
import { Doctor } from '../types'; // Asumiendo que Doctor es el tipo para los perfiles

export const profileService = {
  async getAllDoctors(): Promise<Doctor[]> {
    // Seleccionamos los campos que coinciden con el tipo Doctor
    // La tabla 'profiles' tiene 'id', 'name', 'specialty'.
    // El tipo 'Doctor' también tiene 'email', que no está directamente en 'profiles'
    // sino en 'auth.users'. Por simplicidad, aquí solo obtendremos los campos de 'profiles'.
    // Si necesitas el email, tendrías que hacer un JOIN o una consulta separada a auth.users,
    // o añadir el email a la tabla profiles (requeriría una migración).
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, specialty'); // El cliente Supabase convierte a camelCase

    if (error) {
      console.error("profileService: Error fetching doctors:", error);
      throw error;
    }
    // El 'data' aquí debería tener objetos con id, name, specialty (ya en camelCase)
    // Hacemos un cast a Doctor[], asumiendo que la estructura coincide.
    return (data as Doctor[]) || [];
  },

  async getDoctorById(id: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, specialty')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`profileService: Error fetching doctor by ID ${id}:`, error);
      throw error;
    }
    return data as Doctor | null;
  }
  // No implementaremos create/update/delete para profiles aquí,
  // ya que generalmente se manejan a través del registro de usuarios (auth)
  // y una posible página de "Mi Perfil" para el doctor logueado.
};
