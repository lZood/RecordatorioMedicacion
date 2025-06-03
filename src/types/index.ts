// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string; // ISO Date string
  doctorId?: string; // ID del doctor que creó/asignó este paciente
  user_id?: string | null; // Opcional: El auth.uid del paciente si se ha registrado y vinculado
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  expirationDate: string; // Formato YYYY-MM-DD
  description?: string;
  doctorId: string;
  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
  notificacion_stock_expirando_enviada?: boolean;
}

export interface UserProfile {
  id: string; // Corresponde a auth.users.id
  name: string;
  email: string;
  role: 'doctor' | 'patient' | string; // Hacerlo más específico si es posible
  specialty?: string;
  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
  fcm_token?: string | null; // Para notificaciones push del paciente
  needs_initial_setup?: boolean; // Para el flujo de primer login del paciente
}

// ... (tus otros tipos como MedicationIntake, VitalSign, etc., permanecen igual)

export interface MedicationIntake {
  id: string;
  patientId: string; // Debería ser el ID de la tabla 'patients'
  medicationId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS o HH:MM
  taken: boolean;
  createdAt?: string;
  updatedAt?: string;
  medication_plan_id?: string | null; // NUEVO: FK al plan de medicación
}

export interface MedicationIntakeWithMedication extends Omit<MedicationIntake, 'medicationId'> {
  medication: Pick<Medication, 'id' | 'name' | 'activeIngredient'> | null;
  medicationId: string;
}


export interface VitalSign {
  id: string;
  patientId: string; // Debería ser el ID de la tabla 'patients'
  type: string;
  value: number;
  unit: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS o HH:MM
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentPatientInfo {
  id: string;
  name: string;
  email?: string;
  // Podrías añadir más campos si los necesitas de la tabla patients
  phone?: string;
  address?: string;
}
export interface AppointmentDoctorInfo {
  id: string;
  name: string;
  specialty?: string;
  email?: string; // Añadido para consistencia
}

export interface Appointment {
  id: string;
  patientId: string; // Debería ser el ID de la tabla 'patients'
  doctorId: string;  // Debería ser el ID de la tabla 'profiles' (del doctor)
  specialty: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS o HH:MM
  diagnosis?: string;
  status: 'requested_by_patient' | 'scheduled' | 'completed' | 'cancelled_by_doctor' | 'cancelled_by_patient' | 'rejected_by_doctor' | string;
  patient?: AppointmentPatientInfo | null;
  doctor?: AppointmentDoctorInfo | null;
  createdAt?: string;
  updatedAt?: string;
  notificacion_recordatorio_24h_enviada?: boolean;
  // Nuevos campos para la solicitud
  requested_date?: string | null; // YYYY-MM-DD
  requested_time?: string | null; // HH:MM:SS o HH:MM
  reason_for_request?: string | null;
  rejection_reason?: string | null;
}


export interface Report {
  id: string;
  patientId: string;
  type: string;
  date: string;
  data: any;
}
export interface GeneratedReport {
  id: string;
  reportTypeName: string;
  fileName: string;
  format: 'CSV' | 'PDF';
  generatedAt: string; // ISO Timestamp
  filtersApplied: {
    patientId?: string | null;
    patientName?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  };
}

export interface Notification {
  id: string;
  patient_id: string | null; // auth.uid del paciente (o el ID de profiles del paciente)
  doctor_id: string | null;  // auth.uid del doctor (o el ID de profiles del doctor)
  appointment_id?: string | null;
  medication_intake_id?: string | null; // NUEVO: Para vincular a una toma específica
  message: string;
  type:
    | 'appointment_reminder'
    | 'appointment_reminder_24h'
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_confirmed' // Nuevo
    | 'appointment_rejected' // Nuevo
    | 'appointment_cancelled_by_doctor'
    | 'patient_appointment_request' // Nuevo: para el doctor cuando un paciente solicita
    | 'patient_appointment_cancellation'
    | 'abnormal_vital_sign'
    | 'low_medication_adherence'
    | 'medication_expiring_soon_stock'
    | 'medication_dose_reminder' // NUEVO: Para recordar dosis al paciente
    | 'general_alert'
    | string;
  status: 'pending' | 'sent' | 'read' | 'archived' | 'error' | string;
  send_at?: string | null; // ISO Timestamp, para programar envíos
  created_at?: string;
  updated_at?: string;
  // Para la UI, podrías querer anidar info del paciente o cita
  patient?: Pick<Patient, 'id' | 'name' | 'email'> | null;
  appointment?: Pick<Appointment, 'id' | 'date' | 'time' | 'specialty'> | null;
}


// NUEVO TIPO: MedicationPlan
export interface MedicationPlan {
  id: string; // UUID
  patient_id: string; // FK a patients.id
  doctor_id: string;  // FK a profiles.id (del doctor)
  medication_id: string; // FK a medications.id
  start_date: string; // YYYY-MM-DD
  duration_days: number;
  frequency_hours: number; // Ej. 6, 8, 12, 24
  first_intake_time: string; // HH:MM (hora de la primera toma del día inicial)
  instructions?: string;
  is_active: boolean;
  created_at?: string; // ISO Date string
  updated_at?: string; // ISO Date string

  // Opcional: para mostrar en la UI
  patient?: Pick<Patient, 'id' | 'name'>;
  medication?: Pick<Medication, 'id' | 'name'>;
}

// Tipo para los datos que el doctor envía al crear un plan
export type MedicationPlanCreationData = Omit<MedicationPlan, 'id' | 'doctor_id' | 'created_at' | 'updated_at' | 'is_active' | 'start_date' | 'patient' | 'medication'> & {
  start_date?: string; // Hacer opcional si el backend toma CURRENT_DATE por defecto
};

