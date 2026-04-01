import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ruleHelp = {
  'Field Exists': 'Fails if the JSON path is missing in the response.',
  'Non-Null': 'Fails if the value at the path is null or absent.',
  'Expected Type': 'Fails if the runtime type does not match (string, number, boolean, object, array).',
  'Allowed Value': 'Fails if the value is not one of the pipe-separated allowed literals.',
};

export default function AddValidationRulePage() {
  const { monitorId } = useParams();
  const navigate = useNavigate();
  const { addValidationRule, monitors } = useApp();
  const m = monitors.find((x) => x.id === monitorId);

  const [path, setPath] = useState('data.customer.email');
  const [ruleType, setRuleType] = useState('Non-Null');
  const [expected, setExpected] = useState('');

  async function save() {
    await addValidationRule(monitorId, { path, ruleType, expected });
    navigate(`/monitors/${monitorId}`);
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/monitors">Monitors</Link>
        {' > '}
        {m && (
          <>
            <Link to={`/monitors/${monitorId}`}>{m.name}</Link>
            {' > '}
          </>
        )}
        <span>Add Validation Rule</span>
      </div>
      <div className="two-col">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Add Validation Rule</h1>
          <div className="field">
            <label htmlFor="json-path">JSON Path</label>
            <input
              id="json-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. data.items[0].status"
              className="mono"
            />
          </div>
          <div className="field">
            <label htmlFor="rule-type">Rule Type</label>
            <select id="rule-type" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
              <option>Field Exists</option>
              <option>Non-Null</option>
              <option>Expected Type</option>
              <option>Allowed Value</option>
            </select>
          </div>
          <p className="helper">{ruleHelp[ruleType]}</p>
          <div className="field">
            <label htmlFor="expected">Expected Value</label>
            <input
              id="expected"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder='e.g. string, or "active"|"pending"'
            />
          </div>
          <div className="row-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save Rule
            </button>
            <Link className="btn btn-ghost" to={m ? `/monitors/${monitorId}` : '/monitors'}>
              Cancel
            </Link>
          </div>
        </div>
        <aside className="card">
          <h2 className="section-title">Example JSON path preview</h2>
          <p className="helper">Illustrative response fragment for documentation:</p>
          <div className="diff-box mono">
            {`{
  "data": {
    "customer": {
      "email": "jane@acme.com",
      "id": "cus_123"
    }
  }
}`}
          </div>
          <p className="helper" style={{ marginTop: 8 }}>
            Path <span className="mono">{path || '(empty)'}</span> resolves against each poll response.
          </p>
        </aside>
      </div>
    </>
  );
}
