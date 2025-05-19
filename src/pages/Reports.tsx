// src/pages/Reports.tsx
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Patient, MedicationIntakeWithMedication } from '../types'; // MedicationIntakeWithMedication ya está en el servicio
import { FileText, Download, Filter, Calendar, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MedicationAdherenceReportData {
  patientName: string;
  medicationName: string;
  scheduled: number;
  taken: number;
  adherence: string;
}

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
    supportedFormats: ['PDF'],
  },
];

const Reports: React.FC = () => {
  const { 
    patients, 
    medicationIntakes, // Usar el estado global de AppContext
    userProfile,
    loadingMedicationIntakesGlobal, // Para saber si las tomas globales están listas
  } = useAppContext();

  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const processMedicationAdherenceData = (): MedicationAdherenceReportData[] | null => {
    // Usar directamente medicationIntakes del contexto, que ahora debería estar poblado globalmente
    console.log("Reports.tsx - medicationIntakes from context for processing:", medicationIntakes);
    
    if (loadingMedicationIntakesGlobal) { // Esperar si aún están cargando
        toast.error('Los datos de tomas de medicamentos aún se están cargando. Intente de nuevo en un momento.');
        return null;
    }

    if (!medicationIntakes || medicationIntakes.length === 0) {
      toast.error('No hay datos de tomas de medicamentos disponibles para procesar.');
      return null;
    }

    let filteredIntakes = [...medicationIntakes]; // Crear una copia para no mutar el estado del contexto

    if (selectedPatientId !== 'all') {
      filteredIntakes = filteredIntakes.filter(intake => intake.patientId === selectedPatientId);
    }
    if (dateFrom) {
      filteredIntakes = filteredIntakes.filter(intake => new Date(intake.date) >= new Date(dateFrom + 'T00:00:00'));
    }
    if (dateTo) {
      filteredIntakes = filteredIntakes.filter(intake => new Date(intake.date) <= new Date(dateTo + 'T23:59:59'));
    }

    if (filteredIntakes.length === 0) {
      toast.error('No hay datos que coincidan con los filtros seleccionados.');
      return null;
    }

    const reportData: MedicationAdherenceReportData[] = [];
    const intakesByPatientAndMedication: Record<string, Record<string, { scheduled: number; taken: number }>> = {};

    filteredIntakes.forEach(intake => {
      const patient = patients.find(p => p.id === intake.patientId);
      const patientName = patient?.name || `ID Paciente: ${intake.patientId}`;
      const medicationName = intake.medication?.name || `ID Med: ${intake.medicationId}`;

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
            const adherenceValue = data.scheduled > 0 ? ((data.taken / data.scheduled) * 100) : 0;
            reportData.push({
                patientName,
                medicationName,
                scheduled: data.scheduled,
                taken: data.taken,
                adherence: adherenceValue.toFixed(2) + '%'
            });
        }
    }
    return reportData;
  };
  
  const generateMedicationAdherenceCSV = () => {
    const processedData = processMedicationAdherenceData();
    if (!processedData) return null;

    const headers = ['Paciente', 'Medicamento', 'Tomas Programadas', 'Tomas Realizadas', 'Adherencia'];
    const csvRows = [
      headers.join(','),
      ...processedData.map(row => 
        [
          `"${row.patientName.replace(/"/g, '""')}"`,
          `"${row.medicationName.replace(/"/g, '""')}"`,
          row.scheduled,
          row.taken,
          `"${row.adherence}"`
        ].join(',')
      )
    ];
    return csvRows.join('\n');
  };

  const generateMedicationAdherencePDF = () => {
    const processedData = processMedicationAdherenceData();
    if (!processedData || processedData.length === 0) {
        return null; 
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let finalY = 20; 

    doc.setFontSize(18);
    doc.text("Reporte de Adherencia a la Medicación", pageWidth / 2, finalY, { align: 'center' });
    finalY += 10;

    doc.setFontSize(10);
    let filterText = "Filtros aplicados: ";
    if (selectedPatientId !== 'all') {
        const patientName = patients.find(p => p.id === selectedPatientId)?.name || selectedPatientId;
        filterText += `Paciente: ${patientName}; `;
    } else {
        filterText += "Todos los pacientes; ";
    }
    if (dateFrom) filterText += `Desde: ${new Date(dateFrom + 'T00:00:00').toLocaleDateString()}; `;
    if (dateTo) filterText += `Hasta: ${new Date(dateTo + 'T00:00:00').toLocaleDateString()}; `;
    if (filterText === "Filtros aplicados: ") filterText = "Filtros aplicados: Ninguno";

    doc.text(filterText, 14, finalY);
    finalY += 8;

    doc.setFontSize(8);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, finalY);
    if (userProfile?.name) {
        doc.text(`Por: Dr(a). ${userProfile.name}`, pageWidth - 14, finalY, { align: 'right' });
    }
    finalY += 10;
    
    const tableColumn = ["Paciente", "Medicamento", "Programadas", "Realizadas", "Adherencia (%)"];
    const tableRows: (string | number)[][] = [];

    processedData.forEach(row => {
      const rowData = [
        row.patientName,
        row.medicationName,
        row.scheduled,
        row.taken,
        row.adherence
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: finalY,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] }, 
      margin: { top: 10 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`, 
          data.settings.margin.left, 
          pageHeight - 10
        );
        finalY = data.cursor?.y ?? 20;
      }
    });
    
    finalY = (doc as any).lastAutoTable.finalY || finalY;

    finalY += 10;
    if (finalY > pageHeight - 20) {
        doc.addPage();
        finalY = 20;
    }
    doc.setFontSize(10);
    doc.text("Notas: La adherencia se calcula como (Tomas Realizadas / Tomas Programadas) * 100.", 14, finalY);

    return doc;
  };

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

  const handleDownload = async (format: 'CSV' | 'PDF') => {
    if (!selectedReportType) {
      toast.error('Por favor, seleccione un tipo de reporte.');
      return;
    }
    setIsGenerating(true);

    let fileName = `${selectedReportType}_${new Date().toISOString().split('T')[0]}`;

    try {
        if (selectedReportType === 'medication-adherence') {
          if (format === 'CSV') {
            const csvContent = generateMedicationAdherenceCSV();
            if (csvContent) {
              fileName += '.csv';
              downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
              toast.success(`Reporte ${fileName} descargado.`);
            }
          } else if (format === 'PDF') {
            const pdfDoc = generateMedicationAdherencePDF();
            if (pdfDoc) {
              fileName += '.pdf';
              pdfDoc.save(fileName);
              toast.success(`Reporte ${fileName} descargado.`);
            }
          }
        } else {
          toast.error(`La generación de reportes para "${reportTypesList.find(rt=>rt.id === selectedReportType)?.title || selectedReportType}" aún no está implementada.`);
        }
    } catch (error) {
        console.error("Error generando el reporte:", error);
        toast.error("Ocurrió un error al generar el reporte.");
    } finally {
        setIsGenerating(false);
    }
  };
  
  const selectedReportDefinition = useMemo(() => {
    return reportTypesList.find(rt => rt.id === selectedReportType);
  }, [selectedReportType]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
      
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
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Disponibles</h2>
        </div>
        
        <div className="p-6">
          {loadingMedicationIntakesGlobal && selectedReportType === 'medication-adherence' && (
            <p className="text-gray-500 text-center py-8 animate-pulse">
                Cargando datos de adherencia...
            </p>
          )}
          {!loadingMedicationIntakesGlobal && selectedReportType && selectedReportDefinition ? (
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
                        disabled={isGenerating || (selectedReportType === 'medication-adherence' && loadingMedicationIntakesGlobal)}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-indigo-500 rounded-md hover:bg-indigo-100"
                      >
                        <Download size={16} />
                        <span>CSV</span>
                      </button>
                    )}
                    {selectedReportDefinition.supportedFormats.includes('PDF') && (
                       <button 
                        onClick={() => handleDownload('PDF')}
                        disabled={isGenerating || (selectedReportType === 'medication-adherence' && loadingMedicationIntakesGlobal)}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-purple-500 rounded-md hover:bg-purple-100"
                      >
                        <Download size={16} />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>
                   {isGenerating && <p className="text-sm text-gray-500 mt-2 animate-pulse">Generando reporte...</p>}
                </div>
              </div>
            </div>
          ) : (
            !selectedReportType && 
            <p className="text-gray-500 text-center py-8">
              Seleccione un tipo de reporte de la sección de filtros para ver las opciones de descarga.
            </p>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Generados Recientemente</h2>
        </div>
        <div className="p-6">
            <p className="text-gray-500">Esta sección mostrará los reportes que ha generado y descargado recientemente. (Funcionalidad pendiente)</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;

