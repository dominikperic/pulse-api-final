import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateRiskNotes } from '../lib/hardening.js';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'type', label: 'Type Conflict' },
  { id: 'missing', label: 'Missing in Some Samples' },
  { id: 'nullable', label: 'Nullable Uncertainty' },
  { id: 'enum', label: 'Enum Candidate' },
  { id: 'review', label: 'Needs Review' },
  { id: 'resolved', label: 'Resolved' },
];

function normalizeType(a) {
  const raw = (a.failureType || '').toLowerCase();
  const summary = (a.summary || '').toLowerCase();
  if (raw.includes('type') || summary.includes('type mismatch')) return 'type';
  if (raw.includes('missing') || summary.includes('missing')) return 'missing';
  if (summary.includes('null') || summary.includes('nullable')) return 'nullable';
  if (summary.includes('enum')) return 'enum';
  if (raw.includes('review')) return 'review';
  return 'review';
}

function reviewLabel(kind) {
  if (kind === 'type') return 'Type Conflict';
  if (kind === 'missing') return 'Missing in Some Samples';
  if (kind === 'nullable') return 'Nullable Uncertainty';
  if (kind === 'enum') return 'Enum Candidate';
  return 'Needs Review';
}

function rowClass(kind, resolved) {
  if (resolved) return 'alert-row';
  if (kind === 'type') return 'alert-row down';
  if (kind === 'missing' || kind === 'nullable') return 'alert-row validation';
  if (kind === 'enum') return 'alert-row drift';
  return 'alert-row';
}

export default function AlertsPage() {
  const { alerts, resolveAlert, contracts } = useApp();
  const [filter, setFilter] = useState('all');

  const enriched = useMemo(() => {
    const base = alerts.map((a) => ({
      ...a,
      reviewType: normalizeType(a),
    }));
    const contractDerived = contracts.flatMap((c) =>
      generateRiskNotes(c).slice(0, 3).map((note, idx) => ({
        id: `risk-${c.id}-${idx}`,
        contractId: c.id,
        contractName: c.name,
        path: 'inferred',
        summary: note,
        time: c.lastUpdated,
        resolved: false,
        reviewType: normalizeType({ failureType: 'Needs Review', summary: note }),
      }))
    );
    return [...base, ...contractDerived];
  }, [alerts, contracts]);

  const counts = useMemo(() => {
    const c = {
      all: alerts.length,
      type: 0,
      missing: 0,
      nullable: 0,
      enum: 0,
      review: 0,
      resolved: 0,
    };
    enriched.forEach((a) => {
      c[a.reviewType] += 1;
      if (a.resolved) c.resolved += 1;
    });
    c.review = enriched.filter((a) => a.reviewType === 'review').length;
    return c;
  }, [alerts.length, enriched]);

  const visible = enriched.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return a.resolved;
    return !a.resolved && a.reviewType === filter;
  });

  return (
    <>
      <div className="page-header">
        <h1>Review Queue</h1>
        <p className="helper" style={{ margin: 0, flex: '1 1 100%' }}>
          Contracts with inference ambiguity or schema notes that should be reviewed before publishing.
        </p>
      </div>
      <div className="filter-bar" role="tablist" aria-label="Review queue filters">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="badge badge-muted" style={{ marginLeft: 6 }}>
              {f.id === 'all' ? counts.all : counts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <p className="section-title">Inference warning feed</p>
      {visible.length === 0 ? (
        <p className="helper">{enriched.length === 0 ? 'Nothing to review yet.' : 'No queue items for this filter.'}</p>
      ) : (
        visible.map((a) => (
          <article key={a.id} className={rowClass(a.reviewType, a.resolved)}>
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <strong>{a.contractName}</strong>
                <span className="badge badge-warn">{reviewLabel(a.reviewType)}</span>
                {a.resolved && <span className="badge badge-ok">Resolved</span>}
              </div>
              <div className="helper mono">Field path: {a.path}</div>
              <p style={{ margin: '8px 0 0' }}>{a.summary}</p>
              <div className="helper" style={{ marginTop: 6 }}>
                Last updated: {a.time}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Link className="btn btn-sm btn-primary" to={`/contracts/${a.contractId}`}>
                Open Contract
              </Link>
              {!a.resolved && (
                <button type="button" className="btn btn-sm" onClick={() => void resolveAlert(a.id)}>
                  Mark Reviewed
                </button>
              )}
            </div>
          </article>
        ))
      )}

      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table className="data-table" aria-label="Review queue table">
          <thead>
            <tr>
              <th scope="col">Endpoint / Contract</th>
              <th scope="col">Review Type</th>
              <th scope="col">JSON Path</th>
              <th scope="col">Summary</th>
              <th scope="col">Time</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={`t-${a.id}`}>
                <td>{a.contractName}</td>
                <td>{reviewLabel(a.reviewType)}</td>
                <td className="mono">{a.path}</td>
                <td>{a.summary}</td>
                <td>{a.time}</td>
                <td>{a.resolved ? 'Reviewed' : 'Open'}</td>
                <td>
                  <Link className="btn btn-sm" to={`/contracts/${a.contractId}`}>
                    Open Contract
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
