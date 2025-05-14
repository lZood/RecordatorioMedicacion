import { patientService } from '../services/patients'; // Asegúrate que la ruta sea correcta
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'; // Añade useEffect
import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types';
import { mockPatients, mockMedications, mockAppointments, mockVitalSigns, mockMedicationIntakes } from '../data/mockData';

interface AppContextType {
  patients: Patient[];
  medications: Medication[];
  appointments: Appointment[];
  vitalSigns: VitalSign[];
  medicationIntakes: MedicationIntake[];
  addPatient: (patient: Patient) => void;
  addMedication: (medication: Medication) => void;
  addAppointment: (appointment: Appointment) => void;
  addVitalSign: (vitalSign: VitalSign) => void;
  addMedicationIntake: (intake: MedicationIntake) => void;
  updatePatient: (id: string, updatedPatient: Partial<Patient>) => void;
  getPatientById: (id: string) => Patient | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]); // Inicializa como array vacío
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>(mockVitalSigns);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>(mockMedicationIntakes);
  const [loading, setLoading] = useState(true); // Opcional: para manejar el estado de carga

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await patientService.getAll();
        if (data) {
          setPatients(data);
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
        // Aquí podrías mostrar una notificación de error al usuario
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);
  
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
  try {
    const newPatient = await patientService.create(patientData);
    if (newPatient) {
      setPatients(prevPatients => [...prevPatients, newPatient]);
      // Aquí podrías mostrar una notificación de éxito
    }
  } catch (error) {
    console.error("Error adding patient:", error);
    // Aquí podrías mostrar una notificación de error al usuario
  }
};

  const addMedication = (medication: Medication) => {
    setMedications([...medications, medication]);
  };

  const addAppointment = (appointment: Appointment) => {
    setAppointments([...appointments, appointment]);
  };

  const addVitalSign = (vitalSign: VitalSign) => {
    setVitalSigns([...vitalSigns, vitalSign]);
  };

  const addMedicationIntake = (intake: MedicationIntake) => {
    setMedicationIntakes([...medicationIntakes, intake]);
  };

  const updatePatient = async (id: string, updatedPatientData: Partial<Patient>) => {
  try {
    const updatedPatient = await patientService.update(id, updatedPatientData);
    if (updatedPatient) {
      setPatients(prevPatients =>
        prevPatients.map(patient =>
          patient.id === id ? { ...patient, ...updatedPatient } : patient
        )
      );
      // Aquí podrías mostrar una notificación de éxito
    }
  } catch (error) {
    console.error("Error updating patient:", error);
    // Aquí podrías mostrar una notificación de error al usuario
  }
};

  
  const getPatientById = (id: string) => {
  // Primero intenta encontrarlo en el estado local
  const localPatient = patients.find(patient => patient.id === id);
  if (localPatient) {
    return localPatient;
  }
  // Opcional: Si no se encuentra localmente, podrías intentar cargarlo desde el servicio
  // console.warn(`Patient with id ${id} not found in local state.`);
  // Podrías implementar una carga individual aquí si fuera necesario:
  // const fetchSinglePatient = async () => {
  //   const dbPatient = await patientService.getById(id);
  //   if (dbPatient) setPatients(prev => [...prev, dbPatient]); // Añadirlo al estado
  //   return dbPatient;
  // };
  // return fetchSinglePatient(); // Esto haría la función asíncrona
  return undefined; // O simplemente retornar undefined si no está en el estado
};

  return (
    <AppContext.Provider
      value={{
        patients,
        medications,
        appointments,
        vitalSigns,
        medicationIntakes,
        addPatient,
        addMedication,
        addAppointment,
        addVitalSign,
        addMedicationIntake,
        updatePatient,
        getPatientById
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};