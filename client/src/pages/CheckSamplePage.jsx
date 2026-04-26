import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { stringify } from 'yaml';
import { useApp } from '../context/AppContext';
import SwaggerBridgePanel from '../components/SwaggerBridgePanel.jsx';

export default function CheckSamplePage() {
  const { contractId } = useParams();
  const { contracts } = useApp();
  const c = contracts.find((x) => x.id === contractId);
  const [format, setFormat] = useState('yaml');
  const specYaml = useMemo(() => (c?.openApiDocument ? stringify(c.openApiDocument) : ''), [c]);
  const specJson = useMemo(
    () => (c?.openApiDocument ? JSON.stringify(c.openApiDocument, null, 2) : ''),
    [c]
  );

  if (!c) {
    return (
      <p>
        Contract not found. <Link to="/contracts">Back</Link>
      </p>
    );
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/contracts">Contracts</Link>
        {' > '}
        <Link to={`/contracts/${contractId}`}>{c.name}</Link>
        {' > '}
        <span>Swagger bridge</span>
      </div>
      <div className="page-header">
        <h1>Swagger Bridge</h1>
        <Link className="btn" to={`/contracts/${contractId}`}>
          Back to contract
        </Link>
      </div>

      <p className="helper" style={{ marginBottom: 16, maxWidth: 720 }}>
        Open this generated OpenAPI document in SwaggerHub (primary), use Swagger Editor as fallback, preview it inside
        PulseAPI, or export JSON/YAML for downstream tooling.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">OpenAPI Export Preview</h2>
        <div className="row-actions" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`btn btn-sm ${format === 'yaml' ? 'btn-primary' : ''}`}
            onClick={() => setFormat('yaml')}
          >
            YAML
          </button>
          <button
            type="button"
            className={`btn btn-sm ${format === 'json' ? 'btn-primary' : ''}`}
            onClick={() => setFormat('json')}
          >
            JSON
          </button>
        </div>
        <pre className="diff-box mono" style={{ maxHeight: 260, overflow: 'auto', margin: 0, fontSize: 11 }}>
          {format === 'yaml' ? specYaml || '—' : specJson || '—'}
        </pre>
      </div>

      <section className="card">
        <h2 className="section-title">Swagger Handoff</h2>
        <SwaggerBridgePanel contract={c} />
      </section>
    </>
  );
}
