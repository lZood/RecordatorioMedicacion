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
  doctorId: string; // Made doctorId required for a Medication
  createdAt?: string;
  updatedAt?: string;
}

// Perfil de usuario genérico
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | string;
  specialty?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo específico para Doctor
export interface Doctor extends UserProfile {
  role: 'doctor';
  specialty: string;
}

// Tipo específico para Paciente (perfil)
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
