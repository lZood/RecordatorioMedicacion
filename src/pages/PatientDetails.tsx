import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Phone, Mail, MapPin, Edit, ArrowLeft, Calendar, Activity, Pill, FileText } from 'lucide-react';

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPatientById, appointments, vitalSigns, medicationIntakes, medications } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get patient details
  const patient = getPatientById(id || '');
  
  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Patient not found.</p>
        <Link to="/patients" className="text-indigo-600 mt-4 inline-block hover:underline">
          Back to Patients
        </Link>
      </div>
    );
  }
  
  // Get patient-specific data
  const patientAppointments = appointments.filter(app => app.patientId === patient.id);
  const patientVitalSigns = vitalSigns.filter(sign => sign.patientId === patient.id);
  const patientMedicationIntakes = medicationIntakes.filter(intake => intake.patientId === patient.id);
  
  // Calculate medication adherence rate
  const adherenceRate = patientMedicationIntakes.length > 0 
    ? (patientMedicationIntakes.filter(intake => intake.taken).length / patientMedicationIntakes.length) * 100 
    : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Patient Details</h1>
      </div>
      
      {/* Patient Info Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 relative">
          <button className="absolute top-6 right-6 p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <Edit size={16} />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{patient.name}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center text-gray-600">
              <Phone size={18} className="mr-3 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p>{patient.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Mail size={18} className="mr-3 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p>{patient.email}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600">
              <MapPin size={18} className="mr-3 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p>{patient.address}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Calendar size={18} className="mr-3 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Registered On</p>
                <p>{new Date(patient.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Patient Dashboard Summary */}
        <div className="border-t border-gray-100 bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PatientStatCard 
              title="Medication Adherence" 
              value={`${adherenceRate.toFixed(0)}%`} 
              icon={<Pill className="text-teal-600" size={20} />}
              color="bg-teal-100 text-teal-800"
            />
            <PatientStatCard 
              title="Upcoming Appointments" 
              value={patientAppointments.filter(a => a.status === 'scheduled').length.toString()} 
              icon={<Calendar className="text-indigo-600" size={20} />}
              color="bg-indigo-100 text-indigo-800"
            />
            <PatientStatCard 
              title="Vital Sign Records" 
              value={patientVitalSigns.length.toString()} 
              icon={<Activity className="text-rose-600" size={20} />}
              color="bg-rose-100 text-rose-800"
            />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6">
            {['overview', 'medications', 'appointments', 'vitals', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-4 text-sm font-medium border-b-2 whitespace-nowrap
                  ${activeTab === tab 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Patient Overview</h3>
              <p className="text-gray-600">
                This is the overview tab showing a summary of {patient.name}'s health data, recent medication adherence, 
                upcoming appointments, and vital sign trends.
              </p>
              
              {/* We would include charts and visualizations here in a real app */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center text-gray-500">
                Visualization charts would be displayed here
              </div>
            </div>
          )}
          
          {activeTab === 'medications' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Medications</h3>
                <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                  Add Medication
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Ingredient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adherence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patientMedicationIntakes.length > 0 ? (
                      patientMedicationIntakes.map((intake, index) => {
                        const medication = medications.find(med => med.id === intake.medicationId);
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {medication?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {medication?.activeIngredient || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {intake.date} at {intake.time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${intake.taken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {intake.taken ? 'Taken' : 'Missed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button className="text-indigo-600 hover:text-indigo-900">View</button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No medication records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Appointments</h3>
                <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                  Schedule Appointment
                </button>
              </div>
              
              {patientAppointments.length > 0 ? (
                <div className="space-y-4">
                  {patientAppointments.map(appointment => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{appointment.specialty} Appointment</h4>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar size={14} className="mr-1" />
                            <span className="mr-3">{appointment.date}</span>
                            <Clock size={14} className="mr-1" />
                            <span>{appointment.time}</span>
                          </div>
                          {appointment.diagnosis && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Diagnosis:</span> {appointment.diagnosis}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full capitalize 
                          ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 py-4">No appointments found for this patient.</p>
              )}
            </div>
          )}
          
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Vital Signs</h3>
                <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                  Record Vitals
                </button>
              </div>
              
              {patientVitalSigns.length > 0 ? (
                <div>
                  {/* We would include charts for vital sign trends in a real app */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center text-gray-500 mb-6">
                    Vital signs trend chart would be displayed here
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {patientVitalSigns.map(vitalSign => (
                          <tr key={vitalSign.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {vitalSign.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vitalSign.value} {vitalSign.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vitalSign.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vitalSign.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 py-4">No vital sign records found for this patient.</p>
              )}
            </div>
          )}
          
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="mr-4 p-2 bg-indigo-100 rounded-full">
                      <FileText size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Medication Report</h4>
                      <p className="text-sm text-gray-500">Download medication adherence history</p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="mr-4 p-2 bg-teal-100 rounded-full">
                      <FileText size={20} className="text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Vital Signs Report</h4>
                      <p className="text-sm text-gray-500">Download vital signs history</p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="mr-4 p-2 bg-blue-100 rounded-full">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Appointment History</h4>
                      <p className="text-sm text-gray-500">Download appointment records</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PatientStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const PatientStatCard: React.FC<PatientStatCardProps> = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color.split(' ')[0]}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xl font-semibold text-gray-800 mt-1">{value}</p>
    </div>
  </div>
);

export default PatientDetails;