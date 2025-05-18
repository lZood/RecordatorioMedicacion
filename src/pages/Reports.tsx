// src/pages/Reports.tsx
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext'; // Para acceder a los datos
import { Patient, MedicationIntakeWithMedication } from '../types'; // Asumo que tienes MedicationIntakeWithMedication
import { FileText, Download, Filter, Calendar, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

// Define los tipos de reportes disponibles de forma más estructurada
interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  supportedFormats: ('CSV' | 'PDF')[];
}

const reportTypesList: ReportDefinition[] = [
  {
    id: 'medication-adherence',
    title: 'Reporte de Adherencia a la Medicación',
    description: 'Muestra el cumplimiento del paciente con los horarios de medicación.',
    icon: <FileText size={20} className="text-indigo-600" />,
    supportedFormats: ['CSV', 'PDF'],
  },
  {
    id: 'vital-signs',
    title: 'Reporte de Signos Vitales',
    description: 'Resume las mediciones de signos vitales del paciente a lo largo del tiempo.',
    icon: <FileText size={20} className="text-teal-600" />,
    supportedFormats: ['CSV', 'PDF'],
  },
  {
    id: 'appointments',
    title: 'Reporte de Citas',
    description: 'Lista todas las citas con estado y resultado.',
    icon: <FileText size={20} className="text-blue-600" />,
    supportedFormats: ['CSV', 'PDF'],
  },
  {
    id: 'patient-summary',
    title: 'Reporte Resumen del Paciente',
    description: 'Visión general completa de los datos de salud del paciente.',
    icon: <FileText size={20} className="text-purple-600" />,
    supportedFormats: ['PDF'], // CSV podría ser muy complejo para un resumen general
  },
];

