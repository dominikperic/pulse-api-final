import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SETTINGS_UPDATED_EVENT, buildUserDisplayName, loadUserSettings } from '../../lib/userSettings.js';

export default function DashboardLayout() {
  const { signOut, loadError, refreshWorkspace } = useApp();
  const [userLabel, setUserLabel] = useState(() => buildUserDisplayName(loadUserSettings()));

  useEffect(() => {
    function syncUserLabel() {
      setUserLabel(buildUserDisplayName(loadUserSettings()));
    }
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncUserLabel);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, syncUserLabel);
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <NavLink to="/dashboard" className="sidebar-brand" aria-label="PulseAPI home">
          <img src="/pulseapi-logo.png" alt="PulseAPI" className="sidebar-brand-logo" />
        </NavLink>
        <div className="sidebar-label">Navigate</div>
        <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/contracts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Contracts
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Review Queue
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          Settings
        </NavLink>
      </aside>
      <div className="main-col">
        <header className="topnav">
          <div className="topnav-brand-wrap">
            <NavLink className="topnav-brand" to="/contracts">
              PulseAPI
            </NavLink>
            <span className="topnav-subtitle">Contract intelligence for existing API traffic</span>
          </div>
          <div className="topnav-user">
            <span className="badge badge-muted" title="Signed-in user">
              {userLabel}
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
