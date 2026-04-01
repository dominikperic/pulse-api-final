import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function DashboardLayout() {
  const { signOut, loadError, refreshWorkspace } = useApp();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-label">Navigate</div>
        <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/monitors" className={({ isActive }) => (isActive ? 'active' : '')}>
          Monitors
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Alerts
        </NavLink>
        <NavLink to="/validation-rules" className={({ isActive }) => (isActive ? 'active' : '')}>
          Validation Rules
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          Settings
        </NavLink>
      </aside>
      <div className="main-col">
        <header className="topnav">
          <NavLink className="topnav-brand" to="/monitors">
            PulseAPI
          </NavLink>
          <nav className="topnav-links" aria-label="Top navigation">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              Dashboard
            </NavLink>
            <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
              Alerts
            </NavLink>
            <NavLink to="/monitors" className={({ isActive }) => (isActive ? 'active' : '')}>
              Monitors
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              Settings
            </NavLink>
          </nav>
          <div className="topnav-user">
            <span className="badge badge-muted" title="User menu (prototype)">
              Alex Engineer ▾
            </span>{' '}
            <button type="button" className="link" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="page">
          {loadError && (
            <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)' }} role="alert">
              <strong>Data load failed.</strong> {loadError}{' '}
              <button type="button" className="link" onClick={() => refreshWorkspace()}>
                Retry
              </button>
              <p className="helper" style={{ margin: '8px 0 0' }}>
                Using live API mode? Start the Express server and check <span className="mono">VITE_API_URL</span> / proxy
                settings in <span className="mono">client/.env.development</span>.
              </p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
