import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Calendar, Clock, Users, Pill, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { patients, medications, appointments, vitalSigns } = useAppContext();
  
  // Filter upcoming appointments (scheduled appointments only)
  const upcomingAppointments = appointments
    .filter(appointment => appointment.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  // Count medications that will expire within 30 days
  const today = new Date();
  const expiringMedications = medications.filter(medication => {
    const expDate = new Date(medication.expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  });
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Patients" 
          value={patients.length} 
          icon={<Users className="text-indigo-600" />} 
          linkTo="/patients"
        />
        <StatCard 
          title="Medications" 
          value={medications.length} 
          icon={<Pill className="text-teal-600" />} 
          linkTo="/medications"
        />
        <StatCard 
          title="Appointments" 
          value={appointments.length} 
          icon={<Calendar className="text-blue-600" />} 
          linkTo="/appointments"
        />
        <StatCard 
          title="Vital Sign Records" 
          value={vitalSigns.length} 
          icon={<Activity className="text-rose-600" />} 
          linkTo="/vitals"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-indigo-600 text-sm flex items-center hover:text-indigo-800">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <div key={appointment.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="p-2 bg-indigo-100 rounded-full mr-4">
                    <Calendar size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{appointment.specialty} Appointment</p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar size={14} className="mr-1" />
                      <span className="mr-3">{appointment.date}</span>
                      <Clock size={14} className="mr-1" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                  <button className="text-sm text-indigo-600 px-3 py-1 border border-indigo-200 rounded-full hover:bg-indigo-50">
                    Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 py-4">No upcoming appointments</p>
          )}
        </div>
        
        {/* Alerts Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Alerts</h2>
          
          <div className="space-y-4">
            {/* Expiring Medications Alert */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-start">
                <Pill className="text-yellow-600 mr-3 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-yellow-700">Medications Expiring Soon</p>
                  <p className="text-sm text-yellow-600 mt-1">
                    {expiringMedications.length} medications will expire within 30 days.
                  </p>
                  <Link to="/medications" className="text-xs text-yellow-800 font-medium mt-2 inline-block hover:underline">
                    Review Medications
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Patient Follow-up Alert */}
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
              <div className="flex items-start">
                <Users className="text-indigo-600 mr-3 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-indigo-700">Patient Follow-ups</p>
                  <p className="text-sm text-indigo-600 mt-1">
                    2 patients need follow-up on their medication adherence.
                  </p>
                  <Link to="/patients" className="text-xs text-indigo-800 font-medium mt-2 inline-block hover:underline">
                    View Patients
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  linkTo: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, linkTo }) => (
  <Link to={linkTo} className="bg-white rounded-lg shadow p-6 transition-transform duration-300 hover:transform hover:-translate-y-1">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className="bg-gray-50 p-3 rounded-full">
        {icon}
      </div>
    </div>
  </Link>
);

export default Dashboard;