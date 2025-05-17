// src/pages/Appointments.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import AppointmentCard from '../components/AppointmentCard';
import { Calendar as CalendarIcon, Plus, Filter, User as UserIcon, Briefcase, Clock, X, Bell } from 'lucide-react';
import { Appointment, Patient, Doctor, Notification } from '../types'; // Importar Notification
import toast from 'react-hot-toast';

const Appointments: React.FC = () => {
  const {
    appointments = [], 
    patients = [],   
    doctors = [],    
    addAppointment,
    updateAppointment,
    deleteAppointment, 
    addNotification, // <--- Nueva función del contexto
    loadingAppointments,
    loadingData, 
    currentUser, 
    userProfile  
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
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null); // Para el loader del botón de notificar

  // Efecto para pre-llenar el formulario cuando se edita
  useEffect(() => {
    if (isEditing && currentAppointmentId) {
      const appointmentToEdit = appointments.find(app => app.id === currentAppointmentId);
      if (appointmentToEdit) {
        setPatientId(appointmentToEdit.patientId || ''); 
        setDoctorId(appointmentToEdit.doctorId || '');
        setSpecialty(appointmentToEdit.specialty);
        setDate(appointmentToEdit.date);
        setTime(appointmentToEdit.time);
        setDiagnosis(appointmentToEdit.diagnosis || '');
        setStatus(appointmentToEdit.status);
      }
    } else {
      resetForm();
    }
  }, [isEditing, currentAppointmentId, appointments]);

  // Autocompletar especialidad cuando se selecciona un doctor
  useEffect(() => {
    if (doctorId && (showModal || isEditing)) { 
      const selectedDoctor = doctors.find(doc => doc.id === doctorId);
      if (selectedDoctor) {
        setSpecialty(selectedDoctor.specialty || ''); 
      }
    } else if (!isEditing && !doctorId) { 
      setSpecialty('');
    }
  }, [doctorId, doctors, isEditing, showModal]);

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
    setCurrentAppointmentId(null);
  };

  const handleOpenAddModal = () => {
    if (userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden programar citas.");
      return;
    }
    setIsEditing(false);
    setCurrentAppointmentId(null); 
    setShowModal(true);
  };

  const handleOpenEditModal = (appointment: Appointment) => {
    if (userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden editar citas.");
      return;
    }
    setIsEditing(true);
    setCurrentAppointmentId(appointment.id); 
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'doctor') {
        toast.error("Autenticación requerida / Rol de doctor necesario.");
        return;
    }
    if (!patientId || !doctorId || !specialty.trim() || !date || !time) {
      toast.error("Paciente, Doctor, Especialidad, Fecha y Hora son requeridos.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("La fecha debe estar en formato YYYY-MM-DD.");
      return;
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      toast.error("La hora debe estar en formato HH:MM (ej. 09:30 o 14:00).");
      return;
    }

    setFormLoading(true);
    const appointmentData = {
      patientId,
      doctorId,
      specialty: specialty.trim(),
      date,
      time,
      diagnosis: diagnosis.trim() || undefined, 
      status,
    };

    try {
      if (isEditing && currentAppointmentId) {
        await updateAppointment(currentAppointmentId, appointmentData);
      } else {
        await addAppointment(appointmentData);
      }
      setShowModal(false);
    } catch (error) {
      console.error("AppointmentsPage: Failed to save appointment:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleMarkAsCompleted = async (appointmentToComplete: Appointment) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden modificar citas.");
      return;
    }
    setFormLoading(true); 
    try {
      await updateAppointment(appointmentToComplete.id, { status: 'completed' });
      toast.success('Cita marcada como completada!');
    } catch (error) {
      console.error("AppointmentsPage: Failed to mark appointment as completed:", error);
      toast.error('Error al marcar la cita como completada.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentIdToDelete: string) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden eliminar citas.");
      return;
    }
    const appointmentToDelete = appointments.find(app => app.id === appointmentIdToDelete);
    const patientName = appointmentToDelete?.patient?.name ?? 'este paciente';

    if (window.confirm(`¿Está seguro de que desea eliminar la cita para ${patientName} el ${appointmentToDelete?.date}? Esta acción no se puede deshacer.`)) {
      setFormLoading(true); 
      try {
        await deleteAppointment(appointmentIdToDelete);
        toast.success('Cita eliminada exitosamente!');
      } catch (error) {
        console.error("AppointmentsPage: Failed to delete appointment:", error);
        toast.error('Error al eliminar la cita.');
      } finally {
        setFormLoading(false);
      }
    }
  };

  // Handler para notificar al paciente y guardar la notificación
  const handleNotifyPatient = async (appointmentToNotify: Appointment) => {
    if (!currentUser || userProfile?.role !== 'doctor') {
      toast.error("Solo los doctores pueden enviar notificaciones.");
      return;
    }
    
    const patientDetails = patients.find(p => p.id === appointmentToNotify.patientId) || appointmentToNotify.patient;

    if (!patientDetails) {
      toast.error("Detalles del paciente no encontrados para la notificación.");
      return;
    }

    const patientNameToNotify = patientDetails.name;
    const doctorNameToNotify = doctors.find(d => d.id === appointmentToNotify.doctorId)?.name || 'Tu Doctor';
    
    const formattedDate = new Date(appointmentToNotify.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = new Date(`1970-01-01T${appointmentToNotify.time}`).toLocaleTimeString(navigator.language || 'es-ES', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const message = `Recordatorio: Tiene una cita de ${appointmentToNotify.specialty} con ${doctorNameToNotify} el ${formattedDate} a las ${formattedTime}.`;
    
    const notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
      patientId: patientDetails.id,
      appointmentId: appointmentToNotify.id,
      message: message,
      type: 'appointment_reminder', // Tipo específico para recordatorio de cita
      status: 'pending', // Se podría cambiar a 'sent' si se envía inmediatamente por otro canal
      // sendAt: podrías calcular una fecha para enviar esto más tarde, ej. 24h antes
    };
    
    setNotifyLoading(appointmentToNotify.id); // Indicar carga para este botón específico
    try {
      await addNotification(notificationData); // Llama a la función del contexto para guardar
      toast.success(`Notificación de recordatorio para ${patientNameToNotify} guardada y lista para ser procesada.`);
      // Aquí, en una implementación real, también se podría disparar el envío real de la notificación (email/SMS)
      // o marcarla para un worker que procese envíos.
    } catch (error) {
      console.error("AppointmentsPage: Failed to save notification:", error);
      toast.error('Error al guardar la notificación de recordatorio.');
    } finally {
      setNotifyLoading(null);
    }
  };


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

  if (loadingData && (!doctors.length || !patients.length)) {
    return <div className="flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin"></div><p className="ml-3">Cargando datos iniciales...</p></div>;
  }
   if (userProfile && userProfile.role !== 'doctor') {
    return <div className="p-6 text-center"><h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1><p className="text-gray-700">Esta sección es solo para doctores autorizados.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Citas</h1>
        {userProfile?.role === 'doctor' && (
            <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
            >
            <Plus size={18} />
            <span>Programar Cita</span>
            </button>
        )}
      </div>

      {userProfile?.role === 'doctor' && (
        <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-2">
                <Filter size={18} className="text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-800">Filtros</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="all">Todos los Estados</option>
                    <option value="scheduled">Programada</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
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
            {loadingAppointments && <div className="text-center py-4"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin mx-auto"></div><p className="mt-2 text-sm text-gray-500">Cargando citas...</p></div>}
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
                        {appointmentsByDate[d].map(appointment => (
                        <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            onEdit={() => handleOpenEditModal(appointment)}
                            onMarkAsCompleted={() => handleMarkAsCompleted(appointment)}
                            onDelete={() => handleDeleteAppointment(appointment.id)}
                            onNotifyPatient={() => handleNotifyPatient(appointment)}
                        />
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                !loadingAppointments && <div className="text-center py-12"><p className="text-gray-500 text-lg">No se encontraron citas con los filtros aplicados.</p></div>
            )}
        </>
      )}

      {/* Modal para Añadir/Editar Cita */}
      {showModal && userProfile?.role === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Cita' : 'Programar Nueva Cita'}</h2>
              <button onClick={() => { setShowModal(false); }} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <UserIcon size={16} className="mr-2 text-gray-400"/> Paciente
                </label>
                <select id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Seleccionar paciente</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <UserIcon size={16} className="mr-2 text-gray-400"/> Doctor
                </label>
                <select id="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Seleccionar doctor</option>
                  {doctors.map((doc) => <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Briefcase size={16} className="mr-2 text-gray-400"/> Especialidad
                </label>
                <input type="text" id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required 
                       readOnly={!!doctorId && doctors.some(d => d.id === doctorId && !!d.specialty)} 
                       className={`w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!!doctorId && doctors.some(d => d.id === doctorId && !!d.specialty) ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <CalendarIcon size={16} className="mr-2 text-gray-400"/> Fecha
                    </label>
                    <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Clock size={16} className="mr-2 text-gray-400"/> Hora
                    </label>
                    <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
              </div>

              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico (Opcional)</label>
                <textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Appointment['status'])} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="scheduled">Programada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={formLoading}>Cancelar</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        disabled={formLoading}>
                  {formLoading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Programar Cita')}
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
