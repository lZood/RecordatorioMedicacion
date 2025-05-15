// src/services/patients.ts
import { supabase } from '../lib/supabase';
import { Patient, UserProfile } from '../types'; // UserProfile para el doctor anidado

// Helper para mapear de camelCase (app) a snake_case (DB)
const mapPatientToDb = (patientData: Partial<Omit<Patient, 'id' | 'createdAt'>>) => {
  const dbData: { [key: string]: any } = {};
  if (patientData.name !== undefined) dbData.name = patientData.name;
  if (patientData.phone !== undefined) dbData.phone = patientData.phone;
  if (patientData.address !== undefined) dbData.address = patientData.address;
  if (patientData.email !== undefined) dbData.email = patientData.email;
  if (patientData.doctorId !== undefined) dbData.doctor_id = patientData.doctorId;
  return dbData;
};

// Helper para mapear de snake_case (DB) a camelCase (app)
// Este helper ahora es más complejo si esperamos anidar el perfil del doctor.
// Sin embargo, el tipo Patient no incluye un objeto doctor anidado, solo doctorId.
// Si quieres el objeto doctor anidado en el tipo Patient, debes modificar el tipo Patient.
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
    // updatedAt: dbRecord.updated_at, // Si lo añades al tipo Patient
  };
  // Si 'doctor' (o 'profiles') está anidado en dbRecord y quieres adjuntarlo:
  // if (dbRecord.doctor) { // o dbRecord.profiles
  //   (patient as any).doctorProfile = mapDbToUserProfile(dbRecord.doctor); // Necesitarías mapDbToUserProfile
  // }
  return patient;
};


export const patientService = {
  async create(patientDataFromApp: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient | null> {
    if (!patientDataFromApp.doctorId) {
      console.error("patientService.create: doctorId is required to create a patient.");
      throw new Error("doctorId is required when creating a patient.");
    }
    const dataToInsert = mapPatientToDb(patientDataFromApp);
    console.log("patientService: Insertando paciente (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('patients')
      .insert(dataToInsert)
      .select() // Por defecto, Supabase devuelve las columnas de la tabla 'patients'
                // Si quieres el perfil del doctor anidado, necesitas especificarlo:
                // .select('*, doctor:doctor_id(id, name, specialty, email, role)')
      .single();
      
    if (error) {
      console.error("patientService: Error creando paciente:", error);
      throw error;
    }
    console.log("patientService: Paciente creado, datos crudos de Supabase:", data);
    return data ? mapDbToPatient(data) : null;
  },

  async getAll(): Promise<Patient[]> {
    // RLS se encargará de filtrar por doctor_id = auth.uid() para el rol 'doctor'
    console.log("patientService.getAll: Fetching patients (RLS will filter)...");
    const { data, error } = await supabase
      .from('patients')
      .select('*, doctor:profiles(id, name, specialty, email, role)') // Traer datos del doctor
      .order('name', { ascending: true });
      
    if (error) {
      console.error("patientService.getAll: Error obteniendo todos los pacientes:", error);
      throw error;
    }
    console.log("patientService.getAll: Datos crudos de Supabase:", data);
    // El cliente Supabase anida 'doctor' si se usa la sintaxis de foreign table.
    // mapDbToPatient necesita ser consciente de esto si quieres que el objeto Patient tenga el perfil del doctor.
    // Por ahora, mapDbToPatient solo mapea los campos directos de 'patients'.
    // Si quieres el objeto doctor en Patient, modifica el tipo Patient y mapDbToPatient.
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
    console.log(`patientService.getById (${id}): Datos crudos de Supabase:`, data);
    return data ? mapDbToPatient(data) : null;
  },

  async update(id: string, patientUpdateData: Partial<Omit<Patient, 'id' | 'createdAt'>>): Promise<Patient | null> {
    const dataToUpdate = mapPatientToDb(patientUpdateData);
    if ('doctor_id' in dataToUpdate && patientUpdateData.doctorId === undefined) {
        delete dataToUpdate.doctor_id; // Prevenir cambio de doctor_id accidentalmente
    }
    console.log(`patientService.update: Actualizando paciente ID ${id} (snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('patients')
      .update(dataToUpdate)
      .eq('id', id)
      .select() // Opcional: .select('*, doctor:profiles(...)') si quieres el doctor anidado
      .single();
      
    if (error) {
      console.error(`patientService.update: Error actualizando paciente ID ${id}:`, error);
      throw error;
    }
    console.log(`patientService.update (${id}): Datos crudos de Supabase:`, data);
    return data ? mapDbToPatient(data) : null;
  },

  async delete(id: string): Promise<void> {
    console.log(`patientService.delete: Eliminando paciente ID ${id} (RLS will verify)...`);
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
