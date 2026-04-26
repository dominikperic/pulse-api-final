import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ruleHelp = {
  'Field Exists': 'Fails if the path is missing when checking a new sample against the generated contract.',
  'Non-Null': 'Fails if the value at the path is null or absent during contract checks.',
  'Expected Type': 'Fails if the runtime type does not match the inferred OpenAPI type.',
  'Allowed Value': 'Fails if the value is not one of the pipe-separated allowed literals.',
};

export default function AddValidationRulePage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { addValidationRule, contracts } = useApp();
  const c = contracts.find((x) => x.id === contractId);

  const [path, setPath] = useState('customer.email');
  const [ruleType, setRuleType] = useState('Non-Null');
  const [expected, setExpected] = useState('');

  async function save() {
    await addValidationRule(contractId, { path, ruleType, expected });
    navigate(`/contracts/${contractId}`);
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/contracts">Contracts</Link>
        {' > '}
        {c && (
          <>
            <Link to={`/contracts/${contractId}`}>{c.name}</Link>
            {' > '}
          </>
        )}
        <span>Add Validation Rule</span>
      </div>
      <div className="two-col">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Add Validation Rule</h1>
          <p className="helper">Rules run when you check new JSON samples against the inferred OpenAPI contract.</p>
          <div className="field">
            <label htmlFor="json-path">JSON Path</label>
            <input
              id="json-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. customer.email"
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
            <button type="button" className="btn btn-primary" onClick={() => void save()}>
              Save Rule
            </button>
            <Link className="btn btn-ghost" to={c ? `/contracts/${contractId}` : '/contracts'}>
              Cancel
            </Link>
          </div>
        </div>
        <aside className="card">
          <h2 className="section-title">Example JSON path preview</h2>
          <p className="helper">Fragment aligned with inferred contract for this endpoint:</p>
          <div className="diff-box mono">
            {`{
  "customer": {
    "email": "jane@acme.com",
    "id": "cus_123"
  }
}`}
          </div>
          <p className="helper" style={{ marginTop: 8 }}>
            Path <span className="mono">{path || '(empty)'}</span> is evaluated on each uploaded sample.
          </p>
        </aside>
      </div>
    </>
  );
}
