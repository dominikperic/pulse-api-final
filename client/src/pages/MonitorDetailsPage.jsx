import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { schemaDriftItems, runHistoryM1 } from '../services/mock/fixtures';

export default function MonitorDetailsPage() {
  const { monitorId } = useParams();
  const { monitors, validationRules } = useApp();
  const m = monitors.find((x) => x.id === monitorId);

  const mergedRules = validationRules.filter((r) => r.monitorId === monitorId);
  const isStripe = monitorId === 'm1';
  const drift = isStripe ? schemaDriftItems : [];
  const history = isStripe ? runHistoryM1 : [];

  if (!m) {
    return (
      <p>
        Monitor not found. <Link to="/monitors">Back to Monitors</Link>
      </p>
    );
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/monitors">Monitors</Link>
        {' > '}
        <span>{m.name}</span>
      </div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {m.name}
            <StatusBadge status={m.status} />
          </h1>
          <p className="mono" style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
            {m.endpoint}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn" to={`/monitors/${monitorId}/edit`}>
            Edit Monitor
          </Link>
          <button type="button" className="btn">
            Run Now
          </button>
          <Link className="btn btn-primary" to={`/monitors/${monitorId}/rules/add`}>
            Add Validation Rule
          </Link>
          <button type="button" className="btn">
            Pause Monitor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="section-title">Monitor metadata</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          <div>
            <label>Polling interval</label>
            <div>{m.pollingInterval}</div>
          </div>
          <div>
            <label>Last run</label>
            <div>{m.lastCheck}</div>
          </div>
          <div>
            <label>Baseline established</label>
            <div>{m.baselineEstablished ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="recent-run">
        <h2 id="recent-run" className="section-title">
          A. Recent Run Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
          <div>
            <label>HTTP status</label>
            <div>200</div>
          </div>
          <div>
            <label>Pass / fail</label>
            <div>{isStripe ? 'Fail' : 'Pass'}</div>
          </div>
          <div>
            <label>Drift detected</label>
            <div>{isStripe ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <label>Validation status</label>
            <div>{isStripe ? 'Failed (1 rule)' : 'All passed'}</div>
          </div>
        </div>
        <p className="helper" style={{ marginTop: 12 }}>
          Summary:{' '}
          {isStripe
            ? 'Response matched HTTP OK but schema drift and Non-Null validation failed on data.customer.email.'
            : 'Latest scheduled check completed successfully.'}
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="schema-drift">
        <h2 id="schema-drift" className="section-title">
          B. Schema Drift Summary
        </h2>
        {drift.length === 0 ? (
          <p className="helper">No drift detected on last run (or sample data not loaded for this monitor).</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {drift.map((d) => (
              <li key={d.path} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ marginBottom: 8 }}>
                  <span className="badge badge-warn">{d.label}</span>{' '}
                  <span className="mono">{d.path}</span>
                </div>
                <div className="diff-grid">
                  <div>
                    <label>Baseline value</label>
                    <div className="diff-box">{d.baseline}</div>
                  </div>
                  <div>
                    <label>Current value</label>
                    <div className="diff-box">{d.current}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: 16 }} aria-labelledby="rules-panel">
        <h2 id="rules-panel" className="section-title">
          C. Validation Rules Panel
        </h2>
        <div className="table-wrap">
          <table className="data-table" aria-label="Validation rules for this monitor">
            <thead>
              <tr>
                <th scope="col">JSON Path</th>
                <th scope="col">Rule Type</th>
                <th scope="col">Expected Value</th>
                <th scope="col">Last Result</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mergedRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="helper">
                    No validation rules yet. Use &quot;Add Validation Rule&quot; to define checks for critical fields.
                  </td>
                </tr>
              ) : (
                mergedRules.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.path}</td>
                    <td>{r.ruleType}</td>
                    <td>{r.expected}</td>
                    <td>
                      <span className={r.lastResult === 'Fail' ? 'badge badge-bad' : 'badge badge-ok'}>{r.lastResult}</span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="run-history">
        <h2 id="run-history" className="section-title">
          D. Run History
        </h2>
        <div className="table-wrap">
          <table className="data-table" aria-label="Run history">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">HTTP Status</th>
                <th scope="col">Result</th>
                <th scope="col">Drift</th>
                <th scope="col">Validation</th>
                <th scope="col">View Details</th>
              </tr>
            </thead>
            <tbody>
              {(history.length ? history : [{ id: 'sample', ts: m.lastCheck, http: '—', result: '—', drift: '—', validation: '—' }]).map(
                (row) => (
                  <tr key={row.id}>
                    <td>{row.ts}</td>
                    <td>{row.http}</td>
                    <td>{row.result}</td>
                    <td>{row.drift}</td>
                    <td>{row.validation}</td>
                    <td>
                      <Link className="btn btn-sm" to={`/monitors/${monitorId}/runs/${row.id}`}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
