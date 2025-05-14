// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types'; // Tus tipos
import { User } from '@supabase/supabase-js'; // Tipo User de Supabase
import { supabase } from '../lib/supabase'; // Cliente Supabase
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { medicationIntakeService } from '../services/medicationIntakes';
import toast from 'react-hot-toast';

interface AppContextType {
  currentUser: User | null;
  loadingAuth: boolean; // Para saber si se está verificando la sesión
  patients: Patient[];
  medications: Medication[];
  appointments: Appointment[];
  vitalSigns: VitalSign[];
  medicationIntakes: MedicationIntake[];
  loadingData: boolean; // Para la carga de datos principales
  setCurrentUser: (user: User | null) => void;
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  // Añade aquí las funciones para las otras entidades (Medication, Appointment, etc.)
  // ...
  signOut: () => Promise<void>;
  loadInitialData: () => Promise<void>; // Función para cargar datos
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Inicia como true para verificar sesión
  const [loadingData, setLoadingData] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>([]);

  // Verificar sesión al montar el AppProvider
  useEffect(() => {
    const checkSession = async () => {
      setLoadingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        await loadInitialData(session.user); // Carga datos si hay sesión
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    };
    checkSession();

    // Escuchar cambios en el estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoadingAuth(true);
      if (session) {
        setCurrentUser(session.user);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') { // Cargar datos al iniciar sesión o refrescar token
            await loadInitialData(session.user);
        }
      } else {
        setCurrentUser(null);
        // Limpiar datos si el usuario cierra sesión
        setPatients([]);
        setMedications([]);
        setAppointments([]);
        setVitalSigns([]);
        setMedicationIntakes([]);
      }
      setLoadingAuth(false);
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);


  const loadInitialData = async (user: User | null = currentUser) => {
    if (!user) { // Solo cargar si hay un usuario autenticado
        console.log("No user, skipping data load.");
        return;
    }
    console.log("Loading initial data for user:", user.id);
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
        medicationService.getAll(),
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
      toast.error(`Failed to add patient: ${error.message}`);
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
      toast.error(`Failed to update patient: ${error.message}`);
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
      toast.error(`Failed to delete patient: ${error.message}`);
      throw error;
    }
  };


  const getPatientById = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  const signOut = async () => {
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      await authService.signOut();
      setCurrentUser(null);
      // Limpiar estados de datos
      setPatients([]);
      setMedications([]);
      setAppointments([]);
      setVitalSigns([]);
      setMedicationIntakes([]);
      toast.dismiss('signout-toast');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("Sign out error:", error);
      toast.error(`Sign out failed: ${error.message}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        loadingAuth,
        patients,
        medications,
        appointments,
        vitalSigns,
        medicationIntakes,
        loadingData,
        setCurrentUser, // Asegúrate que se pasa en el contexto
        addPatient,
        updatePatient,
        deletePatient,
        getPatientById,
        // ... otras funciones ...
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