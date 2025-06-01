// src/contexts/AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import {
  Patient,
  Medication,
  Appointment,
  VitalSign,
  MedicationIntake,
  UserProfile,
  Notification,
} from '../types';
import {
  MedicationIntakeWithMedication,
  medicationIntakeService,
} from '../services/medicationIntakes';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { profileService } from '../services/profiles';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';
import { authService, CreatePatientUserCredentials } from '../services/auth'; // Importar CreatePatientUserCredentials

// Helper function (sin cambios)
const isAbnormalVitalSign = (
  vitalSign: VitalSign
): { abnormal: boolean; reason: string } => {
  const { type, value } = vitalSign;
  if (
    type.toLowerCase().includes('presión arterial sistólica') ||
    type.toLowerCase().includes('systolic blood pressure')
  ) {
    if (value > 140)
      return { abnormal: true, reason: `Presión sistólica alta: ${value} mmHg` };
    if (value < 90)
      return { abnormal: true, reason: `Presión sistólica baja: ${value} mmHg` };
  }
  if (
    type.toLowerCase().includes('frecuencia cardíaca') ||
    type.toLowerCase().includes('heart rate')
  ) {
    if (value > 100)
      return { abnormal: true, reason: `Frecuencia cardíaca alta: ${value} bpm` };
    if (value < 60)
      return { abnormal: true, reason: `Frecuencia cardíaca baja: ${value} bpm` };
  }
  return { abnormal: false, reason: '' };
};

// Interfaz para los datos completos al crear un paciente, incluyendo credenciales de login
export interface CreatePatientFullData extends Omit<Patient, 'id' | 'createdAt' | 'doctorId' | 'user_id'> {
  loginEmail: string;
  temporaryPassword: string;
}

