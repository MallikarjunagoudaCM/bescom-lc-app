import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LCListPage from './pages/LCListPage';
import LCDetailPage from './pages/LCDetailPage';
import UsersPage from './pages/UsersPage';
import AdminPage from './pages/AdminPage';
import RegisterPage from './pages/RegisterPage';
import NotificationsPage from './pages/NotificationsPage';
import Layout from './components/common/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 13 } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="lc" element={<LCListPage />} />
            <Route path="lc/:id" element={<LCDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
