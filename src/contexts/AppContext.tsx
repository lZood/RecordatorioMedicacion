// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, Doctor } from '../types';
import { User, Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns'; // Importa vitalSignService
import { medicationIntakeService } from '../services/medicationIntakes';
import { profileService } from '../services/profiles';
import toast from 'react-hot-toast';
import { authService } from '../services/auth';

interface AppContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  loadingData: boolean;

  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  medications: Medication[];
  addMedication: (medicationData: Omit<Medication, 'id'>) => Promise<Medication | undefined>;
  updateMedication: (id: string, updatedMedicationData: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;
  
  appointments: Appointment[];
  doctors: Doctor[];
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
  
  setCurrentUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  loadInitialData: (userOverride?: User | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);

  const loadInitialData = async (userOverride?: User | null) => {
    const userToUse = userOverride !== undefined ? userOverride : currentUser;

    if (!userToUse) {
      console.log("AppContext: No user session, skipping data load.");
      setPatients([]);
      setMedications([]);
      setAppointments([]);
      setDoctors([]);
      setVitalSigns([]);
      setMedicationIntakes([]);
      setLoadingData(false);
      setLoadingAppointments(false);
      setLoadingDoctors(false);
      setLoadingVitalSigns(false);
      return;
    }
    console.log("AppContext: Loading initial data for user:", userToUse.id);
    setLoadingData(true);
    setLoadingAppointments(true);
    setLoadingDoctors(true);
    setLoadingVitalSigns(true);
    try {
      const [
        patientsData,
        medicationsData,
        appointmentsData,
        vitalSignsData,
        medicationIntakesData,
        doctorsData,
      ] = await Promise.all([
        patientService.getAll(),
        medicationService.getAll(),
        appointmentService.getAll(),
        vitalSignService.getAll(),
        medicationIntakeService.getAll(),
        profileService.getAllDoctors(),
      ]);

      setPatients(patientsData || []);
      setMedications(medicationsData || []);
      setAppointments(appointmentsData || []);
      setVitalSigns(vitalSignsData || []);
      setMedicationIntakes(medicationIntakesData || []);
      setDoctors(doctorsData || []);

    } catch (error) {
      console.error("AppContext: Error loading initial data:", error);
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false);
      setLoadingAppointments(false);
      setLoadingDoctors(false);
      setLoadingVitalSigns(false);
    }
  };
  
  useEffect(() => {
    setLoadingAuth(true);
    let subscription: Subscription | undefined;

    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
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
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        const newPatient = await patientService.create(patientData);
        if (newPatient) {
            setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Patient added successfully!');
            return newPatient;
        }
    } catch (error: any) {
        toast.error(`Failed to add patient: ${error.message}`);
        throw error;
    }
    return undefined;
  };
  const updatePatient = async (id: string, updatedData: Partial<Patient>) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Patient updated successfully!');
        }
    } catch (error: any) {
        toast.error(`Failed to update patient: ${error.message}`);
        throw error;
    }
  };
  const deletePatient = async (id: string) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        await patientService.delete(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        toast.success('Patient deleted successfully!');
    } catch (error: any) {
        toast.error(`Failed to delete patient: ${error.message}`);
        throw error;
    }
  };
  const getPatientById = (id: string) => patients.find(p => p.id === id);

  // --- CRUD Medicamentos ---
  const addMedication = async (medData: Omit<Medication, 'id'>) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        const newMed = await medicationService.create(medData);
        if (newMed) {
            setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication added successfully!');
            return newMed;
        }
    } catch (error: any) {
        toast.error(`Failed to add medication: ${error.message}`);
        throw error;
    }
    return undefined;
  };
  const updateMedication = async (id: string, updatedData: Partial<Medication>) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medication updated successfully!');
        }
    } catch (error: any) {
        toast.error(`Failed to update medication: ${error.message}`);
        throw error;
    }
  };
  const deleteMedication = async (id: string) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        await medicationService.delete(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        toast.success('Medication deleted successfully!');
    } catch (error: any) {
        toast.error(`Failed to delete medication: ${error.message}`);
        throw error;
    }
  };
  const getMedicationById = (id: string) => medications.find(m => m.id === id);

  // --- CRUD Citas (Appointments) ---
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      const newAppointment = await appointmentService.create(appointmentData);
      if (newAppointment) {
        const enrichedAppointment = await appointmentService.getById(newAppointment.id);
        if (enrichedAppointment) {
            setAppointments(prev => [...prev, enrichedAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled!');
            return enrichedAppointment;
        } else {
            setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
            toast.success('Appointment scheduled (basic details)!');
            return newAppointment;
        }
      }
    } catch (error: any) { toast.error(`Failed to schedule: ${error.message}`); throw error; }
    return undefined;
  };
  const updateAppointment = async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      const updatedApp = await appointmentService.update(id, appointmentUpdateData);
      if (updatedApp) {
        const enrichedAppointment = await appointmentService.getById(updatedApp.id);
         if (enrichedAppointment) {
            setAppointments(prev => prev.map(app => (app.id === id ? enrichedAppointment : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         } else {
            setAppointments(prev => prev.map(app => (app.id === id ? {...app, ...updatedApp} : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         }
        // toast.success('Appointment updated!'); // Se maneja en la página de detalles si es necesario
      }
    } catch (error: any) { toast.error(`Failed to update: ${error.message}`); throw error; }
  };
  const deleteAppointment = async (id: string) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      // toast.success('Appointment deleted!'); // Se maneja en la página de detalles si es necesario
    } catch (error: any) { toast.error(`Failed to delete: ${error.message}`); throw error; }
  };
  const getAppointmentById = (id: string) => appointments.find(app => app.id === id);

  // --- CRUD para Signos Vitales (VitalSigns) ---
  const addVitalSign = async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser) { 
      toast.error("Authentication required to record vital sign."); 
      throw new Error("User not authenticated"); 
    }
    try {
      console.log("AppContext: Calling vitalSignService.create with:", vitalSignData);
      const newVitalSign = await vitalSignService.create(vitalSignData); // vitalSignData es camelCase
      console.log("AppContext: Received from vitalSignService.create:", newVitalSign);
      if (newVitalSign) { // newVitalSign debería ser camelCase del servicio
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign recorded successfully!');
        return newVitalSign;
      }
    } catch (error: any) {
      console.error("AppContext: Error recording vital sign:", error);
      toast.error(`Failed to record vital sign: ${error.message || 'Unknown error'}`);
      throw error; // Relanza para que el componente lo pueda manejar si es necesario
    }
    return undefined;
  };

  const updateVitalSign = async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Vital sign updated successfully!');
      }
    } catch (error: any) {
      toast.error(`Failed to update vital sign: ${error.message}`);
      throw error;
    }
  };

  const deleteVitalSign = async (id: string) => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
      await vitalSignService.delete(id);
      setVitalSigns(prev => prev.filter(vs => vs.id !== id));
      toast.success('Vital sign deleted successfully!');
    } catch (error: any) {
      toast.error(`Failed to delete vital sign: ${error.message}`);
      throw error;
    }
  };
  
  const getVitalSignsByPatientId = async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser) { toast.error("Auth required"); throw new Error("User not authenticated"); }
    try {
        setLoadingVitalSigns(true);
        const patientVitalSigns = await vitalSignService.getByPatient(patientId);
        return patientVitalSigns;
    } catch (error: any) {
        toast.error(`Failed to get vital signs for patient: ${error.message}`);
        throw error;
    } finally {
        setLoadingVitalSigns(false);
    }
  };

  const signOut = async () => {
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
        vitalSigns, loadingVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign, getVitalSignsByPatientId,
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
