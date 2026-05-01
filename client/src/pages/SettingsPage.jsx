import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadUserSettings, saveUserSettings } from '../lib/userSettings.js';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { authUser } = useApp();
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState(DEFAULT_SETTINGS.organization);
  const [tz, setTz] = useState(DEFAULT_SETTINGS.tz);
  const [exportFmt, setExportFmt] = useState(DEFAULT_SETTINGS.exportFmt);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const initial = loadUserSettings();
    setEmail(authUser?.email || '');
    setOrganization(initial.organization);
    setTz(initial.tz);
    setExportFmt(initial.exportFmt);
  }, [authUser?.email]);

  function handleSaveSettings() {
    const next = {
      email: String(authUser?.email || '').trim(),
      organization: String(organization || '').trim(),
      tz,
      exportFmt,
    };
    saveUserSettings(next);
    setEmail(next.email);
    setSaveMessage('Settings saved.');
  }

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      <div className="settings-grid">
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Profile</h2>
          <div className="field">
            <label htmlFor="profile-email">Work email</label>
            <input id="profile-email" type="email" value={email} disabled readOnly />
          </div>
          <div className="field">
            <label htmlFor="org">Organization name</label>
            <input
              id="org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Provide an organization name within the text box"
            />
            <p className="helper">Provide an organization name within the text box.</p>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">OpenAPI export preferences</h2>
          <div className="field">
            <label htmlFor="export-fmt">Default OpenAPI export</label>
            <select id="export-fmt" value={exportFmt} onChange={(e) => setExportFmt(e.target.value)}>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Timezone</h2>
          <div className="field">
            <label htmlFor="tz">Timezone</label>
            <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </select>
          </div>
          <p className="helper">Timestamps for imports and spec generation use this timezone.</p>
        </section>

        <button type="button" className="btn btn-primary" onClick={handleSaveSettings}>
          Save Settings
        </button>
        {saveMessage && (
          <p className="helper" role="status" style={{ marginTop: 8 }}>
            {saveMessage}
          </p>
        )}
      </div>
    </>
  );
}