const Reports: React.FC = () => {
  const { 
    patients, 
    medicationIntakes, // Asumimos que esto viene de AppContext y son MedicationIntakeWithMedication
    fetchMedicationIntakesForPatient, // Si necesitas cargar on-demand, sino usa las globales
    // ... otros datos que necesites: appointments, vitalSigns
  } = useAppContext();

  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all'); // Para filtrar por paciente
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Función para generar el CSV del reporte de adherencia
  const generateMedicationAdherenceCSV = () => {
    if (!medicationIntakes || medicationIntakes.length === 0) {
      toast.error('No hay datos de tomas de medicamentos disponibles para generar el reporte.');
      return null;
    }

    setIsGenerating(true);
    let filteredIntakes = medicationIntakes;

    // 1. Filtrar por paciente (si no es 'all')
    if (selectedPatientId !== 'all') {
      filteredIntakes = filteredIntakes.filter(intake => intake.patientId === selectedPatientId);
    }

    // 2. Filtrar por rango de fechas (si están definidas)
    if (dateFrom) {
      filteredIntakes = filteredIntakes.filter(intake => new Date(intake.date) >= new Date(dateFrom + 'T00:00:00'));
    }
    if (dateTo) {
      filteredIntakes = filteredIntakes.filter(intake => new Date(intake.date) <= new Date(dateTo + 'T23:59:59'));
    }

    if (filteredIntakes.length === 0) {
      toast.error('No hay datos que coincidan con los filtros seleccionados.');
      setIsGenerating(false);
      return null;
    }

    // 3. Agrupar por paciente y calcular adherencia
    const reportData: {
      patientName: string;
      medicationName: string;
      scheduled: number;
      taken: number;
      adherence: string;
    }[] = [];

    const intakesByPatientAndMedication: Record<string, Record<string, { scheduled: number; taken: number }>> = {};

    filteredIntakes.forEach(intake => {
      const patient = patients.find(p => p.id === intake.patientId);
      const patientName = patient?.name || `ID: ${intake.patientId}`;
      const medicationName = intake.medication?.name || `Med ID: ${intake.medicationId}`;

      if (!intakesByPatientAndMedication[patientName]) {
        intakesByPatientAndMedication[patientName] = {};
      }
      if (!intakesByPatientAndMedication[patientName][medicationName]) {
        intakesByPatientAndMedication[patientName][medicationName] = { scheduled: 0, taken: 0 };
      }

      intakesByPatientAndMedication[patientName][medicationName].scheduled += 1;
      if (intake.taken) {
        intakesByPatientAndMedication[patientName][medicationName].taken += 1;
      }
    });
    
    for (const patientName in intakesByPatientAndMedication) {
        for (const medicationName in intakesByPatientAndMedication[patientName]) {
            const data = intakesByPatientAndMedication[patientName][medicationName];
            const adherence = data.scheduled > 0 ? ((data.taken / data.scheduled) * 100).toFixed(2) + '%' : 'N/A';
            reportData.push({
                patientName,
                medicationName,
                scheduled: data.scheduled,
                taken: data.taken,
                adherence
            });
        }
    }


    // 4. Crear contenido CSV
    const headers = ['Paciente', 'Medicamento', 'Tomas Programadas', 'Tomas Realizadas', 'Adherencia (%)'];
    const csvRows = [
      headers.join(','),
      ...reportData.map(row => 
        [
          `"${row.patientName.replace(/"/g, '""')}"`, // Manejar comillas en nombres
          `"${row.medicationName.replace(/"/g, '""')}"`,
          row.scheduled,
          row.taken,
          `"${row.adherence}"`
        ].join(',')
      )
    ];
    
    setIsGenerating(false);
    return csvRows.join('\n');
  };

  // Función genérica para descargar archivos
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownload = (format: 'CSV' | 'PDF') => {
    if (!selectedReportType) {
      toast.error('Por favor, seleccione un tipo de reporte.');
      return;
    }

    let fileContent: string | null = null;
    let fileName = `${selectedReportType}_${new Date().toISOString().split('T')[0]}`;

    if (selectedReportType === 'medication-adherence') {
      if (format === 'CSV') {
        fileContent = generateMedicationAdherenceCSV();
        fileName += '.csv';
      } else if (format === 'PDF') {
        toast.error('La generación de PDF para este reporte aún no está implementada.');
        // Aquí llamarías a una función generateMedicationAdherencePDF()
        return;
      }
    } else {
      toast.error(`La generación de reportes para "${selectedReportType}" aún no está implementada.`);
      return;
    }

    if (fileContent) {
      downloadFile(fileContent, fileName, format === 'CSV' ? 'text/csv;charset=utf-8;' : 'application/pdf');
      toast.success(`Reporte ${fileName} descargado.`);
    }
  };
  
  const selectedReportDefinition = useMemo(() => {
    return reportTypesList.find(rt => rt.id === selectedReportType);
  }, [selectedReportType]);


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
      
      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter size={18} className="text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Filtros del Reporte</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Reporte
            </label>
            <select
              id="report-type"
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="" disabled>Seleccionar Tipo de Reporte</option>
              {reportTypesList.map(report => (
                <option key={report.id} value={report.id}>{report.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">Paciente (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={16} className="text-gray-400" />
              </div>
              <select id="patient-filter" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="all">Todos los Pacientes</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="date-from"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="date-to"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Mover botones de descarga aquí o dejarlos por reporte */}
      </div>
      
      {/* Available Reports */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Disponibles</h2>
        </div>
        
        <div className="p-6">
          {selectedReportType && selectedReportDefinition ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
              <div className="flex items-start">
                <div className="p-2 bg-indigo-100 rounded-full mr-4 mt-1">
                  {selectedReportDefinition.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{selectedReportDefinition.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedReportDefinition.description}</p>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-medium">Descargar como:</span>
                    {selectedReportDefinition.supportedFormats.includes('CSV') && (
                      <button 
                        onClick={() => handleDownload('CSV')}
                        disabled={isGenerating}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-indigo-500 rounded-md hover:bg-indigo-100"
                      >
                        <Download size={16} />
                        <span>CSV</span>
                      </button>
                    )}
                    {selectedReportDefinition.supportedFormats.includes('PDF') && (
                       <button 
                        onClick={() => handleDownload('PDF')}
                        disabled={isGenerating}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-purple-500 rounded-md hover:bg-purple-100"
                      >
                        <Download size={16} />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>
                   {isGenerating && <p className="text-sm text-gray-500 mt-2">Generando reporte...</p>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Seleccione un tipo de reporte de la sección de filtros para ver las opciones de descarga.
            </p>
          )}
        </div>
      </div>
      
      {/* Recent Reports (Placeholder - Implementar lógica de guardado y carga) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Generados Recientemente</h2>
        </div>
        <div className="p-6">
            <p className="text-gray-500">Esta sección mostrará los reportes que ha generado y descargado recientemente. (Funcionalidad pendiente)</p>
        </div>
        {/* ... (Tabla de reportes recientes como en tu UI original) ... */}
      </div>
    </div>
  );
};

export default Reports;