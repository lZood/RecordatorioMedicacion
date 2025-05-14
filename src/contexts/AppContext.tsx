// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types'; // Tus tipos
import { User, Subscription } from '@supabase/supabase-js'; // Importa Subscription
import { supabase } from '../lib/supabase'; // Cliente Supabase
import { patientService } from '../services/patients';
import { Medication } from '../types';
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
  const addMedication = async (medicationData: Omit<Medication, 'id'>) => {
    if (!currentUser) {
      toast.error("You must be logged in to add a medication.");
      throw new Error("User not authenticated");
    }
    try {
      // Tu tipo Medication no tiene createdAt, pero Supabase lo añade por defecto.
      // El servicio medicationService.create espera Omit<Medication, 'id' | 'createdAt'>
      // Si tu tipo Medication no tiene 'createdAt', está bien.
      // Solo asegúrate de que el objeto que pasas a medicationService.create coincida.
      // La migración de Supabase tiene 'created_at' y 'updated_at' para medications.
      // Tu tipo 'Medication' en src/types/index.ts no los incluye. Podrías añadirlos si quieres usarlos en el frontend.
      // Por ahora, asumiré que el servicio espera datos sin createdAt y que Supabase lo maneja.

      // Si medicationService.create espera Omit<Medication, 'id' | 'createdAt'>
      // y tu tipo Medication es { id, name, activeIngredient, expirationDate, description }
      // entonces está bien pasar medicationData que omite 'id'.
      const newMedication = await medicationService.create(medicationData);
      if (newMedication) {
        setMedications(prevMeds => [...prevMeds, newMedication]);
        toast.success('Medication added successfully!');
        return newMedication;
      }
    } catch (error: any) {
      console.error("Error adding medication (AppContext):", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to add medication: ${supabaseErrorMessage}`);
      throw error;
    }
  };

  const updateMedication = async (id: string, updatedMedicationData: Partial<Medication>) => {
    if (!currentUser) {
      toast.error("You must be logged in to update a medication.");
      throw new Error("User not authenticated");
    }
    try {
      const updatedMedication = await medicationService.update(id, updatedMedicationData);
      if (updatedMedication) {
        setMedications(prevMeds =>
          prevMeds.map(med => (med.id === id ? { ...med, ...updatedMedication } : med))
        );
        toast.success('Medication updated successfully!');
      }
    } catch (error: any) {
      console.error("Error updating medication:", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to update medication: ${supabaseErrorMessage}`);
      throw error;
    }
  };

  const deleteMedication = async (id: string) => {
     if (!currentUser) {
      toast.error("You must be logged in to delete a medication.");
      throw new Error("User not authenticated");
    }
    try {
      await medicationService.delete(id);
      setMedications(prevMeds => prevMeds.filter(med => med.id !== id));
      toast.success('Medication deleted successfully!');
    } catch (error: any) {
      console.error("Error deleting medication:", error);
      const supabaseErrorMessage = error?.message || "An unknown error occurred.";
      toast.error(`Failed to delete medication: ${supabaseErrorMessage}`);
      throw error;
    }
  };

  const getMedicationById = (id: string) => {
    return medications.find(med => med.id === id);
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