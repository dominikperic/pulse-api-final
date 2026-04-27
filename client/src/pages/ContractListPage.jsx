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

export default function ContractListPage() {
  const { contracts, updateContractStatus } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timezone, setTimezone] = useState(() => getUserTimezone());
  const [queueState, setQueueState] = useState(() => loadReviewQueueState());

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

  const imported = contracts.length;
  const generated = contracts.filter((c) => c.specGenerated).length;
  const typesReady = contracts.filter((c) => c.specGenerated).length;
  const contractsWithRiskNotes = useMemo(
    () => countContractsWithActiveRiskNotes(contracts, queueState),
    [contracts, queueState]
  );
  const filteredContracts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.method, c.path, c.status].join(' ').toLowerCase().includes(q);
    });
  }, [contracts, query, statusFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Contracts</h1>
          <p className="helper" style={{ marginTop: 6 }}>
            Browse inferred endpoint contracts, check typing readiness, and hand off specs to Swagger.
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn" to="/alerts">
            Review Queue
          </Link>
          <Link className="btn btn-primary" to="/contracts/import">
            Import Logs
          </Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="row-actions" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 280px', marginBottom: 0 }}>
            <label htmlFor="contracts-search">Search contracts</label>
            <input
              id="contracts-search"
              type="text"
              placeholder="Search by endpoint, method, path, or status"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 220, marginBottom: 0 }}>
            <label htmlFor="contracts-status-filter">Status</label>
            <select id="contracts-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Spec Generated">Spec Generated</option>
              <option value="Inference Warning">Inference Warning</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </section>

      <div className="summary-grid">
        <div className="card summary-card">
          <div className="label">Endpoints Imported</div>
          <div className="value">{imported}</div>
        </div>
        <div className="card summary-card">
          <div className="label">OpenAPI Specs Generated</div>
          <div className="value">{generated}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Typed Models Ready</div>
          <div className="value">{typesReady}</div>
        </div>
        <div className="card summary-card">
          <div className="label">Contracts With Risk Notes</div>
          <div className="value">{contractsWithRiskNotes}</div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <section className="card">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            No contracts yet
          </h2>
          <p className="helper" style={{ margin: '0 0 12px' }}>
            Start by importing real request/response logs or pasting sample payloads to infer your first API contract.
          </p>
          <Link className="btn btn-primary" to="/contracts/import">
            Create First Contract
          </Link>
        </section>
      ) : (
        <>
          <p className="section-title">Endpoint contracts</p>
          <div className="table-wrap">
            <table className="data-table" aria-label="API contracts">
              <thead>
                <tr>
                  <th scope="col">Endpoint Name</th>
                  <th scope="col">Method</th>
                  <th scope="col">Path</th>
                  <th scope="col">Spec Status</th>
                  <th scope="col">Typed Client Status</th>
                  <th scope="col">Last Updated</th>
                  <th scope="col">Risk Notes</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/contracts/${c.id}`}>{c.name}</Link>
                    </td>
                    <td className="mono">{c.method}</td>
                    <td className="mono">{c.path}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{c.specGenerated ? 'Ready' : 'Pending'}</td>
                    <td>{formatTimestampForTimezone(c.lastUpdated, timezone)}</td>
                    <td>{[c.analysisMeta?.warnings, c.analysisMeta?.conflicts].filter(Boolean).join('\n').split('\n').filter(Boolean).length}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-sm" to={`/contracts/${c.id}`}>
                          Open Contract
                        </Link>
                        <Link className="btn btn-sm" to={`/contracts/${c.id}/edit`}>
                          Edit Inputs
                        </Link>
                        <Link className="btn btn-sm" to={`/contracts/${c.id}/types`}>
                          View Types
                        </Link>
                        <Link className="btn btn-sm" to={`/contracts/${c.id}/check`}>
                          Open in SwaggerHub
                        </Link>
                        <Link className="btn btn-sm" to={`/contracts/${c.id}`}>
                          Export Spec
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            void updateContractStatus(
                              c.id,
                              c.status === 'Archived' ? 'Draft' : 'Archived'
                            );
                          }}
                        >
                          {c.status === 'Archived' ? 'Unarchive' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="helper">
                      No contracts match your current search/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
