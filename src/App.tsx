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

function App() {
  return (
    <AppProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="medications" element={<Medications />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="vitals" element={<VitalSigns />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;