import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadUserSettings, saveUserSettings } from '../lib/userSettings.js';

export default function SettingsPage() {
  const [email, setEmail] = useState(DEFAULT_SETTINGS.email);
  const [organization, setOrganization] = useState(DEFAULT_SETTINGS.organization);
  const [notifyEmail, setNotifyEmail] = useState(DEFAULT_SETTINGS.notifyEmail);
  const [notifySlack, setNotifySlack] = useState(DEFAULT_SETTINGS.notifySlack);
  const [tz, setTz] = useState(DEFAULT_SETTINGS.tz);
  const [exportFmt, setExportFmt] = useState(DEFAULT_SETTINGS.exportFmt);
  const [typeOutput, setTypeOutput] = useState(DEFAULT_SETTINGS.typeOutput);
  const [typeStrictness, setTypeStrictness] = useState(DEFAULT_SETTINGS.typeStrictness);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const initial = loadUserSettings();
    setEmail(initial.email);
    setOrganization(initial.organization);
    setNotifyEmail(Boolean(initial.notifyEmail));
    setNotifySlack(Boolean(initial.notifySlack));
    setTz(initial.tz);
    setExportFmt(initial.exportFmt);
    setTypeOutput(initial.typeOutput);
    setTypeStrictness(initial.typeStrictness);
  }, []);

  function handleSaveSettings() {
    const next = {
      email: String(email || '').trim(),
      organization: String(organization || '').trim(),
      notifyEmail,
      notifySlack,
      tz,
      exportFmt,
      typeOutput,
      typeStrictness,
    };
    saveUserSettings(next);
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
            <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="org">Organization name</label>
            <input id="org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Review notifications</h2>
          <div className="checkbox-field">
            <input id="n-email" type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            <label htmlFor="n-email" style={{ margin: 0 }}>
              Email when new inference warnings are detected
            </label>
          </div>
          <div className="checkbox-field">
            <input id="n-slack" type="checkbox" checked={notifySlack} onChange={(e) => setNotifySlack(e.target.checked)} />
            <label htmlFor="n-slack" style={{ margin: 0 }}>
              Slack webhook for schema review queue updates
            </label>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Schema inference strictness</h2>
          <div className="field">
            <label htmlFor="strict">Strictness (mock)</label>
            <select id="strict" value={typeStrictness} onChange={(e) => setTypeStrictness(e.target.value)}>
              <option value="conservative">Conservative — keep more optional/null unions</option>
              <option value="loose">Loose — prefer optional fields</option>
              <option value="balanced">Balanced</option>
              <option value="strict">Aggressive — promote frequent keys to required</option>
            </select>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Typing / hardening output</h2>
          <div className="field">
            <label htmlFor="type-output">Preferred output</label>
            <select id="type-output" value={typeOutput} onChange={(e) => setTypeOutput(e.target.value)}>
              <option value="typescript">TypeScript models</option>
              <option value="zod">Zod runtime schemas</option>
              <option value="both">Both TypeScript + Zod</option>
            </select>
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
