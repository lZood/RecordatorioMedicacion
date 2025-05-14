// src/services/appointments.ts
import { supabase } from '../lib/supabase';
import { Appointment } from '../types'; // Tu tipo Appointment usa camelCase

// Helper para mapear de camelCase (app) a snake_case (DB)
const mapAppointmentToDb = (appointmentData: Partial<Omit<Appointment, 'id'>>) => {
  const dbData: { [key: string]: any } = {};
  if (appointmentData.patientId !== undefined) dbData.patient_id = appointmentData.patientId;
  if (appointmentData.doctorId !== undefined) dbData.doctor_id = appointmentData.doctorId;
  if (appointmentData.specialty !== undefined) dbData.specialty = appointmentData.specialty;
  if (appointmentData.date !== undefined) dbData.date = appointmentData.date;
  if (appointmentData.time !== undefined) dbData.time = appointmentData.time;
  if (appointmentData.diagnosis !== undefined) dbData.diagnosis = appointmentData.diagnosis ?? null;
  if (appointmentData.status !== undefined) dbData.status = appointmentData.status;
  // created_at y updated_at son manejados por la DB
  return dbData;
};


export const appointmentService = {
  async create(appointmentDataFromApp: Omit<Appointment, 'id'>): Promise<Appointment | null> {
    const dataToInsert = mapAppointmentToDb(appointmentDataFromApp);
    console.log("appointmentService: Insertando (snake_case):", dataToInsert);

    const { data, error } = await supabase
      .from('appointments')
      .insert(dataToInsert)
      .select() // Supabase debería devolver los datos con claves convertidas a camelCase
      .single();

    if (error) {
      console.error("appointmentService: Error de Supabase al crear cita:", error);
      throw error;
    }
    console.log("appointmentService: Creación exitosa, datos devueltos (deberían ser camelCase):", data);
    return data as Appointment | null;
  },

  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `) // El cliente Supabase convierte a camelCase, incluyendo los objetos anidados
      .order('date', { ascending: true })
      .order('time', { ascending: true });


    if (error) {
      console.error("appointmentService: Error de Supabase al obtener todas las citas:", error);
      throw error;
    }
    console.log("appointmentService: Datos de getAll (deberían ser camelCase):", data);
    return (data as any[]) || []; // Hacemos un cast a any[] para manejar los datos anidados temporalmente
                                  // Idealmente, tendrías un tipo más específico para Appointment con Patient y Doctor anidados
  },

  async getById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`appointmentService: Error de Supabase al obtener cita por ID ${id}:`, error);
      throw error;
    }
    return data as any | null; // Similar a getAll, para datos anidados
  },

  async getByPatient(patientId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name),
        doctor:profiles(id, name, specialty)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error(`appointmentService: Error de Supabase al obtener citas para paciente ${patientId}:`, error);
      throw error;
    }
    return (data as any[]) || [];
  },


  async update(id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>): Promise<Appointment | null> {
    const dataToUpdate = mapAppointmentToDb(appointmentUpdateData);
    console.log(`appointmentService: Actualizando (ID: ${id}, snake_case):`, dataToUpdate);

    const { data, error } = await supabase
      .from('appointments')
      .update(dataToUpdate)
      .eq('id', id)
      .select() // Convierte a camelCase
      .single();

    if (error) {
      console.error(`appointmentService: Error de Supabase al actualizar cita ID ${id}:`, error);
      throw error;
    }
    console.log("appointmentService: Actualización exitosa, datos devueltos (camelCase):", data);
    return data as Appointment | null;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`appointmentService: Error de Supabase al eliminar cita ID ${id}:`, error);
      throw error;
    }
  }
};
```
**Nota sobre `getAll` y `getById` en `appointmentService.ts`:**
He modificado las consultas `select` para incluir datos del paciente y del doctor asociados. Esto es útil para mostrar nombres en lugar de solo IDs.
```sql
select(`
  *,
  patient:patients(id, name),
  doctor:profiles(id, name, specialty)
`)
```
Esto significa que el objeto `Appointment` devuelto tendrá una propiedad `patient` (con `id` y `name`) y `doctor` (con `id`, `name`, `specialty`). Deberás ajustar tu tipo `Appointment` en `src/types/index.ts` o manejar esto en el `AppContext` si quieres usar estos datos enriquecidos. Por ahora, he usado `any[]` y `any | null` como tipo de retorno para simplificar.

**Paso 3: Actualizar `src/contexts/AppContext.tsx`**

Añadiremos el estado y las funciones CRUD para `appointments` y un estado para `doctors` (perfiles).


```typescript
// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
// ... otros imports ...
import { Appointment, Doctor, Patient } // Asegúrate de tener el tipo Appointment y Doctor
from '../types';
import { appointmentService } from '../services/appointments'; // Importa el servicio de citas
import { profileService } from '../services/profiles'; // Importa el servicio de perfiles/doctores
// ... resto de los imports ...

interface AppContextType {
  // ... (otros tipos de estado y funciones)
  appointments: Appointment[]; // O un tipo más enriquecido si usas los datos anidados de paciente/doctor
  doctors: Doctor[]; // Para la lista de doctores
  loadingAppointments: boolean; // Estado de carga para citas
  loadingDoctors: boolean; // Estado de carga para doctores

  addAppointment: (appointmentData: Omit<Appointment, 'id'>) => Promise<Appointment | undefined>;
  updateAppointment: (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined; // O tipo enriquecido
}

// ... (createContext) ...

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... (otros estados: currentUser, patients, medications, etc.) ...
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);


  // Modifica loadInitialData para incluir citas y doctores
  const loadInitialData = async (userOverride?: User | null) => {
    const userToUse = userOverride !== undefined ? userOverride : currentUser;

    if (!userToUse) {
      // ... (limpiar otros estados) ...
      setAppointments([]);
      setDoctors([]);
      setLoadingData(false); // Asegúrate de que este es el general
      return;
    }
    console.log("AppContext: Loading initial data for user:", userToUse.id);
    setLoadingData(true); // Carga general
    setLoadingAppointments(true);
    setLoadingDoctors(true);

    try {
      // Carga en paralelo
      const [
        patientsData,
        medicationsData,
        appointmentsData,
        vitalSignsData,
        medicationIntakesData,
        doctorsData,
      ] = await Promise.all([
        patientService.getAll(),
        medicationService.getAll(),
        appointmentService.getAll(), // Cargar citas
        vitalSignService.getAll(),
        medicationIntakeService.getAll(),
        profileService.getAllDoctors(), // Cargar doctores
      ]);

      setPatients(patientsData || []);
      setMedications(medicationsData || []);
      setAppointments(appointmentsData || []); // Establecer citas
      setVitalSigns(vitalSignsData || []);
      setMedicationIntakes(medicationIntakesData || []);
      setDoctors(doctorsData || []); // Establecer doctores

    } catch (error) {
      console.error("AppContext: Error loading initial data:", error);
      toast.error("Could not load app data.");
    } finally {
      setLoadingData(false);
      setLoadingAppointments(false);
      setLoadingDoctors(false);
    }
  };

  // ... (useEffect para auth, que llama a loadInitialData) ...

  // --- CRUD para Citas (Appointments) ---
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<Appointment | undefined> => {
    if (!currentUser) {
      toast.error("You must be logged in to schedule an appointment.");
      throw new Error("User not authenticated");
    }
    try {
      // appointmentData viene en camelCase
      const newAppointment = await appointmentService.create(appointmentData);
      if (newAppointment) {
        // Para asegurar que tenemos los datos anidados de paciente/doctor si el servicio los devuelve así:
        // Podrías volver a llamar a appointmentService.getById(newAppointment.id)
        // o simplemente añadirlo y confiar en que la próxima carga de getAll() lo enriquecerá.
        // Por simplicidad, lo añadimos directamente. La lista se actualizará en la próxima carga completa.
        // O, mejor aún, si `create` devuelve el objeto enriquecido, úsalo.
        // Asumamos que `create` devuelve el objeto Appointment (posiblemente enriquecido si `select()` lo hace).
        setAppointments(prevAppointments => [...prevAppointments, newAppointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
        toast.success('Appointment scheduled successfully!');
        return newAppointment;
      }
    } catch (error: any) {
      console.error("AppContext: Error scheduling appointment:", error);
      toast.error(`Failed to schedule appointment: ${error.message}`);
      throw error;
    }
    return undefined;
  };

  const updateAppointment = async (id: string, appointmentUpdateData: Partial<Omit<Appointment, 'id'>>) => {
    if (!currentUser) { /* ... error ... */ throw new Error("User not authenticated"); }
    try {
      const updatedAppointment = await appointmentService.update(id, appointmentUpdateData);
      if (updatedAppointment) {
        setAppointments(prevAppointments =>
          prevAppointments.map(app => (app.id === id ? { ...app, ...updatedAppointment } : app))
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time))
        );
        toast.success('Appointment updated successfully!');
      }
    } catch (error: any) { /* ... error ... */ throw error; }
  };

  const deleteAppointment = async (id: string) => {
    if (!currentUser) { /* ... error ... */ throw new Error("User not authenticated"); }
    try {
      await appointmentService.delete(id);
      setAppointments(prevAppointments => prevAppointments.filter(app => app.id !== id));
      toast.success('Appointment deleted successfully!');
    } catch (error: any) { /* ... error ... */ throw error; }
  };

  const getAppointmentById = (id: string): Appointment | undefined => {
    // Asume que 'appointments' en el estado ya tiene los datos (posiblemente enriquecidos)
    return appointments.find(app => app.id === id);
  };

  // ... (resto de funciones: signOut, addPatient, addMedication, etc.) ...

  return (
    <AppContext.Provider
      value={{
        // ... (otros valores del contexto) ...
        appointments,
        doctors,
        loadingAppointments,
        loadingDoctors,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        getAppointmentById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// ... (useAppContext hook) ...
```

**Paso 4: Actualizar `src/pages/Appointments.tsx`**

Esta página ya muestra las citas. Ahora añadiremos el modal para "Schedule Appointment".


```typescript
// src/pages/Appointments.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import AppointmentCard from '../components/AppointmentCard'; // Asumiendo que este componente existe y funciona
import { Calendar as CalendarIcon, Plus, Filter, User as UserIcon, Briefcase, Clock, X, Users, CheckSquare, XSquare } from 'lucide-react'; // UserIcon para paciente/doctor
import { Appointment, Patient, Doctor } from '../types';
import toast from 'react-hot-toast';

const Appointments: React.FC = () => {
  const {
    appointments,
    patients, // Necesitamos la lista de pacientes
    doctors,  // Necesitamos la lista de doctores
    addAppointment,
    updateAppointment, // Para el modal de edición
    loadingAppointments,
    loadingData // Para saber si pacientes/doctores están cargando
  } = useAppContext();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // Formato YYYY-MM-DD

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);

  // Estados del formulario
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialty, setSpecialty] = useState(''); // Se podría autocompletar al seleccionar doctor
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:MM
  const [diagnosis, setDiagnosis] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  useEffect(() => {
    if (isEditing && currentAppointment) {
      setPatientId(currentAppointment.patientId);
      setDoctorId(currentAppointment.doctorId);
      setSpecialty(currentAppointment.specialty);
      setDate(currentAppointment.date);
      setTime(currentAppointment.time);
      setDiagnosis(currentAppointment.diagnosis || '');
      setStatus(currentAppointment.status);
    } else if (!isEditing) {
      // Resetear para el modo "añadir"
      const today = new Date().toISOString().split('T')[0]; // Fecha de hoy en YYYY-MM-DD
      setPatientId('');
      setDoctorId('');
      setSpecialty('');
      setDate(today);
      setTime('');
      setDiagnosis('');
      setStatus('scheduled');
    }
  }, [isEditing, currentAppointment]);

  // Autocompletar especialidad cuando se selecciona un doctor
  useEffect(() => {
    if (doctorId) {
      const selectedDoctor = doctors.find(doc => doc.id === doctorId);
      if (selectedDoctor) {
        setSpecialty(selectedDoctor.specialty);
      }
    } else {
      setSpecialty('');
    }
  }, [doctorId, doctors]);


  const filteredAppointments = appointments.filter(appointment => {
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesDate = !dateFilter || appointment.date === dateFilter;
    return matchesStatus && matchesDate;
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));


  const appointmentsByDate = filteredAppointments.reduce((acc, appointment) => {
    const appointmentDate = appointment.date; // Asumiendo que date es YYYY-MM-DD
    if (!acc[appointmentDate]) {
      acc[appointmentDate] = [];
    }
    acc[appointmentDate].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const sortedDates = Object.keys(appointmentsByDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentAppointment(null); // Asegura que el formulario se resetee con useEffect
    setShowModal(true);
  };

  const handleOpenEditModal = (appointment: Appointment) => {
    setIsEditing(true);
    setCurrentAppointment(appointment);
    setShowModal(true);
  };

  const resetForm = () => {
    // useEffect se encarga de esto al cambiar isEditing y currentAppointment
    // pero podemos forzarlo si es necesario.
    const today = new Date().toISOString().split('T')[0];
    setPatientId('');
    setDoctorId('');
    setSpecialty('');
    setDate(today);
    setTime('');
    setDiagnosis('');
    setStatus('scheduled');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId || !doctorId || !specialty || !date || !time) {
      toast.error("Patient, Doctor, Specialty, Date, and Time are required.");
      return;
    }
    // Validar formato de fecha y hora (básico)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        toast.error("Date must be in YYYY-MM-DD format.");
        return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
        toast.error("Time must be in HH:MM format.");
        return;
    }

    const appointmentData = {
      patientId,
      doctorId,
      specialty,
      date,
      time,
      diagnosis: diagnosis || undefined, // Enviar undefined si está vacío para que no se guarde como string vacío
      status,
    };

    try {
      if (isEditing && currentAppointment) {
        await updateAppointment(currentAppointment.id, appointmentData);
      } else {
        await addAppointment(appointmentData);
      }
      setShowModal(false);
      resetForm(); // Resetear después de un envío exitoso
    } catch (error) {
      // El toast de error ya se maneja en AppContext
      console.error("Failed to save appointment from page:", error);
    }
  };

  if (loadingData || loadingAppointments) { // Muestra un loader general si los datos primarios están cargando
    return <div className="flex justify-center items-center h-screen">Loading appointments and related data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <Plus size={18} />
          <span>Schedule Appointment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-2">
          <Filter size={18} className="text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon size={16} className="text-gray-400" />
              </div>
              <input type="date" id="date-filter" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                     className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map(d => (
            <div key={d}>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                {new Date(d + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', { // Añadir T00:00:00 para evitar problemas de zona horaria en el formateo
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointmentsByDate[d].map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => handleOpenEditModal(appointment)} // Pasa la función de editar
                    // onDelete se podría manejar aquí o en una vista de detalles
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {loadingAppointments ? "Loading..." : "No appointments found matching your filters."}
          </p>
        </div>
      )}

      {/* Modal para Añadir/Editar Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Appointment' : 'Schedule New Appointment'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Patient Selector */}
              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Users size={16} className="mr-2 text-gray-400"/> Patient
                </label>
                <select id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select a patient</option>
                  {patients.map((p: Patient) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Doctor Selector */}
              <div>
                <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <UserIcon size={16} className="mr-2 text-gray-400"/> Doctor
                </label>
                <select id="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select a doctor</option>
                  {doctors.map((doc: Doctor) => <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>)}
                </select>
              </div>

              {/* Specialty (puede ser auto-completado o editable) */}
              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Briefcase size={16} className="mr-2 text-gray-400"/> Specialty
                </label>
                <input type="text" id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required readOnly={!!doctorId} // Readonly si se autocompleta
                       className={`w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${doctorId ? 'bg-gray-100' : ''}`}/>
              </div>

              {/* Date Input */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CalendarIcon size={16} className="mr-2 text-gray-400"/> Date
                </label>
                <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              {/* Time Input */}
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock size={16} className="mr-2 text-gray-400"/> Time
                </label>
                <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              {/* Diagnosis (Optional) */}
              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">Diagnosis (Optional)</label>
                <textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              {/* Status Selector */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Appointment['status'])} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  {isEditing ? 'Save Changes' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

