export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  expirationDate: string;
  description?: string;
}

export interface MedicationIntake {
  id: string;
  patientId: string;
  medicationId: string;
  date: string;
  time: string;
  taken: boolean;
}

export interface VitalSign {
  id: string;
  patientId: string;
  type: string;
  value: number;
  unit: string;
  date: string;
  time: string;
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
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
}

export interface Report {
  id: string;
  patientId: string;
  type: string;
  date: string;
  data: any;
}