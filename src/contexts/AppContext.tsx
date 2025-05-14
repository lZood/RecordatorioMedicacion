import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Patient, Medication, Appointment, VitalSign, MedicationIntake } from '../types';
import { mockPatients, mockMedications, mockAppointments, mockVitalSigns, mockMedicationIntakes } from '../data/mockData';

interface AppContextType {
  patients: Patient[];
  medications: Medication[];
  appointments: Appointment[];
  vitalSigns: VitalSign[];
  medicationIntakes: MedicationIntake[];
  addPatient: (patient: Patient) => void;
  addMedication: (medication: Medication) => void;
  addAppointment: (appointment: Appointment) => void;
  addVitalSign: (vitalSign: VitalSign) => void;
  addMedicationIntake: (intake: MedicationIntake) => void;
  updatePatient: (id: string, updatedPatient: Partial<Patient>) => void;
  getPatientById: (id: string) => Patient | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>(mockVitalSigns);
  const [medicationIntakes, setMedicationIntakes] = useState<MedicationIntake[]>(mockMedicationIntakes);

  const addPatient = (patient: Patient) => {
    setPatients([...patients, patient]);
  };

  const addMedication = (medication: Medication) => {
    setMedications([...medications, medication]);
  };

  const addAppointment = (appointment: Appointment) => {
    setAppointments([...appointments, appointment]);
  };

  const addVitalSign = (vitalSign: VitalSign) => {
    setVitalSigns([...vitalSigns, vitalSign]);
  };

  const addMedicationIntake = (intake: MedicationIntake) => {
    setMedicationIntakes([...medicationIntakes, intake]);
  };

  const updatePatient = (id: string, updatedPatient: Partial<Patient>) => {
    setPatients(
      patients.map(patient => 
        patient.id === id ? { ...patient, ...updatedPatient } : patient
      )
    );
  };

  const getPatientById = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  return (
    <AppContext.Provider
      value={{
        patients,
        medications,
        appointments,
        vitalSigns,
        medicationIntakes,
        addPatient,
        addMedication,
        addAppointment,
        addVitalSign,
        addMedicationIntake,
        updatePatient,
        getPatientById
      }}
    >
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