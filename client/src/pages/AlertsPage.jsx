import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateRiskNotes } from '../lib/hardening.js';
import { SETTINGS_UPDATED_EVENT } from '../lib/userSettings.js';
import { formatTimestampForTimezone, getUserTimezone } from '../lib/timezone.js';
import {
  REVIEW_QUEUE_STATE_KEY,
  emitReviewQueueUpdated,
  loadReviewQueueState,
} from '../lib/reviewQueueState.js';

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

function parseTs(ts) {
  const d = Date.parse(String(ts || '').replace(' UTC', 'Z').replace(' ', 'T'));
  return Number.isNaN(d) ? 0 : d;
}

export default function AlertsPage() {
  const { alerts, contracts } = useApp();
  const [filter, setFilter] = useState('all');
  const [queueState, setQueueState] = useState(() => loadReviewQueueState());
  const [timezone, setTimezone] = useState(() => getUserTimezone());

  function updateQueueState(id, patch) {
    setQueueState((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...patch } };
      localStorage.setItem(REVIEW_QUEUE_STATE_KEY, JSON.stringify(next));
      emitReviewQueueUpdated();
      return next;
    });
  }

  useEffect(() => {
    function syncTimezone() {
      setTimezone(getUserTimezone());
    }
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
  }, []);

  const enriched = useMemo(() => {
    const base = alerts.map((a) => ({
      ...a,
      dismissed: Boolean(queueState[a.id]?.dismissed),
      resolved: typeof queueState[a.id]?.reviewed === 'boolean' ? Boolean(queueState[a.id]?.reviewed) : Boolean(a.resolved),
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
        dismissed: Boolean(queueState[`risk-${c.id}-${idx}`]?.dismissed),
        resolved: Boolean(queueState[`risk-${c.id}-${idx}`]?.reviewed),
        reviewType: normalizeType({ failureType: 'Needs Review', summary: note }),
      }))
    );
    return [...base, ...contractDerived].filter((a) => !a.dismissed);
  }, [alerts, contracts, queueState]);

  const ordered = useMemo(
    () =>
      [...enriched].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? -1 : 1;
        return parseTs(b.time) - parseTs(a.time);
      }),
    [enriched]
  );

  const counts = useMemo(() => {
    const c = {
      all: enriched.length,
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
  }, [enriched]);

  const visible = ordered.filter((a) => {
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
        <p className="helper">{ordered.length === 0 ? 'Nothing to review yet.' : 'No queue items for this filter.'}</p>
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
                Last updated: {formatTimestampForTimezone(a.time, timezone)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Link className="btn btn-sm btn-primary" to={`/contracts/${a.contractId}`}>
                Open Contract
              </Link>
              {!a.resolved && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => updateQueueState(a.id, { reviewed: true, dismissed: false })}
                >
                  Mark Reviewed
                </button>
              )}
              {a.resolved && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => updateQueueState(a.id, { reviewed: false, dismissed: false })}
                  >
                    Unmark Reviewed
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => updateQueueState(a.id, { dismissed: true })}
                  >
                    Dismiss
                  </button>
                </>
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
                <td>{formatTimestampForTimezone(a.time, timezone)}</td>
                <td>{a.resolved ? 'Reviewed' : 'Open'}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn btn-sm" to={`/contracts/${a.contractId}`}>
                      Open Contract
                    </Link>
                    {!a.resolved ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => updateQueueState(a.id, { reviewed: true, dismissed: false })}
                      >
                        Mark Reviewed
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => updateQueueState(a.id, { reviewed: false, dismissed: false })}
                        >
                          Unmark
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => updateQueueState(a.id, { dismissed: true })}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
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
