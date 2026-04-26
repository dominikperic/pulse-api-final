import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function SampleCheckDetailsPage() {
  const { contractId, checkId } = useParams();
  const { contracts } = useApp();
  const c = contracts.find((x) => x.id === contractId);
  const entry = c?.sampleHistory?.find((h) => h.id === checkId);
  const cr = entry?.checkResult;
  const op = cr?.liveOperational;

  if (!c) {
    return (
      <p>
        Contract not found. <Link to="/contracts">Back</Link>
      </p>
    );
  }

  if (!entry || !cr) {
    return (
      <p>
        Check not found. <Link to={`/contracts/${contractId}`}>Back to contract</Link>
      </p>
    );
  }

  const isLive = entry.checkKind === 'live';

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/contracts">Contracts</Link>
        {' > '}
        <Link to={`/contracts/${contractId}`}>{c.name}</Link>
        {' > '}
        <span>Check {checkId}</span>
      </div>
      <div className="page-header">
        <h1>{isLive ? 'Live endpoint check' : 'Sample check'} / diff details</h1>
        <Link className="btn" to={`/contracts/${contractId}`}>
          Back to Contract Details
        </Link>
      </div>

      <div className="run-layout">
        <div>
          {isLive && op && (
            <section className="card" style={{ marginBottom: 16 }}>
              <h2 className="section-title">Operational result</h2>
              <div className="field">
                <label>Success</label>
                <div>{op.ok ? 'Yes' : 'No'}</div>
              </div>
              <div className="field">
                <label>HTTP status</label>
                <div className="mono">{op.statusCode ?? '—'}</div>
              </div>
              <div className="field">
                <label>Latency</label>
                <div>{entry.latencyMs != null ? `${entry.latencyMs} ms` : '—'}</div>
              </div>
              <div className="field">
                <label>Expected status match</label>
                <div>{op.expectedStatusMatch === true ? 'Yes' : op.expectedStatusMatch === false ? 'No' : '—'}</div>
              </div>
              {op.message && (
                <div className="field">
                  <label>Error</label>
                  <div className="badge badge-bad">{op.message}</div>
                </div>
              )}
              {cr.requestMeta && (
                <div className="field">
                  <label>Request</label>
                  <pre className="diff-box mono" style={{ fontSize: 10, margin: 0 }}>
                    {JSON.stringify(cr.requestMeta, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          )}

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title">Endpoint &amp; payload</h2>
            <div className="field">
              <label>Endpoint</label>
              <div className="mono">
                {c.method} {c.path}
              </div>
            </div>
            <div className="field">
              <label>Check kind / status</label>
              <div>
                {entry.checkKind === 'live' ? 'Live check' : entry.checkKind === 'paste' ? 'Paste sample' : entry.sampleType}{' '}
                · HTTP {entry.http}
              </div>
            </div>
            <div className="field">
              <label>Response preview</label>
              <pre className="diff-box mono" style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                {(cr.responseBodyPreview || cr.samplePreview || '').slice(0, 4000)}
              </pre>
            </div>
          </section>

          {isLive && cr.proposedExampleResponse != null && (
            <section className="card" style={{ marginBottom: 16 }}>
              <h2 className="section-title">Proposed update (from check)</h2>
              <ul className="helper" style={{ paddingLeft: 18 }}>
                {(cr.proposalSummary || []).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <pre className="diff-box mono" style={{ fontSize: 10, marginTop: 8 }}>
                {JSON.stringify(cr.proposedExampleResponse, null, 2)}
              </pre>
            </section>
          )}
        </div>
        <div>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-title">Contract comparison</h2>
            <div className="field">
              <label>Drift summary</label>
              <div className="diff-box mono" style={{ fontSize: 12 }}>
                {cr.driftLines?.length ? cr.driftLines.join('\n') : 'No drift rows'}
              </div>
            </div>
            {cr.ajv?.attempted && (
              <div className="field">
                <label>Ajv</label>
                <div>{cr.ajv.valid ? 'Schema valid' : 'Schema validation failed'}</div>
                <ul className="helper" style={{ paddingLeft: 18 }}>
                  {(cr.ajv.errors || []).map((e, i) => (
                    <li key={i}>
                      {e.path}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="field">
              <label>Missing required</label>
              <div className="mono">{cr.drift?.missingRequired?.join(', ') || '—'}</div>
            </div>
            <div className="field">
              <label>Extra properties</label>
              <div className="mono">{cr.drift?.extraProperties?.join(', ') || '—'}</div>
            </div>
            <div className="field">
              <label>Type mismatches</label>
              <ul className="helper" style={{ paddingLeft: 18 }}>
                {(cr.drift?.typeMismatches || []).map((m) => (
                  <li key={m.path}>
                    {m.path}: {m.detail}
                  </li>
                ))}
                {(!cr.drift?.typeMismatches || cr.drift.typeMismatches.length === 0) && <li>—</li>}
              </ul>
            </div>
          </section>
          <section className="card">
            <h2 className="section-title">Validation outcomes</h2>
            <div className="table-wrap">
              <table className="data-table" aria-label="Validation results">
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col">Path</th>
                    <th scope="col">Result</th>
                    <th scope="col">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(cr.validationResults || []).map((v, i) => (
                    <tr key={i}>
                      <td>{v.rule.ruleType}</td>
                      <td className="mono">{v.rule.path}</td>
                      <td>
                        <span className={v.pass ? 'badge badge-ok' : 'badge badge-bad'}>{v.pass ? 'Pass' : 'Fail'}</span>
                      </td>
                      <td>{v.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
