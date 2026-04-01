import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ValidationRulesPage() {
  const { validationRules } = useApp();

  return (
    <>
      <div className="page-header">
        <h1>Validation Rules</h1>
        <p className="helper" style={{ margin: 0, flex: '1 1 100%' }}>
          Cross-monitor list of field validation rules (MVP wireframe).
        </p>
      </div>
      <div className="table-wrap">
        <table className="data-table" aria-label="All validation rules">
          <thead>
            <tr>
              <th scope="col">Monitor</th>
              <th scope="col">JSON Path</th>
              <th scope="col">Rule Type</th>
              <th scope="col">Expected Value</th>
              <th scope="col">Last Result</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {validationRules.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/monitors/${r.monitorId}`}>{r.monitorName}</Link>
                </td>
                <td className="mono">{r.path}</td>
                <td>{r.ruleType}</td>
                <td>{r.expected}</td>
                <td>{r.lastResult}</td>
                <td>
                  <Link className="btn btn-sm" to={`/monitors/${r.monitorId}`}>
                    Open Monitor
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
