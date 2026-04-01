import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'drift', label: 'Schema Drift' },
  { id: 'validation', label: 'Validation Failures' },
  { id: 'down', label: 'Monitor Down' },
  { id: 'resolved', label: 'Resolved' },
];

function rowClass(a) {
  if (a.resolved) return 'alert-row';
  if (a.failureType === 'Schema Drift') return 'alert-row drift';
  if (a.failureType === 'Validation Failure') return 'alert-row validation';
  if (a.failureType === 'Monitor Down') return 'alert-row down';
  return 'alert-row';
}

export default function AlertsPage() {
  const { alerts, resolveAlert } = useApp();
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => {
    const c = { all: alerts.length, drift: 0, validation: 0, down: 0, resolved: 0 };
    alerts.forEach((a) => {
      if (a.failureType === 'Schema Drift') c.drift += 1;
      if (a.failureType === 'Validation Failure') c.validation += 1;
      if (a.failureType === 'Monitor Down') c.down += 1;
      if (a.resolved) c.resolved += 1;
    });
    return c;
  }, [alerts]);

  const visible = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return a.resolved;
    if (filter === 'drift') return !a.resolved && a.failureType === 'Schema Drift';
    if (filter === 'validation') return !a.resolved && a.failureType === 'Validation Failure';
    if (filter === 'down') return !a.resolved && a.failureType === 'Monitor Down';
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1>Alerts</h1>
      </div>
      <div className="filter-bar" role="tablist" aria-label="Alert filters">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="badge badge-muted" style={{ marginLeft: 6 }}>
              {counts[f.id] ?? counts.all}
            </span>
          </button>
        ))}
      </div>

      <p className="section-title">Alert feed</p>
      {visible.length === 0 ? (
        <p className="helper">No alerts for this filter.</p>
      ) : (
        visible.map((a) => (
          <article key={a.id} className={rowClass(a)}>
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <strong>{a.monitorName}</strong>
                <span className="badge badge-warn">{a.failureType}</span>
                <span className={`badge ${a.severity === 'Critical' ? 'badge-bad' : ''}`}>{a.severity}</span>
                {a.resolved && <span className="badge badge-ok">Resolved</span>}
              </div>
              <div className="helper mono">Affected path: {a.path}</div>
              <p style={{ margin: '8px 0 0' }}>{a.summary}</p>
              <div className="helper" style={{ marginTop: 6 }}>
                Time detected: {a.time}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Link className="btn btn-sm btn-primary" to={`/monitors/${a.monitorId}`}>
                View Monitor
              </Link>
              {!a.resolved && (
                <button type="button" className="btn btn-sm" onClick={() => void resolveAlert(a.id)}>
                  Mark Resolved
                </button>
              )}
            </div>
          </article>
        ))
      )}

      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table className="data-table" aria-label="Alerts table view">
          <thead>
            <tr>
              <th scope="col">Monitor Name</th>
              <th scope="col">Failure Type</th>
              <th scope="col">Affected Field/Path</th>
              <th scope="col">Short Summary</th>
              <th scope="col">Time Detected</th>
              <th scope="col">Severity</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={`t-${a.id}`}>
                <td>{a.monitorName}</td>
                <td>{a.failureType}</td>
                <td className="mono">{a.path}</td>
                <td>{a.summary}</td>
                <td>{a.time}</td>
                <td>{a.severity}</td>
                <td>
                  <Link className="btn btn-sm" to={`/monitors/${a.monitorId}`}>
                    View Monitor
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
