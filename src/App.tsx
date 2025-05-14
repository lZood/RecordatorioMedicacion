import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Medications from './pages/Medications';
import Appointments from './pages/Appointments';
import VitalSigns from './pages/VitalSigns';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Layout from './components/Layout';
import PatientDetails from './pages/PatientDetails';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import MedicationDetails from './pages/MedicationDetails';

function App() {
  return (
    <AppProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas comienzan aquí */}
          <Route element={<ProtectedRoute />}>
            {/* Layout principal para todas las rutas protegidas */}
            <Route path="/" element={<Layout />}>
              {/* Rutas hijas que se renderizarán dentro del Outlet del Layout */}
              <Route index element={<Dashboard />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientDetails />} />
              <Route path="medications" element={<Medications />} />
              <Route path="medications/:id" element={<MedicationDetails />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="vitals" element={<VitalSigns />} />
              <Route path="reports" element={<Reports />} />
              {/* Otras rutas protegidas dentro de Layout pueden ir aquí */}
            </Route> {/* Cierre de la ruta del Layout */}
          </Route> {/* Cierre de la ruta protegida principal */}

        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;