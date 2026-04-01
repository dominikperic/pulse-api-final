import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const defaultForm = {
  name: '',
  description: '',
  pollingInterval: '5',
  method: 'GET',
  endpoint: '',
  authType: 'None',
  authSecret: '',
  headers: '',
  body: '',
  runTestNow: true,
  saveBaseline: true,
};

export default function CreateMonitorPage() {
  const { monitorId } = useParams();
  const isEdit = Boolean(monitorId && monitorId !== 'create');
  const navigate = useNavigate();
  const { monitors, addMonitor } = useApp();
  const existing = isEdit ? monitors.find((m) => m.id === monitorId) : null;

  const [form, setForm] = useState(() =>
    existing
      ? {
          ...defaultForm,
          name: existing.name,
          description: existing.description,
          endpoint: existing.endpoint,
          method: existing.method,
          pollingInterval: '5',
        }
      : defaultForm
  );
  const [testPanel, setTestPanel] = useState({
    status: 'Idle',
    httpCode: '—',
    preview: 'Run “Test Monitor” to see response preview.',
    error: '',
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function runTest() {
    setTestPanel({
      status: form.endpoint ? 'Success' : 'Error',
      httpCode: form.endpoint ? '200' : '—',
      preview: form.endpoint
        ? '{\n  "data": {\n    "customer": {\n      "id": "cus_abc",\n      "email": null\n    }\n  }\n}'
        : '',
      error: form.endpoint ? '' : 'Endpoint URL is required for test request.',
    });
  }

  async function saveMonitor() {
    await addMonitor({
      name: form.name || 'Untitled Monitor',
      description: form.description,
      endpoint: form.endpoint || 'https://api.example.com/unknown',
      method: form.method,
      pollingInterval: `${form.pollingInterval} min`,
      pollingIntervalLabel: `Every ${form.pollingInterval} minutes`,
      lastCheck: 'Just now',
      baselineEstablished: form.saveBaseline,
      status: 'Healthy',
    });
    navigate('/monitors');
  }

  return (
    <>
    <div className="page-header" style={{ marginBottom: 16 }}>
      <div>
        <h1>{isEdit ? 'Edit Monitor' : 'Create Monitor'}</h1>
        <p className="breadcrumb" style={{ margin: 0 }}>
          <Link to="/dashboard">Dashboard</Link>
          {' / '}
          <Link to="/monitors">Monitors</Link>
          {' / '}
          <span>{isEdit ? 'Edit' : 'New'}</span>
        </p>
      </div>
      <Link className="btn btn-ghost" to="/monitors">
        Back to list
      </Link>
    </div>
    <div className="two-col">
      <div>
        <section className="form-section" aria-labelledby="sec-basic">
          <h2 id="sec-basic">Section A: Basic Information</h2>
          <div className="field">
            <label htmlFor="mon-name">Monitor Name</label>
            <input
              id="mon-name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Stripe Customer Sync"
            />
          </div>
          <div className="field">
            <label htmlFor="mon-desc">Description</label>
            <textarea
              id="mon-desc"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What this endpoint is for"
            />
          </div>
          <div className="field">
            <label htmlFor="poll">Polling Interval</label>
            <select
              id="poll"
              value={form.pollingInterval}
              onChange={(e) => setField('pollingInterval', e.target.value)}
              aria-label="Polling interval"
            >
              <option value="1">Every 1 minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 60 minutes</option>
            </select>
          </div>
        </section>

        <section className="form-section" aria-labelledby="sec-req">
          <h2 id="sec-req">Section B: Request Configuration</h2>
          <div className="field">
            <label htmlFor="method">HTTP Method</label>
            <select
              id="method"
              value={form.method}
              onChange={(e) => setField('method', e.target.value)}
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="url">Endpoint URL</label>
            <input
              id="url"
              value={form.endpoint}
              onChange={(e) => setField('endpoint', e.target.value)}
              placeholder="https://api.vendor.com/v1/resource"
            />
          </div>
          <div className="field">
            <label htmlFor="auth">Authentication Type</label>
            <select
              id="auth"
              value={form.authType}
              onChange={(e) => setField('authType', e.target.value)}
            >
              <option>None</option>
              <option>API Key (header)</option>
              <option>Bearer Token</option>
              <option>Basic Auth</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="secret">API Key / Bearer Token</label>
            <input
              id="secret"
              type="password"
              value={form.authSecret}
              onChange={(e) => setField('authSecret', e.target.value)}
              placeholder="Stored encrypted (prototype)"
            />
          </div>
          <div className="field">
            <label htmlFor="headers">Optional Headers (key: value per line)</label>
            <textarea
              id="headers"
              value={form.headers}
              onChange={(e) => setField('headers', e.target.value)}
              placeholder={'Accept: application/json\nX-Custom: value'}
            />
          </div>
          <div className="field">
            <label htmlFor="body">Optional Request Body (JSON)</label>
            <textarea id="body" value={form.body} onChange={(e) => setField('body', e.target.value)} placeholder="{}" />
          </div>
        </section>

        <section className="form-section" aria-labelledby="sec-val">
          <h2 id="sec-val">Section C: Validation / Setup</h2>
          <div className="checkbox-field">
            <input
              id="run-now"
              type="checkbox"
              checked={form.runTestNow}
              onChange={(e) => setField('runTestNow', e.target.checked)}
            />
            <label htmlFor="run-now" style={{ margin: 0 }}>
              Run test request now
            </label>
          </div>
          <div className="checkbox-field">
            <input
              id="baseline"
              type="checkbox"
              checked={form.saveBaseline}
              onChange={(e) => setField('saveBaseline', e.target.checked)}
            />
            <label htmlFor="baseline" style={{ margin: 0 }}>
              Save first successful JSON response as baseline
            </label>
          </div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={runTest}>
              Test Monitor
            </button>
            {!isEdit && (
              <button type="button" className="btn btn-primary" onClick={saveMonitor}>
                Save Monitor
              </button>
            )}
            {isEdit && (
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/monitors/${monitorId}`)}>
                Save Changes
              </button>
            )}
            <Link className="btn btn-ghost" to="/monitors">
              Cancel
            </Link>
          </div>
        </section>
      </div>

      <aside className="card" aria-labelledby="test-panel-title">
        <h2 id="test-panel-title" className="section-title">
          Section D: Test Result Panel
        </h2>
        <div className="field">
          <label>Test Status</label>
          <div className="badge">{testPanel.status}</div>
        </div>
        <div className="field">
          <label>HTTP Status Code</label>
          <div>{testPanel.httpCode}</div>
        </div>
        <div className="field">
          <label>Response Preview</label>
          <div className="diff-box mono">{testPanel.preview}</div>
        </div>
        {testPanel.error && (
          <div className="field">
            <label>Setup Error Message</label>
            <div className="badge badge-bad">{testPanel.error}</div>
          </div>
        )}
      </aside>
    </div>
    </>
  );
}
