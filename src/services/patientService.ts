// src/services/patients.ts
import { supabase } from '../lib/supabase';
import { Patient } from '../types'; 

// Helper para mapear de camelCase (app) a snake_case (DB)
// Asegúrate de que maneje 'user_id' si lo pasas en camelCase como 'userId'
const mapPatientToDb = (patientData: Partial<Omit<Patient, 'id' | 'createdAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (patientData.name !== undefined) dbData.name = patientData.name;
  if (patientData.phone !== undefined) dbData.phone = patientData.phone;
  if (patientData.address !== undefined) dbData.address = patientData.address;
  if (patientData.email !== undefined) dbData.email = patientData.email;
  if (patientData.doctorId !== undefined) dbData.doctor_id = patientData.doctorId;
  // Nuevo campo para vincular con auth.users (a través de profiles si es necesario)
  if ((patientData as any).user_id !== undefined) dbData.user_id = (patientData as any).user_id; 
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app)
const mapDbToPatient = (dbRecord: any): Patient | null => {
  if (!dbRecord) return null;
  const patient: Patient = {
    id: dbRecord.id, // Este es el ID de la tabla 'patients'
    name: dbRecord.name,
    phone: dbRecord.phone,
    address: dbRecord.address,
    email: dbRecord.email,
    createdAt: dbRecord.created_at,
    doctorId: dbRecord.doctor_id,
    user_id: dbRecord.user_id, // Añadir el user_id
  };
  return patient;
};


export const patientService = {
  // La firma de create ahora espera el objeto con user_id y doctorId
  async create(patientDataFromApp: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient | null> {
    // patientDataFromApp ya debería incluir doctorId y user_id desde AppContext.addPatient
    if (!patientDataFromApp.doctorId) {
      console.error("patientService.create: doctorId is required.");
      throw new Error("doctorId is required when creating a patient.");
    }
    if (!(patientDataFromApp as any).user_id) { // user_id es crucial
        console.error("patientService.create: user_id is required to link patient to auth user.");
        throw new Error("user_id is required for patient record.");
    }

    const dataToInsert = mapPatientToDb(patientDataFromApp);
    console.log("patientService: Insertando paciente (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('patients')
      .insert(dataToInsert)
      .select() 
      .single();
      
    if (error) {
      console.error("patientService: Error creando paciente:", error);
      // Si el error es por unique constraint en user_id (si la pusiste), maneja apropiadamente
      if (error.code === '23505') { // Código de error para violación de unicidad en PostgreSQL
        toast.error("Este usuario ya tiene un registro de paciente asociado.");
      }
      throw error;
    }
    console.log("patientService: Paciente creado, datos crudos de Supabase:", data);
    return data ? mapDbToPatient(data) : null;
  },

  // ... (resto de las funciones getAll, getById, update, delete sin cambios necesarios para este flujo,
  // pero asegúrate que mapDbToPatient y mapPatientToDb se usen consistentemente si también manejan user_id) ...
  async getAll(): Promise<Patient[]> {
    console.log("patientService.getAll: Fetching patients (RLS will filter)...");
    const { data, error } = await supabase
      .from('patients')
      .select('*, doctor:profiles(id, name, specialty, email, role)') 
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
      .select('*, doctor:profiles(id, name, specialty, email, role)')
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
    const dataToUpdate = mapPatientToDb(patientUpdateData);
    if ('doctor_id' in dataToUpdate && patientUpdateData.doctorId === undefined) {
        delete dataToUpdate.doctor_id; 
    }
    // No permitir cambiar user_id en una actualización
    if ('user_id' in dataToUpdate) {
        delete dataToUpdate.user_id;
    }
    console.log(`patientService.update: Actualizando paciente ID ${id} (snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('patients')
      .update(dataToUpdate)
      .eq('id', id)
      .select() 
      .single();
      
    if (error) {
      console.error(`patientService.update: Error actualizando paciente ID ${id}:`, error);
      throw error;
    }
    return data ? mapDbToPatient(data) : null;
  },

  async delete(id: string): Promise<void> {
    console.log(`patientService.delete: Eliminando paciente ID ${id} (RLS will verify)...`);
    // Considerar si al eliminar un paciente también se debe eliminar el usuario de auth y su perfil.
    // Por ahora, solo elimina el registro de 'patients'.
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`patientService.delete: Error eliminando paciente ID ${id}:`, error);
      throw error;
    }
    console.log(`patientService.delete: Paciente ID ${id} eliminado.`);
  }
};
