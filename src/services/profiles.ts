// src/services/profiles.ts
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

// Helper para mapear de snake_case (DB) a camelCase (app)
const mapDbToUserProfile = (dbRecord: any): UserProfile | null => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    email: dbRecord.email,
    role: dbRecord.role,
    specialty: dbRecord.specialty,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
};

export const profileService = {
  async getAllDoctors(): Promise<UserProfile[]> {
    console.log("profileService.getAllDoctors: Fetching all doctor profiles...");
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, specialty, email, role, created_at, updated_at')
      .eq('role', 'doctor'); // Solo perfiles de doctores

    if (error) {
      console.error("profileService.getAllDoctors: Error fetching doctors:", error);
      throw error;
    }
    console.log("profileService.getAllDoctors: Raw data from Supabase:", data);
    return data ? data.map(mapDbToUserProfile).filter(profile => profile !== null) as UserProfile[] : [];
  },

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    if (!userId) {
      console.warn("profileService.getProfileByUserId: No userId provided.");
      return null;
    }
    console.log(`profileService.getProfileByUserId: Fetching profile for user ID: ${userId}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, specialty, email, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // 'PGRST116' es "Query result contains no rows"
        console.warn(`profileService.getProfileByUserId: No profile found for user ID ${userId}.`);
        return null;
      }
      console.error(`profileService.getProfileByUserId: Error fetching profile for user ID ${userId}:`, error);
      throw error;
    }
    console.log(`profileService.getProfileByUserId (${userId}): Raw data from Supabase:`, data);
    return data ? mapDbToUserProfile(data) : null;
  }
  // La creación de perfiles se maneja por el trigger.
  // La actualización podría ser una funcionalidad separada (ej. página "Mi Perfil").
};
