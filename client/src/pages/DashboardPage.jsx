import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { formatTimestampForTimezone, getUserTimezone } from '../lib/timezone.js';
import { SETTINGS_UPDATED_EVENT } from '../lib/userSettings.js';
import {
  REVIEW_QUEUE_UPDATED_EVENT,
  countContractsWithActiveRiskNotes,
  loadReviewQueueState,
} from '../lib/reviewQueueState.js';

function parseTs(ts) {
  const d = Date.parse(String(ts || '').replace(' UTC', 'Z').replace(' ', 'T'));
  return Number.isNaN(d) ? 0 : d;
}

function warningCount(c) {
  const warningText = [c.analysisMeta?.warnings, c.analysisMeta?.conflicts]
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!warningText || warningText === '—') return 0;
  return warningText.split('\n').filter(Boolean).length;
}

function warningSummary(c) {
  const lines = [c.analysisMeta?.warnings, c.analysisMeta?.conflicts]
    .filter(Boolean)
    .join('\n')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  return lines[0] || 'Review inferred schema details before publishing.';
}

export default function DashboardPage() {
  const { contracts } = useApp();
  const [timezone, setTimezone] = useState(() => getUserTimezone());
  const [queueState, setQueueState] = useState(() => loadReviewQueueState());
  const hasContracts = contracts.length > 0;
  const sortedContracts = useMemo(
    () => [...contracts].sort((a, b) => parseTs(b.lastUpdated) - parseTs(a.lastUpdated)),
    [contracts]
  );

  const stats = useMemo(() => {
    const endpointsImported = contracts.length;
    const specsGenerated = contracts.filter((c) => c.specGenerated).length;
    const typedModelsReady = contracts.filter((c) => c.specGenerated).length;
    const contractsWithRiskNotes = countContractsWithActiveRiskNotes(contracts, queueState);
    return { endpointsImported, specsGenerated, typedModelsReady, contractsWithRiskNotes };
  }, [contracts, queueState]);

  const reviewQueue = useMemo(
    () =>
      sortedContracts
        .filter((c) => warningCount(c) > 0 || c.status === 'Needs Review' || c.status === 'Inference Warning')
        .slice(0, 6),
    [sortedContracts]
  );

  const recentlyGenerated = useMemo(
    () => sortedContracts.filter((c) => c.specGenerated).slice(0, 6),
    [sortedContracts]
  );

  const latestContract = sortedContracts[0];

  useEffect(() => {
    function syncTimezone() {
      setTimezone(getUserTimezone());
    }
    function syncQueue() {
      setQueueState(loadReviewQueueState());
    }
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
    window.addEventListener(REVIEW_QUEUE_UPDATED_EVENT, syncQueue);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
      window.removeEventListener(REVIEW_QUEUE_UPDATED_EVENT, syncQueue);
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="helper" style={{ margin: '6px 0 0' }}>
            Ingest logs or JSON samples, infer OpenAPI contracts, generate typed boilerplate, and bridge into Swagger.
          </p>
        </div>
        <Link className="btn btn-primary" to="/contracts/import">
          Import Logs
        </Link>
      </div>

      <div className="summary-grid">
        <div className="card summary-card">
          <div className="label">Endpoints Imported</div>
          <div className="value">{stats.endpointsImported}</div>
        </div>
        <div className="card summary-card">
          <div className="label">OpenAPI Specs Generated</div>
          <div className="value">{stats.specsGenerated}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Typed Models Ready</div>
          <div className="value">{stats.typedModelsReady}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Contracts With Risk Notes</div>
          <div className="value">{stats.contractsWithRiskNotes}</div>
        </div>
      </div>

      {!hasContracts && (
        <section className="card dashboard-gap" style={{ padding: 20 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            No contracts yet
          </h2>
          <p className="helper" style={{ margin: '0 0 12px' }}>
            Import logs or paste request/response samples to generate your first OpenAPI spec and typed client boilerplate.
          </p>
          <div className="row-actions">
            <Link className="btn btn-primary" to="/contracts/import">
              Import Logs
            </Link>
          </div>
        </section>
      )}

      {hasContracts && (
        <>
      <div className="run-layout dashboard-gap">
        <section className="card" style={{ padding: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Recent Contracts
          </h2>
          {sortedContracts.slice(0, 6).map((c) => (
            <div key={c.id} className="dashboard-activity-row">
              <div className="dashboard-activity-main">
                <strong>{c.name}</strong>
                <span className="helper mono">
                  {c.method} {c.path}
                </span>
                <span className="helper">{formatTimestampForTimezone(c.lastUpdated, timezone)}</span>
              </div>
              <div className="dashboard-activity-actions">
                <StatusBadge status={c.status} />
                <Link className="btn btn-sm" to={`/contracts/${c.id}`}>
                  Open
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="card" style={{ padding: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Recently Generated Specs
          </h2>
          {recentlyGenerated.length === 0 ? (
            <p className="helper">No specs generated yet.</p>
          ) : (
            recentlyGenerated.map((c) => (
              <div key={c.id} className="dashboard-activity-row">
                <div className="dashboard-activity-main">
                  <strong>{c.name}</strong>
                  <span className="helper">Updated {formatTimestampForTimezone(c.lastUpdated, timezone)}</span>
                </div>
                <div className="dashboard-activity-actions">
                  <Link className="btn btn-sm" to={`/contracts/${c.id}/types`}>
                    Generate Types
                  </Link>
                  <Link className="btn btn-sm" to={`/contracts/${c.id}/check`}>
                    Open in SwaggerHub
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="run-layout dashboard-gap">
        <section className="card" style={{ padding: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Endpoints With Typing Risks</h2>
          {reviewQueue.length === 0 ? (
            <p className="helper">No contracts currently flagged for schema review.</p>
          ) : (
            reviewQueue.map((c) => (
              <div key={c.id} className="dashboard-activity-row">
                <div className="dashboard-activity-main">
                  <strong>{c.name}</strong>
                  <span className="helper">{warningSummary(c)}</span>
                </div>
                <div className="dashboard-activity-actions">
                  <StatusBadge status={c.status} />
                  <Link className="btn btn-sm" to={`/contracts/${c.id}`}>
                    Review
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card" style={{ padding: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Quick Actions
          </h2>
          <div className="dashboard-quick-actions">
            <Link className="btn btn-primary" to="/contracts/import">
              Import Logs
            </Link>
            <Link className="btn" to={latestContract ? `/contracts/${latestContract.id}` : '/contracts'}>
              Open Latest Spec
            </Link>
            <Link className="btn" to={latestContract ? `/contracts/${latestContract.id}/check` : '/contracts'}>
              Open Latest in SwaggerHub
            </Link>
            <Link className="btn" to={latestContract ? `/contracts/${latestContract.id}/types` : '/contracts'}>
              Generate Latest Types
            </Link>
            <Link className="btn" to="/alerts">
              Review Risk Notes
            </Link>
            <Link className="btn" to="/contracts">
              View Contracts
            </Link>
          </div>
        </section>
      </div>

        </>
      )}
    </>
  );
}
