import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function RunDetailsPage() {
  const { monitorId, runId } = useParams();
  const { monitors } = useApp();
  const m = monitors.find((x) => x.id === monitorId);

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/monitors">Monitors</Link>
        {' > '}
        {m && <Link to={`/monitors/${monitorId}`}>{m.name}</Link>}
        {' > '}
        <span>Run {runId}</span>
      </div>
      <div className="page-header">
        <h1>Run Details</h1>
        <Link className="btn" to={`/monitors/${monitorId}`}>
          Back to Monitor Details
        </Link>
      </div>

      <div className="run-layout">
        <div>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title">Execution</h2>
            <div className="field">
              <label>Timestamp</label>
              <div>2026-04-01 09:42:11 UTC</div>
            </div>
            <div className="field">
              <label>Endpoint</label>
              <div className="mono">{m?.endpoint ?? '—'}</div>
            </div>
            <div className="field">
              <label>Request summary</label>
              <div className="mono">
                GET /v1/customers
                <br />
                Headers: Authorization: Bearer ••••, Accept: application/json
              </div>
            </div>
            <div className="field">
              <label>HTTP status</label>
              <div>200</div>
            </div>
            <div className="field">
              <label>Raw response preview</label>
              <div className="diff-box mono">
                {`{
  "data": {
    "customer": {
      "id": "cus_abc",
      "email": null
    }
  }
}`}
              </div>
            </div>
            <div className="field">
              <label>Error message (if failed)</label>
              <div className="badge badge-bad">Validation: Non-Null failed for data.customer.email</div>
            </div>
          </section>
        </div>
        <div>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title">Schema comparison result</h2>
            <ul className="helper" style={{ paddingLeft: 18 }}>
              <li>Type change at data.customer.email: string → null (Null Regression)</li>
              <li>Missing field data.customer.metadata.tier</li>
            </ul>
          </section>
          <section className="card">
            <h2 className="section-title">Validation rule results</h2>
            <div className="table-wrap">
              <table className="data-table" aria-label="Validation results">
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col">Path</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Non-Null</td>
                    <td className="mono">data.customer.email</td>
                    <td>
                      <span className="badge badge-bad">Fail</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Field Exists</td>
                    <td className="mono">data.customer.id</td>
                    <td>
                      <span className="badge badge-ok">Pass</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
