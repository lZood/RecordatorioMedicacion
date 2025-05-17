// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
  doctorId?: string;
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  expirationDate: string;
  description?: string;
  doctorId: string; 
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | string;
  specialty?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor extends UserProfile {
  role: 'doctor';
  specialty: string;
}

export interface PatientProfile extends UserProfile {
  role: 'patient';
}

export interface MedicationIntake {
  id: string;
  patientId: string;
  medicationId: string;
  date: string;
  time: string;
  taken: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VitalSign {
  id: string;
  patientId: string;
  type: string;
  value: number;
  unit: string;
  date: string;
  time: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentPatientInfo {
  id: string;
  name: string;
  email?: string;
}
export interface AppointmentDoctorInfo {
  id: string;
  name: string;
  specialty?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  date: string;
  time: string;
  diagnosis?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  patient?: AppointmentPatientInfo | null;
  doctor?: AppointmentDoctorInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  patientId: string;
  type: string;
  date: string;
  data: any;
}

export interface Notification {
  id: string;
  patientId: string; // A quién se dirige la notificación (si es específica del paciente)
  appointmentId?: string | null;
  doctorId?: string | null; // Quién generó o a quién está dirigida (si es para el doctor)
  message: string;
  /**
   * Tipos de notificación:
   * - 'appointment_reminder': Recordatorio manual de cita enviado por el doctor.
   * - 'appointment_reminder_24h': Recordatorio automático de cita próxima (24h).
   * - 'appointment_created': Nueva cita creada para un paciente.
   * - 'appointment_updated': Cita existente actualizada.
   * - 'appointment_cancelled_by_doctor': Cita cancelada por el doctor.
   * - 'patient_appointment_cancellation': Paciente canceló una cita (notificación para el doctor).
   * - 'abnormal_vital_sign': Paciente registró un signo vital anormal (notificación para el doctor).
   * - 'low_medication_adherence': Paciente con baja adherencia (notificación para el doctor).
   * - 'medication_expiring_soon_stock': Medicamento en stock del doctor por vencer.
   * - 'general_alert': Alerta general para el doctor o paciente.
   */
  type: 
    | 'appointment_reminder' 
    | 'appointment_reminder_24h'
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_cancelled_by_doctor'
    | 'patient_appointment_cancellation' // Para el doctor
    | 'abnormal_vital_sign' // Para el doctor
    | 'low_medication_adherence' // Para el doctor
    | 'medication_expiring_soon_stock' // Para el doctor
    | 'general_alert'
    | string; // Permite otros tipos personalizados
  status: 'pending' | 'sent' | 'read' | 'archived' | string;
  sendAt?: string | null; 
  createdAt?: string;
  updatedAt?: string;
  patient?: Pick<Patient, 'id' | 'name' | 'email'> | null;
  appointment?: Pick<Appointment, 'id' | 'date' | 'time' | 'specialty'> | null;
}
