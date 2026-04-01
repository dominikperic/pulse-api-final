import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function MonitorListPage({ pageTitle = 'API Monitors' }) {
  const { monitors, updateMonitorStatus } = useApp();

  const active = monitors.filter((m) => m.status !== 'Paused').length;
  const failed = monitors.filter((m) => m.status === 'Validation Failed').length;
  const drift = monitors.filter((m) => m.status === 'Drift Detected').length;
  const validationFails = monitors.filter((m) => m.status === 'Validation Failed').length;

  return (
    <>
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <Link className="btn btn-primary" to="/monitors/create">
          Create Monitor
        </Link>
      </div>

      <div className="summary-grid">
        <div className="card summary-card">
          <div className="label">Active Monitors</div>
          <div className="value">{active}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Failed Checks</div>
          <div className="value">{failed}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Schema Drift Alerts</div>
          <div className="value">{drift}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Validation Failures</div>
          <div className="value">{validationFails}</div>
        </div>
      </div>

      <p className="section-title">Monitor list</p>
      <div className="table-wrap">
        <table className="data-table" aria-label="API monitors">
          <thead>
            <tr>
              <th scope="col">Monitor Name</th>
              <th scope="col">Endpoint</th>
              <th scope="col">Status</th>
              <th scope="col">Last Check</th>
              <th scope="col">Alert Count</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {monitors.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/monitors/${m.id}`}>{m.name}</Link>
                </td>
                <td className="mono">{m.endpoint}</td>
                <td>
                  <StatusBadge status={m.status} />
                </td>
                <td>{m.lastCheck}</td>
                <td>{m.alertCount}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn btn-sm" to={`/monitors/${m.id}`}>
                      View
                    </Link>
                    <Link className="btn btn-sm" to={`/monitors/${m.id}/edit`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        void updateMonitorStatus(m.id, m.status === 'Paused' ? 'Healthy' : 'Paused');
                      }}
                    >
                      {m.status === 'Paused' ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
