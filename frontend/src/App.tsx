import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EventCreatePage from './pages/EventCreatePage';
import TeamsPage from './pages/TeamsPage';
import TeamPage from './pages/TeamPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import StatsPage from './pages/StatsPage';
import InvitePage from './pages/InvitePage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import SetupWizardPage from './pages/SetupWizardPage';
import { settingsAPI } from './lib/api';
import { useDarkMode } from './hooks/useDarkMode';

interface Organization {
  id: number;
  name: string;
  logo?: string;
  timezone: string;
  setup_completed: number;
}

function App() {
  const { token } = useAuthStore();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [setupCompleted, setSetupCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  useDarkMode(); // Initialize dark mode

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await settingsAPI.getOrganization();
        if (response.data) {
          setOrganization(response.data);
          const isSetupComplete = response.data.setup_completed === 1;
          setSetupCompleted(isSetupComplete);
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error);
        // Default to setup incomplete if fetch fails
        setSetupCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOrganization();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      
      {/* Setup wizard - only for admins who haven't completed setup */}
      <Route
        path="/setup"
        element={
          token && !setupCompleted ? (
            <SetupWizardPage />
          ) : (
            <Navigate to="/" />
          )
        }
      />

      <Route element={token ? <Layout organization={organization} /> : <Navigate to="/login" />}>
        <Route path="/" element={!setupCompleted ? <Navigate to="/setup" /> : <DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<EventCreatePage />} />
        <Route path="/teams/:id" element={<TeamPage />} />
        <Route path="/teams/:id/events" element={<EventsPage />} />
        <Route path="/teams/:id/events/new" element={<EventCreatePage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/teams/:id/stats" element={<StatsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
