// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';
import { authService } from '../services/auth';

// Helper function to determine if a vital sign is abnormal (basic example)
const isAbnormalVitalSign = (vitalSign: VitalSign): { abnormal: boolean; reason: string } => {
  const { type, value } = vitalSign;
  if (type.toLowerCase().includes('presión arterial sistólica') || type.toLowerCase().includes('systolic blood pressure')) {
    if (value > 140) return { abnormal: true, reason: `Presión sistólica alta: ${value} mmHg` };
    if (value < 90) return { abnormal: true, reason: `Presión sistólica baja: ${value} mmHg` };
  }
  if (type.toLowerCase().includes('frecuencia cardíaca') || type.toLowerCase().includes('heart rate')) {
    if (value > 100) return { abnormal: true, reason: `Frecuencia cardíaca alta: ${value} bpm` };
    if (value < 60) return { abnormal: true, reason: `Frecuencia cardíaca baja: ${value} bpm` };
  }
  return { abnormal: false, reason: '' };
};


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
  updateAppointment: (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => Promise<Appointment | undefined>;
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

  notifications: Notification[];
  loadingNotifications: boolean;
  addNotification: (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Notification | undefined>;
  fetchNotificationsForPatient: (patientId: string) => Promise<Notification[]>;
  updateNotificationStatus: (notificationId: string, status: Notification['status']) => Promise<Notification | undefined>;
  // Removed generator functions from AppContextType as they are internal implementation details
  // generateUpcomingAppointmentReminders: () => Promise<void>; 
  // checkExpiringMedicationsStock: () => Promise<void>;

  signOut: () => Promise<void>;
  loadInitialData: (user: User | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(true);
  const [loadingMedicationIntakes, setLoadingMedicationIntakes] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);


  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) { setUserProfile(null); return null; }
    setLoadingProfile(true);
    try {
      const profile = await profileService.getProfileByUserId(userId);
      setUserProfile(profile); return profile;
    } catch (error) { console.error("AppContext: Error fetching user profile:", error); setUserProfile(null); return null;
    } finally { setLoadingProfile(false); }
  }, []);

  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | undefined> => {
    if (!currentUser) {
        throw new Error("Not authenticated. Cannot create notification.");
    }
    
    const dataToCreate = {
      ...notificationData,
      patientId: notificationData.patientId === undefined ? null : notificationData.patientId,
      doctorId: notificationData.doctorId !== undefined ? notificationData.doctorId : (userProfile?.role === 'doctor' ? currentUser.id : undefined),
    };

    try {
      const newNotification = await notificationService.create(dataToCreate as Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>);
      if (newNotification) {
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotification.id)) return prev; // Evitar duplicados en el estado
          return [newNotification, ...prev].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        });
        return newNotification;
      }
    } catch (error: any) { 
      console.error(`AppContext.addNotification: Error para tipo ${dataToCreate.type}:`, error);
      // No mostrar toast aquí para notificaciones automáticas para evitar spam
      if (dataToCreate.type !== 'appointment_reminder_24h' && 
          dataToCreate.type !== 'abnormal_vital_sign' &&
          dataToCreate.type !== 'medication_expiring_soon_stock') {
          toast.error(`Error al guardar notificación: ${error.message || 'Error desconocido'}`); 
      }
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);


  const generateUpcomingAppointmentReminders = useCallback(async (
    currentAppointments: Appointment[], 
    currentPatients: Patient[], 
    // Se pasa 'notifications' desde el useEffect que llama a esta función
    // para asegurar que se usa la versión más actualizada para la comprobación de duplicados.
    upToDateNotifications: Notification[], 
    currentDoctorProfile: UserProfile | null
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !currentAppointments.length || !currentPatients.length) return;

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const appt of currentAppointments) {
      if (appt.status === 'scheduled') {
        const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
        if (appointmentDateTime > now && appointmentDateTime <= twentyFourHoursLater) {
          const existingReminder = upToDateNotifications.find(
            n => n.appointmentId === appt.id && n.type === 'appointment_reminder_24h'
          );
          if (!existingReminder) {
            const patient = currentPatients.find(p => p.id === appt.patientId);
            if (patient && currentDoctorProfile) {
              const message = `Recordatorio automático: Su cita de ${appt.specialty} con ${currentDoctorProfile.name} es mañana, ${new Date(appt.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las ${new Date(`1970-01-01T${appt.time}`).toLocaleTimeString(navigator.language || 'es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}.`;
              const reminderData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: patient.id, appointmentId: appt.id, doctorId: appt.doctorId, message,
                type: 'appointment_reminder_24h', status: 'pending', 
                sendAt: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
              };
              try { await addNotification(reminderData); } catch (e) { /* silent */ }
            }
          }
        }
      }
    }
  }, [addNotification]); // addNotification es estable

  const checkExpiringMedicationsStock = useCallback(async (
    currentMedications: Medication[],
    upToDateNotifications: Notification[],
    currentAuthUser: User | null,
    currentDoctorProfile: UserProfile | null
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !currentMedications.length || !currentAuthUser) return;
    
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayDateString = today.toISOString().split('T')[0]; // Para comparación de fechas de creación

    for (const med of currentMedications) {
        if (med.doctorId !== currentAuthUser.id) continue;
        const expirationDate = new Date(med.expirationDate);
        if (expirationDate > today && expirationDate <= thirtyDaysLater) {
            // Chequeo de duplicados más robusto:
            // 1. Mismo tipo
            // 2. Mismo doctor
            // 3. El mensaje debe contener el nombre del medicamento Y la fecha de expiración exacta
            // 4. (Opcional pero recomendado) No se haya creado una notificación similar hoy
            const medExpirationDateString = new Date(med.expirationDate + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES');
            const existingNotification = upToDateNotifications.find(
                n => n.type === 'medication_expiring_soon_stock' && 
                     n.doctorId === currentAuthUser.id &&
                     n.message.includes(`"${med.name}"`) && // Contiene el nombre del medicamento
                     n.message.includes(medExpirationDateString) && // Contiene la fecha de expiración formateada
                     (n.createdAt && n.createdAt.startsWith(todayDateString)) // Creada hoy
            );

            if (!existingNotification) {
                const message = `Alerta de inventario: Su medicamento "${med.name}" (Principio Activo: ${med.activeIngredient}) vence el ${medExpirationDateString}.`;
                const notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
                    patientId: null, doctorId: currentAuthUser.id, message,
                    type: 'medication_expiring_soon_stock', status: 'pending',
                };
                try { await addNotification(notificationData); } catch (e) { /* silent */ }
            }
        }
    }
  }, [addNotification]); // addNotification es estable

  // internalLoadInitialData ahora también llama a los generadores después de cargar los datos
  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); setLoadingNotifications(false); setLoadingProfile(false);
      return;
    }
    
    setLoadingData(true); setLoadingAppointments(true); setLoadingDoctors(true); 
    setLoadingVitalSigns(true); setLoadingMedicationIntakes(true); setLoadingNotifications(true);
    
    const fetchedProfile = await fetchUserProfile(authUser.id);

    try {
      const [
        resolvedDoctorsData, 
        resolvedNotificationsData, 
        patientsData, 
        medicationsData, 
        appointmentsData, 
        vitalSignsData
      ] = await Promise.all([
        profileService.getAllDoctors(),
        notificationService.getAll(),
        fetchedProfile?.role === 'doctor' ? patientService.getAll() : Promise.resolve([]),
        fetchedProfile?.role === 'doctor' ? medicationService.getAll() : Promise.resolve([]),
        fetchedProfile?.role === 'doctor' ? appointmentService.getAll() : Promise.resolve([]),
        fetchedProfile?.role === 'doctor' ? vitalSignService.getAll() : Promise.resolve([])
      ]);

      setDoctors(resolvedDoctorsData || []);
      const initialNotifications = resolvedNotificationsData || [];
      setNotifications(initialNotifications);
      
      if (fetchedProfile?.role === 'doctor') {
        const currentPatients = patientsData || [];
        const currentAppointments = appointmentsData || [];
        const currentMedications = medicationsData || [];

        setPatients(currentPatients);
        setMedications(currentMedications);
        setAppointments(currentAppointments);
        setVitalSigns(vitalSignsData || []);
        setMedicationIntakes([]); 

        // Llamar a los generadores aquí, después de que todos los datos estén establecidos
        // y pasarles los datos más frescos, incluyendo las notificaciones iniciales.
        // Esto asegura que la primera verificación se haga con el estado completo.
        generateUpcomingAppointmentReminders(currentAppointments, currentPatients, initialNotifications, fetchedProfile);
        checkExpiringMedicationsStock(currentMedications, initialNotifications, authUser, fetchedProfile);

      } else {
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]);
      }

    } catch (error) {
      console.error("AppContext: Error loading initial data sets:", error);
      toast.error("No se pudieron cargar los datos de la aplicación.");
    } finally {
      setLoadingData(false); setLoadingAppointments(false); setLoadingDoctors(false); 
      setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); setLoadingNotifications(false);
    }
  }, [fetchUserProfile, generateUpcomingAppointmentReminders, checkExpiringMedicationsStock]); // Dependencias estables
  

  // useEffect para la autenticación, llama a internalLoadInitialData
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
        // Solo recargar todo si el usuario realmente cambia
        if (newAuthUser?.id !== currentUser?.id || (!newAuthUser && currentUser)) {
            setCurrentUser(newAuthUser);
            await internalLoadInitialData(newAuthUser);
        } else if (newAuthUser && !currentUser) { // Caso de login inicial después de que el listener ya estaba activo
            setCurrentUser(newAuthUser);
            await internalLoadInitialData(newAuthUser);
        }
      });
      subscription = authListenerData.subscription;
    };
    checkSessionAndSubscribe();
    return () => {
      subscription?.unsubscribe();
    };
  }, [internalLoadInitialData, currentUser]); // currentUser añadido para re-evaluar si cambia externamente

  // useEffect separado para ejecutar generadores de notificaciones cuando los datos relevantes cambian,
  // DESPUÉS de la carga inicial.
  useEffect(() => {
    // Solo ejecutar si no estamos en la carga inicial de datos Y el usuario es un doctor.
    // Y si los datos necesarios (appointments, patients, medications, notifications) ya están cargados.
    if (
      !loadingData && // No durante la carga inicial general
      userProfile?.role === 'doctor' &&
      currentUser &&
      !loadingAppointments && // Datos específicos cargados
      !loadingMedications &&
      !loadingNotifications // Notificaciones iniciales cargadas
    ) {
      // console.log("AppContext: useEffect[data] -> Calling notification generators.");
      generateUpcomingAppointmentReminders(appointments, patients, notifications, userProfile);
      checkExpiringMedicationsStock(medications, notifications, currentUser, userProfile);
    }
  }, [
    userProfile, currentUser,
    loadingData, loadingAppointments, loadingMedications, loadingNotifications, // Estados de carga
    appointments, patients, medications, notifications, // Datos que pueden cambiar y requerir re-evaluación
    generateUpcomingAppointmentReminders, checkExpiringMedicationsStock // Funciones memoizadas
  ]);


  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Solo los doctores pueden añadir pacientes."); throw new Error("User not authorized or not a doctor."); }
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

  const addAppointmentCb = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    const dataWithCorrectDoctor = { ...appointmentData, doctorId: currentUser.id };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Cita programada!');
        const patient = patients.find(p => p.id === newAppointment.patientId);
        if (patient) {
            await addNotification({
                patientId: patient.id,
                appointmentId: newAppointment.id,
                doctorId: newAppointment.doctorId,
                message: `Se ha programado una nueva cita de ${newAppointment.specialty} para usted el ${new Date(newAppointment.date + 'T00:00:00').toLocaleDateString()} a las ${new Date(`1970-01-01T${newAppointment.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
                type: 'appointment_created',
                status: 'pending',
            });
        }
        return newAppointment;
      }
    } catch (error: any) { toast.error(`Error al programar cita: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile, patients, addNotification]);

  const updateAppointmentCb = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) : Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
      const oldAppointment = appointments.find(app => app.id === id);
      const updatedApp = await appointmentService.update(id, appointmentUpdateData);
      if (updatedApp) {
         setAppointments(prev => prev.map(app => (app.id === id ? updatedApp : app)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
         toast.success('Cita actualizada!');
         if (oldAppointment && (oldAppointment.date !== updatedApp.date || oldAppointment.time !== updatedApp.time || oldAppointment.status !== updatedApp.status)) {
            const patient = patients.find(p => p.id === updatedApp.patientId);
            if (patient) {
                let message = `Su cita de ${updatedApp.specialty} ha sido actualizada. Nueva fecha: ${new Date(updatedApp.date + 'T00:00:00').toLocaleDateString()} a las ${new Date(`1970-01-01T${updatedApp.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
                if (updatedApp.status === 'cancelled') {
                    message = `Su cita de ${updatedApp.specialty} del ${new Date(updatedApp.date + 'T00:00:00').toLocaleDateString()} ha sido cancelada.`;
                }
                 await addNotification({
                    patientId: patient.id,
                    appointmentId: updatedApp.id,
                    doctorId: updatedApp.doctorId,
                    message,
                    type: updatedApp.status === 'cancelled' ? 'appointment_cancelled_by_doctor' : 'appointment_updated',
                    status: 'pending',
                });
            }
         }
         return updatedApp;
      }
    } catch (error: any) { toast.error(`Error al actualizar cita: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile, appointments, patients, addNotification]);

  const deleteAppointmentCb = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Error de autenticación/Rol de doctor necesario"); throw new Error("User not authorized or not a doctor."); }
    try {
      const apptToDelete = appointments.find(app => app.id === id);
      if (apptToDelete && apptToDelete.status !== 'cancelled') {
        const patient = patients.find(p => p.id === apptToDelete.patientId);
        if (patient) {
            await addNotification({
                patientId: patient.id,
                appointmentId: apptToDelete.id,
                doctorId: apptToDelete.doctorId,
                message: `Su cita de ${apptToDelete.specialty} del ${new Date(apptToDelete.date + 'T00:00:00').toLocaleDateString()} ha sido cancelada.`,
                type: 'appointment_cancelled_by_doctor',
                status: 'pending',
            });
        }
      }
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(app => app.id !== id));
      toast.success('Cita eliminada!');
    } catch (error: any) { toast.error(`Error al eliminar cita: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile, appointments, patients, addNotification]);

  const getAppointmentById = useCallback((id: string): Appointment | undefined => {
    return appointments.find(app => app.id === id);
  }, [appointments]);

  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const newVitalSign = await vitalSignService.create(vitalSignData);
      if (newVitalSign) {
        setVitalSigns(prev => [...prev, newVitalSign].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Signo vital registrado!');
        
        const abnormalityCheck = isAbnormalVitalSign(newVitalSign);
        if (abnormalityCheck.abnormal) {
          const patient = patients.find(p => p.id === newVitalSign.patientId);
          await addNotification({
            patientId: newVitalSign.patientId,
            doctorId: currentUser.id,
            message: `Alerta Signo Vital: ${patient?.name || 'Paciente desconocido'} registró ${newVitalSign.type} ${abnormalityCheck.reason}.`,
            type: 'abnormal_vital_sign',
            status: 'pending'
          });
          toast.warn(`Signo vital anormal detectado para ${patient?.name || 'Paciente desconocido'}! Notificación generada.`);
        }
        return newVitalSign;
      }
    } catch (error: any) { toast.error(`Error al registrar signo vital: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
  }, [currentUser, userProfile, patients, addNotification]); 

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

  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake) {
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
      toast.success('Toma de medicamento eliminada!');
    } catch (error: any) { toast.error(`Error al eliminar toma: ${error.message || 'Error desconocido'}`); throw error; }
  }, [currentUser, userProfile]);

  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    setLoadingMedicationIntakes(true);
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data;
    } catch (error: any) { toast.error(`Error al obtener tomas: ${error.message || 'Error desconocido'}`); throw error; }
    finally { setLoadingMedicationIntakes(false); }
  }, [currentUser, userProfile]);

  const fetchNotificationsForPatient = useCallback(async (patientId: string): Promise<Notification[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    setLoadingNotifications(true);
    try {
      const data = await notificationService.getByPatient(patientId);
      return data;
    } catch (error: any) { toast.error(`Error al obtener notificaciones: ${error.message || 'Error desconocido'}`); throw error; }
    finally { setLoadingNotifications(false); }
  }, [currentUser, userProfile]);

  const updateNotificationStatus = useCallback(async (notificationId: string, status: Notification['status']): Promise<Notification | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { toast.error("Autenticación requerida/Rol de doctor necesario"); throw new Error("Not authorized."); }
    try {
      const updatedNotification = await notificationService.update(notificationId, { status });
      if (updatedNotification) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? updatedNotification : n)
                                  .sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
        toast.success(`Notificación marcada como ${status}.`);
        return updatedNotification;
      }
    } catch (error: any) { toast.error(`Error al actualizar estado de notificación: ${error.message || 'Error desconocido'}`); throw error; }
    return undefined;
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
        addAppointment: addAppointmentCb, updateAppointment: updateAppointmentCb, deleteAppointment: deleteAppointmentCb, getAppointmentById,
        vitalSigns, loadingVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign, fetchVitalSignsForPatient,
        medicationIntakes, loadingMedicationIntakes, addMedicationIntake, updateMedicationIntake, deleteMedicationIntake, fetchMedicationIntakesForPatient,
        notifications, loadingNotifications, addNotification, fetchNotificationsForPatient, updateNotificationStatus,
        // Expose wrappers for generator functions that pass the current state
        generateUpcomingAppointmentReminders: () => {
          if (userProfile?.role === 'doctor' && appointments && patients && notifications && userProfile) {
            return generateUpcomingAppointmentReminders(appointments, patients, notifications, userProfile);
          }
          return Promise.resolve();
        },
        checkExpiringMedicationsStock: () => {
          if (userProfile?.role === 'doctor' && medications && notifications && currentUser && userProfile) {
            return checkExpiringMedicationsStock(medications, notifications, currentUser, userProfile);
          }
          return Promise.resolve();
        },
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
