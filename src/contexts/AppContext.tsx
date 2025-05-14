// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types'; // Tus tipos
import { User, Subscription } from '@supabase/supabase-js'; // Importa Subscription
import { supabase } from '../lib/supabase'; // Cliente Supabase
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { medicationIntakeService } from '../services/medicationIntakes';
import toast from 'react-hot-toast';
import { authService } from '../services/auth'; // Asegúrate de que authService está importado si lo usas

// ... (interfaz AppContextType y createContext permanecen igual) ...
interface AppContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  patients: Patient[];
  medications: Medication[];
  addMedication: (medicationData: Omit<Medication, 'id' | 'createdAt'>) => Promise<Medication | undefined>; // createdAt no está en tu tipo Medication, pero es bueno ser consistente si Supabase lo añade
  updateMedication: (id: string, updatedMedicationData: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined; // Si es necesario
  appointments: Appointment[];
  vitalSigns: VitalSign[];
  medicationIntakes: MedicationIntake[];
  loadingData: boolean;
  setCurrentUser: (user: User | null) => void;
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  signOut: () => Promise<void>;
  loadInitialData: (userOverride?: User | null) => Promise<void>; // Modificado para aceptar un usuario opcional
}

const AppContext = createContext<AppContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>([]);

  // Cargar datos iniciales
  const loadInitialData = async (userOverride?: User | null) => { // Acepta userOverride
    const userToUse = userOverride !== undefined ? userOverride : currentUser; // Usa el override o el estado actual

    if (!userToUse) {
      console.log("No user session, skipping data load.");
      setPatients([]);
      setMedications([]);
      setAppointments([]);
      setVitalSigns([]);
      setMedicationIntakes([]);
      setLoadingData(false);
      return;
    }
    console.log("Loading initial data for user:", userToUse.id);
    setLoadingData(true);
    try {
      const [
        patientsData,
        medicationsData,
        appointmentsData,
        vitalSignsData,
        medicationIntakesData,
      ] = await Promise.all([
        patientService.getAll(),
        medicationService.getAll(), // Asumiendo que tienes estos servicios
        appointmentService.getAll(),
        vitalSignService.getAll(),
        medicationIntakeService.getAll(),
      ]);
      setPatients(patientsData || []);
      setMedications(medicationsData || []);
      setAppointments(appointmentsData || []);
      setVitalSigns(vitalSignsData || []);
      setMedicationIntakes(medicationIntakesData || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Could not load app data.");
    } finally {
      setLoadingData(false);
    }
  };


  useEffect(() => {
    setLoadingAuth(true);
    // Variable para almacenar la suscripción
    let subscription: Subscription | undefined;

    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        await loadInitialData(session.user); // Carga datos si hay sesión
      } else {
        setCurrentUser(null);
        await loadInitialData(null); // Asegura que los datos se limpien si no hay sesión
      }
      setLoadingAuth(false);

      // Escuchar cambios en el estado de autenticación
      const { data: authListenerData } = supabase.auth.onAuthStateChange(async (event, session) => {
        // No es necesario setLoadingAuth(true) aquí usualmente,
        // ya que el primer setLoadingAuth(false) se ejecuta después de la comprobación inicial.
        // Pero si quieres ser explícito o manejar transiciones:
        // setLoadingAuth(true);

        if (session) {
          setCurrentUser(session.user);
          // Solo recargar datos si es un evento de SIGNED_IN o si el usuario actual es diferente
          if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && (!currentUser || currentUser.id !== session.user.id))) {
            await loadInitialData(session.user);
          }
        } else {
          setCurrentUser(null);
          await loadInitialData(null); // Limpia datos
        }
        // setLoadingAuth(false); // Si lo activaste arriba
      });
      // Asigna la suscripción
      subscription = authListenerData.subscription;
    };

    checkSessionAndSubscribe();

    // Función de limpieza para desuscribirse
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // El array de dependencias vacío asegura que esto se ejecute solo una vez al montar y limpiar al desmontar


  // --- CRUD para Medicamentos ---
  const addMedication = async (medicationData: Omit<Medication, 'id'>): Promise<Medication | undefined> => {
    // medicationData aquí está en camelCase, tal como lo recibe de la página Medications.tsx
    if (!currentUser) {
      toast.error("You must be logged in to add a medication.");
      throw new Error("User not authenticated");
    }
    try {
      // medicationService.create ahora se encarga internamente de mapear a snake_case
      const newMedication = await medicationService.create(medicationData);
      if (newMedication) {
        setMedications(prevMeds => [...prevMeds, newMedication]); // newMedication debería ser camelCase devuelto por el servicio
        toast.success('Medication added successfully!');
        return newMedication;
      }
    } catch (error: any) {
      console.error("Error adding medication (AppContext):", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to add medication: ${supabaseErrorMessage}`);
      throw error;
    }
    return undefined; // Añadido para satisfacer la promesa si newMedication no se define
  };

  const getMedicationById = (id: string): Medication | undefined => {
    // Asumiendo que 'medications' en el estado ya está en camelCase
    // o que el servicio lo devuelve en camelCase.
    // Si 'medications' en el estado está en snake_case, necesitarías convertirlo aquí
    // o acceder con snake_case y mapear a un objeto Medication.
    const med = medications.find(m => m.id === id);
    if (med) {
        // Si 'med' del estado viene con snake_case, y tu tipo Medication es camelCase:
        if ((med as any).active_ingredient || (med as any).expiration_date) {
            return {
                id: med.id,
                name: med.name,
                activeIngredient: (med as any).active_ingredient || med.activeIngredient,
                expirationDate: (med as any).expiration_date || med.expirationDate,
                description: med.description,
            };
        }
        return med; // Asume que ya está en camelCase
    }
    return undefined;
  };

  const updateMedication = async (id: string, updatedMedicationData: Partial<Medication>) => {
    // updatedMedicationData viene en camelCase de MedicationDetails.tsx
    if (!currentUser) { /* ... manejo de error ... */ throw new Error("User not authenticated"); }
    try {
      const updatedMed = await medicationService.update(id, updatedMedicationData); // El servicio maneja la conversión a snake_case para la DB
      if (updatedMed) { // updatedMed debería venir en camelCase del servicio
        setMedications(prevMeds =>
          prevMeds.map(m => (m.id === id ? { ...m, ...updatedMed } : m))
        );
        // toast.success('Medication updated!'); // Ya lo hace MedicationDetails
      }
    } catch (error) { /* ... manejo de error ... */ throw error; }
  };

  const deleteMedication = async (id: string) => {
    if (!currentUser) { /* ... manejo de error ... */ throw new Error("User not authenticated"); }
    try {
      await medicationService.delete(id);
      setMedications(prevMeds => prevMeds.filter(m => m.id !== id));
      // toast.success('Medication deleted!'); // Ya lo hace MedicationDetails
    } catch (error) { /* ... manejo de error ... */ throw error; }
  };

  // CRUD PACIENTES
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      toast.error("You must be logged in to add a patient.");
      throw new Error("User not authenticated");
    }
    try {
      const newPatient = await patientService.create(patientData);
      if (newPatient) {
        setPatients(prevPatients => [...prevPatients, newPatient]);
        toast.success('Patient added successfully!');
        return newPatient;
      }
    } catch (error: any) {
      console.error("Error adding patient (AppContext):", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to add patient: ${supabaseErrorMessage}`);
      throw error;
    }
  };

  const updatePatient = async (id: string, updatedPatientData: Partial<Patient>) => {
    if (!currentUser) {
      toast.error("You must be logged in to update a patient.");
      throw new Error("User not authenticated");
    }
    try {
      const updatedPatient = await patientService.update(id, updatedPatientData);
      if (updatedPatient) {
        setPatients(prevPatients =>
          prevPatients.map(patient =>
            patient.id === id ? { ...patient, ...updatedPatient } : patient
          )
        );
        toast.success('Patient updated successfully!');
      }
    } catch (error: any) {
      console.error("Error updating patient:", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to update patient: ${supabaseErrorMessage}`);
      throw error;
    }
  };

  const deletePatient = async (id: string) => {
    if (!currentUser) {
      toast.error("You must be logged in to delete a patient.");
      throw new Error("User not authenticated");
    }
    try {
      await patientService.delete(id);
      setPatients(prevPatients => prevPatients.filter(patient => patient.id !== id));
      toast.success('Patient deleted successfully!');
    } catch (error: any) {
      console.error("Error deleting patient:", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to delete patient: ${supabaseErrorMessage}`);
      throw error;
    }
  };


  const getPatientById = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  const signOut = async () => {
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      await authService.signOut(); // authService.signOut() ya llama a supabase.auth.signOut()
      // onAuthStateChange se encargará de actualizar currentUser y limpiar los datos
      toast.dismiss('signout-toast');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("Sign out error:", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Sign out failed: ${supabaseErrorMessage}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        loadingAuth,
        patients,
        medications,
        addMedication,
        updateMedication,
        deleteMedication,
        getMedicationById,
        appointments,
        vitalSigns,
        medicationIntakes,
        loadingData,
        setCurrentUser,
        addPatient,
        updatePatient,
        deletePatient,
        getPatientById,
        signOut,
        loadInitialData
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