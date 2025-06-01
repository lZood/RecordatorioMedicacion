// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile, Notification } from '../types'; // Asegúrate que Patient no tenga user_id aquí si no es parte del modelo principal
import { MedicationIntakeWithMedication, medicationIntakeService } from '../services/medicationIntakes';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { patientService } from '../services/patients';
import { medicationService } from '../services/medications';
import { appointmentService } from '../services/appointments';
import { vitalSignService } from '../services/vitalSigns';
import { profileService } from '../services/profiles';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';
import { authService, ExtendedSignUpCredentials } from '../services/auth'; // ExtendedSignUpCredentials no se usará en el nuevo addPatient


// Helper function
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
  // MODIFICACIÓN 1: Cambiar la firma de addPatient
  addPatient: (
    patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'> // Ya no recibe password ni email para auth
  ) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Omit<Patient, 'user_id'>>) => Promise<void>; // Mantén user_id omitido si no es parte de Patient
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  // ... (el resto de las firmas de AppContextType permanecen igual) ...
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
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>) => Promise<Appointment | undefined>;
  updateAppointment: (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor'>>) => Promise<Appointment | undefined>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined;

  vitalSigns: VitalSign[];
  loadingVitalSigns: boolean;
  addVitalSign: (vitalSignData: Omit<VitalSign, 'id'>) => Promise<VitalSign | undefined>;
  updateVitalSign: (id: string, vitalSignUpdateData: Partial<Omit<VitalSign, 'id'>>) => Promise<void>;
  deleteVitalSign: (id: string) => Promise<void>;
  fetchVitalSignsForPatient: (patientId: string) => Promise<VitalSign[]>;

  medicationIntakes: MedicationIntakeWithMedication[];
  loadingMedicationIntakesGlobal: boolean;
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
  // ... (tus estados y otras funciones como fetchUserProfile, internalLoadInitialData, useEffects, etc. permanecen igual) ...
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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const [loadingMedicationIntakesGlobal, setLoadingMedicationIntakesGlobal] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationChecksDone, setNotificationChecksDone] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) {
      return null;
    }
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
      console.log("AppContext: internalLoadInitialData - No authUser, clearing data.");
      setUserProfile(null);
      setLoadingProfile(false);
      setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
      setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      setLoadingData(false); setLoadingAppointments(false); setLoadingMedications(false);
      setLoadingDoctors(false); setLoadingVitalSigns(false);
      setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
      setNotificationChecksDone(false);
      return;
    }

    console.log("AppContext: internalLoadInitialData - Loading data for user:", authUser.id);
    setLoadingData(true);
    const fetchedProfile = await fetchUserProfile(authUser.id);

    if (fetchedProfile) {
        setUserProfile(fetchedProfile);
    } else {
        setUserProfile(null);
        console.warn(`AppContext: internalLoadInitialData - No profile fetched or fetch failed for user ${authUser.id}.`);
    }
    setLoadingProfile(false);

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
        // Clear all data states on a major fetch error
        setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
        setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      } finally {
        setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
        setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
      }
    } else {
      console.log(`AppContext: internalLoadInitialData - User role is '${fetchedProfile?.role}', not 'doctor', or profile fetch failed. Clearing doctor-specific data.`);
      setPatients([]); setMedications([]); setAppointments([]);
      setVitalSigns([]); setMedicationIntakes([]);
      setNotifications([]);
    }
    setLoadingData(false);
    setNotificationChecksDone(true);
  }, [fetchUserProfile]);

  useEffect(() => {
    console.log("AppContext: Auth Effect (runs once on mount)");
    let isMounted = true;
    setLoadingAuth(true);

    const processAuthState = (newUser: User | null) => {
      if (!isMounted) return;
      setCurrentUser(prevCurrentUser => {
        if (newUser?.id !== prevCurrentUser?.id || (!newUser && prevCurrentUser) || (newUser && !prevCurrentUser)) {
          console.log(`AppContext: Auth state change detected by processAuthState. New user: ${newUser?.id}, Previous user in state: ${prevCurrentUser?.id}`);
          if (newUser) {
            console.log(`AppContext: New user ${newUser.id} detected. Resetting profile and setting loadingProfile true.`);
            setUserProfile(null); // Reset profile before fetching new one
            setLoadingProfile(true);
          } else {
            console.log("AppContext: User is null. Clearing profile, setting loadingProfile false.");
            setUserProfile(null);
            setLoadingProfile(false);
          }
          return newUser;
        }
        console.log("AppContext: Auth state effectively unchanged in processAuthState.");
        return prevCurrentUser;
      });
      if (loadingAuth && isMounted) { // Ensure loadingAuth is set to false after the first check
          setLoadingAuth(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AppContext: onAuthStateChange event:", event);
      processAuthState(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      console.log("AppContext: Initial getSession() result received.");
      processAuthState(session?.user ?? null);
    }).catch(error => {
      if (!isMounted) return;
      console.error("AppContext: Error in getSession():", error);
      processAuthState(null); // Ensure loadingAuth is handled
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      console.log("AppContext: Auth Effect cleanup.");
    };
  }, []);

  useEffect(() => {
    console.log("AppContext: DataLoad useEffect. currentUser:", currentUser?.id, "loadingAuth:", loadingAuth, "loadingProfile:", loadingProfile);
    if (!loadingAuth) { // Only proceed if auth state is resolved
      if (currentUser && loadingProfile) {
          // If currentUser is set, and we just set loadingProfile to true,
          // internalLoadInitialData will be called when loadingProfile becomes false (after profile fetch)
          // OR it will be called because currentUser changed.
          // This condition specifically waits if profile is actively being fetched for a new user.
          console.log("AppContext: DataLoad useEffect - User exists, auth loaded, profile IS LOADING. Waiting for profile.");
          return;
      }

      if (currentUser && !loadingProfile) { // User exists, auth loaded, profile IS NOT loading (either fetched or fetch failed)
        console.log("AppContext: DataLoad useEffect - User exists, auth loaded, profile NOT loading. Calling internalLoadInitialData.");
        internalLoadInitialData(currentUser);
      } else if (!currentUser && !loadingProfile) { // No user, auth loaded, profile not loading (cleared state)
        console.log("AppContext: DataLoad useEffect - No user, auth loaded, profile NOT loading. Clearing data.");
        internalLoadInitialData(null);
      }
    } else {
        console.log("AppContext: DataLoad useEffect - Auth IS STILL loading. Deferring data load.");
    }
  }, [currentUser, loadingAuth, loadingProfile, internalLoadInitialData]);


  // MODIFICACIÓN 2: Implementar la nueva lógica de addPatient
  const addPatient = useCallback(async (
    patientData: Omit<Patient, 'id' | 'createdAt' | 'doctorId'>
  ): Promise<Patient | undefined> => {
    const currentAuthUser = currentUser;
    const currentDoctorProfile = userProfile;

    if (!currentAuthUser || currentDoctorProfile?.role !== 'doctor') {
      toast.error("Solo los doctores autenticados pueden añadir pacientes.");
      throw new Error("User not authorized or not a doctor.");
    }

    try {
      // Preparamos los datos para la tabla 'patients', incluyendo el doctorId
      const patientRecordData: Omit<Patient, 'id' | 'createdAt'> = {
        ...patientData, // Esto contiene name, email (informativo), phone, address
        doctorId: currentAuthUser.id, // El ID del doctor que está creando al paciente
        // user_id (el auth ID del paciente) NO se establece aquí.
        // Se establecerá cuando el paciente se registre en la app móvil y se vincule.
      };

      console.log("AppContext.addPatient: Intentando crear registro de paciente en tabla 'patients':", patientRecordData);
      // patientService.create ahora solo inserta en la tabla 'patients'
      const newPatientRecord = await patientService.create(patientRecordData);

      if (newPatientRecord) {
        setPatients(prev => [...prev, newPatientRecord].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Registro del paciente ${newPatientRecord.name} creado!`);
        // No hay inicio de sesión con la cuenta del paciente aquí.
        // La sesión del doctor permanece activa.
        return newPatientRecord;
      } else {
        console.error("AppContext.addPatient: Falló la creación del registro del paciente.");
        toast.error("Error al crear el registro del paciente.");
        throw new Error("Falló la creación del registro del paciente.");
      }
    } catch (error: any) {
      toast.error(`Error creando el registro del paciente: ${error.message || 'Error desconocido'}`);
      console.error("AppContext.addPatient: Error creando el registro del paciente:", error);
      throw error; // Re-lanzar para que Patients.tsx pueda manejarlo si es necesario
    }
  }, [currentUser, userProfile]);

  // ... (el resto de tus funciones como updatePatient, deletePatient, addMedication, etc. permanecen igual) ...
  // Asegúrate de que las firmas de esas funciones coincidan con las definidas en AppContextType
  const updatePatient = useCallback(async (id: string, updatedData: Partial<Omit<Patient, 'user_id'>>): Promise<void> => {
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


  const addAppointmentCb = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'>): Promise<Appointment | undefined> => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Error de autenticación/Rol de doctor necesario");
      throw new Error("User not authorized or not a doctor.");
    }
    const dataWithCorrectDoctor: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patient' | 'doctor' | 'notificacion_recordatorio_24h_enviada'> = {
        ...appointmentData,
        doctorId: currentUser.id,
    };
    try {
      const newAppointment = await appointmentService.create(dataWithCorrectDoctor);
      if (newAppointment) {
        setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Cita programada!');
        // Notification logic for new appointment (remains the same)
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
  }, [currentUser, userProfile, patients, addNotification]); // addNotification is already a useCallback

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
         // Notification logic for updated/cancelled appointment (remains the same)
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
  }, [currentUser, userProfile, appointments, patients, addNotification]); // addNotification is already a useCallback

  const deleteAppointmentCb = useCallback(async (id: string): Promise<void> => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Error de autenticación/Rol de doctor necesario");
      throw new Error("User not authorized or not a doctor.");
    }
    try {
      const apptToDelete = appointments.find(app => app.id === id);
      // Notification logic for deleted appointment (remains the same)
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
  }, [currentUser, userProfile, appointments, patients, addNotification]); // addNotification is already a useCallback

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
        // Notification logic for abnormal vital sign (remains the same)
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
  }, [currentUser, userProfile, patients, addNotification]); // addNotification is already a useCallback

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

  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | undefined> => {
    // ... (implementation as you provided, seems okay)
    const currentAuthUser = currentUser;
    const currentProfile = userProfile;

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
          if (prev.some(n => n.id === newNotification.id)) return prev;
          return [newNotification, ...prev].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        });
        if (dataToCreate.type !== 'appointment_reminder_24h' &&
            dataToCreate.type !== 'abnormal_vital_sign' &&
            dataToCreate.type !== 'medication_expiring_soon_stock' &&
            dataToCreate.type !== 'low_medication_adherence') {
            toast.success(`Notificación "${newNotification.type}" guardada.`);
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
  }, [currentUser, userProfile]); // Added userProfile here as it's used

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


  const updateAppointmentFlag = useCallback(async (appointmentId: string, flagUpdates: Partial<Pick<Appointment, 'notificacion_recordatorio_24h_enviada'>>) => {
    // ... (implementation as you provided, seems okay)
    try {
        const updatedAppointment = await appointmentService.update(appointmentId, flagUpdates);
        if (updatedAppointment) {
            setAppointments(prevAppts => prevAppts.map(appt => appt.id === appointmentId ? { ...appt, ...updatedAppointment } : appt));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para cita ${appointmentId}:`, error);
    }
  }, []); // Missing dependencies: appointmentService, setAppointments

  const updateMedicationFlag = useCallback(async (medicationId: string, flagUpdates: Partial<Pick<Medication, 'notificacion_stock_expirando_enviada'>>) => {
    // ... (implementation as you provided, seems okay)
    try {
        const updatedMedication = await medicationService.update(medicationId, flagUpdates);
        if (updatedMedication) {
            setMedications(prevMeds => prevMeds.map(med => med.id === medicationId ? { ...med, ...updatedMedication } : med));
        }
    } catch (error) {
        console.error(`AppContext: Error actualizando flag de notificación para medicamento ${medicationId}:`, error);
    }
  }, []); // Missing dependencies: medicationService, setMedications

  const generateUpcomingAppointmentReminders = useCallback(async (
    apptsToCheck: Appointment[],
    allPatients: Patient[],
    currentDoctorProfile: UserProfile | null
  ) => {
    // ... (implementation as you provided, seems okay)
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
              await addNotification(reminderData); // This is addNotification from AppContext
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
    currentDoctorProfile: UserProfile | null
  ) => {
    // ... (implementation as you provided, seems okay)
    if (currentDoctorProfile?.role !== 'doctor' || !medsToCheck.length || !authUserId) return;
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
              await addNotification(notificationData); // This is addNotification from AppContext
              await updateMedicationFlag(med.id, { notificacion_stock_expirando_enviada: true });
            } catch (e) { console.error("AppContext: Error in checkExpiringMedicationsStock for med:", med.id, e); }
        }
    }
  }, [addNotification, updateMedicationFlag]);

  useEffect(() => {
    const allDataLoadedAndUserReady =
        !loadingData && !loadingAppointments && !loadingMedications &&
        !loadingNotifications && !loadingProfile && !loadingVitalSigns &&
        !loadingDoctors && !loadingMedicationIntakesGlobal &&
        !loadingAuth &&
        currentUser &&
        userProfile?.role === 'doctor' &&
        notificationChecksDone;

    if (allDataLoadedAndUserReady) {
      const currentAppointmentsCopy = [...appointments];
      const currentMedicationsCopy = [...medications];
      const currentPatientsCopy = [...patients]; // Ensure patients state is up-to-date for these checks
      const runChecks = async () => {
        if (userProfile?.role === 'doctor' && currentUser) {
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
    loadingAuth, loadingData, loadingAppointments, loadingMedications,
    loadingNotifications, loadingProfile, loadingVitalSigns, loadingDoctors,
    loadingMedicationIntakesGlobal,
    notificationChecksDone,
    appointments, medications, patients, // Make sure patients is a dependency
    generateUpcomingAppointmentReminders, checkExpiringMedicationsStock
  ]);


  const signOut = useCallback(async () => {
    toast.loading('Cerrando sesión...', { id: 'signout-toast' });
    try {
      await authService.signOut();
      toast.dismiss('signout-toast');
      toast.success('Sesión cerrada exitosamente!');
      // Auth useEffect will handle state clearing via setCurrentUser(null)
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