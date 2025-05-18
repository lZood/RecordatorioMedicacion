// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile, Notification } from '../types';
import { MedicationIntakeWithMedication } from '../services/medicationIntakes';
import { User } from '@supabase/supabase-js'; // Subscription no se usa directamente aquí
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

// Helper function (si la tienes, asegúrate que esté definida)
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
  loadingMedications: boolean; 
  addMedication: (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>) => Promise<Medication | undefined>;
  updateMedication: (id: string, updatedMedicationData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;
  
  appointments: Appointment[];
  doctors: UserProfile[];
  loadingAppointments: boolean;
  loadingDoctors: boolean;
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'notificacion_recordatorio_24h_enviada'>) => Promise<Appointment | undefined>;
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
  
  signOut: () => Promise<void>;
  loadInitialData: (user: User | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true); // Indica carga general de datos
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]); // No se usa para carga global, sino específica de paciente
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(true);
  const [loadingMedicationIntakes, setLoadingMedicationIntakes] = useState(true); // Carga específica de tomas
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Estado para controlar si las comprobaciones de notificaciones automáticas ya se ejecutaron
  const [notificationChecksDone, setNotificationChecksDone] = useState(false);


  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) { 
      setUserProfile(null); 
      setLoadingProfile(false); 
      return null; 
    }
    setLoadingProfile(true); // Iniciar carga de perfil
    try {
      console.log("AppContext: fetchUserProfile - Calling profileService.getProfileByUserId for userId:", userId);
      const profile = await profileService.getProfileByUserId(userId);
      console.log("AppContext: fetchUserProfile - Profile fetched:", profile);
      setUserProfile(profile); 
      return profile;
    } catch (error) { 
      console.error("AppContext: fetchUserProfile - Error fetching user profile:", error); 
      setUserProfile(null); 
      return null;
    } finally { 
      setLoadingProfile(false); // Finalizar carga de perfil
    }
  }, []);

  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | undefined> => {
    if (!currentUser) {
        // No lanzar error aquí directamente si es para notificaciones de fondo
        console.warn("AppContext.addNotification: Not authenticated. Cannot create notification.");
        return undefined;
    }
    
    const dataToCreate = {
      ...notificationData,
      patientId: notificationData.patientId === undefined ? null : notificationData.patientId,
      // Asignar doctorId si el usuario actual es un doctor y no se proporcionó un doctorId
      doctorId: notificationData.doctorId !== undefined 
                  ? notificationData.doctorId 
                  : (userProfile?.role === 'doctor' ? currentUser.id : undefined),
    };

    try {
      console.log(`AppContext.addNotification: Attempting to create notification of type: ${dataToCreate.type}`, dataToCreate);
      const newNotification = await notificationService.create(dataToCreate as Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>);
      if (newNotification) {
        setNotifications(prev => {
          // Evitar duplicados si la notificación ya existe (poco probable con UUIDs pero seguro)
          if (prev.some(n => n.id === newNotification.id)) return prev;
          return [newNotification, ...prev].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        });
        // No mostrar toast para notificaciones automáticas para no molestar al usuario
        if (dataToCreate.type !== 'appointment_reminder_24h' && 
            dataToCreate.type !== 'abnormal_vital_sign' &&
            dataToCreate.type !== 'medication_expiring_soon_stock' &&
            dataToCreate.type !== 'low_medication_adherence') { // Añadir otros tipos automáticos aquí
            toast.success(`Notificación "${newNotification.type}" guardada.`);
        }
        return newNotification;
      }
    } catch (error: any) { 
      console.error(`AppContext.addNotification: Error creating notification of type ${dataToCreate.type}:`, error);
      // Solo mostrar toast para errores de notificaciones iniciadas por el usuario, no las automáticas.
      if (dataToCreate.type !== 'appointment_reminder_24h' && 
          dataToCreate.type !== 'abnormal_vital_sign' &&
          dataToCreate.type !== 'medication_expiring_soon_stock' &&
          dataToCreate.type !== 'low_medication_adherence') {
          toast.error(`Error al guardar notificación: ${error.message || 'Error desconocido'}`); 
      }
    }
    return undefined;
  }, [currentUser, userProfile]); // userProfile es dependencia por si se usa para doctorId


  const updateAppointmentFlag = useCallback(async (appointmentId: string, flagUpdates: Partial<Pick<Appointment, 'notificacion_recordatorio_24h_enviada'>>) => {
    try {
        const updatedAppointment = await appointmentService.update(appointmentId, flagUpdates);
        if (updatedAppointment) {
            setAppointments(prevAppts => prevAppts.map(appt => appt.id === appointmentId ? { ...appt, ...updatedAppointment } : appt));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para cita ${appointmentId}:`, error);
    }
  }, []); // Sin dependencias si appointmentService es estable y no usa estado del contexto

  const updateMedicationFlag = useCallback(async (medicationId: string, flagUpdates: Partial<Pick<Medication, 'notificacion_stock_expirando_enviada'>>) => {
    try {
        const updatedMedication = await medicationService.update(medicationId, flagUpdates);
        if (updatedMedication) {
            setMedications(prevMeds => prevMeds.map(med => med.id === medicationId ? { ...med, ...updatedMedication } : med));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para medicamento ${medicationId}:`, error);
    }
  }, []); // Sin dependencias si medicationService es estable

  const generateUpcomingAppointmentReminders = useCallback(async (
    apptsToCheck: Appointment[],
    allPatients: Patient[], 
    currentDoctorProfile: UserProfile | null
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !apptsToCheck.length || !allPatients.length) return;
    console.log("AppContext: Checking for upcoming appointment reminders...");

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const appt of apptsToCheck) {
      if (appt.status === 'scheduled' && !appt.notificacion_recordatorio_24h_enviada) {
        const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
        if (appointmentDateTime > now && appointmentDateTime <= twentyFourHoursLater) {
          const patient = allPatients.find(p => p.id === appt.patientId);
          if (patient && currentDoctorProfile) {
            const message = `Recordatorio automático: Su cita de ${appt.specialty} con ${currentDoctorProfile.name} es mañana, ${new Date(appt.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las ${new Date(`1970-01-01T${appt.time}`).toLocaleTimeString(navigator.language || 'es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}.`;
            const reminderData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
              patientId: patient.id, appointmentId: appt.id, doctorId: appt.doctorId, message,
              type: 'appointment_reminder_24h', status: 'pending', 
              sendAt: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            };
            try { 
              console.log("AppContext: Generating 24h reminder for appointment:", appt.id);
              await addNotification(reminderData);
              await updateAppointmentFlag(appt.id, { notificacion_recordatorio_24h_enviada: true });
            } catch (e) { console.error("AppContext: Error in generateUpcomingAppointmentReminders for appt:", appt.id, e); }
          }
        }
      }
    }
  }, [addNotification, updateAppointmentFlag]);

  const checkExpiringMedicationsStock = useCallback(async (
    medsToCheck: Medication[],
    authUserId: string | undefined, // Puede ser undefined si currentUser es null
    currentDoctorProfile: UserProfile | null
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !medsToCheck.length || !authUserId) return;
    console.log("AppContext: Checking for expiring medication stock...");
    
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const med of medsToCheck) {
        if (med.doctorId !== authUserId) continue;
        if (med.notificacion_stock_expirando_enviada) continue; 

        const expirationDate = new Date(med.expirationDate);
        if (expirationDate > today && expirationDate <= thirtyDaysLater) {
            const medExpirationDateString = new Date(med.expirationDate + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES');
            const message = `Alerta de inventario: Su medicamento "${med.name}" (Principio Activo: ${med.activeIngredient}) vence el ${medExpirationDateString}.`;
            
            const notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: null, doctorId: authUserId, message: message,
                type: 'medication_expiring_soon_stock', status: 'pending',
            };
            try { 
              console.log("AppContext: Generating expiring stock notification for med:", med.id);
              await addNotification(notificationData);
              await updateMedicationFlag(med.id, { notificacion_stock_expirando_enviada: true });
            } catch (e) { console.error("AppContext: Error in checkExpiringMedicationsStock for med:", med.id, e); }
        }
    }
  }, [addNotification, updateMedicationFlag]);


  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      console.log("AppContext: internalLoadInitialData - No authUser, clearing data.");
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingMedications(false); 
      setLoadingDoctors(false); setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); 
      setLoadingNotifications(false); setLoadingProfile(false);
      setNotificationChecksDone(false); // Resetear para la próxima carga de datos
      return;
    }
    
    console.log("AppContext: internalLoadInitialData - Starting data load for user:", authUser.id);
    setLoadingData(true); setLoadingAppointments(true); setLoadingMedications(true);
    setLoadingDoctors(true); setLoadingVitalSigns(true); setLoadingMedicationIntakes(true); 
    setLoadingNotifications(true); 
    // setLoadingProfile se maneja en fetchUserProfile
    setNotificationChecksDone(false); // Resetear para que las comprobaciones se ejecuten después de esta carga

    const fetchedProfile = await fetchUserProfile(authUser.id); // Esto ya setea userProfile y loadingProfile

    try {
      // Solo cargar datos si el perfil es de doctor
      if (fetchedProfile?.role === 'doctor') {
        console.log("AppContext: internalLoadInitialData - Doctor profile found. Fetching doctor-specific data.");
        const [
          resolvedDoctorsData, 
          resolvedNotificationsData, 
          patientsData, 
          medicationsData, 
          appointmentsData, 
          vitalSignsData
        ] = await Promise.all([
          profileService.getAllDoctors().catch(e => { console.error("Error fetching all doctors:", e); return []; }),
          notificationService.getAll().catch(e => { console.error("Error fetching all notifications:", e); return []; }),
          patientService.getAll().catch(e => { console.error("Error fetching patients:", e); return []; }),
          medicationService.getAll().catch(e => { console.error("Error fetching medications:", e); return []; }),
          appointmentService.getAll().catch(e => { console.error("Error fetching appointments:", e); return []; }),
          vitalSignService.getAll().catch(e => { console.error("Error fetching vital signs:", e); return []; })
        ]);

        setDoctors(resolvedDoctorsData || []);
        setNotifications(resolvedNotificationsData || []);
        setPatients(patientsData || []);
        setMedications(medicationsData || []);
        setAppointments(appointmentsData || []);
        setVitalSigns(vitalSignsData || []);
        setMedicationIntakes([]); // Se cargan on-demand en PatientDetails
      } else {
        console.log("AppContext: internalLoadInitialData - Profile is not doctor or not found. Clearing doctor-specific data.");
        // Si no es doctor o no hay perfil, limpiar los datos específicos del doctor
        setPatients([]); setMedications([]); setAppointments([]);
        setVitalSigns([]); setMedicationIntakes([]); 
        // Doctores y Notificaciones (generales) podrían seguir siendo relevantes o limpiarse según la lógica
        setDoctors([]); // O mantener los doctores si son datos públicos
        setNotifications([]); // O filtrar notificaciones si algunas son generales
      }
    } catch (error) {
      console.error("AppContext: internalLoadInitialData - Error loading initial data sets:", error);
      toast.error("No se pudieron cargar los datos de la aplicación.");
      // Limpiar estados en caso de error mayor para evitar datos inconsistentes
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
    } finally {
      console.log("AppContext: internalLoadInitialData - Finished data load attempt.");
      setLoadingData(false); setLoadingAppointments(false); setLoadingMedications(false);
      setLoadingDoctors(false); setLoadingVitalSigns(false); setLoadingMedicationIntakes(false); 
      setLoadingNotifications(false);
      // setLoadingProfile ya está en false por fetchUserProfile
      setNotificationChecksDone(true); // Marcar que la carga de datos (y por ende las comprobaciones) pueden proceder
    }
  }, [fetchUserProfile]); // fetchUserProfile es una dependencia estable de useCallback
  

  // Efecto para onAuthStateChange
  useEffect(() => {
    console.log("AppContext: Setting up onAuthStateChange listener.");
    setLoadingAuth(true); // Indicar que estamos en proceso de verificar la autenticación inicial

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AppContext: onAuthStateChange triggered. Event:", _event, "Session:", !!session);
        const user = session?.user ?? null;
        const previousUserId = currentUser?.id;
        
        setCurrentUser(user); // Actualizar currentUser inmediatamente

        if (user?.id !== previousUserId || (!user && previousUserId)) {
            console.log(`AppContext: onAuthStateChange - User state changed (from ${previousUserId} to ${user?.id}). Reloading data.`);
            await internalLoadInitialData(user);
        } else {
            console.log("AppContext: onAuthStateChange - User state did not change relevantly for data reload.");
        }
        setLoadingAuth(false); // Terminar estado de carga de autenticación
      }
    );

    // Verificación inicial de la sesión al montar el componente
    (async () => {
      console.log("AppContext: Performing initial session check.");
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("AppContext: Error getting initial session:", error);
      }
      console.log("AppContext: Initial session check result:", !!session);
      const user = session?.user ?? null;

      // Solo llamar a setCurrentUser y internalLoadInitialData si el usuario es diferente al actual
      // o si es la primera vez (currentUser es null).
      if (user?.id !== currentUser?.id || (!user && currentUser) || (user && !currentUser)) {
        setCurrentUser(user);
        await internalLoadInitialData(user);
      }
      setLoadingAuth(false); // Terminar estado de carga de autenticación después de la verificación inicial
    })();

    return () => {
      console.log("AppContext: Unsubscribing from onAuthStateChange.");
      subscription?.unsubscribe();
    };
  // Las dependencias deben ser estables.
  // `internalLoadInitialData` es un useCallback. `currentUser` causa que este efecto se re-ejecute si cambia,
  // lo cual es correcto para manejar cambios de sesión.
  }, [internalLoadInitialData]); // currentUser fue quitado para evitar re-ejecución si sólo cambia currentUser sin cambiar la sesión real

  // Efecto para ejecutar las comprobaciones de notificaciones DESPUÉS de que todo haya cargado
  useEffect(() => {
    // Solo ejecutar si todas las cargas de datos principales han terminado Y
    // el usuario está autenticado y tiene un perfil de doctor.
    const allDataLoadedAndUserReady = 
        !loadingData && 
        !loadingAppointments && 
        !loadingMedications && 
        !loadingNotifications && 
        !loadingProfile && 
        !loadingVitalSigns && 
        !loadingDoctors &&
        !loadingAuth && // Asegurarse que la autenticación haya terminado
        currentUser && 
        userProfile?.role === 'doctor' &&
        notificationChecksDone; // Asegurarse que internalLoadInitialData haya completado su ciclo.

    if (allDataLoadedAndUserReady) {
      console.log("AppContext: All data loaded and user is ready. Running notification checks.");
      
      // Para evitar bucles, estas funciones idealmente no deberían causar cambios en las dependencias
      // de *este* useEffect de una manera que lo haga re-ejecutar indefinidamente.
      // Pasamos copias de los arrays para que las funciones operen sobre la "foto" actual.
      const currentAppointmentsCopy = [...appointments];
      const currentMedicationsCopy = [...medications];
      const currentPatientsCopy = [...patients];

      const runChecks = async () => {
        // Doble verificación por si userProfile o currentUser cambian durante el async
        if (userProfile?.role === 'doctor' && currentUser) {
          await generateUpcomingAppointmentReminders(currentAppointmentsCopy, currentPatientsCopy, userProfile);
          await checkExpiringMedicationsStock(currentMedicationsCopy, currentUser.id, userProfile);
        }
      };
      
      runChecks();
      // Considera si necesitas resetear `notificationChecksDone` en algún punto si estas comprobaciones
      // deben volver a ejecutarse bajo ciertas condiciones (ej. después de un nuevo login).
      // Por ahora, se resetea en internalLoadInitialData cuando no hay authUser.
    }
  }, [
    // Dependencias que indican que los datos y el estado de autenticación están listos:
    currentUser, userProfile, 
    loadingAuth, loadingData, loadingAppointments, loadingMedications, 
    loadingNotifications, loadingProfile, loadingVitalSigns, loadingDoctors,
    notificationChecksDone, // Nueva bandera
    // Los arrays de datos principales, si cambian, podrían justificar una nueva comprobación
    // pero hay que tener cuidado con los bucles si las funciones de comprobación los modifican.
    appointments, medications, patients, 
    // Funciones callback (estables):
    generateUpcomingAppointmentReminders, checkExpiringMedicationsStock
  ]);


  // --- Definiciones de funciones CRUD (addPatient, updatePatient, etc.) ---
  // Estas funciones deben ser useCallback y tener sus dependencias correctas.
  // Ejemplo para addPatient (las otras seguirían un patrón similar):
  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>): Promise<Patient | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Solo los doctores pueden añadir pacientes."); 
      throw new Error("User not authorized or not a doctor."); 
    }
    try {
      const patientDataWithDoctorId: Omit<Patient, 'id' | 'createdAt'> = { ...patientData, doctorId: currentUser.id };
      const newPatient = await patientService.create(patientDataWithDoctorId);
      if (newPatient) { 
        setPatients(prev => [...prev, newPatient].sort((a,b) => a.name.localeCompare(b.name))); 
        toast.success('Paciente añadido!'); 
        return newPatient; 
      }
    } catch (error: any) { 
      toast.error(`Error al añadir paciente: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);
  
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Patient>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
    try {
        const updated = await patientService.update(id, updatedData);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === id ? {...p, ...updated} : p).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Paciente actualizado!');
        }
    } catch (error: any) { 
      toast.error(`Error al actualizar paciente: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
    try {
        await patientService.delete(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        toast.success('Paciente eliminado!');
    } catch (error: any) { 
      toast.error(`Error al eliminar paciente: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const getPatientById = useCallback((id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  }, [patients]);

  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>): Promise<Medication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Solo los doctores pueden añadir medicamentos."); 
      throw new Error("User not authorized or not a doctor."); 
    }
    if (!currentUser.id) { 
      toast.error("Falta ID del doctor."); 
      throw new Error("Doctor ID is missing.");
    }
    try {
      const medicationDataWithDoctorId: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = { 
        ...medicationData, 
        doctorId: currentUser.id,
        notificacion_stock_expirando_enviada: false 
      };
      // Asegurar que el tipo coincida con lo que espera medicationService.create
      const newMed = await medicationService.create(medicationDataWithDoctorId as Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>);
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
  
  const updateMedicationCb = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
    try {
        const updated = await medicationService.update(id, updatedData);
        if (updated) {
            setMedications(prev => prev.map(m => m.id === id ? {...m, ...updated} : m).sort((a,b) => a.name.localeCompare(b.name)));
            toast.success('Medicamento actualizado!');
        }
    } catch (error: any) { 
      toast.error(`Error al actualizar medicamento: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const deleteMedication = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
    try {
        await medicationService.delete(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        toast.success('Medicamento eliminado!');
    } catch (error: any) { 
      toast.error(`Error al eliminar medicamento: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const getMedicationById = useCallback((id: string): Medication | undefined => {
    return medications.find(m => m.id === id);
  }, [medications]);

  const addAppointmentCb = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'notificacion_recordatorio_24h_enviada'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
    const dataWithCorrectDoctor: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'> = { 
        ...appointmentData, 
        doctorId: currentUser.id, // Asignar el doctorId del usuario actual
    };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor as Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>);
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
    } catch (error: any) { 
      toast.error(`Error al programar cita: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile, patients, addNotification]);

  const updateAppointmentCb = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) : Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
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
    } catch (error: any) { 
      toast.error(`Error al actualizar cita: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile, appointments, patients, addNotification]);

  const deleteAppointmentCb = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Error de autenticación/Rol de doctor necesario"); 
      throw new Error("User not authorized or not a doctor."); 
    }
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
    } catch (error: any) { 
      toast.error(`Error al eliminar cita: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile, appointments, patients, addNotification]);

  const getAppointmentById = useCallback((id: string): Appointment | undefined => {
    return appointments.find(app => app.id === id);
  }, [appointments]);

  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
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
    } catch (error: any) { 
      toast.error(`Error al registrar signo vital: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile, patients, addNotification]); 

  const updateVitalSign = useCallback(async (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      const updatedVitalSign = await vitalSignService.update(id, vitalSignUpdateData);
      if (updatedVitalSign) {
        setVitalSigns(prev => prev.map(vs => (vs.id === id ? { ...vs, ...updatedVitalSign } : vs))
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ));
        toast.success('Signo vital actualizado!');
      }
    } catch (error: any) { 
      toast.error(`Error al actualizar signo vital: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const deleteVitalSign = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      await vitalSignService.delete(id);
      setVitalSigns(prev => prev.filter(vs => vs.id !== id));
      toast.success('Signo vital eliminado!');
    } catch (error: any) { 
      toast.error(`Error al eliminar signo vital: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);
  
  const fetchVitalSignsForPatient = useCallback(async (patientId: string): Promise<VitalSign[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    setLoadingVitalSigns(true);
    try {
        const data = await vitalSignService.getByPatient(patientId);
        return data;
    } catch (error: any) { 
      toast.error(`Error al obtener signos vitales: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    finally { setLoadingVitalSigns(false); }
  }, [currentUser, userProfile]);

  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake) {
        // No actualizamos el estado global `medicationIntakes` aquí, ya que se maneja por paciente
        toast.success('Toma de medicamento registrada!');
        return newIntake; // Devolver para actualizar localmente en la página del paciente
      }
    } catch (error: any) { 
      toast.error(`Error al añadir toma: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);

  const updateMedicationIntake = useCallback(async (id: string, intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      const updatedIntake = await medicationIntakeService.update(id, intakeUpdateData);
      if (updatedIntake) {
        toast.success('Toma de medicamento actualizada!');
        return updatedIntake; // Devolver para actualizar localmente
      }
    } catch (error: any) { 
      toast.error(`Error al actualizar toma: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);

  const deleteMedicationIntake = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      await medicationIntakeService.delete(id);
      toast.success('Toma de medicamento eliminada!');
      // La actualización local se maneja en la página del paciente
    } catch (error: any) { 
      toast.error(`Error al eliminar toma: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
  }, [currentUser, userProfile]);

  const fetchMedicationIntakesForPatient = useCallback(async (patientId: string): Promise<MedicationIntakeWithMedication[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    setLoadingMedicationIntakes(true); // Este estado es para la carga específica en PatientDetails
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data;
    } catch (error: any) { 
      toast.error(`Error al obtener tomas: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    finally { setLoadingMedicationIntakes(false); }
  }, [currentUser, userProfile]);

  const fetchNotificationsForPatient = useCallback(async (patientId: string): Promise<Notification[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    setLoadingNotifications(true); // Indica carga de notificaciones para un paciente
    try {
      const data = await notificationService.getByPatient(patientId);
      return data;
    } catch (error: any) { 
      toast.error(`Error al obtener notificaciones: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    finally { setLoadingNotifications(false); }
  }, [currentUser, userProfile]);

  const updateNotificationStatus = useCallback(async (notificationId: string, status: Notification['status']): Promise<Notification | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') { 
      toast.error("Autenticación requerida/Rol de doctor necesario"); 
      throw new Error("Not authorized."); 
    }
    try {
      const updatedNotification = await notificationService.update(notificationId, { status });
      if (updatedNotification) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? updatedNotification : n)
                                  .sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
        toast.success(`Notificación marcada como ${status}.`);
        return updatedNotification;
      }
    } catch (error: any) { 
      toast.error(`Error al actualizar estado de notificación: ${error.message || 'Error desconocido'}`); 
      throw error; 
    }
    return undefined;
  }, [currentUser, userProfile]);


  const signOut = useCallback(async () => {
    console.log("AppContext: signOut called");
    toast.loading('Cerrando sesión...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      // setCurrentUser(null); // onAuthStateChange debería encargarse de esto
      // setUserProfile(null);
      // // Limpiar otros estados también
      // setPatients([]);
      // setMedications([]);
      // setAppointments([]);
      // setDoctors([]);
      // setVitalSigns([]);
      // setNotifications([]);
      // setNotificationChecksDone(false);
      toast.dismiss('signout-toast');
      toast.success('Sesión cerrada exitosamente!');
      // La navegación se maneja en Sidebar o donde se llame a signOut
    } catch (error: any) {
      toast.dismiss('signout-toast');
      console.error("AppContext: Sign out error:", error);
      toast.error(`Error al cerrar sesión: ${error.message || 'Error desconocido'}`);
    }
  }, []);
  
  const value = {
    currentUser, userProfile, loadingAuth, loadingData, loadingProfile,
    patients, addPatient, updatePatient, deletePatient, getPatientById,
    medications, loadingMedications,
    addMedication, updateMedication: updateMedicationCb, 
    deleteMedication, getMedicationById,
    appointments, doctors, loadingAppointments, loadingDoctors,
    addAppointment: addAppointmentCb, updateAppointment: updateAppointmentCb, 
    deleteAppointment: deleteAppointmentCb, getAppointmentById,
    vitalSigns, loadingVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign, fetchVitalSignsForPatient,
    medicationIntakes, loadingMedicationIntakes, addMedicationIntake, updateMedicationIntake, deleteMedicationIntake, fetchMedicationIntakesForPatient,
    notifications, loadingNotifications, addNotification, fetchNotificationsForPatient, updateNotificationStatus,
    signOut,
    loadInitialData: internalLoadInitialData,
  };

  return (
    <AppContext.Provider value={value}>
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