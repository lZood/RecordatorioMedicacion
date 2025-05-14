import React from 'react';
import { FileText, Download, Filter, Calendar } from 'lucide-react';

const Reports: React.FC = () => {
  const reportTypes = [
    {
      id: 'medication-adherence',
      title: 'Medication Adherence Report',
      description: 'Shows patient compliance with medication schedules',
      icon: <FileText size={20} className="text-indigo-600" />
    },
    {
      id: 'vital-signs',
      title: 'Vital Signs Report',
      description: 'Summarizes patient vital sign measurements over time',
      icon: <FileText size={20} className="text-teal-600" />
    },
    {
      id: 'appointments',
      title: 'Appointments Report',
      description: 'Lists all appointments with status and outcome',
      icon: <FileText size={20} className="text-blue-600" />
    },
    {
      id: 'patient-summary',
      title: 'Patient Summary Report',
      description: 'Comprehensive overview of patient health data',
      icon: <FileText size={20} className="text-purple-600" />
    }
  ];
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
      
      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-2">
          <Filter size={18} className="text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              id="report-type"
              defaultValue=""
              className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="" disabled>Select Report Type</option>
              {reportTypes.map(report => (
                <option key={report.id} value={report.id}>{report.title}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="date-from"
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="date-to"
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200">
            <Filter size={16} />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
      
      {/* Available Reports */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Available Reports</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map(report => (
              <div 
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start">
                  <div className="p-2 bg-gray-100 rounded-full mr-4 mt-1">
                    {report.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{report.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Available formats:</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">PDF</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">CSV</span>
                      </div>
                      
                      <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200">
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Recently Generated Reports</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">Medication Adherence Report</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">2023-11-01</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    PDF
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">Download</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">Vital Signs Report</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">2023-10-25</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    CSV
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">Download</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;