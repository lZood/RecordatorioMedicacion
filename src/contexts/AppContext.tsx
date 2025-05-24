// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake, UserProfile, Notification } from '../types';
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
import { authService, ExtendedSignUpCredentials } from '../services/auth'; // Asegúrate de importar ExtendedSignUpCredentials

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
  // Modificada la firma de addPatient
  addPatient: (
    patientDataForTable: Omit<Patient, 'id' | 'createdAt' | 'doctorId' | 'user_id'>, 
    passwordForAuth: string,
    emailForAuth: string 
  ) => Promise<Patient | undefined>;
  updatePatient: (id: string, updatedPatientData: Partial<Omit<Patient, 'user_id'>>) => Promise<void>; // No permitir cambiar user_id
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
      // setUserProfile(null); // No es necesario aquí, se maneja por el que llama o auth useEffect
      // setLoadingProfile(false); // No es necesario aquí
      return null;
    }
    console.log(`AppContext: fetchUserProfile called for userId: ${userId}`);
    // setLoadingProfile(true); // El que llama (internalLoadInitialData o auth useEffect) ya lo puso en true
    try {
      const profile = await profileService.getProfileByUserId(userId);
      console.log(`AppContext: fetchUserProfile - profileService returned:`, profile);
      if (profile) { // Solo actualiza si el perfil es válido
        setUserProfile(profile);
      } else {
        setUserProfile(null); // Asegurar que se limpia si no hay perfil
      }
      return profile;
    } catch (error) {
      console.error("AppContext: Error fetching user profile in fetchUserProfile:", error);
      setUserProfile(null);
      toast.error("Error al cargar el perfil del usuario.");
      return null;
    } finally {
      console.log(`AppContext: fetchUserProfile setting loadingProfile to false for userId: ${userId}`);
      setLoadingProfile(false); // Siempre poner a false al finalizar
    }
  }, []); // Dependencias vacías si profileService es estable

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
    // setLoadingProfile(true) es manejado por el useEffect de autenticación cuando currentUser cambia a un nuevo usuario
    setLoadingData(true);

    const fetchedProfile = await fetchUserProfile(authUser.id); // fetchUserProfile gestionará setLoadingProfile

    if (!fetchedProfile) {
        console.warn(`AppContext: internalLoadInitialData - No profile fetched for user ${authUser.id}. Aborting further data load.`);
        setLoadingData(false);
        setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
        setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
        // setLoadingProfile(false) es manejado por fetchUserProfile's finally block
        setNotificationChecksDone(true);
        return;
    }

    if (fetchedProfile.role === 'doctor') {
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
        setPatients([]); setMedications([]); setAppointments([]); setDoctors([]);
        setVitalSigns([]); setMedicationIntakes([]); setNotifications([]);
      } finally {
        setLoadingAppointments(false); setLoadingMedications(false); setLoadingDoctors(false);
        setLoadingVitalSigns(false); setLoadingMedicationIntakesGlobal(false); setLoadingNotifications(false);
      }
    } else {
      console.log(`AppContext: internalLoadInitialData - User role is '${fetchedProfile.role}', not 'doctor'. Clearing doctor-specific data.`);
      setPatients([]); setMedications([]); setAppointments([]);
      setVitalSigns([]); setMedicationIntakes([]);
      setNotifications([]);
    }
    setLoadingData(false);
    setNotificationChecksDone(true);
  }, [fetchUserProfile]);

  // useEffect para manejar la autenticación
  useEffect(() => {
    console.log("AppContext: Auth Effect (runs once on mount)");
    let isMounted = true;
    setLoadingAuth(true); // Indicar que estamos verificando el estado de auth

    // Esta función se llamará cuando cambie el estado de autenticación o al obtener la sesión inicial
    const processAuthState = (newUser: User | null, previousUser: User | null | undefined) => {
        if (!isMounted) return;

        if (newUser?.id !== previousUser?.id || (!newUser && previousUser) || (newUser && !previousUser)) {
            console.log(`AppContext: Auth state change detected. New user: ${newUser?.id}, Previous user: ${previousUser?.id}`);
            setCurrentUser(newUser); // Establecer el nuevo usuario

            if (newUser) {
                // Si hay un nuevo usuario (login o sesión restaurada para un usuario diferente)
                console.log(`AppContext: New user ${newUser.id} detected. Resetting profile and setting loadingProfile true.`);
                setUserProfile(null);    // Limpiar cualquier perfil anterior
                setLoadingProfile(true); // Indicar que el perfil para este nuevo usuario se está cargando
            } else {
                // Si el nuevo usuario es null (logout o sesión no encontrada)
                console.log("AppContext: User is null (logout/no session). Clearing profile and setting loadingProfile false.");
                setUserProfile(null);
                setLoadingProfile(false); // No hay perfil que cargar
            }
        } else {
            console.log("AppContext: Auth state effectively unchanged based on user ID.");
        }
        
        // Marcar loadingAuth como false después del primer procesamiento,
        // ya sea del listener o de getSession.
        if (loadingAuth) {
            setLoadingAuth(false);
        }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("AppContext: onAuthStateChange event:", event);
        // Usamos una función de callback en setCurrentUser para obtener el valor más fresco de currentUser para la comparación
        // pero para simplificar, pasaremos currentUser directamente a processAuthState,
        // ya que processAuthState se define en el mismo scope y currentUser es una dependencia del efecto externo.
        // Lo importante es que processAuthState se llame con el newUser del evento.
        processAuthState(session?.user ?? null, currentUser);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        console.log("AppContext: Initial getSession() result received.");
        processAuthState(session?.user ?? null, currentUser);
    }).catch(error => {
        if (!isMounted) return;
        console.error("AppContext: Error in getSession():", error);
        processAuthState(null, currentUser); // Tratar como si no hubiera sesión
    });

    return () => {
        isMounted = false;
        subscription?.unsubscribe();
        console.log("AppContext: Auth Effect cleanup.");
    };
  }, []); // Vacío para ejecutar solo al montar y desmontar

  // useEffect para cargar datos, depende de currentUser y si la autenticación ya terminó
  useEffect(() => {
    console.log("AppContext: DataLoad useEffect. currentUser:", currentUser?.id, "loadingAuth:", loadingAuth);
    if (!loadingAuth) { 
        if (currentUser) {
            // loadingProfile ya fue puesto a true por el efecto de Auth cuando currentUser cambió.
            console.log("AppContext: DataLoad useEffect - User exists, auth loaded. Calling internalLoadInitialData.");
            internalLoadInitialData(currentUser);
        } else {
            console.log("AppContext: DataLoad useEffect - No user, auth loaded. Clearing data.");
            internalLoadInitialData(null);
        }
    } else {
        console.log("AppContext: DataLoad useEffect - Auth still loading, deferring data load.");
    }
  }, [currentUser, loadingAuth, internalLoadInitialData]);


  const addPatient = useCallback(async (
    patientDataForTable: Omit<Patient, 'id' | 'createdAt' | 'doctorId' | 'user_id'>, 
    passwordForAuth: string,
    emailForAuth: string 
  ): Promise<Patient | undefined> => {
    const currentAuthUser = currentUser; // Captura el valor estable de currentUser
    const currentDoctorProfile = userProfile; // Captura el valor estable de userProfile

    if (!currentAuthUser || currentDoctorProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden añadir pacientes.");
      throw new Error("User not authorized or not a doctor.");
    }

    let newSignedUpUser: User | null = null;
    try {
      console.log(`AppContext: Attempting to create auth user for patient: ${emailForAuth}`);
      const signUpCredentials: ExtendedSignUpCredentials = {
        email: emailForAuth,
        password: passwordForAuth,
        options: {
          data: {
            name: patientDataForTable.name,
            role: 'patient',
          }
          // Considera la configuración de `email_confirm` en Supabase
          // o usa `emailRedirectTo` si quieres confirmación.
        }
      };
      const authResponse = await authService.signUp(signUpCredentials);

      if (authResponse.error) {
        console.error("AppContext.addPatient: Supabase signUp error:", authResponse.error);
        throw authResponse.error;
      }
      if (!authResponse.user) {
        console.error("AppContext.addPatient: Supabase signUp successful but no user object returned.");
        throw new Error("User creation in auth failed: no user object returned.");
      }
      newSignedUpUser = authResponse.user;
      console.log(`AppContext.addPatient: Auth user created successfully for patient. User ID: ${newSignedUpUser.id}`);
      // El trigger on_auth_user_created debería crear la entrada en public.profiles.

    } catch (error: any) {
      toast.error(`Error creando cuenta de autenticación para paciente: ${error.message || 'Error desconocido'}`);
      console.error("AppContext.addPatient: Error during Supabase signUp for patient:", error);
      throw error;
    }

    // Crear el registro en la tabla 'patients'
    if (newSignedUpUser && newSignedUpUser.id) {
      try {
        const patientRecordData: Omit<Patient, 'id' | 'createdAt'> = {
          ...patientDataForTable,
          user_id: newSignedUpUser.id, // Vincular con el usuario de auth
          doctorId: currentAuthUser.id, 
        };
        
        console.log("AppContext.addPatient: Attempting to create patient record in 'patients' table:", patientRecordData);
        const newPatientRecord = await patientService.create(patientRecordData);

        if (newPatientRecord) {
          setPatients(prev => [...prev, newPatientRecord].sort((a, b) => a.name.localeCompare(b.name)));
          toast.success(`Paciente ${newPatientRecord.name} registrado y cuenta creada!`);
          return newPatientRecord;
        } else {
          console.error("AppContext.addPatient: Patient record creation failed after auth user creation.");
          toast.error("Error creando registro del paciente después de la cuenta de autenticación.");
          // Idealmente, aquí habría lógica de rollback para newSignedUpUser si es posible.
          throw new Error("Patient record creation failed.");
        }
      } catch (error: any) {
        toast.error(`Error creando registro del paciente: ${error.message || 'Error desconocido'}`);
        console.error("AppContext.addPatient: Error creating patient record:", error);
        // Idealmente, aquí habría lógica de rollback para newSignedUpUser si es posible.
        throw error;
      }
    } else {
      throw new Error("Auth user ID not available for patient record creation.");
    }
  }, [currentUser, userProfile]); // Dependencias: currentUser y userProfile para autorización y doctorId
                                 // patientService es un import, por lo que es estable si no se redefine.

  // ... (RESTO DE FUNCIONES CRUD Y HELPERS: updatePatient, deletePatient, etc.
  //      asegúrate de que sus dependencias en useCallback sean correctas,
  //      principalmente [currentUser, userProfile] si necesitan autorización o IDs.
  //      Mantén las implementaciones que tenías para estas funciones,
  //      solo revisa las dependencias de useCallback.)

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

  const signOut = useCallback(async () => {
    toast.loading('Cerrando sesión...', { id: 'signout-toast' });
    try {
      const { error } = await authService.signOut();
      // Limpiar estados locales inmediatamente después de que signOut tenga éxito
      // Esto es manejado por el useEffect de Auth al detectar currentUser como null.
      // setCurrentUser(null); // Desencadena el flujo de limpieza de datos
      // setUserProfile(null);
      // setLoadingProfile(false); 
      
      if (error) throw error;
      toast.dismiss('signout-toast');
      toast.success('Sesión cerrada exitosamente!');
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
