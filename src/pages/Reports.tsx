// src/pages/Reports.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Patient, MedicationIntakeWithMedication, VitalSign, Appointment, GeneratedReport, UserProfile } from '../types';
import { FileText, Download, Filter, Calendar, User as UserIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces para los datos procesados de cada reporte ---
interface MedicationAdherenceReportData {
  patientName: string;
  medicationName: string;
  scheduled: number;
  taken: number;
  adherence: string;
}

interface VitalSignsReportData {
  patientName: string;
  date: string;
  time: string;
  type: string;
  value: number;
  unit: string;
}

interface AppointmentsReportData {
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  diagnosis?: string;
}

// --- Definición de los tipos de reporte ---
interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  supportedFormats: ('CSV' | 'PDF')[];
  requiresPatientSelection?: boolean;
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
    requiresPatientSelection: true,
  },
];

const Reports: React.FC = () => {
  const { 
    patients, 
    medicationIntakes,
    vitalSigns,
    appointments,
    doctors, // Array de UserProfile para los doctores
    userProfile, // Perfil del doctor logueado
    loadingMedicationIntakesGlobal,
    loadingVitalSigns,
    loadingAppointments,
  } = useAppContext();

  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [recentlyGeneratedReports, setRecentlyGeneratedReports] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    const storedReports = localStorage.getItem('recentlyGeneratedReports');
    if (storedReports) {
      try {
        const parsedReports = JSON.parse(storedReports);
        if (Array.isArray(parsedReports)) {
            setRecentlyGeneratedReports(parsedReports);
        }
      } catch (e) {
        console.error("Error parsing stored reports from localStorage", e);
        localStorage.removeItem('recentlyGeneratedReports'); // Clear corrupted data
      }
    }
  }, []);

  useEffect(() => {
    // Solo guardar si hay algo que guardar o si ya existía algo (para limpiar si se borra todo)
    if (recentlyGeneratedReports.length > 0 || localStorage.getItem('recentlyGeneratedReports')) {
        localStorage.setItem('recentlyGeneratedReports', JSON.stringify(recentlyGeneratedReports));
    }
  }, [recentlyGeneratedReports]);

  // --- Funciones de Procesamiento de Datos ---
  const processMedicationAdherenceData = (): MedicationAdherenceReportData[] | null => {
    if (loadingMedicationIntakesGlobal) {
        toast.error('Los datos de tomas de medicamentos aún se están cargando.');
        return null;
    }
    if (!medicationIntakes || medicationIntakes.length === 0) {
      toast.error('No hay datos de tomas de medicamentos disponibles para procesar.');
      return null;
    }
    let filteredIntakes = [...medicationIntakes];
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
      toast.error('No hay datos de adherencia que coincidan con los filtros.');
      return null;
    }
    const reportData: MedicationAdherenceReportData[] = [];
    const intakesByPatientAndMedication: Record<string, Record<string, { scheduled: number; taken: number }>> = {};
    filteredIntakes.forEach(intake => {
      const patient = patients.find(p => p.id === intake.patientId);
      const patientName = patient?.name || `ID Paciente: ${intake.patientId}`;
      const medicationName = intake.medication?.name || `ID Med: ${intake.medicationId}`;
      if (!intakesByPatientAndMedication[patientName]) intakesByPatientAndMedication[patientName] = {};
      if (!intakesByPatientAndMedication[patientName][medicationName]) intakesByPatientAndMedication[patientName][medicationName] = { scheduled: 0, taken: 0 };
      intakesByPatientAndMedication[patientName][medicationName].scheduled += 1;
      if (intake.taken) intakesByPatientAndMedication[patientName][medicationName].taken += 1;
    });
    for (const patientName in intakesByPatientAndMedication) {
        for (const medicationName in intakesByPatientAndMedication[patientName]) {
            const data = intakesByPatientAndMedication[patientName][medicationName];
            const adherenceValue = data.scheduled > 0 ? ((data.taken / data.scheduled) * 100) : 0;
            reportData.push({ patientName, medicationName, scheduled: data.scheduled, taken: data.taken, adherence: adherenceValue.toFixed(2) + '%' });
        }
    }
    return reportData.sort((a,b) => a.patientName.localeCompare(b.patientName) || a.medicationName.localeCompare(b.medicationName));
  };

  const processVitalSignsData = (): VitalSignsReportData[] | null => {
    if (loadingVitalSigns) {
        toast.error('Los datos de signos vitales aún se están cargando.');
        return null;
    }
    if (!vitalSigns || vitalSigns.length === 0) {
        toast.error('No hay datos de signos vitales disponibles.');
        return null;
    }
    let filteredVitalSigns = [...vitalSigns];
    if (selectedPatientId !== 'all') {
        filteredVitalSigns = filteredVitalSigns.filter(vs => vs.patientId === selectedPatientId);
    }
    if (dateFrom) {
        filteredVitalSigns = filteredVitalSigns.filter(vs => new Date(vs.date) >= new Date(dateFrom + 'T00:00:00'));
    }
    if (dateTo) {
        filteredVitalSigns = filteredVitalSigns.filter(vs => new Date(vs.date) <= new Date(dateTo + 'T23:59:59'));
    }
    if (filteredVitalSigns.length === 0) {
        toast.error('No hay datos de signos vitales que coincidan con los filtros.');
        return null;
    }
    return filteredVitalSigns.map(vs => {
        const patient = patients.find(p => p.id === vs.patientId);
        return {
            patientName: patient?.name || `ID Paciente: ${vs.patientId}`,
            date: new Date(vs.date + 'T00:00:00Z').toLocaleDateString(), // Asegurar que se trate como UTC si es necesario
            time: vs.time,
            type: vs.type,
            value: vs.value,
            unit: vs.unit,
        };
    }).sort((a,b) => a.patientName.localeCompare(b.patientName) || new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time));
  };

  const processAppointmentsData = (): AppointmentsReportData[] | null => {
    if (loadingAppointments) {
        toast.error('Los datos de citas aún se están cargando.');
        return null;
    }
    if (!appointments || appointments.length === 0) {
        toast.error('No hay datos de citas disponibles.');
        return null;
    }
    let filteredAppointments = [...appointments];
    if (selectedPatientId !== 'all') {
        filteredAppointments = filteredAppointments.filter(appt => appt.patientId === selectedPatientId);
    }
    if (dateFrom) {
        filteredAppointments = filteredAppointments.filter(appt => new Date(appt.date) >= new Date(dateFrom + 'T00:00:00'));
    }
    if (dateTo) {
        filteredAppointments = filteredAppointments.filter(appt => new Date(appt.date) <= new Date(dateTo + 'T23:59:59'));
    }
    if (filteredAppointments.length === 0) {
        toast.error('No hay datos de citas que coincidan con los filtros.');
        return null;
    }
    return filteredAppointments.map(appt => {
        const patient = patients.find(p => p.id === appt.patientId);
        const doctor = appt.doctor || doctors.find(d => d.id === appt.doctorId); // Usar el array global de doctores
        return {
            patientName: patient?.name || `ID Paciente: ${appt.patientId}`,
            doctorName: doctor?.name || `ID Doctor: ${appt.doctorId}`,
            specialty: appt.specialty,
            date: new Date(appt.date + 'T00:00:00Z').toLocaleDateString(),
            time: appt.time,
            status: appt.status,
            diagnosis: appt.diagnosis || '',
        };
    }).sort((a,b) => a.patientName.localeCompare(b.patientName) || new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time));
  };

  // --- Funciones de Generación CSV ---
  const generateMedicationAdherenceCSV = () => { 
    const processedData = processMedicationAdherenceData();
    if (!processedData) return null;
    const headers = ['Paciente', 'Medicamento', 'Tomas Programadas', 'Tomas Realizadas', 'Adherencia'];
    const csvRows = [
      headers.join(','),
      ...processedData.map(row => 
        [ `"${row.patientName.replace(/"/g, '""')}"`, `"${row.medicationName.replace(/"/g, '""')}"`, row.scheduled, row.taken, `"${row.adherence}"` ].join(',')
      )
    ];
    return csvRows.join('\n');
  };
  const generateVitalSignsCSV = () => {
    const processedData = processVitalSignsData();
    if (!processedData) return null;
    const headers = ['Paciente', 'Fecha', 'Hora', 'Tipo', 'Valor', 'Unidad'];
    const csvRows = [
      headers.join(','),
      ...processedData.map(row => 
        [ `"${row.patientName.replace(/"/g, '""')}"`, row.date, row.time, `"${row.type.replace(/"/g, '""')}"`, row.value, `"${row.unit.replace(/"/g, '""')}"` ].join(',')
      )
    ];
    return csvRows.join('\n');
  };
  const generateAppointmentsCSV = () => {
    const processedData = processAppointmentsData();
    if (!processedData) return null;
    const headers = ['Paciente', 'Doctor', 'Especialidad', 'Fecha', 'Hora', 'Estado', 'Diagnóstico'];
    const csvRows = [
      headers.join(','),
      ...processedData.map(row => 
        [ `"${row.patientName.replace(/"/g, '""')}"`, `"${row.doctorName.replace(/"/g, '""')}"`, `"${row.specialty.replace(/"/g, '""')}"`, row.date, row.time, row.status, `"${(row.diagnosis || '').replace(/"/g, '""')}"` ].join(',')
      )
    ];
    return csvRows.join('\n');
  };

  // --- Funciones de Generación PDF ---
  const commonPdfStyles = (doc: jsPDF, title: string, filters: {patientId?: string | null, dateFrom?: string | null, dateTo?: string | null}) => {
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = 20;

    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(10);
    let filterText = "Filtros aplicados: ";
    if (filters.patientId && filters.patientId !== 'all') {
        const patientName = patients.find(p => p.id === filters.patientId)?.name || filters.patientId;
        filterText += `Paciente: ${patientName}; `;
    } else {
        filterText += "Todos los pacientes; ";
    }
    if (filters.dateFrom) filterText += `Desde: ${new Date(filters.dateFrom + 'T00:00:00Z').toLocaleDateString()}; `;
    if (filters.dateTo) filterText += `Hasta: ${new Date(filters.dateTo + 'T00:00:00Z').toLocaleDateString()}; `;
    if (filterText === "Filtros aplicados: ") filterText = "Filtros aplicados: Ninguno";
    
    doc.text(filterText, 14, currentY, { maxWidth: pageWidth - 28 });
    currentY += (doc.splitTextToSize(filterText, pageWidth - 28).length * 5) + 3; // Ajustar Y según líneas de filtro

    doc.setFontSize(8);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, currentY);
    if (userProfile?.name) {
        doc.text(`Por: Dr(a). ${userProfile.name}`, pageWidth - 14, currentY, { align: 'right' });
    }
    currentY += 10;
    return currentY; // Devuelve la posición Y para el inicio de la tabla
  };
  
  const addPdfFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.width - 20, pageHeight - 10, {align: 'right'});
  };


  const generateMedicationAdherencePDF = () => { 
    const processedData = processMedicationAdherenceData();
    if (!processedData || processedData.length === 0) return null; 
    const doc = new jsPDF();
    let startY = commonPdfStyles(doc, "Reporte de Adherencia a la Medicación", {patientId: selectedPatientId, dateFrom, dateTo });
    
    const tableColumn = ["Paciente", "Medicamento", "Programadas", "Realizadas", "Adherencia (%)"];
    const tableRows: (string | number)[][] = processedData.map(row => [row.patientName, row.medicationName, row.scheduled, row.taken, row.adherence]);
    
    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: startY, theme: 'striped', headStyles: { fillColor: [22, 160, 133] },
      didDrawPage: (data) => addPdfFooter(doc, data.pageNumber, doc.getNumberOfPages())
    });
    
    startY = (doc as any).lastAutoTable.finalY || startY; 
    startY += 10;
    if (startY > (doc.internal.pageSize.height || doc.internal.pageSize.getHeight()) - 20) { doc.addPage(); startY = 20; }
    doc.setFontSize(10); doc.text("Notas: La adherencia se calcula como (Tomas Realizadas / Tomas Programadas) * 100.", 14, startY);
    return doc;
  };

  const generateVitalSignsPDF = () => {
    const processedData = processVitalSignsData();
    if (!processedData || processedData.length === 0) return null;
    const doc = new jsPDF();
    let startY = commonPdfStyles(doc, "Reporte de Signos Vitales", {patientId: selectedPatientId, dateFrom, dateTo });
    
    const tableColumn = ['Paciente', 'Fecha', 'Hora', 'Tipo', 'Valor', 'Unidad'];
    const tableRows = processedData.map(row => [row.patientName, row.date, row.time, row.type, row.value, row.unit]);
    
    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: startY, theme: 'grid', headStyles: { fillColor: [26, 188, 156] },
      didDrawPage: data => addPdfFooter(doc, data.pageNumber, doc.getNumberOfPages())
    });
    return doc;
  };

  const generateAppointmentsPDF = () => {
    const processedData = processAppointmentsData();
    if (!processedData || processedData.length === 0) return null;
    const doc = new jsPDF();
    let startY = commonPdfStyles(doc, "Reporte de Citas", {patientId: selectedPatientId, dateFrom, dateTo });

    const tableColumn = ['Paciente', 'Doctor', 'Especialidad', 'Fecha', 'Hora', 'Estado', 'Diagnóstico'];
    const tableRows = processedData.map(row => [row.patientName, row.doctorName, row.specialty, row.date, row.time, row.status, row.diagnosis || '']);
    
    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: startY, theme: 'grid', headStyles: { fillColor: [52, 152, 219] },
      didDrawPage: data => addPdfFooter(doc, data.pageNumber, doc.getNumberOfPages())
    });
    return doc;
  };
  
  const generatePatientSummaryPDF = () => {
    if (selectedPatientId === 'all') { toast.error('Por favor, seleccione un paciente específico para generar el resumen.'); return null; }
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) { toast.error('Paciente no encontrado.'); return null; }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFontSize(20); doc.text(`Resumen del Paciente: ${patient.name}`, pageWidth / 2, yPos, { align: 'center' }); yPos += 15;
    
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, yPos);
    if (userProfile?.name) {
      doc.text(`Por: Dr(a). ${userProfile.name}`, pageWidth - 14, yPos, { align: 'right' });
    }
    yPos += 10;

    doc.setFontSize(14); doc.text("Información Demográfica", 14, yPos); yPos += 7;
    doc.setFontSize(10);
    doc.text(`Nombre: ${patient.name}`, 14, yPos); yPos += 5;
    doc.text(`Email: ${patient.email || 'N/A'}`, 14, yPos); yPos += 5;
    doc.text(`Teléfono: ${patient.phone || 'N/A'}`, 14, yPos); yPos += 5;
    doc.text(`Dirección: ${patient.address || 'N/A'}`, 14, yPos); yPos += 10;

    const patientAppointments = appointments
        .filter(a => a.patientId === selectedPatientId && a.status === 'scheduled' && new Date(a.date) >= new Date())
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3); // Próximas 3 citas

    if (patientAppointments.length > 0) {
        doc.setFontSize(14); doc.text("Próximas Citas", 14, yPos); yPos += 7;
        doc.setFontSize(10);
        patientAppointments.forEach(appt => { 
            const doctorName = doctors.find(d => d.id === appt.doctorId)?.name || 'N/A'; 
            doc.text(`- ${new Date(appt.date + "T00:00:00Z").toLocaleDateString()} a las ${appt.time} con Dr(a). ${doctorName} (${appt.specialty})`, 14, yPos); yPos += 5; 
        });
        yPos += 5;
    }
    
    const patientMedicationNames = Array.from(new Set(
        medicationIntakes
            .filter(mi => mi.patientId === selectedPatientId)
            .map(mi => mi.medication?.name)
            .filter(name => !!name) // Filtrar undefined o null
    )).slice(0, 5); // Primeros 5 medicamentos de las tomas

    if (patientMedicationNames.length > 0) {
        doc.setFontSize(14); doc.text("Medicamentos (basado en tomas recientes)", 14, yPos); yPos += 7;
        doc.setFontSize(10);
        patientMedicationNames.forEach(medName => { doc.text(`- ${medName}`, 14, yPos); yPos += 5; });
        yPos += 5;
    }

    const patientVitalSigns = vitalSigns
        .filter(vs => vs.patientId === selectedPatientId)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time))
        .slice(0, 5); // Últimos 5 signos vitales
    
    if (patientVitalSigns.length > 0) {
        doc.setFontSize(14); doc.text("Últimos Signos Vitales Registrados", 14, yPos); yPos += 7;
        const vsTableHead = [['Fecha', 'Hora', 'Tipo', 'Valor', 'Unidad']];
        const vsTableBody = patientVitalSigns.map(vs => [ new Date(vs.date + "T00:00:00Z").toLocaleDateString(), vs.time, vs.type, vs.value.toString(), vs.unit ]);
        autoTable(doc, { head: vsTableHead, body: vsTableBody, startY: yPos, theme: 'grid' });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addPdfFooter(doc, i, pageCount);
    }
    return doc;
  };

  // --- Función de Descarga (Modificada para añadir a "Recientes") ---
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
    const reportDefinition = reportTypesList.find(rt => rt.id === selectedReportType);
    if (!reportDefinition) {
        toast.error('Tipo de reporte no válido.');
        return;
    }
    if (reportDefinition.requiresPatientSelection && selectedPatientId === 'all') {
        toast.error(`El reporte "${reportDefinition.title}" requiere que seleccione un paciente específico.`);
        return;
    }

    setIsGenerating(true);
    const patientForFile = patients.find(p=>p.id === selectedPatientId);
    const patientNameForFile = selectedPatientId !== 'all' ? patientForFile?.name?.replace(/\s/g, '_') || selectedPatientId : 'general';
    let fileName = `${selectedReportType}_${patientNameForFile}_${new Date().toISOString().split('T')[0]}`;

    try {
        let fileContent: string | null = null;
        let pdfDoc: jsPDF | null = null;
        let success = false;

        switch (selectedReportType) {
            case 'medication-adherence':
                if (format === 'CSV') fileContent = generateMedicationAdherenceCSV();
                else pdfDoc = generateMedicationAdherencePDF();
                break;
            case 'vital-signs':
                if (format === 'CSV') fileContent = generateVitalSignsCSV();
                else pdfDoc = generateVitalSignsPDF();
                break;
            case 'appointments':
                if (format === 'CSV') fileContent = generateAppointmentsCSV();
                else pdfDoc = generateAppointmentsPDF();
                break;
            case 'patient-summary':
                if (format === 'PDF') pdfDoc = generatePatientSummaryPDF();
                else toast.error('El resumen del paciente solo está disponible en PDF.');
                break;
            default:
                toast.error(`La generación para "${reportDefinition.title}" aún no está implementada.`);
        }

        if (fileContent) {
          fileName += '.csv';
          downloadFile(fileContent, fileName, 'text/csv;charset=utf-8;');
          toast.success(`Reporte ${fileName} descargado.`);
          success = true;
        } else if (pdfDoc) {
          fileName += '.pdf';
          pdfDoc.save(fileName);
          toast.success(`Reporte ${fileName} descargado.`);
          success = true;
        }

        if (success) {
            const newRecentReport: GeneratedReport = {
                id: uuidv4(),
                reportTypeName: reportDefinition.title,
                fileName: fileName,
                format: format,
                generatedAt: new Date().toISOString(),
                filtersApplied: {
                    patientId: selectedPatientId !== 'all' ? selectedPatientId : null,
                    patientName: selectedPatientId !== 'all' ? patientForFile?.name || null : 'Todos',
                    dateFrom: dateFrom || null,
                    dateTo: dateTo || null,
                }
            };
            setRecentlyGeneratedReports(prev => [newRecentReport, ...prev.slice(0, 4)]);
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

  const isDownloadDisabled = useMemo(() => {
    if (isGenerating) return true;
    if (!selectedReportType) return true;
    const definition = reportTypesList.find(rt => rt.id === selectedReportType);
    if (definition?.requiresPatientSelection && selectedPatientId === 'all') return true;
    if (selectedReportType === 'medication-adherence' && loadingMedicationIntakesGlobal) return true;
    if (selectedReportType === 'vital-signs' && loadingVitalSigns) return true;
    if (selectedReportType === 'appointments' && loadingAppointments) return true;
    if (selectedReportType === 'patient-summary' && (loadingAppointments || loadingVitalSigns || loadingMedicationIntakesGlobal || (patients.length === 0 && selectedPatientId !== 'all'))) return true;
    return false;
  }, [isGenerating, selectedReportType, selectedPatientId, loadingMedicationIntakesGlobal, loadingVitalSigns, loadingAppointments, patients]);

  const handleDeleteRecentReport = (reportId: string) => {
    setRecentlyGeneratedReports(prev => prev.filter(report => report.id !== reportId));
    toast.success("Reporte eliminado de la lista de recientes.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter size={18} className="text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Filtros del Reporte</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
            <select id="report-type" value={selectedReportType} onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="" disabled>Seleccionar Tipo de Reporte</option>
              {reportTypesList.map(report => (<option key={report.id} value={report.id}>{report.title}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon size={16} className="text-gray-400" /></div>
              <select id="patient-filter" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="all">Todos los Pacientes</option>
                {patients.map(patient => (<option key={patient.id} value={patient.id}>{patient.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={16} className="text-gray-400" /></div>
              <input type="date" id="date-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
          </div>
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={16} className="text-gray-400" /></div>
              <input type="date" id="date-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Disponibles</h2>
        </div>
        <div className="p-6">
          {(loadingMedicationIntakesGlobal && selectedReportType === 'medication-adherence') ||
           (loadingVitalSigns && selectedReportType === 'vital-signs') ||
           (loadingAppointments && selectedReportType === 'appointments') ||
           (selectedReportType === 'patient-summary' && (loadingAppointments || loadingVitalSigns || loadingMedicationIntakesGlobal))
           ? (<p className="text-gray-500 text-center py-8 animate-pulse">Cargando datos para el reporte seleccionado...</p>) 
           : selectedReportType && selectedReportDefinition ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
              <div className="flex items-start">
                <div className="p-2 bg-indigo-100 rounded-full mr-4 mt-1">{selectedReportDefinition.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{selectedReportDefinition.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedReportDefinition.description}</p>
                  {selectedReportDefinition.requiresPatientSelection && selectedPatientId === 'all' && (
                     <p className="text-red-600 text-sm mt-3">Por favor, seleccione un paciente específico en los filtros para generar este reporte.</p>
                  )}
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-medium">Descargar como:</span>
                    {selectedReportDefinition.supportedFormats.includes('CSV') && (
                      <button onClick={() => handleDownload('CSV')} disabled={isDownloadDisabled}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-indigo-500 rounded-md hover:bg-indigo-100">
                        <Download size={16} /><span>CSV</span>
                      </button>
                    )}
                    {selectedReportDefinition.supportedFormats.includes('PDF') && (
                       <button onClick={() => handleDownload('PDF')} disabled={isDownloadDisabled}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 px-3 py-1.5 border border-purple-500 rounded-md hover:bg-purple-100">
                        <Download size={16} /><span>PDF</span>
                      </button>
                    )}
                  </div>
                   {isGenerating && <p className="text-sm text-gray-500 mt-2 animate-pulse">Generando reporte...</p>}
                </div>
              </div>
            </div>
          ) : (!selectedReportType && <p className="text-gray-500 text-center py-8">Seleccione un tipo de reporte de la sección de filtros para ver las opciones de descarga.</p>)}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Reportes Generados Recientemente</h2>
        </div>
        {recentlyGeneratedReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Reporte</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generado el</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filtros</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentlyGeneratedReports.map(report => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.reportTypeName}</div>
                      <div className="text-xs text-gray-500 break-all">{report.fileName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(report.generatedAt).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        report.format === 'PDF' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {report.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {`Paciente: ${report.filtersApplied.patientName || 'N/A'}`}<br/>
                        {`Desde: ${report.filtersApplied.dateFrom ? new Date(report.filtersApplied.dateFrom + "T00:00:00Z").toLocaleDateString() : 'N/A'}`}<br/>
                        {`Hasta: ${report.filtersApplied.dateTo ? new Date(report.filtersApplied.dateTo + "T00:00:00Z").toLocaleDateString() : 'N/A'}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleDeleteRecentReport(report.id)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        title="Eliminar de la lista"
                      >
                        <Trash2 size={16}/> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No hay reportes generados recientemente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

