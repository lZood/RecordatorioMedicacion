// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile } from '../types';
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
  addMedication: (medicationData: Omit<Medication, 'id'>) => Promise<Medication | undefined>;
  updateMedication: (id: string, updatedMedicationData: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;
  
  appointments: Appointment[];
  doctors: UserProfile[]; // Lista de todos los doctores para selectores
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
  getVitalSignsByPatientId: (patientId: string) => Promise<VitalSign[]>;

  medicationIntakes: MedicationIntake[];
  
  signOut: () => Promise<void>;
  loadInitialData: (user: User | null) => Promise<void>;
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
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
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
  };

  const loadInitialData = async (authUser: User | null) => {
    if (!authUser) {
      console.log("AppContext: No authUser, clearing states.");
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); setLoadingVitalSigns(false);
      return;
    }
    console.log("AppContext: AuthUser present, fetching profile for:", authUser.id);
    const fetchedProfile = await fetchUserProfile(authUser.id);

    setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); setLoadingVitalSigns(true);
    try {
      const doctorsDataPromise = profileService.getAllDoctors(); // Siempre cargar la lista de doctores para selectores

      let dataPromises: Promise<any>[] = [doctorsDataPromise];
      
      if (fetchedProfile?.role === 'doctor') {
        console.log("AppContext: User is a doctor, loading doctor-specific data.");
        dataPromises = [
          ...dataPromises,
          patientService.getAll(), // RLS filtrará por doctor_id
          medicationService.getAll(), // RLS filtrará si es necesario (actualmente para todos los doctores)
          appointmentService.getAll(), // RLS filtrará por doctor_id
          vitalSignService.getAll(), // RLS filtrará por pacientes del doctor
          medicationIntakeService.getAll(), // RLS filtrará
        ];
      } else {
        console.log(`AppContext: User role is not 'doctor' (role: ${fetchedProfile?.role}). Skipping doctor-specific data sets.`);
        // Si no es doctor, solo cargamos la lista de doctores y el resto serán arrays vacíos.
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]);
        // Rellenar las promesas restantes para que Promise.all no falle
        dataPromises = [doctorsDataPromise, Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
      }
      
      const [
        resolvedDoctorsData,
        patientsData, medicationsData, appointmentsData,
        vitalSignsData, medicationIntakesData
      ] = await Promise.all(dataPromises);

      setDoctors(resolvedDoctorsData || []);
      // Solo setear los datos específicos del doctor si el rol es 'doctor'
      // (aunque RLS ya debería haber devuelto vacío si no lo es)
      if (fetchedProfile?.role === 'doctor') {
        setPatients(patientsData || []);
        setMedications(medicationsData || []);
        setAppointments(appointmentsData || []);
        setVitalSigns(vitalSignsData || []);
        setMedicationIntakes(medicationIntakesData || []);
      }

    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); setLoadingVitalSigns(false);
    }
  };
  
  useEffect(() => {
    setLoadingAuth(true);
    let subscription: Subscription | undefined;
    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setCurrentUser(authUser);
      await loadInitialData(authUser);
      setLoadingAuth(false);

      const { data: authListenerData } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newAuthUser = session?.user ?? null;
        console.log("AppContext: Auth state changed, event:", _event, "newAuthUser ID:", newAuthUser?.id);
        setCurrentUser(newAuthUser);
        await loadInitialData(newAuthUser);
      });
      subscription = authListenerData.subscription;
    };
    checkSessionAndSubscribe();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Only doctors can add patients.");
      throw new Error("User not authorized or not a doctor.");
    }
    try {
      const patientDataWithDoctorId: Omit<Patient, 'id' | 'createdAt'> = {
        ...patientData,
        doctorId: currentUser.id,
      };
      const newPatient = await patientService.create(patientDataWithDoctorId);
      if (newPatient) {
        setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name)));
        toast.success('Patient added successfully!');
        return newPatient;
      }
    } catch (error: any) { toast.error(`Failed to add patient: ${error.message}`); throw error; }
    return undefined;
  };
  const updatePatient = async (id: string, updatedData: Partial<Patient>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Patient updated successfully!');
        }
    } catch (error: any) { toast.error(`Failed to update patient: ${error.message}`); throw error; }
  };
  const deletePatient = async (id: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await patientService.delete(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        toast.success('Patient deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete patient: ${error.message}`); throw error; }
  };
  const getPatientById = (id: string) => patients.find(p => p.id === id);

  // CRUDs para Medication (asumiendo que son gestionados por doctores y RLS lo maneja)
  const addMedication = async (medData: Omit<Medication, 'id'>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const newMed = await medicationService.create(medData);
        if (newMed) {
            setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication added successfully!');
            return newMed;
        }
    } catch (error: any) { toast.error(`Failed to add medication: ${error.message}`); throw error; }
    return undefined;
  };
  const updateMedication = async (id: string, updatedData: Partial<Medication>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication updated successfully!');
        }
    } catch (error: any) { toast.error(`Failed to update medication: ${error.message}`); throw error; }
  };
  const deleteMedication = async (id: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
        await medicationService.delete(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        toast.success('Medication deleted successfully!');
    } catch (error: any) { toast.error(`Failed to delete medication: ${error.message}`); throw error; }
  };
  const getMedicationById = (id: string) => medications.find(m => m.id === id);

  // CRUDs para Appointment (RLS maneja el acceso basado en doctor_id)
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    const dataWithCorrectDoctor = { ...appointmentData, doctorId: currentUser.id }; // Asegura que el doctorId es el logueado
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        const enrichedAppointment = await appointmentService.getById(newAppointment.id); // Recargar para datos anidados
        if (enrichedAppointment) {
            setAppointments(prev => [...prev, enrichedAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled!');
            return enrichedAppointment;
        }
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Appointment scheduled (basic details)!');
        return newAppointment;
      }
    } catch (error: any) { toast.error(`Failed to schedule: ${error.message}`); throw error; }
    return undefined;
  };
  const updateAppointment = async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      const currentAppointment = appointments.find(app => app.id === id);
      if (currentAppointment && appointmentUpdateData.doctorId && appointmentUpdateData.doctorId !== currentUser.id) {
            toast.error("Cannot reassign appointment to another doctor.");
            throw new Error("Cannot reassign appointment to another doctor.");
      }
      const finalUpdateData = {...appointmentUpdateData, doctorId: currentUser.id}; // Asegurar doctorId

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
    } catch (error: any) { toast.error(`Failed to update: ${error.message}`); throw error; }
  };
  const deleteAppointment = async (id: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      toast.success('Appointment deleted!');
    } catch (error: any) { toast.error(`Failed to delete: ${error.message}`); throw error; }
  };
  const getAppointmentById = (id: string) => appointments.find(app => app.id === id);

  // CRUDs para VitalSign (RLS maneja el acceso basado en el doctor_id del paciente)
  const addVitalSign = async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      const newVitalSign = await vitalSignService.create(vitalSignData);
      if (newVitalSign) {
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign recorded!');
        return newVitalSign;
      }
    } catch (error: any) { toast.error(`Failed to record vital sign: ${error.message}`); throw error; }
    return undefined;
  };
  const updateVitalSign = async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign updated!');
      }
    } catch (error: any) { toast.error(`Failed to update vital sign: ${error.message}`); throw error; }
  };
  const deleteVitalSign = async (id: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    try {
      await vitalSignService.delete(id);
      setVitalSigns(prev => prev.filter(vs => vs.id !== id));
      toast.success('Vital sign deleted!');
    } catch (error: any) { toast.error(`Failed to delete vital sign: ${error.message}`); throw error; }
  };
  const getVitalSignsByPatientId = async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Auth error/Doctor role needed"); throw new Error("User not authorized or not a doctor."); }
    setLoadingVitalSigns(true);
    try {
        return await vitalSignService.getByPatient(patientId); // RLS filtrará
    } catch (error: any) { toast.error(`Failed to get vital signs: ${error.message}`); throw error; }
    finally { setLoadingVitalSigns(false); }
  };

  const signOut = async () => {
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
  };

  return (
    <AppContext.Provider
      value={{
        currentUser, userProfile, loadingAuth, loadingData, loadingProfile,
        patients, addPatient, updatePatient, deletePatient, getPatientById,
        medications, addMedication, updateMedication, deleteMedication, getMedicationById,
        appointments, doctors, loadingAppointments, loadingDoctors,
        addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
        vitalSigns, loadingVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign, getVitalSignsByPatientId,
        medicationIntakes,
        // setCurrentUser no se expone si onAuthStateChange es el manejador principal
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
