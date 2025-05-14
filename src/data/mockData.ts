import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types';

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    phone: '555-123-4567',
    address: '123 Main St, Anytown, USA',
    email: 'john@example.com',
    createdAt: '2023-01-15T12:30:00Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '555-987-6543',
    address: '456 Oak Ave, Somewhere, USA',
    email: 'jane@example.com',
    createdAt: '2023-02-20T14:45:00Z'
  },
  {
    id: '3',
    name: 'Robert Johnson',
    phone: '555-456-7890',
    address: '789 Pine Rd, Nowhere, USA',
    email: 'robert@example.com',
    createdAt: '2023-03-10T09:15:00Z'
  }
];

export const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Aspirin',
    activeIngredient: 'Acetylsalicylic acid',
    expirationDate: '2025-06-30',
    description: 'Used to treat pain, fever, and inflammation'
  },
  {
    id: '2',
    name: 'Lisinopril',
    activeIngredient: 'Lisinopril',
    expirationDate: '2025-08-15',
    description: 'Used to treat high blood pressure'
  },
  {
    id: '3',
    name: 'Metformin',
    activeIngredient: 'Metformin hydrochloride',
    expirationDate: '2024-12-31',
    description: 'Used to manage type 2 diabetes'
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    doctorId: 'dr-1',
    specialty: 'Cardiology',
    date: '2023-11-15',
    time: '10:00',
    diagnosis: 'Hypertension',
    status: 'completed'
  },
  {
    id: '2',
    patientId: '2',
    doctorId: 'dr-2',
    specialty: 'Endocrinology',
    date: '2023-11-20',
    time: '14:30',
    status: 'scheduled'
  },
  {
    id: '3',
    patientId: '3',
    doctorId: 'dr-3',
    specialty: 'Neurology',
    date: '2023-11-25',
    time: '11:15',
    status: 'scheduled'
  }
];

export const mockVitalSigns: VitalSign[] = [
  {
    id: '1',
    patientId: '1',
    type: 'Blood Pressure',
    value: 120,
    unit: 'mmHg',
    date: '2023-11-01',
    time: '09:30'
  },
  {
    id: '2',
    patientId: '1',
    type: 'Heart Rate',
    value: 75,
    unit: 'bpm',
    date: '2023-11-01',
    time: '09:30'
  },
  {
    id: '3',
    patientId: '2',
    type: 'Blood Glucose',
    value: 95,
    unit: 'mg/dL',
    date: '2023-11-05',
    time: '08:00'
  }
];

export const mockMedicationIntakes: MedicationIntake[] = [
  {
    id: '1',
    patientId: '1',
    medicationId: '1',
    date: '2023-11-01',
    time: '08:00',
    taken: true
  },
  {
    id: '2',
    patientId: '1',
    medicationId: '1',
    date: '2023-11-01',
    time: '20:00',
    taken: true
  },
  {
    id: '3',
    patientId: '2',
    medicationId: '2',
    date: '2023-11-05',
    time: '12:00',
    taken: false
  }
];