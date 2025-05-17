// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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
  updateMedication: (id: string, updatedPatientData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
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
  // loadInitialData no se expone directamente si la carga es interna y automática
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // True until first auth event is processed
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

  const previousAuthUserIdRef = useRef<string | null | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) { 
      if (isMountedRef.current) setUserProfile(null); 
      return null; 
    }
    if (isMountedRef.current) setLoadingProfile(true);
    try {
      console.log(`AppContext: Fetching profile for user ID: ${userId}`);
      const profile = await profileService.getProfileByUserId(userId);
      if (isMountedRef.current) setUserProfile(profile);
      console.log("AppContext: User profile fetched:", profile);
      return profile;
    } catch (error) { 
      console.error("AppContext: Error fetching user profile:", error); 
      if (isMountedRef.current) setUserProfile(null); 
      return null;
    } finally { 
      if (isMountedRef.current) setLoadingProfile(false); 
    }
  }, []); // Estable

  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!isMountedRef.current) return;

    if (!authUser) {
      console.log("AppContext: No authUser for internalLoadInitialData, clearing all app states.");
      if (isMountedRef.current) {
        setUserProfile(null);
        setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
        setVitalSigns([]); setMedicationIntakes([]);
        setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
        setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
      }
      return;
    }
    console.log("AppContext: AuthUser present, attempting to load initial data for:", authUser.id);
    
    const fetchedProfile = await fetchUserProfile(authUser.id);
    if (!isMountedRef.current) return;

    if (isMountedRef.current) {
        setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); 
        setLoadingVitalSigns(true); setLoadingMedicationIntakes(true);
    }
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
        ];
      } else {
        console.log(`AppContext: User role is not 'doctor' (role: ${fetchedProfile?.role}). Skipping doctor-specific data sets.`);
        if(isMountedRef.current) {
            setPatients([]); setMedications([]); setAppointments([]);
            setVitalSigns([]); setMedicationIntakes([]);
        }
        dataPromises = [doctorsDataPromise, Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
      }
      
      const results = await Promise.all(dataPromises);
      if (!isMountedRef.current) return;

      const [
        resolvedDoctorsData,
        patientsData, medicationsData, appointmentsData,
        vitalSignsData, 
      ] = results;

      if (isMountedRef.current) {
        setDoctors(resolvedDoctorsData || []);
        if (fetchedProfile?.role === 'doctor') {
            setPatients(patientsData || []);
            setMedications(medicationsData || []);
            setAppointments(appointmentsData || []);
            setVitalSigns(vitalSignsData || []);
        }
        setMedicationIntakes([]); 
      }
    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      if (isMountedRef.current) toast.error("Could not load app data. Check console for details.");
    } finally {
      if (isMountedRef.current) {
        setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
        setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
      }
    }
  }, [fetchUserProfile]);
  
  useEffect(() => {
    setLoadingAuth(true); // Indicar que la autenticación está en proceso al inicio del efecto
    isMountedRef.current = true;
    let subscription: Subscription | undefined;

    console.log("AppContext: useEffect for onAuthStateChange - Subscribing.");

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMountedRef.current) {
          console.log("AppContext: onAuthStateChange called but component unmounted. Skipping.");
          return;
        }

        const newAuthUser = session?.user ?? null;
        const newAuthUserId = newAuthUser?.id;
        const oldAuthUserId = previousAuthUserIdRef.current;

        console.log(
          "AppContext: onAuthStateChange. Event:", _event,
          "NewUID:", newAuthUserId,
          "OldUID:", oldAuthUserId,
          "Current loadingAuth:", loadingAuth
        );

        setCurrentUser(newAuthUser); // Siempre actualizar currentUser

        if (loadingAuth) { // Este es el primer evento que establece el estado de autenticación inicial
          console.log("AppContext: First auth event processed. Event:", _event, "NewUID:", newAuthUserId);
          previousAuthUserIdRef.current = newAuthUserId;
          await internalLoadInitialData(newAuthUser);
          if (isMountedRef.current) setLoadingAuth(false);
        } else { // El estado de autenticación ya se inicializó, esto es un cambio subsiguiente
          if (newAuthUserId !== oldAuthUserId) {
            // El ID del usuario realmente cambió (login nuevo, logout)
            console.log(`AppContext: User ID actually changed. Old: ${oldAuthUserId}, New: ${newAuthUserId}. Event: ${_event}. Reloading all data.`);
            previousAuthUserIdRef.current = newAuthUserId;
            await internalLoadInitialData(newAuthUser);
          } else if (newAuthUser) { // El ID del usuario es el mismo, pero ocurrió un evento
            if (_event === 'USER_UPDATED') {
              console.log("AppContext: Event USER_UPDATED for current user. Refetching profile.");
              await fetchUserProfile(newAuthUser.id);
            } else if (_event === 'TOKEN_REFRESHED') {
              console.log(`AppContext: Event TOKEN_REFRESHED for current user ${newAuthUserId}. currentUser object updated. Profile should be current.`);
              // No es necesario recargar todos los datos; el token se maneja internamente por Supabase client.
              // El perfil ya debería estar cargado si el usuario no cambió.
            }
            // No se necesita una acción específica para INITIAL_SESSION si el user ID no cambió y loadingAuth ya es false,
            // ya que la carga inicial de datos ya habría ocurrido.
          }
        }
      }
    );
    subscription = authListenerData.subscription;
    
    // Obtener la sesión inicial para establecer previousAuthUserIdRef y potencialmente loadingAuth
    // Esto ayuda a asegurar que loadingAuth se ponga en false si no hay sesión y onAuthStateChange no se dispara con INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMountedRef.current && loadingAuth) { // Solo actuar si aún estamos en la fase de carga de autenticación
            const authUser = session?.user ?? null;
            if (previousAuthUserIdRef.current === undefined) { // Si onAuthStateChange no lo ha seteado aún
                previousAuthUserIdRef.current = authUser?.id;
                console.log("AppContext: Initial getSession (fallback) set previousAuthUserIdRef to:", authUser?.id);
            }
            if (!authUser && !currentUser) { // Si no hay sesión y onAuthStateChange tampoco ha encontrado una
                console.log("AppContext: Initial getSession found no user, and onAuthStateChange hasn't set one. Setting loadingAuth to false.");
                setLoadingAuth(false); 
                internalLoadInitialData(null); // Limpiar datos si es necesario
            }
        }
    });


    return () => {
      isMountedRef.current = false;
      console.log("AppContext: Unsubscribing from onAuthStateChange.");
      subscription?.unsubscribe();
    };
  }, [internalLoadInitialData, fetchUserProfile]); // Dependencias estables

  // --- CRUD Pacientes ---
  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Only doctors can add patients."); throw new Error("User not authorized or not a doctor."); }
    try {
      const patientDataWithDoctorId: Omit<Patient, 'id' | 'createdAt'> = { ...patientData, doctorId: currentUser.id };
      const newPatient = await patientService.create(patientDataWithDoctorId);
      if (newPatient && isMountedRef.current) { setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name))); toast.success('Patient added successfully!'); return newPatient; }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to add patient: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Patient>): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated && isMountedRef.current) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Patient updated successfully!');
        }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to update patient: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await patientService.delete(id);
        if (isMountedRef.current) {
            setPatients(prev => prev.filter(p => p.id !== id));
            toast.success('Patient deleted successfully!');
        }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to delete patient: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getPatientById = useCallback((id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  }, [patients]);

  // --- CRUD Medicamentos ---
  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Medication | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Only doctors can add medications."); throw new Error("User not authorized or not a doctor."); }
    if (!currentUser.id) { toast.error("Doctor ID is missing. Cannot add medication."); throw new Error("Doctor ID is missing.");}
    try {
      const medicationDataWithDoctorId: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = { ...medicationData, doctorId: currentUser.id };
      const newMed = await medicationService.create(medicationDataWithDoctorId);
      if (newMed && isMountedRef.current) { 
        setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name))); 
        toast.success('Medication added successfully!'); 
        return newMed; 
      }
    } catch (error: any) { 
      console.error("AppContext.addMedication: Error:", error);
      if (isMountedRef.current) toast.error(`Failed to add medication: ${error.message || 'Unknown error'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updateMedication = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated && isMountedRef.current) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication updated successfully!');
        }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to update medication: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteMedication = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await medicationService.delete(id);
        if (isMountedRef.current) {
            setMedications(prev => prev.filter(m => m.id !== id));
            toast.success('Medication deleted successfully!');
        }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to delete medication: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getMedicationById = useCallback((id: string): Medication | undefined => {
    return medications.find(m => m.id === id);
  }, [medications]);

  // --- CRUD Citas (Appointments) ---
  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    const dataWithCorrectDoctor = { ...appointmentData, doctorId: currentUser.id };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment && isMountedRef.current) {
        const enrichedAppointment = await appointmentService.getById(newAppointment.id);
        if (isMountedRef.current) {
            if (enrichedAppointment) {
                setAppointments(prev => [...prev, enrichedAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
                toast.success('Appointment scheduled!');
                return enrichedAppointment;
            } 
            setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled (basic details)!');
            return newAppointment;
        }
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to schedule appointment: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateAppointment = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      const currentAppointment = appointments.find(app => app.id === id);
      if (currentAppointment && appointmentUpdateData.doctorId && appointmentUpdateData.doctorId !== currentUser.id) {
            if (isMountedRef.current) toast.error("Cannot reassign appointment to another doctor.");
            throw new Error("Cannot reassign appointment to another doctor.");
      }
      const finalUpdateData = {...appointmentUpdateData, doctorId: currentUser.id}; 
      const updatedApp = await appointmentService.update(id, finalUpdateData);
      if (updatedApp && isMountedRef.current) {
        const enrichedAppointment = await appointmentService.getById(updatedApp.id);
        if (isMountedRef.current) {
            if (enrichedAppointment) {
                setAppointments(prev => prev.map(app => (app.id === id ? enrichedAppointment : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            } else { 
                setAppointments(prev => prev.map(app => (app.id === id ? {...app, ...updatedApp} : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            }
            toast.success('Appointment updated!');
        }
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to update appointment: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile, appointments]);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      await appointmentService.delete(id);
      if (isMountedRef.current) {
        setAppointments(prev => prev.filter(app => app.id !== id));
        toast.success('Appointment deleted!');
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to delete appointment: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getAppointmentById = useCallback((id: string): Appointment | undefined => {
    return appointments.find(app => app.id === id);
  }, [appointments]);

  // --- CRUD para Signos Vitales (VitalSigns) ---
  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const newVitalSign = await vitalSignService.create(vitalSignData);
      if (newVitalSign && isMountedRef.current) {
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign recorded successfully!');
        return newVitalSign;
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to record vital sign: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateVitalSign = useCallback(async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign && isMountedRef.current) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign updated successfully!');
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to update vital sign: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteVitalSign = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      await vitalSignService.delete(id);
      if (isMountedRef.current) {
        setVitalSigns(prev => prev.filter(vs => vs.id !== id));
        toast.success('Vital sign deleted successfully!');
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to delete vital sign: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);
  
  const fetchVitalSignsForPatient = useCallback(async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    if (isMountedRef.current) setLoadingVitalSigns(true);
    try {
        const data = await vitalSignService.getByPatient(patientId);
        return data;
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to get vital signs for patient: ${error.message || 'Unknown error'}`); throw error; }
    finally { if (isMountedRef.current) setLoadingVitalSigns(false); }
  }, [currentUser, userProfile]);

  // --- CRUD para Tomas de Medicamentos (MedicationIntakes) ---
  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake && isMountedRef.current) {
        setMedicationIntakes(prev => [...prev, newIntake].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Medication intake scheduled/recorded!');
        return newIntake;
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to add medication intake: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateMedicationIntake = useCallback(async (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const updatedIntake = await medicationIntakeService.update(id, intakeUpdateData);
      if (updatedIntake && isMountedRef.current) {
        setMedicationIntakes(prev => prev.map(i => (i.id === id ? updatedIntake : i))
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Medication intake updated!');
        return updatedIntake;
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to update intake: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const deleteMedicationIntake = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      await medicationIntakeService.delete(id);
      if (isMountedRef.current) {
        setMedicationIntakes(prev => prev.filter(i => i.id !== id));
        toast.success('Medication intake deleted successfully!');
      }
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to delete intake: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => {
    if (!currentUser || !userProfile || userProfile.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    if (isMountedRef.current) setLoadingMedicationIntakes(true);
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data;
    } catch (error: any) { if (isMountedRef.current) toast.error(`Failed to get medication intakes for patient: ${error.message || 'Unknown error'}`); throw error; }
    finally { if (isMountedRef.current) setLoadingMedicationIntakes(false); }
  }, [currentUser, userProfile]);

  const signOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      if (isMountedRef.current) {
        toast.dismiss('signout-toast');
        toast.success('Signed out successfully!');
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        toast.dismiss('signout-toast');
        console.error("AppContext: Sign out error:", error);
        toast.error(`Sign out failed: ${error.message || 'Unknown error'}`);
      }
    }
  }, []);

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
        // No exponer loadInitialData directamente si es solo para uso interno
        // loadInitialData: internalLoadInitialData, 
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
