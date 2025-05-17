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
  loadInitialData: (user: User | null) => Promise<void>; // Exponer la función de carga si es necesaria externamente
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
      setUserProfile(profile);
      console.log("AppContext: User profile fetched:", profile);
      return profile;
    } catch (error) { 
      console.error("AppContext: Error fetching user profile:", error); 
      setUserProfile(null); 
      return null;
    } finally { 
      setLoadingProfile(false); 
    }
  }, []); // Estable

  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      console.log("AppContext: No authUser, clearing all app states.");
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
      return;
    }
    console.log("AppContext: AuthUser present, attempting to load initial data for:", authUser.id);
    
    const fetchedProfile = await fetchUserProfile(authUser.id); // fetchUserProfile es estable

    setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); 
    setLoadingVitalSigns(true); setLoadingMedicationIntakes(true);
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
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]);
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
      setMedicationIntakes([]); 

    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false);
    }
  }, [fetchUserProfile]); // Ahora solo depende de fetchUserProfile (estable)
  
  useEffect(() => {
    setLoadingAuth(true);
    let isMounted = true;
    let subscription: Subscription | undefined;

    const initialSetup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      const authUser = session?.user ?? null;
      setCurrentUser(authUser);
      previousAuthUserIdRef.current = authUser?.id;
      
      if (authUser) {
        console.log("AppContext: Initial session check - user found. Loading initial data.");
        await internalLoadInitialData(authUser);
      } else {
        console.log("AppContext: Initial session check - no user. Clearing data.");
        await internalLoadInitialData(null);
      }
      setLoadingAuth(false);
    };

    initialSetup();

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        console.log("AppContext: Auth state change received. Event:", _event, "Session User ID:", session?.user?.id);

        const newAuthUser = session?.user ?? null;
        const newAuthUserId = newAuthUser?.id;

        // Siempre actualizar currentUser para reflejar el estado más reciente de Supabase Auth
        setCurrentUser(newAuthUser);

        if (newAuthUserId !== previousAuthUserIdRef.current) {
          console.log(`AppContext: User ID changed. Old: ${previousAuthUserIdRef.current}, New: ${newAuthUserId}. Event: ${_event}. Reloading all data.`);
          previousAuthUserIdRef.current = newAuthUserId;
          await internalLoadInitialData(newAuthUser); // Esto cargará el perfil y los datos del doctor
        } else if (_event === 'USER_UPDATED' && newAuthUser) {
          console.log("AppContext: Event USER_UPDATED for current user. Refetching profile.");
          await fetchUserProfile(newAuthUser.id); // Solo recargar el perfil
        } else if ((_event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') && newAuthUser) {
          console.log(`AppContext: Event ${_event} for current user ${newAuthUserId}. Ensuring profile is loaded if not already.`);
          // Si el perfil no está cargado o es de un usuario diferente (poco probable aquí), recargarlo.
          if (!userProfile || userProfile.id !== newAuthUserId) {
            await fetchUserProfile(newAuthUser.id);
          } else {
            console.log("AppContext: Profile already loaded for current user. No full data reload needed for TOKEN_REFRESHED/INITIAL_SESSION.");
          }
        }
      }
    );
    subscription = authListenerData.subscription;

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [internalLoadInitialData, fetchUserProfile]); // Dependencias estables

  // --- CRUD Pacientes ---
  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Only doctors can add patients."); throw new Error("User not authorized or not a doctor."); }
    try {
      const patientDataWithDoctorId: Omit<Patient, 'id' | 'createdAt'> = { ...patientData, doctorId: currentUser.id };
      const newPatient = await patientService.create(patientDataWithDoctorId);
      if (newPatient) { setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name))); toast.success('Patient added successfully!'); return newPatient; }
    } catch (error: any) { toast.error(`Failed to add patient: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Patient>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Patient updated successfully!');
        }
    } catch (error: any) { toast.error(`Failed to update patient: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await patientService.delete(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        toast.success('Patient deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete patient: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getPatientById = useCallback((id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  }, [patients]);

  // --- CRUD Medicamentos ---
  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Medication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Only doctors can add medications."); throw new Error("User not authorized or not a doctor."); }
    if (!currentUser.id) { toast.error("Doctor ID is missing. Cannot add medication."); throw new Error("Doctor ID is missing.");}
    try {
      const medicationDataWithDoctorId: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = { ...medicationData, doctorId: currentUser.id };
      const newMed = await medicationService.create(medicationDataWithDoctorId);
      if (newMed) { 
        setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name))); 
        toast.success('Medication added successfully!'); 
        return newMed; 
      }
    } catch (error: any) { 
      console.error("AppContext.addMedication: Error:", error);
      toast.error(`Failed to add medication: ${error.message || 'Unknown error'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updateMedication = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication updated successfully!');
        }
    } catch (error: any) { toast.error(`Failed to update medication: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteMedication = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await medicationService.delete(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        toast.success('Medication deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete medication: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getMedicationById = useCallback((id: string): Medication | undefined => {
    return medications.find(m => m.id === id);
  }, [medications]);

  // --- CRUD Citas (Appointments) ---
  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    const dataWithCorrectDoctor = { ...appointmentData, doctorId: currentUser.id };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        const enrichedAppointment = await appointmentService.getById(newAppointment.id);
        if (enrichedAppointment) {
            setAppointments(prev => [...prev, enrichedAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled!');
            return enrichedAppointment;
        } 
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Appointment scheduled (basic details)!');
        return newAppointment;
      }
    } catch (error: any) { toast.error(`Failed to schedule appointment: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateAppointment = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      const currentAppointment = appointments.find(app => app.id === id);
      if (currentAppointment && appointmentUpdateData.doctorId && appointmentUpdateData.doctorId !== currentUser.id) {
            toast.error("Cannot reassign appointment to another doctor.");
            throw new Error("Cannot reassign appointment to another doctor.");
      }
      const finalUpdateData = {...appointmentUpdateData, doctorId: currentUser.id}; 
      const updatedApp = await appointmentService.update(id, finalUpdateData);
      if (updatedApp) {
        const enrichedAppointment = await appointmentService.getById(updatedApp.id);
         if (enrichedAppointment) {
            setAppointments(prev => prev.map(app => (app.id === id ? enrichedAppointment : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         } else { 
            setAppointments(prev => prev.map(app => (app.id === id ? {...app, ...updatedApp} : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         }
         toast.success('Appointment updated!');
      }
    } catch (error: any) { toast.error(`Failed to update appointment: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile, appointments]);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      toast.success('Appointment deleted!');
    } catch (error: any) { toast.error(`Failed to delete appointment: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const getAppointmentById = useCallback((id: string): Appointment | undefined => {
    return appointments.find(app => app.id === id);
  }, [appointments]);

  // --- CRUD para Signos Vitales (VitalSigns) ---
  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const newVitalSign = await vitalSignService.create(vitalSignData);
      if (newVitalSign) {
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign recorded successfully!');
        return newVitalSign;
      }
    } catch (error: any) { toast.error(`Failed to record vital sign: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateVitalSign = useCallback(async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign updated successfully!');
      }
    } catch (error: any) { toast.error(`Failed to update vital sign: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteVitalSign = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      await vitalSignService.delete(id);
      setVitalSigns(prev => prev.filter(vs => vs.id !== id));
      toast.success('Vital sign deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete vital sign: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);
  
  const fetchVitalSignsForPatient = useCallback(async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    setLoadingVitalSigns(true); // Considerar si este loader global es el adecuado o si PatientDetails debe tener el suyo
    try {
        const data = await vitalSignService.getByPatient(patientId);
        return data;
    } catch (error: any) { toast.error(`Failed to get vital signs for patient: ${error.message || 'Unknown error'}`); throw error; }
    finally { setLoadingVitalSigns(false); }
  }, [currentUser, userProfile]);

  // --- CRUD para Tomas de Medicamentos (MedicationIntakes) ---
  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake) {
        // Actualizar estado global o dejar que PatientDetails maneje su propia lista si es preferible
        setMedicationIntakes(prev => [...prev, newIntake].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Medication intake scheduled/recorded!');
        return newIntake;
      }
    } catch (error: any) { toast.error(`Failed to add medication intake: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateMedicationIntake = useCallback(async (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      const updatedIntake = await medicationIntakeService.update(id, intakeUpdateData);
      if (updatedIntake) {
        setMedicationIntakes(prev => prev.map(i => (i.id === id ? updatedIntake : i))
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Medication intake updated!');
        return updatedIntake;
      }
    } catch (error: any) { toast.error(`Failed to update intake: ${error.message || 'Unknown error'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const deleteMedicationIntake = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    try {
      await medicationIntakeService.delete(id);
      setMedicationIntakes(prev => prev.filter(i => i.id !== id));
      toast.success('Medication intake deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete intake: ${error.message || 'Unknown error'}`); throw error; }
  }, [currentUser, userProfile]);

  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth required/Doctor role needed"); throw new Error("Not authorized."); }
    setLoadingMedicationIntakes(true); // Considerar si este loader global es el adecuado
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data; // PatientDetails manejará estos datos en su propio estado
    } catch (error: any) { toast.error(`Failed to get medication intakes for patient: ${error.message || 'Unknown error'}`); throw error; }
    finally { setLoadingMedicationIntakes(false); }
  }, [currentUser, userProfile]);

  const signOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      toast.dismiss('signout-toast');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("AppContext: Sign out error:", error);
      toast.error(`Sign out failed: ${error.message || 'Unknown error'}`);
    }
  }, []);

  // Exponer la versión estable de loadInitialData si algún componente externo la necesita
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
        loadInitialData: stableLoadInitialData, // Exponer la versión estable
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
