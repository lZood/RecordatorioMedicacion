// src/pages/VitalSigns.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { VitalSign, Patient } from '../types';
import { User as UserIcon, Plus, Activity, Calendar as CalendarIcon, Clock, Edit3, Trash2, X, Thermometer, Heart, TrendingUp } from 'lucide-react'; // UserIcon para paciente
import toast from 'react-hot-toast';

const VitalSigns: React.FC = () => {
  const {
    vitalSigns = [], // Con valor por defecto
    patients = [],   // Con valor por defecto
    addVitalSign,
    updateVitalSign,
    deleteVitalSign,
    loadingVitalSigns,
    loadingData, // Para saber si patients está cargando
    currentUser
  } = useAppContext();

  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // Para filtrar por tipo de signo vital

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVitalSignId, setCurrentVitalSignId] = useState<string | null>(null);

  // Estados del formulario
  const [formPatientId, setFormPatientId] = useState('');
  const [formType, setFormType] = useState(''); // E.g., "Blood Pressure", "Heart Rate"
  const [formValue, setFormValue] = useState<string>(''); // Usar string para el input, luego convertir a number
  const [formUnit, setFormUnit] = useState(''); // E.g., "mmHg", "bpm", "°C"
  const [formDate, setFormDate] = useState(''); // YYYY-MM-DD
  const [formTime, setFormTime] = useState(''); // HH:MM
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pre-llenar formulario para editar
  useEffect(() => {
    if (isEditing && currentVitalSignId) {
      const vsToEdit = vitalSigns.find(vs => vs.id === currentVitalSignId);
      if (vsToEdit) {
        setFormPatientId(vsToEdit.patientId);
        setFormType(vsToEdit.type);
        setFormValue(String(vsToEdit.value)); // Convertir número a string para el input
        setFormUnit(vsToEdit.unit);
        setFormDate(vsToEdit.date);
        setFormTime(vsToEdit.time);
      }
    } else {
      resetForm();
    }
  }, [isEditing, currentVitalSignId, vitalSigns]);

  const resetForm = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));

    setFormPatientId(patientFilter !== 'all' ? patientFilter : ''); // Preseleccionar si hay filtro de paciente
    setFormType('');
    setFormValue('');
    setFormUnit('');
    setFormDate(localToday.toISOString().split('T')[0]);
    const now = new Date();
    setFormTime(now.toTimeString().slice(0,5)); // Hora actual HH:MM
    setCurrentVitalSignId(null);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    resetForm(); // Asegura que el formulario esté limpio y con la fecha/hora actual
    setShowModal(true);
  };

  const handleOpenEditModal = (vs: VitalSign) => {
    setIsEditing(true);
    setCurrentVitalSignId(vs.id); // useEffect llenará el formulario
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) { toast.error("Auth required"); return; }
    if (!formPatientId || !formType.trim() || formValue.trim() === '' || !formUnit.trim() || !formDate || !formTime) {
      toast.error("Patient, Type, Value, Unit, Date, and Time are required.");
      return;
    }
    const numericValue = parseFloat(formValue);
    if (isNaN(numericValue)) {
      toast.error("Value must be a valid number.");
      return;
    }
     if (!/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      toast.error("Date must be in YYYY-MM-DD format."); return;
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(formTime)) {
      toast.error("Time must be in HH:MM format."); return;
    }

    setFormSubmitting(true);
    const vitalSignData = {
      patientId: formPatientId,
      type: formType.trim(),
      value: numericValue,
      unit: formUnit.trim(),
      date: formDate,
      time: formTime,
    };

    try {
      if (isEditing && currentVitalSignId) {
        await updateVitalSign(currentVitalSignId, vitalSignData);
      } else {
        await addVitalSign(vitalSignData);
      }
      setShowModal(false);
      // resetForm(); // Se resetea con useEffect al cambiar isEditing/currentVitalSignId
    } catch (error) {
      // El toast de error ya se maneja en AppContext
      console.error("Failed to save vital sign from page:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, type: string, patientName?: string) => {
    if (!currentUser) { toast.error("Auth required"); return; }
    if (window.confirm(`Are you sure you want to delete the ${type} record ${patientName ? `for ${patientName}` : ''}?`)) {
      try {
        await deleteVitalSign(id);
        // El toast de éxito ya se maneja en AppContext
      } catch (error) {
        console.error("Failed to delete vital sign:", error);
      }
    }
  };

  const filteredVitalSigns = vitalSigns.filter(vitalSign => {
    const matchesPatient = patientFilter === 'all' || vitalSign.patientId === patientFilter;
    const matchesType = typeFilter === 'all' || vitalSign.type.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesPatient && matchesType;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time) ); // Ordenar por más reciente


  // Obtener tipos únicos de signos vitales para el filtro
  const vitalSignTypes = Array.from(new Set(vitalSigns.map(sign => sign.type)));

  if (loadingData && !patients.length) { // Muestra un loader si los pacientes (necesarios para el selector) están cargando
    return <div className="flex justify-center items-center h-screen">Loading patient data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Vital Signs</h1>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <Plus size={18} />
          <span>Record Vital Signs</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-2">
          <Activity size={18} className="text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={16} className="text-gray-400" />
              </div>
              <select id="patient-filter" value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)}
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="all">All Patients</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Vital Sign Type</label>
             <input type="text" id="type-filter" placeholder="e.g., Blood Pressure, Heart Rate" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                     className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            {/* O un selector si tienes tipos predefinidos:
            <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="all">All Types</option>
              {vitalSignTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select> */}
          </div>
        </div>
      </div>

      {/* Vital Signs Data Table */}
      {loadingVitalSigns && <div className="text-center py-4">Loading vital signs...</div>}
      {!loadingVitalSigns && filteredVitalSigns.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVitalSigns.map(vs => {
                const patient = patients.find(p => p.id === vs.patientId);
                const displayDateTime = `${new Date(vs.date + 'T00:00:00').toLocaleDateString(navigator.language || 'es-ES', {year: 'numeric', month: 'short', day: 'numeric'})}, ${vs.time}`;
                return (
                  <tr key={vs.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{vs.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{vs.value} {vs.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{displayDateTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button onClick={() => handleOpenEditModal(vs)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                      <button onClick={() => handleDelete(vs.id, vs.type, patient?.name)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !loadingVitalSigns && <div className="text-center py-12"><p className="text-gray-500 text-lg">No vital signs records found matching your filters.</p></div>
      )}

      {/* Modal para Añadir/Editar Signo Vital */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Vital Sign' : 'Record New Vital Sign'}</h2>
              <button onClick={() => { setShowModal(false); /* resetForm se llama por useEffect */ }} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="formPatientId" className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select id="formPatientId" value={formPatientId} onChange={(e) => setFormPatientId(e.target.value)} required
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="" disabled>Select a patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="formType" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input type="text" id="formType" placeholder="e.g., Heart Rate" value={formType} onChange={(e) => setFormType(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="formValue" className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input type="number" step="any" id="formValue" placeholder="e.g., 75" value={formValue} onChange={(e) => setFormValue(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="formUnit" className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" id="formUnit" placeholder="e.g., bpm" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="formDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" id="formDate" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="formTime" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" id="formTime" value={formTime} onChange={(e) => setFormTime(e.target.value)} required
                         className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); /* resetForm se llama por useEffect */ }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" disabled={formSubmitting}>Cancel</button>
                <button type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Record Vital Sign')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalSigns;