interface AppContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  loadingData: boolean;
  loadingProfile: boolean;

  patients: Patient[];
  addPatient: (patientFullData: CreatePatientFullData) => Promise<Patient | undefined>; // Firma actualizada
  updatePatient: (id: string, updatedPatientData: Partial<Omit<Patient, 'user_id' | 'doctorId'>>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  medications: Medication[];
  loadingMedications: boolean;
  addMedication: (
    medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>
  ) => Promise<Medication | undefined>;
  updateMedication: (
    id: string,
    updatedMedicationData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;

  appointments: Appointment[];
  doctors: UserProfile[];
  loadingAppointments: boolean;
  loadingDoctors: boolean;
  addAppointment: (
    appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>
  ) => Promise<Appointment | undefined>;
  updateAppointment: (
    id: string,
    appointmentUpdateData: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor'>>
  ) => Promise<Appointment | undefined>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined;

  vitalSigns: VitalSign[];
  loadingVitalSigns: boolean;
  addVitalSign: (vitalSignData: Omit<VitalSign, 'id'>) => Promise<VitalSign | undefined>;
  updateVitalSign: (
    id: string,
    vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>
  ) => Promise<void>;
  deleteVitalSign: (id: string) => Promise<void>;
  fetchVitalSignsForPatient: (patientId: string) => Promise<VitalSign[]>;

  medicationIntakes: MedicationIntakeWithMedication[];
  loadingMedicationIntakesGlobal: boolean;
  addMedicationIntake: (
    intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<MedicationIntakeWithMedication | undefined>;
  updateMedicationIntake: (
    id: string,
    intakeUpdateData: Partial<Omit<MedicationIntake, 'id' | 'patientId' | 'medicationId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<MedicationIntakeWithMedication | undefined>;
  deleteMedicationIntake: (id: string) => Promise<void>;
  fetchMedicationIntakesForPatient: (
    patientId: string
  ) => Promise<MedicationIntakeWithMedication[]>;

  notifications: Notification[];
  loadingNotifications: boolean;
  addNotification: (
    notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Notification | undefined>;
  fetchNotificationsForPatient: (patientId: string) => Promise<Notification[]>;
  updateNotificationStatus: (
    notificationId: string,
    status: Notification['status']
  ) => Promise<Notification | undefined>;

  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true); // Iniciar como true
  const [loadingProfile, setLoadingProfile] = useState(true); // Iniciar como true

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntakeWithMedication[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(true);
  const [loadingMedicationIntakesGlobal, setLoadingMedicationIntakesGlobal] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notificationChecksDone, setNotificationChecksDone] = useState(false);


  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    console.log(`AppContext: fetchUserProfile called for userId: ${userId}`);
    try {
      const profile = await profileService.getProfileByUserId(userId);
      console.log(`AppContext: fetchUserProfile - profileService returned:`, profile);
      return profile;
    } catch (error) {
      console.error("AppContext: Error fetching user profile in fetchUserProfile:", error);
      toast.error("Error al cargar el perfil del usuario.");
      return null;
    }
  }, []);

  const internalLoadInitialData = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      console.log("AppContext: internalLoadInitialData - No authUser, clearing data and states.");
      setUserProfile(null);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      
      setLoadingProfile(false); 
      setLoadingData(false);
      setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
      setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
      setNotificationChecksDone(false); // Resetear para el próximo login
      return;
    }

    console.log("AppContext: internalLoadInitialData - Loading data for user:", authUser.id);
    setLoadingProfile(true); // Indicar que el perfil está cargando
    setLoadingData(true);    // Indicar que los datos generales están cargando

    const fetchedProfile = await fetchUserProfile(authUser.id);
    setUserProfile(fetchedProfile); // Establecer perfil (o null si falla)
    setLoadingProfile(false);       // Perfil ya no está cargando

    if (fetchedProfile && fetchedProfile.role === 'doctor') {
      console.log("AppContext: internalLoadInitialData - User is a doctor, fetching doctor-specific data.");
      setLoadingAppointments(true); setLoadingMedications(true); setLoadingDoctors(true);
      setLoadingVitalSigns(true); setLoadingMedicationIntakesGlobal(true); setLoadingNotifications(true);
      try {
        const [
          resolvedDoctorsData, resolvedNotificationsData, patientsData,
          medicationsData, appointmentsData, vitalSignsData, allMedicationIntakesData
        ] = await Promise.all([
          profileService.getAllDoctors().catch(e => { console.error("Error fetching all doctors:", e); return []; }),
          notificationService.getAll().catch(e => { console.error("Error fetching all notifications:", e); return []; }),
          patientService.getAll().catch(e => { console.error("Error fetching patients:", e); return []; }),
          medicationService.getAll().catch(e => { console.error("Error fetching medications:", e); return []; }),
          appointmentService.getAll().catch(e => { console.error("Error fetching appointments:", e); return []; }),
          vitalSignService.getAll().catch(e => { console.error("Error fetching vital signs:", e); return []; }),
          medicationIntakeService.getAllIntakes().catch(e => { console.error("Error fetching all medication intakes:", e); return []; })
        ]);
        setDoctors(resolvedDoctorsData || []);
        setNotifications(resolvedNotificationsData || []);
        setPatients(patientsData || []);
        setMedications(medicationsData || []);
        setAppointments(appointmentsData || []);
        setVitalSigns(vitalSignsData || []);
        setMedicationIntakes(allMedicationIntakesData || []);
      } catch (error) {
        console.error("AppContext: Error loading initial data sets for doctor:", error);
        toast.error("No se pudieron cargar todos los datos de la aplicación.");
      } finally {
        setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
        setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
      }
    } else {
      console.log(`AppContext: internalLoadInitialData - User role is '${fetchedProfile?.role}', not 'doctor', or profile fetch failed. Clearing non-profile data.`);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
      setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
    }
    setLoadingData(false); // Todos los datos (o su ausencia) están establecidos
    setNotificationChecksDone(true);
  }, [fetchUserProfile]);


  useEffect(() => {
    setLoadingAuth(true);
    setLoadingProfile(true); // Asumir que el perfil también se cargará inicialmente
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AppContext: onAuthStateChange event: ${event}, session:`, session);
        const user = session?.user ?? null;
        setCurrentUser(user); // Esto disparará el efecto de carga de datos

        if (!user) { // Si no hay usuario (logout)
          setLoadingProfile(false); // Ya no hay perfil que cargar
        }
        // setLoadingAuth se pondrá en false en el efecto de carga de datos
      }
    );

    // Carga inicial de sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AppContext: Initial getSession() call, session:", session);
      const user = session?.user ?? null;
      setCurrentUser(user); // Esto también disparará el efecto de carga de datos
      if (!user) {
        setLoadingProfile(false);
      }
      // setLoadingAuth se maneja en el efecto de carga de datos
    }).catch(error => {
      console.error("AppContext: Error in initial getSession():", error);
      setCurrentUser(null);
      setLoadingProfile(false);
      setLoadingAuth(false); // Asegurar que se desactive en caso de error
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Solo se ejecuta una vez al montar

  // Efecto para cargar datos cuando currentUser o loadingAuth cambian
  useEffect(() => {
    console.log("AppContext: DataLoad useEffect triggered. loadingAuth:", loadingAuth, "currentUser:", currentUser?.id);
    if (!loadingAuth) { // Solo proceder si la autenticación inicial ha terminado
      if (currentUser) {
        console.log("AppContext: DataLoad useEffect - User exists, calling internalLoadInitialData.");
        internalLoadInitialData(currentUser);
      } else {
        console.log("AppContext: DataLoad useEffect - No user, clearing data.");
        internalLoadInitialData(null); // Esto limpiará los estados y pondrá los loaders en false
      }
    }
  }, [currentUser, loadingAuth, internalLoadInitialData]);


  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | undefined> => {
    const currentAuthUser = currentUser;
    const currentProfile = userProfile; // Usar el estado userProfile

    if (!currentAuthUser) {
        console.warn("AppContext.addNotification: Not authenticated. Cannot create notification.");
        return undefined;
    }
    const dataToCreate = {
      ...notificationData,
      patientId: notificationData.patientId === undefined ? null : notificationData.patientId,
      doctorId: notificationData.doctorId !== undefined
                  ? notificationData.doctorId
                  : (currentProfile?.role === 'doctor' ? currentAuthUser.id : undefined),
    };
    try {
      const newNotification = await notificationService.create(dataToCreate as Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>);
      if (newNotification) {
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotification.id)) return prev; // Evitar duplicados si ya existe
          return [newNotification, ...prev].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        });
        // Mostrar toast solo para notificaciones "manuales" o importantes, no las automáticas de fondo
        if (dataToCreate.type !== 'appointment_reminder_24h' &&
            dataToCreate.type !== 'abnormal_vital_sign' &&
            dataToCreate.type !== 'medication_expiring_soon_stock' &&
            dataToCreate.type !== 'low_medication_adherence') {
            toast.success(`Notificación "${newNotification.type.replace(/_/g, ' ')}" guardada.`);
        }
        return newNotification;
      }
    } catch (error: any) {
      console.error(`AppContext.addNotification: Error creating notification of type ${dataToCreate.type}:`, error);
      if (dataToCreate.type !== 'appointment_reminder_24h' &&
          dataToCreate.type !== 'abnormal_vital_sign' &&
          dataToCreate.type !== 'medication_expiring_soon_stock' &&
          dataToCreate.type !== 'low_medication_adherence') {
          toast.error(`Error al guardar notificación: ${error.message || 'Error desconocido'}`);
      }
    }
    return undefined;
  }, [currentUser, userProfile]); // Depender de userProfile del estado

  const updateAppointmentFlag = useCallback(async (appointmentId: string, flagUpdates: Partial<Pick<Appointment, 'notificacion_recordatorio_24h_enviada'>>) => {
    try {
        const updatedAppointment = await appointmentService.update(appointmentId, flagUpdates);
        if (updatedAppointment) {
            setAppointments(prevAppts => prevAppts.map(appt => appt.id === appointmentId ? { ...appt, ...updatedAppointment } : appt));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para cita ${appointmentId}:`, error);
    }
  }, []);

  const updateMedicationFlag = useCallback(async (medicationId: string, flagUpdates: Partial<Pick<Medication, 'notificacion_stock_expirando_enviada'>>) => {
    try {
        const updatedMedication = await medicationService.update(medicationId, flagUpdates);
        if (updatedMedication) {
            setMedications(prevMeds => prevMeds.map(med => med.id === medicationId ? { ...med, ...updatedMedication } : med));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para medicamento ${medicationId}:`, error);
    }
  }, []);

  const generateUpcomingAppointmentReminders = useCallback(async (
    apptsToCheck: Appointment[],
    allPatients: Patient[],
    currentDoctorProfile: UserProfile | null // Usar el perfil del estado
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !apptsToCheck.length || !allPatients.length) return;
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
    authUserId: string | undefined,
    currentDoctorProfile: UserProfile | null // Usar el perfil del estado
  ) => {
    if (currentDoctorProfile?.role !== 'doctor' || !medsToCheck.length || !authUserId) return;
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (const med of medsToCheck) {
        if (med.doctorId !== authUserId) continue; // Solo medicamentos del doctor actual
        if (med.notificacion_stock_expirando_enviada) continue; // Si ya se notificó, saltar
        const expirationDate = new Date(med.expirationDate);
        if (expirationDate > today && expirationDate <= thirtyDaysLater) { // Vence en los próximos 30 días
            const medExpirationDateString = new Date(med.expirationDate + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES');
            const message = `Alerta de inventario: Su medicamento "${med.name}" (Principio Activo: ${med.activeIngredient}) vence el ${medExpirationDateString}.`;
            const notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: null, // Notificación para el doctor, no un paciente específico
                doctorId: authUserId, // ID del doctor
                message: message,
                type: 'medication_expiring_soon_stock',
                status: 'pending',
            };
            try {
              await addNotification(notificationData);
              await updateMedicationFlag(med.id, { notificacion_stock_expirando_enviada: true });
            } catch (e) { console.error("AppContext: Error in checkExpiringMedicationsStock for med:", med.id, e); }
        }
    }
  }, [addNotification, updateMedicationFlag]);

  // Efecto para ejecutar chequeos de notificaciones automáticas
  useEffect(() => {
    const allDataLoadedAndUserReady =
        !loadingAuth && !loadingData && !loadingProfile && // Asegurar que todo esté cargado
        currentUser &&
        userProfile?.role === 'doctor' &&
        notificationChecksDone; // Y que la carga inicial de datos haya finalizado

    if (allDataLoadedAndUserReady) {
      const currentAppointmentsCopy = [...appointments];
      const currentMedicationsCopy = [...medications];
      const currentPatientsCopy = [...patients];

      const runChecks = async () => {
        if (userProfile?.role === 'doctor' && currentUser) { // Doble chequeo por si acaso
          console.log("AppContext: Running scheduled checks (appointments, medications)");
          await generateUpcomingAppointmentReminders(currentAppointmentsCopy, currentPatientsCopy, userProfile);
          await checkExpiringMedicationsStock(currentMedicationsCopy, currentUser.id, userProfile);
        }
      };
      runChecks().catch(error => {
        console.error("AppContext: Error in runChecks useEffect:", error);
      });
    }
  }, [
    currentUser, userProfile,
    loadingAuth, loadingData, loadingProfile,
    notificationChecksDone, // Usar este flag
    appointments, medications, patients, // Dependencias de datos
    generateUpcomingAppointmentReminders, checkExpiringMedicationsStock // Dependencias de funciones
  ]);

  // CRUD Pacientes
  const addPatient = useCallback(async (patientFullData: CreatePatientFullData): Promise<Patient | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden añadir pacientes.");
      throw new Error("User not authorized or not a doctor.");
    }

    let patientAuthUser: User | null = null;
    try {
      // 1. Crear la cuenta de autenticación para el paciente
      const patientAuthCredentials: CreatePatientUserCredentials = {
        email: patientFullData.loginEmail,
        password: patientFullData.temporaryPassword,
        options: {
          data: {
            name: patientFullData.name,
            role: 'patient',
          }
        }
      };
      const authResponse = await authService.createPatientUser(patientAuthCredentials);

      if (authResponse.error) throw authResponse.error;
      patientAuthUser = authResponse.user;
      if (!patientAuthUser) throw new Error("Patient authentication account could not be created.");

      // 2. Crear el registro en la tabla 'patients'
      const patientRecordData: Omit<Patient, 'id' | 'createdAt'> = {
        name: patientFullData.name,
        phone: patientFullData.phone,
        address: patientFullData.address,
        email: patientFullData.email, // Email de contacto
        doctorId: currentUser.id, // ID del doctor logueado
        user_id: patientAuthUser.id, // Vincular con el ID de autenticación del paciente
      };
      const newPatient = await patientService.create(patientRecordData);
      if (newPatient) {
        setPatients(prev => [...prev, newPatient].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('¡Paciente y cuenta de acceso creados!');
        return newPatient;
      } else {
        throw new Error("Failed to create patient record in database.");
      }
    } catch (error: any) {
      toast.error(`Error creando paciente: ${error.message || 'Error desconocido'}`);
      console.error("AppContext.addPatient: Error during patient creation process:", error);
      // Lógica de compensación: si el usuario de auth se creó pero el registro de DB falló
      if (patientAuthUser && patientAuthUser.id) {
        console.warn("Attempting to delete orphaned auth user:", patientAuthUser.id);
        // Idealmente, llamar a una función de admin para eliminar el usuario de auth.
        // Por ahora, solo logueamos, ya que el cliente no tiene permisos de admin.
        // await supabase.auth.admin.deleteUser(patientAuthUser.id); // ESTO SOLO FUNCIONA EN EL SERVIDOR/EDGE FUNCTION
        toast.info("Se creó una cuenta de acceso para el paciente pero falló el registro de sus datos. Contacte a soporte.");
      }
      return undefined;
    }
  }, [currentUser, userProfile]);

  const updatePatient = useCallback(async (id: string, updatedData: Partial<Omit<Patient, 'user_id' | 'doctorId'>>): Promise<void> => {
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
    // Considerar eliminar también el usuario de auth asociado si existe y es deseado.
    // Esto requeriría una Edge Function o llamada de admin.
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


  // CRUD Medicamentos (sin cambios significativos, pero asegurar consistencia)
  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt' | 'notificacion_stock_expirando_enviada'>): Promise<Medication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor' || !currentUser.id) {
      toast.error("Solo los doctores pueden añadir medicamentos.");
      throw new Error("User not authorized, not a doctor, or doctor ID missing.");
    }
    try {
      const medicationDataWithDoctorId: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = {
        ...medicationData,
        doctorId: currentUser.id,
        notificacion_stock_expirando_enviada: false
      };
      const newMed = await medicationService.create(medicationDataWithDoctorId as any); // Cast as any if types mismatch temporarily
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

  const updateMedicationCb = useCallback(async (id: string, updatedData: Partial<Omit<Medication, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>>) => {
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

  const deleteMedication = useCallback(async (id: string) => {
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


  // CRUD Citas (revisar consistencia con addNotification)
  const addAppointmentCb = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor' || !currentUser.id) {
      toast.error("Error de autenticación/Rol de doctor necesario");
      throw new Error("User not authorized or not a doctor.");
    }
    const dataWithCorrectDoctor: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'> = {
        ...appointmentData,
        doctorId: currentUser.id, // Asegurar que el doctorId es el del usuario logueado
    };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Cita programada!');
        const patient = patients.find(p => p.id === newAppointment.patientId);
        if (patient) {
            await addNotification({ // addNotification ya es un useCallback
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

  const updateAppointmentCb = useCallback(async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor'>>) : Promise<Appointment | undefined> => {
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
      if (apptToDelete && apptToDelete.status !== 'cancelled') { // Solo notificar si no estaba ya cancelada
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


  // CRUD Signos Vitales
  const addVitalSign = useCallback(async (vitalSignData: Omit<VitalSign, 'id'>): Promise<VitalSign | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor' || !currentUser.id) {
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
            doctorId: currentUser.id, // El doctor que registra el signo es el actual
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
    try {
        const data = await vitalSignService.getByPatient(patientId);
        return data;
    } catch (error: any) {
      toast.error(`Error al obtener signos vitales: ${error.message || 'Error desconocido'}`);
      throw error;
    }
  }, [currentUser, userProfile]);


  // CRUD Tomas de Medicamentos
  const addMedicationIntake = useCallback(async (intakeData: Omit<MedicationIntake, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationIntakeWithMedication | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Autenticación requerida/Rol de doctor necesario");
      throw new Error("Not authorized.");
    }
    try {
      const newIntake = await medicationIntakeService.create(intakeData);
      if (newIntake) {
        setMedicationIntakes(prev => [newIntake, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
        toast.success('Toma de medicamento registrada!');
        return newIntake;
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
        setMedicationIntakes(prev => prev.map(i => i.id === id ? updatedIntake : i).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)));
        toast.success('Toma de medicamento actualizada!');
        return updatedIntake;
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
      setMedicationIntakes(prev => prev.filter(i => i.id !== id));
      toast.success('Toma de medicamento eliminada!');
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
    try {
      const data = await medicationIntakeService.getByPatient(patientId);
      return data;
    } catch (error: any) {
      toast.error(`Error al obtener tomas: ${error.message || 'Error desconocido'}`);
      throw error;
    }
  }, [currentUser, userProfile]);


  // CRUD Notificaciones
  const fetchNotificationsForPatient = useCallback(async (patientId: string): Promise<Notification[]> => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Autenticación requerida/Rol de doctor necesario");
      throw new Error("Not authorized.");
    }
    try {
      const data = await notificationService.getByPatient(patientId);
      return data;
    } catch (error: any) {
      toast.error(`Error al obtener notificaciones: ${error.message || 'Error desconocido'}`);
      throw error;
    }
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

  // Sign Out
  const signOut = useCallback(async () => {
    toast.loading('Cerrando sesión...', { id: 'signout-toast' });
    try {
      await authService.signOut();
      toast.dismiss('signout-toast');
      toast.success('Sesión cerrada exitosamente!');
      // El Auth useEffect se encargará de llamar a setCurrentUser(null)
      // y el DataLoad useEffect llamará a internalLoadInitialData(null)
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
    medicationIntakes,
    loadingMedicationIntakesGlobal,
    addMedicationIntake, updateMedicationIntake, deleteMedicationIntake,
    fetchMedicationIntakesForPatient,
    notifications, loadingNotifications, addNotification, fetchNotificationsForPatient, updateNotificationStatus,
    signOut,
    // loadInitialData: internalLoadInitialData, // No es necesario exponerlo si se maneja internamente
  };

  return (
    <AppContext.Provider value={value as AppContextType}> {/* Cast a AppContextType */}
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
