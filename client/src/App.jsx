import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import DashboardPage from './pages/DashboardPage';
import ContractListPage from './pages/ContractListPage';
import ImportSamplesPage from './pages/ImportSamplesPage';
import ContractDetailsPage from './pages/ContractDetailsPage';
import CheckSamplePage from './pages/CheckSamplePage';
import ContractTypesPage from './pages/ContractTypesPage';
import AlertsPage from './pages/AlertsPage';
import ValidationRulesPage from './pages/ValidationRulesPage';
import SettingsPage from './pages/SettingsPage';

function Protected() {
  const { authed, authReady } = useApp();
  if (!authReady) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Legacy bookmarks from early prototype builds. */
function LegacyMonitorsRedirect() {
  const { pathname, search } = useLocation();
  let next = pathname.replace(/^\/monitors/, '/contracts');
  if (next === '/contracts/create') next = '/contracts/import';
  next = next.replace(/\/runs\//, '/check/');
  return <Navigate to={`${next}${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create-account" element={<CreateAccountPage />} />
      <Route path="/monitors/*" element={<LegacyMonitorsRedirect />} />
      <Route element={<Protected />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="contracts" element={<ContractListPage />} />
          <Route path="contracts/import" element={<ImportSamplesPage />} />
          <Route path="contracts/:contractId/edit" element={<ImportSamplesPage />} />
          <Route path="contracts/:contractId/check" element={<CheckSamplePage />} />
          <Route path="contracts/:contractId/types" element={<ContractTypesPage />} />
          <Route path="contracts/:contractId/checks/:checkId" element={<Navigate to="/contracts" replace />} />
          <Route path="contracts/:contractId/rules/add" element={<Navigate to="/contracts" replace />} />
          <Route path="contracts/:contractId" element={<ContractDetailsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="validation-rules" element={<ValidationRulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
