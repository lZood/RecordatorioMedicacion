// src/pages/AppointmentDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Appointment, Patient, Doctor } from '../types'; // Asegúrate que los tipos estén bien definidos
import { ArrowLeft, Edit3, Trash2, Calendar as CalendarIcon, Clock, User as UserIcon, Briefcase, FileText, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Define un tipo para la cita con detalles de paciente y doctor (si no lo tienes ya)
interface AppointmentWithDetails extends Omit<Appointment, 'patientId' | 'doctorId'> {
  patientId: string;
  doctorId: string;
  patient?: { id: string; name: string; } | null;
  doctor?: { id: string; name: string; specialty: string; } | null;
}

const AppointmentDetails: React.FC = () => {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    patients = [], // Con valor por defecto
    doctors = [],  // Con valor por defecto
    currentUser
  } = useAppContext();

  const [appointment, setAppointment] = useState<AppointmentWithDetails | null | undefined>(null); // null para carga, undefined si no se encuentra
  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Estados del formulario de edición
  const [editPatientId, setEditPatientId] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editStatus, setEditStatus] = useState<Appointment['status']>('scheduled');

  useEffect(() => {
    if (appointmentId) {
      const appt = getAppointmentById(appointmentId) as AppointmentWithDetails | undefined;
      setAppointment(appt);
      if (appt) {
        setEditPatientId(appt.patientId || (appt.patient?.id ?? ''));
        setEditDoctorId(appt.doctorId || (appt.doctor?.id ?? ''));
        setEditSpecialty(appt.specialty);
        setEditDate(appt.date);
        setEditTime(appt.time);
        setEditDiagnosis(appt.diagnosis || '');
        setEditStatus(appt.status);
      }
    }
  }, [appointmentId, getAppointmentById]); // El getAppointmentById podría depender de 'appointments' en AppContext

   // Autocompletar especialidad cuando se selecciona un doctor en el modal de edición
   useEffect(() => {
    if (showEditModal && editDoctorId) {
      const selectedDoctor = doctors.find(doc => doc.id === editDoctorId);
      if (selectedDoctor) {
        setEditSpecialty(selectedDoctor.specialty);
      }
    } else if (showEditModal && !editDoctorId) {
        setEditSpecialty(''); // Limpiar si se deselecciona el doctor
    }
  }, [editDoctorId, doctors, showEditModal]);


  const handleOpenEditModal = () => {
    if (appointment) {
      // Re-poblar el formulario con los datos actuales de la cita al abrir el modal
      setEditPatientId(appointment.patientId || (appointment.patient?.id ?? ''));
      setEditDoctorId(appointment.doctorId || (appointment.doctor?.id ?? ''));
      setEditSpecialty(appointment.specialty);
      setEditDate(appointment.date);
      setEditTime(appointment.time);
      setEditDiagnosis(appointment.diagnosis || '');
      setEditStatus(appointment.status);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appointmentId || !currentUser) {
        toast.error("Authentication or appointment ID missing.");
        return;
    }
    if (!editPatientId || !editDoctorId || !editSpecialty || !editDate || !editTime) {
      toast.error("Patient, Doctor, Specialty, Date, and Time are required.");
      return;
    }
    // Validaciones de formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      toast.error("Date must be in YYYY-MM-DD format."); return;
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(editTime)) {
      toast.error("Time must be in HH:MM format."); return;
    }

    setFormLoading(true);
    const updatedAppointmentData = {
      patientId: editPatientId,
      doctorId: editDoctorId,
      specialty: editSpecialty,
      date: editDate,
      time: editTime,
      diagnosis: editDiagnosis || undefined,
      status: editStatus,
    };

    try {
      await updateAppointment(appointmentId, updatedAppointmentData);
      // El estado global se actualiza en AppContext.
      // Para reflejar cambios inmediatamente aquí, podemos recargar o actualizar localmente.
      const updatedAppt = getAppointmentById(appointmentId) as AppointmentWithDetails | undefined;
      setAppointment(updatedAppt); // Actualiza el estado local
      setShowEditModal(false);
      toast.success('Appointment updated successfully!');
    } catch (error) {
      console.error("Failed to update appointment:", error);
      // El toast de error ya debería manejarse en AppContext
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentId || !appointment || !currentUser) return;
    if (window.confirm(`Are you sure you want to delete this appointment for ${appointment.patient?.name || 'this patient'} on ${appointment.date}?`)) {
      try {
        await deleteAppointment(appointmentId);
        toast.success('Appointment deleted successfully!');
        navigate('/appointments'); // Redirigir a la lista después de eliminar
      } catch (error) {
        console.error("Failed to delete appointment:", error);
        // El toast de error ya debería manejarse en AppContext
      }
    }
  };

  if (appointment === null) {
    return <div className="flex justify-center items-center h-screen">Loading appointment details...</div>;
  }

  if (appointment === undefined) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Appointment not found.</p>
        <Link to="/appointments" className="text-indigo-600 mt-4 inline-block hover:underline">
          Back to Appointments
        </Link>
      </div>
    );
  }

  // Formatear fecha para visualización
  let displayDate = 'N/A';
  if (appointment.date) {
    const dateObj = new Date(appointment.date + 'T00:00:00'); // Asegurar que se interprete como fecha local
    if (!isNaN(dateObj.getTime())) {
      displayDate = dateObj.toLocaleDateString(navigator.language || 'es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      });
    }
  }
  // Formatear hora para visualización
  let displayTime = 'N/A';
    if (appointment.time) {
        const [hours, minutes] = appointment.time.split(':');
        if (hours && minutes) {
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
            displayTime = timeDate.toLocaleTimeString(navigator.language || 'es-ES', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }
    }


  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/appointments" className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Appointment Details</h1>
      </div>

      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
            <h2 className="text-xl font-semibold">
                Appointment with {appointment.patient?.name || 'N/A'}
            </h2>
            <p className="text-indigo-200">
                {displayDate} at {displayTime}
            </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleOpenEditModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >
              <Edit3 size={16} /> Reschedule / Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <p className="font-semibold text-gray-500 mb-1">Patient</p>
              <div className="flex items-center gap-2 text-gray-800">
                <Users size={18} className="text-indigo-500" />
                <span>{appointment.patient?.name || 'Not available'}</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Doctor</p>
              <div className="flex items-center gap-2 text-gray-800">
                <UserIcon size={18} className="text-indigo-500" />
                <span>{appointment.doctor?.name || 'Not available'}</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Specialty</p>
              <div className="flex items-center gap-2 text-gray-800">
                <Briefcase size={18} className="text-indigo-500" />
                <span>{appointment.specialty}</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Status</p>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
              }`}>
                {appointment.status}
              </span>
            </div>
            {appointment.diagnosis && (
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-500 mb-1">Diagnosis</p>
                <div className="flex items-start gap-2 text-gray-800 bg-gray-50 p-3 rounded-md">
                  <FileText size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="whitespace-pre-wrap">{appointment.diagnosis}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición (Reschedule) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Reschedule / Edit Appointment</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              {/* Patient Selector */}
              <div>
                <label htmlFor="editPatientId" className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select id="editPatientId" value={editPatientId} onChange={(e) => setEditPatientId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Doctor Selector */}
              <div>
                <label htmlFor="editDoctorId" className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select id="editDoctorId" value={editDoctorId} onChange={(e) => setEditDoctorId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select doctor</option>
                  {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>)}
                </select>
              </div>
              {/* Specialty */}
              <div>
                <label htmlFor="editSpecialty" className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <input type="text" id="editSpecialty" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} required readOnly={!!editDoctorId && doctors.some(d => d.id === editDoctorId)}
                       className={`w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${editDoctorId && doctors.some(d => d.id === editDoctorId) ? 'bg-gray-100' : ''}`}/>
              </div>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" id="editDate" value={editDate} onChange={(e) => setEditDate(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="editTime" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" id="editTime" value={editTime} onChange={(e) => setEditTime(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
              </div>
              {/* Diagnosis */}
              <div>
                <label htmlFor="editDiagnosis" className="block text-sm font-medium text-gray-700 mb-1">Diagnosis (Optional)</label>
                <textarea id="editDiagnosis" value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} rows={3}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              {/* Status */}
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="editStatus" value={editStatus} onChange={(e) => setEditStatus(e.target.value as Appointment['status'])} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" disabled={formLoading}>Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetails;
