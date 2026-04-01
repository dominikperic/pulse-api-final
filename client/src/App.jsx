import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorListPage from './pages/MonitorListPage';
import CreateMonitorPage from './pages/CreateMonitorPage';
import MonitorDetailsPage from './pages/MonitorDetailsPage';
import AddValidationRulePage from './pages/AddValidationRulePage';
import RunDetailsPage from './pages/RunDetailsPage';
import AlertsPage from './pages/AlertsPage';
import ValidationRulesPage from './pages/ValidationRulesPage';
import SettingsPage from './pages/SettingsPage';

function Protected() {
  const { authed } = useApp();
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="monitors" element={<MonitorListPage />} />
          <Route path="monitors/create" element={<CreateMonitorPage />} />
          <Route path="monitors/:monitorId/edit" element={<CreateMonitorPage />} />
          <Route path="monitors/:monitorId/rules/add" element={<AddValidationRulePage />} />
          <Route path="monitors/:monitorId/runs/:runId" element={<RunDetailsPage />} />
          <Route path="monitors/:monitorId" element={<MonitorDetailsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="validation-rules" element={<ValidationRulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
