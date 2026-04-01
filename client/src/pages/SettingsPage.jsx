import { useState } from 'react';

export default function SettingsPage() {
  const [email, setEmail] = useState('alex@acme.dev');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlack, setNotifySlack] = useState(false);
  const [tz, setTz] = useState('UTC');
  const [defaultPoll, setDefaultPoll] = useState('5');

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
            <input id="org" type="text" defaultValue="Acme Engineering" />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Notification preferences</h2>
          <div className="checkbox-field">
            <input id="n-email" type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            <label htmlFor="n-email" style={{ margin: 0 }}>
              Email on failed checks and new drift
            </label>
          </div>
          <div className="checkbox-field">
            <input id="n-slack" type="checkbox" checked={notifySlack} onChange={(e) => setNotifySlack(e.target.checked)} />
            <label htmlFor="n-slack" style={{ margin: 0 }}>
              Slack webhook (configure in production)
            </label>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">API credential management</h2>
          <p className="helper">
            Monitor credentials are scoped per workspace. Rotate keys from each monitor&apos;s edit screen. Production would
            offer vault-backed secrets (prototype note only).
          </p>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Billing</h2>
          <p className="helper">Placeholder — plan: Prototype / Wireframe tier. No charges in MVP mockup.</p>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Timezone & polling defaults</h2>
          <div className="field">
            <label htmlFor="tz">Timezone</label>
            <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="def-poll">Default polling interval for new monitors</label>
            <select id="def-poll" value={defaultPoll} onChange={(e) => setDefaultPoll(e.target.value)}>
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </div>
        </section>

        <button type="button" className="btn btn-primary">
          Save Settings
        </button>
      </div>
    </>
  );
}
