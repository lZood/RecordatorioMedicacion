// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile, Doctor } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes';
import { User, Subscription, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { medicationIntakeService } from '../services/medicationIntakes';
import { profileService } from '../services/profiles';
import toast from 'react-hot-toast';
import { authService } from '../services/auth';

interface AppContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  loadingData: boolean;
  loadingProfile: boolean;

  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  medications: Medication[];
  addMedication: (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>) => Promise<Medication | undefined>;
  updateMedication: (id: string, updatedMedicationData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;
  
  appointments: Appointment[];
  doctors: UserProfile[];
  loadingAppointments: boolean;
  loadingDoctors: boolean;
  addAppointment: (appointmentData: Omit<Appointment, 'id'>) => Promise<Appointment | undefined>;
  updateAppointment: (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined;

  vitalSigns: VitalSign[];
  loadingVitalSigns: boolean;
  addVitalSign: (vitalSignData: Omit<VitalSign, 'id'>) => Promise<VitalSign | undefined>;
  updateVitalSign: (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => Promise<void>;
  deleteVitalSign: (id: string) => Promise<void>;
  fetchVitalSignsForPatient: (patientId: string) => Promise<VitalSign[]>;
  
  medicationIntakes: MedicationIntakeWithMedication[];
  loadingMedicationIntakes: boolean;
  addMedicationIntake: (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MedicationIntakeWithMedication | undefined>;
  updateMedicationIntake: (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>) => Promise<MedicationIntakeWithMedication | undefined>;
  deleteMedicationIntake: (id: string) => Promise<void>;
  fetchMedicationIntakesForPatient: (patientId: string) => Promise<MedicationIntakeWithMedication[]>;

  signOut: () => Promise<void>;
  // loadInitialData ya no se expone directamente, el useEffect lo maneja internamente.
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false); 
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const [loadingMedicationIntakes, setLoadingMedicationIntakes] = useState(false);

  // Ref para almacenar el ID del usuario anterior y evitar recargas innecesarias
  const previousAuthUserIdRef = useRef<string | null | undefined>(undefined);


  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) { 
      setUserProfile(null); 
      return null; 
    }
    setLoadingProfile(true);
    try {
      console.log(`AppContext: Fetching profile for user ID: ${userId}`);
      const profile = await profileService.getProfileByUserId(userId);
      setUserProfile(profile); // profile puede ser null si no se encuentra
      console.log("AppContext: User profile fetched:", profile);
      return profile;
    } catch (error) { 
      console.error("AppContext: Error fetching user profile:", error); 
      setUserProfile(null); 
      return null;
    } finally { 
      setLoadingProfile(false); 
    }
  }, []); // Sin dependencias, función estable

  // Renombrada para uso interno y memoizada
  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      console.log("AppContext: No authUser, clearing all app states.");
      setUserProfile(null); // Asegurar que el perfil también se limpia
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
      return;
    }
    console.log("AppContext: AuthUser present, attempting to load initial data for:", authUser.id);
    
    // Obtener el perfil del usuario. fetchUserProfile es estable.
    const fetchedProfile = userProfile?.id === authUser.id ? userProfile : await fetchUserProfile(authUser.id);

    setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); 
    setLoadingVitalSigns(true); setLoadingMedicationIntakes(true); // Aunque no se carguen globalmente, resetear loader
    try {
      const doctorsDataPromise = profileService.getAllDoctors(); 
      let dataPromises: Promise<any>[] = [doctorsDataPromise];
      
      if (fetchedProfile?.role === 'doctor') {
        console.log("AppContext: User is a doctor, queueing doctor-specific data loading.");
        dataPromises = [
          ...dataPromises,
          patientService.getAll(),
          medicationService.getAll(), 
          appointmentService.getAll(),
          vitalSignService.getAll(),
          // MedicationIntakes se cargan bajo demanda en PatientDetails, no globalmente aquí.
        ];
      } else {
        console.log(`AppContext: User role is not 'doctor' (role: ${fetchedProfile?.role}). Skipping doctor-specific data sets.`);
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]);
        // Rellenar promesas para que Promise.all tenga la estructura esperada si no es doctor
        dataPromises = [doctorsDataPromise, Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
      }
      
      const [
        resolvedDoctorsData,
        patientsData, medicationsData, appointmentsData,
        vitalSignsData, 
      ] = await Promise.all(dataPromises);

      setDoctors(resolvedDoctorsData || []);
      
      if (fetchedProfile?.role === 'doctor') {
        setPatients(patientsData || []);
        setMedications(medicationsData || []);
        setAppointments(appointmentsData || []);
        setVitalSigns(vitalSignsData || []);
      }
      // MedicationIntakes se mantiene vacío o se gestiona localmente en PatientDetails.
      setMedicationIntakes([]); 

    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
    }
  }, [fetchUserProfile, userProfile]); // Depende de fetchUserProfile y userProfile para la optimización
  
  useEffect(() => {
    setLoadingAuth(true);
    let subscription: Subscription | undefined;

    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      
      setCurrentUser(authUser);
      previousAuthUserIdRef.current = authUser?.id; // Inicializar ref
      
      if (authUser) {
        await internalLoadInitialData(authUser);
      } else {
        await internalLoadInitialData(null); // Limpiar estados si no hay sesión inicial
      }
      setLoadingAuth(false);

      const { data: authListenerData } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newAuthUser = session?.user ?? null;
        const newAuthUserId = newAuthUser?.id;

        console.log(
          "AppContext: Auth state changed. Event:", _event,
          "New User ID:", newAuthUserId,
          "Previous User ID:", previousAuthUserIdRef.current,
          "Current User ID in state:", currentUser?.id
        );

        // Solo actuar si el ID del usuario ha cambiado realmente, o en eventos explícitos de login/logout.
        if (newAuthUserId !== previousAuthUserIdRef.current || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
          console.log("AppContext: User ID changed or critical auth event. Updating user and reloading all data.");
          setCurrentUser(newAuthUser); // Actualizar currentUser
          previousAuthUserIdRef.current = newAuthUserId; // Actualizar la referencia
          await internalLoadInitialData(newAuthUser); // Recargar todos los datos
        } else if (_event === 'USER_UPDATED' && newAuthUser && newAuthUser.id === previousAuthUserIdRef.current) {
          // Si el usuario es el mismo pero sus metadatos podrían haber cambiado
          console.log("AppContext: Event USER_UPDATED for current user. Refetching profile.");
          setCurrentUser(newAuthUser); // Actualizar el objeto currentUser por si tiene nuevos metadatos
          await fetchUserProfile(newAuthUser.id); // Solo recargar el perfil
        } else if (_event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
            // Para TOKEN_REFRESHED o INITIAL_SESSION (si el ID no cambió),
            // podríamos verificar si el objeto currentUser necesita actualizarse sin recargar todo.
            if (newAuthUser && JSON.stringify(newAuthUser) !== JSON.stringify(currentUser)){
                console.log("AppContext: Token refreshed or initial session with same user but different user object. Updating currentUser.");
                setCurrentUser(newAuthUser);
            } else {
                console.log("AppContext: Token refreshed or initial session with same user. No full reload needed.");
            }
        }
      });
      subscription = authListenerData.subscription;
    };

    checkSessionAndSubscribe();

    return () => {
      subscription?.unsubscribe();
    };
  // internalLoadInitialData y fetchUserProfile están memoizadas.
  // currentUser se añade para que el bloque USER_UPDATED pueda comparar con el estado actual.
  }, [internalLoadInitialData, fetchUserProfile, currentUser]);


  // --- CRUD Pacientes ---
  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Patient>): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const deletePatient = useCallback(async (id: string): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const getPatientById = useCallback((id: string): Patient | undefined => patients.find(p => p.id === id), [patients]);

  // --- CRUD Medicamentos ---
  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Medication | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const updateMedication = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const deleteMedication = useCallback(async (id: string): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const getMedicationById = useCallback((id: string): Medication | undefined => medications.find(m => m.id === id), [medications]);

  // --- CRUD Citas (Appointments) ---
  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const updateAppointment = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => { /* ... */ }, [currentUser, userProfile, appointments]);
  const deleteAppointment = useCallback(async (id: string): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const getAppointmentById = useCallback((id: string): Appointment | undefined => appointments.find(app => app.id === id), [appointments]);

  // --- CRUD para Signos Vitales (VitalSigns) ---
  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const updateVitalSign = useCallback(async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => { /* ... */ }, [currentUser, userProfile]);
  const deleteVitalSign = useCallback(async (id: string): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const fetchVitalSignsForPatient = useCallback(async (patientId: string): Promise<VitalSign[]> => { /* ... */ return []; }, [currentUser, userProfile]);

  // --- CRUD para Tomas de Medicamentos (MedicationIntakes) ---
  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const updateMedicationIntake = useCallback(async (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | undefined> => { /* ... */ return undefined; }, [currentUser, userProfile]);
  const deleteMedicationIntake = useCallback(async (id: string): Promise<void> => { /* ... */ }, [currentUser, userProfile]);
  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => { /* ... */ return []; }, [currentUser, userProfile]);

  const signOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      // onAuthStateChange se encargará de limpiar currentUser y llamar a internalLoadInitialData(null)
      toast.dismiss('signout-toast');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("AppContext: Sign out error:", error);
      toast.error(`Sign out failed: ${error.message || 'Unknown error'}`);
    }
  }, []);

  // Exponer la versión estable de loadInitialData si algún componente externo la necesita,
  // aunque generalmente la carga de datos es interna y se activa por cambios de autenticación.
  const stableLoadInitialData = useCallback(internalLoadInitialData, [internalLoadInitialData]);

  return (
    <AppContext.Provider
      value={{
        currentUser, userProfile, loadingAuth, loadingData, loadingProfile,
        patients, addPatient, updatePatient, deletePatient, getPatientById,
        medications, addMedication, updateMedication, deleteMedication, getMedicationById,
        appointments, doctors, loadingAppointments, loadingDoctors,
        addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
        vitalSigns, loadingVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign, fetchVitalSignsForPatient,
        medicationIntakes, loadingMedicationIntakes, addMedicationIntake, updateMedicationIntake, deleteMedicationIntake, fetchMedicationIntakesForPatient,
        signOut,
        loadInitialData: stableLoadInitialData, // Exponer la versión estable si es necesario
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
