// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, Doctor } from '../types'; // Asegúrate que Doctor esté importado
import { User, Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { medicationIntakeService } from '../services/medicationIntakes';
import { profileService } from '../services/profiles'; // Importa profileService
import toast from 'react-hot-toast';
import { authService } from '../services/auth';

interface AppContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  loadingData: boolean; // Carga general de datos

  // Patients
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  // Medications
  medications: Medication[];
  addMedication: (medicationData: Omit<Medication, 'id'>) => Promise<Medication | undefined>;
  updateMedication: (id: string, updatedMedicationData: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;

  // Appointments
  appointments: Appointment[]; // Considera usar AppointmentWithDetails si tienes datos anidados
  doctors: Doctor[];
  loadingAppointments: boolean;
  loadingDoctors: boolean;
  addAppointment: (appointmentData: Omit<Appointment, 'id'>) => Promise<Appointment | undefined>;
  updateAppointment: (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined;

  // VitalSigns & MedicationIntakes
  vitalSigns: VitalSign[];
  medicationIntakes: MedicationIntake[];
  // Podrías añadir funciones CRUD para VitalSigns y MedicationIntakes aquí si es necesario

  // Auth
  setCurrentUser: (user: User | null) => void; // Aunque onAuthStateChange lo maneja principalmente
  signOut: () => Promise<void>;
  loadInitialData: (userOverride?: User | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false); // Carga general

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]); // O AppointmentWithDetails[]
  const [doctors, setDoctors] = useState<Doctor[]>([]); // Estado para doctores
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false); // Estados de carga específicos
  const [loadingDoctors, setLoadingDoctors] = useState(false);


  const loadInitialData = async (userOverride?: User | null) => {
    const userToUse = userOverride !== undefined ? userOverride : currentUser;

    if (!userToUse) {
      console.log("AppContext: No user session, skipping data load.");
      setPatients([]);
      setMedications([]);
      setAppointments([]);
      setDoctors([]); // Limpiar doctores también
      setVitalSigns([]);
      setMedicationIntakes([]);
      setLoadingData(false);
      setLoadingAppointments(false);
      setLoadingDoctors(false);
      return;
    }
    console.log("AppContext: Loading initial data for user:", userToUse.id);
    setLoadingData(true);
    setLoadingAppointments(true);
    setLoadingDoctors(true);
    try {
      const [
        patientsData,
        medicationsData,
        appointmentsData,
        vitalSignsData,
        medicationIntakesData,
        doctorsData, // Destructurar doctorsData
      ] = await Promise.all([
        patientService.getAll(),
        medicationService.getAll(),
        appointmentService.getAll(),
        vitalSignService.getAll(),
        medicationIntakeService.getAll(),
        profileService.getAllDoctors(), // Llamada al servicio de perfiles
      ]);

      setPatients(patientsData || []);
      setMedications(medicationsData || []);
      setAppointments(appointmentsData || []);
      setVitalSigns(vitalSignsData || []);
      setMedicationIntakes(medicationIntakesData || []);
      setDoctors(doctorsData || []); // Establecer el estado de doctores

    } catch (error) {
      console.error("AppContext: Error loading initial data:", error); // Este log es clave
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false);
      setLoadingAppointments(false);
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    setLoadingAuth(true);
    let subscription: Subscription | undefined;

    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // setCurrentUser(session?.user ?? null); // Establece el usuario basado en la sesión
      if (session) {
        setCurrentUser(session.user); // Ya lo haces bien
        await loadInitialData(session.user);
      } else {
        setCurrentUser(null);
        await loadInitialData(null);
      }
      setLoadingAuth(false);

      const { data: authListenerData } = supabase.auth.onAuthStateChange(async (event, session) => {
        setCurrentUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === "INITIAL_SESSION" && session)) {
          await loadInitialData(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          await loadInitialData(null);
        }
      });
      subscription = authListenerData.subscription;
    };

    checkSessionAndSubscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);


  // --- CRUD Pacientes ---
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    const newPatient = await patientService.create(patientData);
    if (newPatient) setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name)));
    return newPatient;
  };
  const updatePatient = async (id: string, updatedData: Partial<Patient>) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    const updated = await patientService.update(id, updatedData);
    if (updated) setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
  };
  const deletePatient = async (id: string) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    await patientService.delete(id);
    setPatients(prev => prev.filter(p => p.id !== id));
  };
  const getPatientById = (id: string) => patients.find(p => p.id === id);

  // --- CRUD Medicamentos ---
  const addMedication = async (medData: Omit<Medication, 'id'>) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    const newMed = await medicationService.create(medData);
    if (newMed) setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name)));
    return newMed;
  };
  const updateMedication = async (id: string, updatedData: Partial<Medication>) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    const updated = await medicationService.update(id, updatedData);
    if (updated) setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
  };
  const deleteMedication = async (id: string) => {
    if (!currentUser) { /* ... */ throw new Error("Auth required"); }
    await medicationService.delete(id);
    setMedications(prev => prev.filter(m => m.id !== id));
  };
  const getMedicationById = (id: string) => medications.find(m => m.id === id);


  // --- CRUD Citas (Appointments) ---
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      const newAppointment = await appointmentService.create(appointmentData);
      if (newAppointment) {
        // Para obtener los datos anidados de patient y doctor, podrías recargar o confiar en la próxima carga
        // O si create ya los devuelve enriquecidos (como lo configuramos en el servicio), está bien.
        const enrichedAppointment = await appointmentService.getById(newAppointment.id); // Recarga para obtener datos anidados
        if (enrichedAppointment) {
            setAppointments(prev => [...prev, enrichedAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled!');
            return enrichedAppointment;
        } else {
            // Si getById falla, añade el newAppointment básico
            setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled (basic details)!');
            return newAppointment;
        }
      }
    } catch (error: any) { toast.error(`Failed: ${error.message}`); throw error; }
    return undefined;
  };

  const updateAppointment = async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser) { /* ... */ throw new Error("User not authenticated"); }
    try {
      const updatedApp = await appointmentService.update(id, appointmentUpdateData);
      if (updatedApp) {
        const enrichedAppointment = await appointmentService.getById(updatedApp.id); // Recarga para obtener datos anidados
         if (enrichedAppointment) {
            setAppointments(prev => prev.map(app => (app.id === id ? enrichedAppointment : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         } else {
            setAppointments(prev => prev.map(app => (app.id === id ? {...app, ...updatedApp} : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         }
        toast.success('Appointment updated!');
      }
    } catch (error: any) { toast.error(`Failed: ${error.message}`); throw error; }
  };

  const deleteAppointment = async (id: string) => {
    if (!currentUser) { /* ... */ throw new Error("User not authenticated"); }
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      toast.success('Appointment deleted!');
    } catch (error: any) { toast.error(`Failed: ${error.message}`); throw error; }
  };

  const getAppointmentById = (id: string) => appointments.find(app => app.id === id);


  const signOut = async () => {
    // ... (tu función signOut existente)
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      await authService.signOut();
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
        loadingData,
        patients, addPatient, updatePatient, deletePatient, getPatientById,
        medications, addMedication, updateMedication, deleteMedication, getMedicationById,
        appointments, doctors, loadingAppointments, loadingDoctors,
        addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
        vitalSigns,
        medicationIntakes,
        setCurrentUser,
        signOut,
        loadInitialData,
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
