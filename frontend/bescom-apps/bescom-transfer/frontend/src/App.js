import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth
import Landing    from './pages/auth/Landing';
import Login      from './pages/auth/Login';
import OfficeLogin from './pages/auth/OfficeLogin';
import Register   from './pages/auth/Register';

// Employee
import Dashboard         from './pages/employee/Dashboard';
import ApplyTransfer     from './pages/employee/ApplyTransfer';
import MyApplications    from './pages/employee/MyApplications';
import ApplicationDetail from './pages/employee/ApplicationDetail';
import Profile           from './pages/employee/Profile';

// HR
import HRDashboard   from './pages/hr/HRDashboard';
import CycleManager  from './pages/hr/CycleManager';
import MeritList     from './pages/hr/MeritList';
import VacanciesView from './pages/hr/VacanciesView';

// Admin
import UserManagement from './pages/admin/UserManagement';

// Office
import OfficeDashboard from './pages/office/OfficeDashboard';

// Smart root redirect based on auth state and role
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)                          return <Navigate to="/home" replace />;
  if (user.role === 'hr_corporate')   return <Navigate to="/hr/dashboard" replace />;
  if (user.role === 'office_admin')   return <Navigate to="/office/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

const NotFound = () => (
  <div style={{ textAlign:'center', padding:'80px 20px' }}>
    <p style={{ fontSize:'48px', marginBottom:'16px' }}>🔍</p>
    <h2 style={{ color:'#2c2c2a', marginBottom:'8px' }}>Page not found</h2>
    <a href="/" style={{ color:'#534AB7', fontWeight:'500' }}>← Go home</a>
  </div>
);

const Forbidden = () => (
  <div style={{ textAlign:'center', padding:'80px 20px' }}>
    <p style={{ fontSize:'48px', marginBottom:'16px' }}>🚫</p>
    <h2 style={{ color:'#2c2c2a', marginBottom:'8px' }}>Access Forbidden</h2>
    <p style={{ color:'#888780', marginBottom:'20px' }}>You don't have permission to view this page.</p>
    <a href="/" style={{ color:'#534AB7', fontWeight:'500' }}>← Go home</a>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root — smart redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public auth pages */}
          <Route path="/home"         element={<Landing />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/office-login" element={<OfficeLogin />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/unauthorized" element={<Layout><Forbidden /></Layout>} />

          {/* Employee */}
          <Route path="/dashboard"      element={<ProtectedRoute roles={['employee']}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/apply"          element={<ProtectedRoute roles={['employee']}><Layout><ApplyTransfer /></Layout></ProtectedRoute>} />
          <Route path="/my-applications" element={<ProtectedRoute roles={['employee']}><Layout><MyApplications /></Layout></ProtectedRoute>} />
          <Route path="/application/:id" element={<ProtectedRoute roles={['employee','hr_corporate']}><Layout><ApplicationDetail /></Layout></ProtectedRoute>} />
          <Route path="/profile"        element={<ProtectedRoute roles={['employee']}><Layout><Profile /></Layout></ProtectedRoute>} />

          {/* HR */}
          <Route path="/hr/dashboard"  element={<ProtectedRoute roles={['hr_corporate']}><Layout><HRDashboard /></Layout></ProtectedRoute>} />
          <Route path="/hr/cycles"     element={<ProtectedRoute roles={['hr_corporate']}><Layout><CycleManager /></Layout></ProtectedRoute>} />
          <Route path="/hr/merit-list" element={<ProtectedRoute roles={['hr_corporate']}><Layout><MeritList /></Layout></ProtectedRoute>} />
          <Route path="/hr/vacancies"  element={<ProtectedRoute roles={['hr_corporate']}><Layout><VacanciesView /></Layout></ProtectedRoute>} />
          <Route path="/hr/users"      element={<ProtectedRoute roles={['hr_corporate']}><Layout><UserManagement /></Layout></ProtectedRoute>} />

          {/* Office Admin */}
          <Route path="/office/dashboard" element={<ProtectedRoute roles={['office_admin']}><Layout><OfficeDashboard /></Layout></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
        <Toaster position="top-right" toastOptions={{ duration:4000, style:{ borderRadius:'10px', fontSize:'14px' } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
