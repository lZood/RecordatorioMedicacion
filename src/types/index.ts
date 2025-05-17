// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string; // Asegúrate de que el email esté aquí si lo usarás para notificaciones
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
  email?: string; // Añadir email aquí también si se obtiene anidado
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

// NUEVA INTERFAZ PARA NOTIFICACIONES
export interface Notification {
  id: string;
  patientId: string;
  appointmentId?: string | null; // Opcional, si la notificación está ligada a una cita
  message: string;
  type: string; // 'appointment_reminder', 'medication_reminder', 'general_alert', etc.
  status: 'pending' | 'sent' | 'read' | 'archived' | string; // Permite otros estados si es necesario
  sendAt?: string | null; // Fecha ISO para envío programado
  createdAt?: string;
  updatedAt?: string;
  // Podrías añadir detalles del paciente o cita si los obtienes anidados
  patient?: Pick<Patient, 'id' | 'name' | 'email'> | null;
  appointment?: Pick<Appointment, 'id' | 'date' | 'time' | 'specialty'> | null;
}

