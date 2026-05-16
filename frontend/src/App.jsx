import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
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

// Root pages where back should prompt exit instead of navigating back
const ROOT_PATHS = ['/', '/login'];

function AndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const exitPressedRef = useRef(false);

  useEffect(() => {
    const handleBackButton = (e) => {
      // Prevent default Capacitor behaviour (which closes the app)
      if (e && e.preventDefault) e.preventDefault();

      const isRootPage = ROOT_PATHS.includes(location.pathname);

      if (!isRootPage) {
        // Navigate back within the app
        navigate(-1);
        return;
      }

      // On root pages: double-press to exit
      if (exitPressedRef.current) {
        // Second press — actually exit via Capacitor bridge
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
          window.Capacitor.Plugins.App.exitApp();
        } else if (navigator.app && navigator.app.exitApp) {
          navigator.app.exitApp();
        }
        return;
      }

      exitPressedRef.current = true;
      toast('Press back again to exit', { duration: 2000, icon: '📱' });
      setTimeout(() => { exitPressedRef.current = false; }, 2000);
    };

    // Capacitor bridges the Android hardware back button as a 'backbutton' DOM event
    document.addEventListener('backbutton', handleBackButton, false);
    return () => document.removeEventListener('backbutton', handleBackButton, false);
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 13 } }} />
        <BrowserRouter>
          <AndroidBackHandler />
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
      </NotificationProvider>
    </AuthProvider>
  );
}
