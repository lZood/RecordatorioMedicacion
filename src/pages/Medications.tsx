import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import MedicationCard from '../components/MedicationCard';
import { Plus, Search } from 'lucide-react';

const Medications: React.FC = () => {
  const { medications } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter medications based on search term
  const filteredMedications = medications.filter(medication => 
    medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Medications</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
            />
          </div>
          
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200">
            <Plus size={18} />
            <span>Add Medication</span>
          </button>
        </div>
      </div>
      
      {/* Medication Status Filters */}
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200">
          All Medications
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
          Expiring Soon
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
          Expired
        </button>
      </div>
      
      {filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map(medication => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No medications found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Medications;