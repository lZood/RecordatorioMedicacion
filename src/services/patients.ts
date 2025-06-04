// src/services/patients.ts
import { supabase } from '../lib/supabase';
import { Patient } from '../types'; 
import { toast } from 'react-hot-toast';

// Helper para mapear de camelCase (app) a snake_case (DB)
const mapPatientToDb = (patientData: Partial<Omit<Patient, 'id' | 'createdAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (patientData.name !== undefined) dbData.name = patientData.name;
  if (patientData.phone !== undefined) dbData.phone = patientData.phone;
  if (patientData.address !== undefined) dbData.address = patientData.address;
  if (patientData.email !== undefined) dbData.email = patientData.email;
  if (patientData.doctorId !== undefined) dbData.doctor_id = patientData.doctorId;
  if ((patientData as any).user_id !== undefined) dbData.user_id = (patientData as any).user_id; 
  if ((patientData as any).profile_id !== undefined) dbData.profile_id = (patientData as any).profile_id;
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app)
const mapDbToPatient = (dbRecord: any): Patient | null => {
  if (!dbRecord) return null;
  const patient: Patient = {
    id: dbRecord.id,
    name: dbRecord.name,
    phone: dbRecord.phone,
    address: dbRecord.address,
    email: dbRecord.email,
    createdAt: dbRecord.created_at,
    doctorId: dbRecord.doctor_id,
    user_id: dbRecord.user_id,
    profile_id: dbRecord.profile_id,
  };
  return patient;
};

export const patientService = {
  async create(patientDataFromApp: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient | null> {
    // Verificar que tenemos un usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("patientService.create: No authenticated user found:", authError);
      throw new Error("Authentication required to create patient.");
    }

    // Asegurarse de que el doctorId coincida con el ID del usuario autenticado
    const dataToInsert = mapPatientToDb({
      ...patientDataFromApp,
      doctorId: user.id // Forzar que el doctorId sea el ID del usuario autenticado
    });

    console.log("patientService: Insertando paciente (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('patients')
      .insert(dataToInsert)
      .select()
      .single();
      
    if (error) {
      console.error("patientService: Error creando paciente:", error);
      if (error.code === '23505') {
        toast.error("Este usuario ya tiene un registro de paciente asociado.");
      } else if (error.code === '42501') {
        toast.error("No tienes permisos para crear pacientes.");
      }
      throw error;
    }

    console.log("patientService: Paciente creado, datos crudos de Supabase:", data);
    return data ? mapDbToPatient(data) : null;
  },

  async getAll(): Promise<Patient[]> {
    console.log("patientService.getAll: Fetching patients (RLS will filter)...");
    const { data, error } = await supabase
      .from('patients')
      .select('*, doctor:profiles!patients_doctor_id_fkey(id, name, specialty, email, role)') 
      .order('name', { ascending: true });
      
    if (error) {
      console.error("patientService.getAll: Error obteniendo todos los pacientes:", error);
      throw error;
    }
    return data ? data.map(mapDbToPatient).filter(p => p !== null) as Patient[] : [];
  },

  async getById(id: string): Promise<Patient | null> {
    console.log(`patientService.getById: Fetching patient ID ${id} (RLS will filter)...`);
    const { data, error } = await supabase
      .from('patients')
      .select('*, doctor:profiles!patients_doctor_id_fkey(id, name, specialty, email, role)')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.warn(`patientService.getById: No patient found for ID ${id}.`);
        return null;
      }
      console.error(`patientService.getById: Error obteniendo paciente por ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToPatient(data) : null;
  },

  async update(id: string, patientUpdateData: Partial<Omit<Patient, 'id' | 'createdAt'>>): Promise<Patient | null> {
    // Verificar que tenemos un usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("patientService.update: No authenticated user found:", authError);
      throw new Error("Authentication required to update patient.");
    }

    const dataToUpdate = mapPatientToDb(patientUpdateData);
    // No permitir cambiar el doctor_id o user_id en una actualización
    delete dataToUpdate.doctor_id;
    delete dataToUpdate.user_id;

    console.log(`patientService.update: Actualizando paciente ID ${id} (snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('patients')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`patientService.update: Error actualizando paciente ID ${id}:`, error);
      if (error.code === '42501') {
        toast.error("No tienes permisos para actualizar este paciente.");
      }
      throw error;
    }
    return data ? mapDbToPatient(data) : null;
  },

  async delete(id: string): Promise<void> {
    // Verificar que tenemos un usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("patientService.delete: No authenticated user found:", authError);
      throw new Error("Authentication required to delete patient.");
    }

    console.log(`patientService.delete: Eliminando paciente ID ${id} (RLS will verify)...`);
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`patientService.delete: Error eliminando paciente ID ${id}:`, error);
      if (error.code === '42501') {
        toast.error("No tienes permisos para eliminar este paciente.");
      }
      throw error;
    }
    console.log(`patientService.delete: Paciente ID ${id} eliminado.`);
  }
};