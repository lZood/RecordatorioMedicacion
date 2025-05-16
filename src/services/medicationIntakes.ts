    // src/services/medicationIntakes.ts
    import { supabase } from '../lib/supabase';
    import { MedicationIntake, Medication } from '../types'; // Asume que Medication está en types

    // Tipo para MedicationIntake enriquecido con detalles del medicamento
    export interface MedicationIntakeWithMedication extends Omit<MedicationIntake, 'medicationId'> {
      medication: Pick<Medication, 'id' | 'name' | 'activeIngredient'> | null;
      // Mantener medicationId por si medication es null o para referencia
      medicationId: string;
    }


    // Helper para mapear de camelCase (app) a snake_case (DB)
    const mapIntakeToDb = (intakeData: Partial<Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const dbData: { [key: string]: any } = {};
      if (intakeData.patientId !== undefined) dbData.patient_id = intakeData.patientId;
      if (intakeData.medicationId !== undefined) dbData.medication_id = intakeData.medicationId;
      if (intakeData.date !== undefined) dbData.date = intakeData.date;
      if (intakeData.time !== undefined) dbData.time = intakeData.time;
      if (intakeData.taken !== undefined) dbData.taken = intakeData.taken;
      return dbData;
    };

    // Helper para mapear de snake_case (DB) a camelCase (app)
    const mapDbToIntakeWithMedication = (dbRecord: any): MedicationIntakeWithMedication | null => {
      if (!dbRecord) return null;
      return {
        id: dbRecord.id,
        patientId: dbRecord.patient_id,
        medicationId: dbRecord.medication_id, // Mantener el ID original
        date: dbRecord.date,
        time: dbRecord.time,
        taken: dbRecord.taken,
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at,
        medication: dbRecord.medications // Supabase anida la tabla foránea así si se llama 'medications'
          ? {
              id: dbRecord.medications.id,
              name: dbRecord.medications.name,
              activeIngredient: dbRecord.medications.active_ingredient, // Asegúrate que esto se mapee si es necesario
            }
          : null,
      };
    };
     const mapDbToIntake = (dbRecord: any): MedicationIntake | null => {
      if (!dbRecord) return null;
      return {
        id: dbRecord.id,
        patientId: dbRecord.patient_id,
        medicationId: dbRecord.medication_id,
        date: dbRecord.date,
        time: dbRecord.time,
        taken: dbRecord.taken,
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at,
      };
    };


    export const medicationIntakeService = {
      async create(intakeDataFromApp: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | null> {
        const dataToInsert = mapIntakeToDb(intakeDataFromApp);
        console.log("medicationIntakeService: Insertando (snake_case):", dataToInsert);

        const { data, error } = await supabase
          .from('medication_intakes')
          .insert(dataToInsert)
          .select(`
            *,
            medications (id, name, active_ingredient)
          `) // Seleccionar datos del medicamento anidado
          .single();
          
        if (error) {
          console.error("medicationIntakeService: Error creando toma de medicamento:", error);
          throw error;
        }
        console.log("medicationIntakeService: Creación exitosa, datos crudos de Supabase:", data);
        return data ? mapDbToIntakeWithMedication(data) : null;
      },

      async getByPatient(patientId: string): Promise<MedicationIntakeWithMedication[]> {
        console.log(`medicationIntakeService: Obteniendo tomas para paciente ${patientId}`);
        const { data, error } = await supabase
          .from('medication_intakes')
          .select(`
            *,
            medications (id, name, active_ingredient)
          `) // Seleccionar datos del medicamento anidado
          .eq('patient_id', patientId)
          .order('date', { ascending: false })
          .order('time', { ascending: false });
          
        if (error) {
          console.error(`medicationIntakeService: Error obteniendo tomas para paciente ${patientId}:`, error);
          throw error;
        }
        console.log(`medicationIntakeService: Tomas para paciente ${patientId}, datos crudos:`, data);
        return data ? data.map(mapDbToIntakeWithMedication).filter(intake => intake !== null) as MedicationIntakeWithMedication[] : [];
      },

      async update(id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | null> {
        // Principalmente para actualizar 'taken', 'date', 'time'
        const dataToUpdate = mapIntakeToDb(intakeUpdateData);
        console.log(`medicationIntakeService: Actualizando (ID: ${id}, snake_case):`, dataToUpdate);

        const { data, error } = await supabase
          .from('medication_intakes')
          .update(dataToUpdate)
          .eq('id', id)
          .select(`
            *,
            medications (id, name, active_ingredient)
          `)
          .single();
          
        if (error) {
          console.error(`medicationIntakeService: Error actualizando toma ID ${id}:`, error);
          throw error;
        }
        console.log("medicationIntakeService: Actualización exitosa, datos crudos de Supabase:", data);
        return data ? mapDbToIntakeWithMedication(data) : null;
      },

      async delete(id: string): Promise<void> {
        const { error } = await supabase
          .from('medication_intakes')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error(`medicationIntakeService: Error eliminando toma ID ${id}:`, error);
          throw error;
        }
      }
    };
    