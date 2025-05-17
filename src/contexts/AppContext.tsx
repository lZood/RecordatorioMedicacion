// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
// Asegúrate de importar el nuevo tipo Notification y el servicio
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile, Doctor, Notification } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes';
import { User, Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { medicationIntakeService } from '../services/medicationIntakes';
import { profileService } from '../services/profiles';
import { notificationService } from '../services/notificationService'; // Importar el nuevo servicio
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
  doctors: UserProfile[]; // Este debería ser UserProfile[] o Doctor[]
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

  // Funciones de Notificación
  notifications: Notification[];
  loadingNotifications: boolean;
  addNotification: (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Notification | undefined>;
  fetchNotificationsForPatient: (patientId: string) => Promise<Notification[]>;
  // Podrías añadir updateNotification y deleteNotification si es necesario

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
  const [doctors, setDoctors] = useState<UserProfile[]>([]); // O Doctor[]
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]); // Estado para notificaciones

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const [loadingMedicationIntakes, setLoadingMedicationIntakes] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false); // Estado de carga para notificaciones


  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) { 
      setUserProfile(null); 
      return null; 
    }
    setLoadingProfile(true);
    try {
      const profile = await profileService.getProfileByUserId(userId);
      setUserProfile(profile);
      return profile;
    } catch (error) { 
      console.error("AppContext: Error fetching user profile:", error); 
      setUserProfile(null); 
      return null;
    } finally { 
      setLoadingProfile(false); 
    }
  }, []);

  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]); // Limpiar notificaciones
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); setLoadingNotifications(false); // Limpiar carga de notificaciones
      return;
    }
    const fetchedProfile = await fetchUserProfile(authUser.id);

    setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); 
    setLoadingVitalSigns(true); setLoadingMedicationIntakes(true); setLoadingNotifications(true);
    try {
      const doctorsDataPromise = profileService.getAllDoctors(); 
      // Podrías cargar notificaciones generales aquí si fuera necesario, o por paciente
      // const notificationsPromise = notificationService.getAll(); // Ejemplo si quieres cargar todas

      let dataPromises: Promise<any>[] = [doctorsDataPromise /*, notificationsPromise */];
      
      if (fetchedProfile?.role === 'doctor') {
        dataPromises = [
          ...dataPromises,
          patientService.getAll(),
          medicationService.getAll(), 
          appointmentService.getAll(),
          vitalSignService.getAll(),
          // MedicationIntakes y Notifications se cargan bajo demanda o filtradas
        ];
      } else {
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
        dataPromises = [doctorsDataPromise, /* Promise.resolve([]), */ Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
      }
      
      const [
        resolvedDoctorsData,
        // resolvedNotificationsData, // Si cargas todas
        patientsData, medicationsData, appointmentsData,
        vitalSignsData, 
      ] = await Promise.all(dataPromises);

      setDoctors(resolvedDoctorsData || []);
      // setNotifications(resolvedNotificationsData || []); // Si cargas todas
      
      if (fetchedProfile?.role === 'doctor') {
        setPatients(patientsData || []);
        setMedications(medicationsData || []);
        setAppointments(appointmentsData || []);
        setVitalSigns(vitalSignsData || []);
        setMedicationIntakes([]); 
        setNotifications([]); // Inicialmente vacío, se cargarán por paciente si es necesario
      }

    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      toast.error("Could not load app data. Check console for details.");
    } finally {
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); setLoadingNotifications(false);
    }
  }, [fetchUserProfile]);
  
  useEffect(() => {
    setLoadingAuth(true);
    let subscription: Subscription | undefined;
    const checkSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setCurrentUser(authUser);
      await internalLoadInitialData(authUser);
      setLoadingAuth(false);

      const { data: authListenerData } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newAuthUser = session?.user ?? null;
        setCurrentUser(newAuthUser);
        await internalLoadInitialData(newAuthUser);
      });
      subscription = authListenerData.subscription;
    };
    checkSessionAndSubscribe();
    return () => {
      subscription?.unsubscribe();
    };
  }, [internalLoadInitialData]);

  // --- CRUD Pacientes ---
  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Only doctors can add patients."); throw new Error("User not authorized or not a doctor."); }
    try {
      const patientDataWithDoctorId: Omit<Patient, 'id' | 'createdAt'> = { ...patientData, doctorId: currentUser.id };
      const newPatient = await patientService.create(patientDataWithDoctorId);
      if (newPatient) { setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name))); toast.success('Paciente añadido!'); return newPatient; }
    } catch (error: any) { toast.error(`Error al añadir paciente: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Patient>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Paciente actualizado!');
        }
    } catch (error: any) { toast.error(`Error al actualizar paciente: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
        await patientService.delete(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        toast.success('Paciente eliminado!');
    } catch (error: any) { toast.error(`Error al eliminar paciente: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const getPatientById = useCallback((id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  }, [patients]);

  // --- CRUD Medicamentos ---
  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Medication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Solo los doctores pueden añadir medicamentos."); throw new Error("User not authorized or not a doctor."); }
    if (!currentUser.id) { toast.error("Falta ID del doctor."); throw new Error("Doctor ID is missing.");}
    try {
      const medicationDataWithDoctorId: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = { ...medicationData, doctorId: currentUser.id };
      const newMed = await medicationService.create(medicationDataWithDoctorId);
      if (newMed) { 
        setMedications(prev => [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name))); 
        toast.success('Medicamento añadido!'); 
        return newMed; 
      }
    } catch (error: any) { 
      toast.error(`Error al añadir medicamento: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updateMedication = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medicamento actualizado!');
        }
    } catch (error: any) { toast.error(`Error al actualizar medicamento: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteMedication = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
        await medicationService.delete(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        toast.success('Medicamento eliminado!');
    } catch (error: any) { toast.error(`Error al eliminar medicamento: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const getMedicationById = useCallback((id: string): Medication | undefined => {
    return medications.find(m => m.id === id);
  }, [medications]);

  // --- CRUD Citas (Appointments) ---
  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    const dataWithCorrectDoctor = { ...appointmentData, doctorId: currentUser.id }; // Asegurar que el doctorId es el del usuario actual
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        // El servicio ya devuelve la cita con detalles de paciente y doctor si se configuró el .select()
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Cita programada!');
        return newAppointment;
      }
    } catch (error: any) { toast.error(`Error al programar cita: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateAppointment = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
      const currentAppointment = appointments.find(app => app.id === id);
      // Prevenir cambiar doctorId a otro doctor si no es el mismo que el actual.
      // Si doctorId no está en appointmentUpdateData o es el mismo, está bien.
      // Si se intenta cambiar a un doctorId diferente al currentUser.id, se podría bloquear.
      // Por ahora, el servicio asume que el RLS maneja la propiedad.
      // Si se quiere permitir que un doctor reasigne a OTRO doctor, la lógica sería más compleja.
      // Aquí, si se incluye doctorId, se usará; si no, se mantendrá el existente.
      // Si la intención es que el doctorId SIEMPRE sea el currentUser.id al editar, se puede forzar:
      // const finalUpdateData = {...appointmentUpdateData, doctorId: currentUser.id}; 
      const updatedApp = await appointmentService.update(id, appointmentUpdateData); // Usar appointmentUpdateData directamente
      if (updatedApp) {
         setAppointments(prev => prev.map(app => (app.id === id ? updatedApp : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         toast.success('Cita actualizada!');
      }
    } catch (error: any) { toast.error(`Error al actualizar cita: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile, appointments]);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      toast.success('Cita eliminada!');
    } catch (error: any) { toast.error(`Error al eliminar cita: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const getAppointmentById = useCallback((id: string): Appointment | undefined => {
    return appointments.find(app => app.id === id);
  }, [appointments]);

  // --- CRUD para Signos Vitales (VitalSigns) ---
  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const newVitalSign = await vitalSignService.create(vitalSignData);
      if (newVitalSign) {
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Signo vital registrado!');
        return newVitalSign;
      }
    } catch (error: any) { toast.error(`Error al registrar signo vital: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateVitalSign = useCallback(async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Signo vital actualizado!');
      }
    } catch (error: any) { toast.error(`Error al actualizar signo vital: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const deleteVitalSign = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      await vitalSignService.delete(id);
      setVitalSigns(prev => prev.filter(vs => vs.id !== id));
      toast.success('Signo vital eliminado!');
    } catch (error: any) { toast.error(`Error al eliminar signo vital: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);
  
  const fetchVitalSignsForPatient = useCallback(async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    setLoadingVitalSigns(true);
    try {
        const data = await vitalSignService.getByPatient(patientId);
        return data;
    } catch (error: any) { toast.error(`Error al obtener signos vitales: ${error.message || 'Error desconocido'}`); throw error; }
    finally { setLoadingVitalSigns(false); }
  }, [currentUser, userProfile]);

  // --- CRUD para Tomas de Medicamentos (MedicationIntakes) ---
  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake) {
        // No actualizamos el estado global `medicationIntakes` aquí, ya que se maneja por paciente en PatientDetails.
        // Si tuvieras una vista global de todas las tomas, aquí la actualizarías.
        toast.success('Toma de medicamento registrada!');
        return newIntake;
      }
    } catch (error: any) { toast.error(`Error al añadir toma: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const updateMedicationIntake = useCallback(async (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const updatedIntake = await medicationIntakeService.update(id, intakeUpdateData);
      if (updatedIntake) {
        // Similar a add, no actualizamos el estado global aquí directamente.
        toast.success('Toma de medicamento actualizada!');
        return updatedIntake;
      }
    } catch (error: any) { toast.error(`Error al actualizar toma: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const deleteMedicationIntake = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      await medicationIntakeService.delete(id);
      // No actualizamos el estado global aquí.
      toast.success('Toma de medicamento eliminada!');
    } catch (error: any) { toast.error(`Error al eliminar toma: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    setLoadingMedicationIntakes(true);
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data; // Devuelve los datos para que PatientDetails los use
    } catch (error: any) { toast.error(`Error al obtener tomas: ${error.message || 'Error desconocido'}`); throw error; }
    finally { setLoadingMedicationIntakes(false); }
  }, [currentUser, userProfile]);

  // --- Funciones de Notificación ---
  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const newNotification = await notificationService.create(notificationData);
      if (newNotification) {
        // Podrías actualizar un estado global de notificaciones si es relevante para la UI general.
        // Por ahora, solo retornamos la notificación creada.
        // setNotifications(prev => [...prev, newNotification].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
        toast.success('Notificación guardada!');
        return newNotification;
      }
    } catch (error: any) { toast.error(`Error al guardar notificación: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile]);

  const fetchNotificationsForPatient = useCallback(async (patientId: string): Promise<Notification[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    setLoadingNotifications(true);
    try {
      const data = await notificationService.getByPatient(patientId);
      // Podrías actualizar el estado global aquí si lo deseas, o simplemente devolver.
      // setNotifications(data); 
      return data;
    } catch (error: any) { toast.error(`Error al obtener notificaciones: ${error.message || 'Error desconocido'}`); throw error; }
    finally { setLoadingNotifications(false); }
  }, [currentUser, userProfile]);


  const signOut = useCallback(async () => {
    toast.loading('Cerrando sesión...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      toast.dismiss('signout-toast');
      toast.success('Sesión cerrada exitosamente!');
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("AppContext: Sign out error:", error);
      toast.error(`Error al cerrar sesión: ${error.message || 'Error desconocido'}`);
    }
  }, []);

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
        notifications, loadingNotifications, addNotification, fetchNotificationsForPatient, // Añadir al contexto
        signOut,
        loadInitialData: stableLoadInitialData,
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
