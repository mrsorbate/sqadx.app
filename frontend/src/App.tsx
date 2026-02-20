import { Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const { token } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      
      <Route element={token ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<DashboardPage />} />
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
