// src/pages/Appointments.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import AppointmentCard from '../components/AppointmentCard';
import { Calendar as CalendarIcon, Plus, Filter, User as UserIcon, Briefcase, Clock, X, Users } from 'lucide-react';
import { Appointment, Patient, Doctor } from '../types';
import toast from 'react-hot-toast';

const Appointments: React.FC = () => {
  const {
    appointments = [], // Default to empty array
    patients = [],   // Default to empty array
    doctors = [],    // Default to empty array
    addAppointment,
    updateAppointment,
    loadingAppointments,
    loadingData, // General loading flag from AppContext
    currentUser
  } = useAppContext();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);

  // Estados del formulario
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('scheduled');
  const [formLoading, setFormLoading] = useState(false);


  // Efecto para pre-llenar el formulario cuando se edita
  useEffect(() => {
    if (isEditing && currentAppointmentId) {
      // 'appointments' ya tiene un valor por defecto de [] gracias a la desestructuración
      const appointmentToEdit = appointments.find(app => app.id === currentAppointmentId);
      if (appointmentToEdit) {
        setPatientId( (appointmentToEdit as any).patient?.id || appointmentToEdit.patientId || '');
        setDoctorId( (appointmentToEdit as any).doctor?.id || appointmentToEdit.doctorId || '');
        setSpecialty(appointmentToEdit.specialty);
        setDate(appointmentToEdit.date);
        setTime(appointmentToEdit.time);
        setDiagnosis(appointmentToEdit.diagnosis || '');
        setStatus(appointmentToEdit.status);
      }
    } else {
      resetForm();
    }
  }, [isEditing, currentAppointmentId, appointments]); // appointments es una dependencia

  // Autocompletar especialidad cuando se selecciona un doctor
  useEffect(() => {
    if (doctorId) {
      // 'doctors' ya tiene un valor por defecto de []
      const selectedDoctor = doctors.find(doc => doc.id === doctorId);
      if (selectedDoctor) {
        setSpecialty(selectedDoctor.specialty);
      }
    } else if (!isEditing) {
      setSpecialty('');
    }
  }, [doctorId, doctors, isEditing]); // doctors es una dependencia

  const resetForm = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    
    setPatientId('');
    setDoctorId('');
    setSpecialty('');
    setDate(localToday.toISOString().split('T')[0]);
    setTime('');
    setDiagnosis('');
    setStatus('scheduled');
    setCurrentAppointmentId(null); // También resetea el ID de la cita actual
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    // El useEffect se encargará de llamar a resetForm porque isEditing cambia
    // y currentAppointmentId se puede establecer a null aquí o en resetForm.
    setCurrentAppointmentId(null); 
    setShowModal(true);
  };

  const handleOpenEditModal = (appointment: Appointment) => {
    setIsEditing(true);
    setCurrentAppointmentId(appointment.id); // useEffect llenará el formulario
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
        toast.error("Authentication required to save an appointment.");
        return;
    }
    if (!patientId || !doctorId || !specialty || !date || !time) {
      toast.error("Patient, Doctor, Specialty, Date, and Time are required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Date must be in YYYY-MM-DD format.");
      return;
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      toast.error("Time must be in HH:MM format.");
      return;
    }

    setFormLoading(true);
    const appointmentData = {
      patientId,
      doctorId,
      specialty,
      date,
      time,
      diagnosis: diagnosis || undefined,
      status,
    };

    try {
      if (isEditing && currentAppointmentId) {
        await updateAppointment(currentAppointmentId, appointmentData);
      } else {
        await addAppointment(appointmentData);
      }
      setShowModal(false);
      // resetForm(); // Se resetea al cambiar isEditing o currentAppointmentId a través de useEffect
    } catch (error) {
      console.error("Failed to save appointment from page:", error);
    } finally {
      setFormLoading(false);
    }
  };

  // 'appointments' ya tiene un valor por defecto de []
  const filteredAppointments = appointments.filter(appointment => {
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesDate = !dateFilter || appointment.date === dateFilter;
    return matchesStatus && matchesDate;
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));

  const appointmentsByDate = filteredAppointments.reduce((acc, appointment) => {
    const appointmentDate = appointment.date;
    if (!acc[appointmentDate]) {
      acc[appointmentDate] = [];
    }
    acc[appointmentDate].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const sortedDates = Object.keys(appointmentsByDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

  // Usar loadingData para el estado de carga inicial general,
  // y loadingAppointments para la carga específica de citas si es necesario.
  if (loadingData && (!doctors.length || !patients.length)) {
    return <div className="flex justify-center items-center h-screen">Loading initial data...</div>;
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
      {loadingAppointments && <div className="text-center py-4">Loading appointments...</div>}
      {!loadingAppointments && sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map(d => (
            <div key={d}>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                {new Date(d + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 'appointmentsByDate[d]' es un array y no debería ser undefined si sortedDates tiene 'd' */}
                {appointmentsByDate[d].map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => handleOpenEditModal(appointment)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loadingAppointments && <div className="text-center py-12"><p className="text-gray-500 text-lg">No appointments found matching your filters.</p></div>
      )}

      {/* Modal para Añadir/Editar Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Appointment' : 'Schedule New Appointment'}</h2>
              <button onClick={() => { setShowModal(false); /* resetForm se llama por useEffect al cambiar isEditing/currentAppointmentId */ }} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Users size={16} className="mr-2 text-gray-400"/> Patient
                </label>
                <select id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select a patient</option>
                  {/* 'patients' ya tiene un valor por defecto de [] */}
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <UserIcon size={16} className="mr-2 text-gray-400"/> Doctor
                </label>
                <select id="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select a doctor</option>
                  {/* 'doctors' ya tiene un valor por defecto de [] */}
                  {doctors.map((doc) => <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Briefcase size={16} className="mr-2 text-gray-400"/> Specialty
                </label>
                <input type="text" id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required readOnly={!!doctorId && doctors.some(d => d.id === doctorId)}
                       className={`w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${doctorId && doctors.some(d => d.id === doctorId) ? 'bg-gray-100' : ''}`}/>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CalendarIcon size={16} className="mr-2 text-gray-400"/> Date
                </label>
                <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock size={16} className="mr-2 text-gray-400"/> Time
                </label>
                <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required
                       className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">Diagnosis (Optional)</label>
                <textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

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
                <button type="button" onClick={() => { setShowModal(false); /* resetForm se llama por useEffect */ }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={formLoading}>Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        disabled={formLoading}>
                  {formLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Schedule Appointment')}
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
