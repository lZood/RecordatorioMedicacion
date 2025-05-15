// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
  doctorId?: string; // ID del doctor que gestiona/creó este paciente
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  expirationDate: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Perfil de usuario genérico (puede ser doctor o paciente en el futuro)
export interface UserProfile {
  id: string; // Coincide con auth.users.id
  name: string;
  email: string; // Email del usuario
  role: 'doctor' | 'patient' | string; // Roles definidos
  specialty?: string; // Opcional, principalmente para doctores
  createdAt?: string;
  updatedAt?: string;
}

// Tipo específico para Doctor, hereda de UserProfile
export interface Doctor extends UserProfile {
  role: 'doctor';
  specialty: string; // Para un doctor, la especialidad es requerida
}

// Tipo específico para Paciente (perfil), si los pacientes tuvieran perfiles en la tabla 'profiles'
export interface PatientProfile extends UserProfile {
  role: 'patient';
  // Otros campos específicos del perfil del paciente si los hubiera
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

// Información resumida para mostrar en citas
export interface AppointmentPatientInfo {
  id: string;
  name: string;
}
export interface AppointmentDoctorInfo {
  id: string;
  name: string;
  specialty?: string;
}

// Tipo Appointment, usando UserProfile para la información del doctor
export interface Appointment {
  id: string;
  patientId: string; // ID de la tabla 'patients'
  doctorId: string;  // ID de la tabla 'profiles' (del doctor)
  specialty: string; // Especialidad de la cita (puede ser la del doctor o una específica)
  date: string;
  time: string;
  diagnosis?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  patient?: AppointmentPatientInfo | null; // Datos anidados del paciente
  doctor?: AppointmentDoctorInfo | null;  // Datos anidados del doctor
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
