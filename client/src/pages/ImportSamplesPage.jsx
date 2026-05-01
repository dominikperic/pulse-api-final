import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { stringify } from 'yaml';
import { useApp } from '../context/AppContext';
import { runImportAnalysis } from '../lib/pipeline.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

const emptyReq = () => ({ id: `rq-${Date.now()}`, body: '{\n  "email": "alex@example.test"\n}' });
const emptyRes = () => ({
  id: `rs-${Date.now()}`,
  statusCode: '200',
  body: '{\n  "id": "demo_123",\n  "status": "created"\n}',
});

function isDraftCandidate(form) {
  return !String(form.name || '').trim() &&
    !String(form.description || '').trim() &&
    !String(form.path || '').trim() &&
    !String(form.url || '').trim();
}

function buildPayloadFromAnalysis(form, analysis, sampleImportSnapshot) {
  const errCount = analysis.errors.length;
  const conflictCount = analysis.mergedConflicts.length;
  const draftCandidate = isDraftCandidate(form);
  let status = 'Spec Generated';
  if (draftCandidate) status = 'Draft';
  else if (errCount) status = 'Needs Review';
  else if (conflictCount > 0) status = 'Inference Warning';

  const normalizedAuthConfig =
    form.authConfig?.type === 'bearer'
      ? {
          type: 'bearer',
          secretSource: 'env',
          envVarName: form.authConfig?.envVarName || 'STRIPE_SECRET_KEY',
        }
      : { type: 'none' };

  return {
    name: form.name || 'Untitled endpoint',
    description: form.description,
    method: form.method,
    path: form.path || '/unknown',
    endpoint: form.url || `https://api.example.com${form.path || ''}`,
    authConfig: normalizedAuthConfig,
    lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    status,
    alertCount: draftCandidate ? 0 : conflictCount + errCount,
    specGenerated: draftCandidate ? false : errCount === 0,
    requestSchema: analysis.analysisMeta.requestSchema,
    responseSchemas: analysis.analysisMeta.responseSchemas,
    openApiDocument: analysis.openApiDocument,
    analysisMeta: analysis.analysisMeta,
    sampleHistory: form.sampleHistory ?? [],
    sampleImportSnapshot,
  };
}

export default function ImportSamplesPage() {
  const { contractId } = useParams();
  const isEdit = Boolean(contractId && contractId !== 'import');
  const navigate = useNavigate();
  const { contracts, addContract, updateContract, deleteContract } = useApp();
  const existing = isEdit ? contracts.find((c) => c.id === contractId) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [method, setMethod] = useState(existing?.method ?? 'POST');
  const [path, setPath] = useState(existing?.path ?? '');
  const [url, setUrl] = useState(existing?.endpoint ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [authType, setAuthType] = useState(existing?.authConfig?.type ?? 'none');
  const [requestSamples, setRequestSamples] = useState([emptyReq()]);
  const [responseSamples, setResponseSamples] = useState([emptyRes()]);
  const [analysis, setAnalysis] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const reqFileRef = useRef(null);
  const resFileRef = useRef(null);

  useEffect(() => {
    if (!existing?.id) return;
    const snap = existing.sampleImportSnapshot;
    if (snap?.requestSamples?.length) {
      setRequestSamples(
        snap.requestSamples.map((s, i) => ({
          id: `rq-${existing.id}-${i}`,
          body: s.body,
        }))
      );
    }
    if (snap?.responseSamples?.length) {
      setResponseSamples(
        snap.responseSamples.map((s, i) => ({
          id: `rs-${existing.id}-${i}`,
          statusCode: s.statusCode || '200',
          body: s.body,
        }))
      );
    }
  }, [existing?.id]);

  const savedEndpointName = (existing?.name ?? '').trim();
  /** Saved display name, or the literal DELETE when the contract name is empty. */
  const deleteConfirmTarget = savedEndpointName.length > 0 ? savedEndpointName : 'DELETE';
  const deleteNameMatches = deleteConfirmName.trim() === deleteConfirmTarget;

  function runAnalyze() {
    const result = runImportAnalysis({
      name: name || 'Endpoint',
      method,
      path,
      url,
      authConfig: { type: authType },
      requestSamples,
      responseSamples,
    });
    setParseErrors(result.errors);
    setAnalysis(result);
  }

  function runGenerate() {
    runAnalyze();
  }

  async function handleSaveClick() {
    const a = runImportAnalysis({
      name: name || 'Endpoint',
      method,
      path,
      url,
      authConfig: { type: authType },
      requestSamples,
      responseSamples,
    });
    setParseErrors(a.errors);
    setAnalysis(a);
    const sampleImportSnapshot = {
      requestSamples: requestSamples.map(({ body }) => ({ body })),
      responseSamples: responseSamples.map(({ statusCode: sc, body }) => ({
        statusCode: sc || '200',
        body,
      })),
    };
    const payload = buildPayloadFromAnalysis(
      {
        name,
        description,
        method,
        path,
        url,
        authConfig: { type: authType },
        sampleHistory: isEdit ? existing?.sampleHistory ?? [] : [],
      },
      a,
      sampleImportSnapshot
    );
    if (isEdit) {
      await updateContract(contractId, payload);
      navigate(`/contracts/${contractId}`);
    } else {
      await addContract(payload);
      navigate('/contracts');
    }
  }

  function loadJsonFile(file, setter, template, invalidLabel) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        JSON.parse(text);
        setter((prev) => [...prev, { ...template(), body: text }]);
      } catch {
        setParseErrors((e) => [...e, `${invalidLabel || file.name}: invalid JSON`]);
      }
    };
    reader.readAsText(file);
  }

  function loadJsonFiles(files, setter, template, invalidPrefix) {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    list.forEach((file) => {
      loadJsonFile(file, setter, template, `${invalidPrefix}: ${file.name}`);
    });
  }

  const previewYaml = analysis?.openApiDocument ? stringify(analysis.openApiDocument) : '';

  return (
    <>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>{isEdit ? 'Edit Inference Inputs' : 'Import Logs or Samples'}</h1>
          <p className="helper" style={{ margin: '6px 0 0' }}>
            PulseAPI uses observed request/response data to infer OpenAPI contracts, then generates typed client boilerplate.
          </p>
          <p className="breadcrumb" style={{ margin: 0 }}>
            <Link to="/dashboard">Dashboard</Link>
            {' / '}
            <Link to="/contracts">Contracts</Link>
            {' / '}
            <span>{isEdit ? 'Edit' : 'Import'}</span>
          </p>
        </div>
        <Link className="btn btn-ghost" to="/contracts">
          Back to list
        </Link>
      </div>
      <div className="two-col">
        <div>
          <CollapsibleSection sectionId="sec-a" title="Section A: Endpoint Info" variant="form">
            <div className="field">
              <label htmlFor="ep-name">Endpoint Name</label>
              <input
                id="ep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Demo Order Create"
              />
            </div>
            <div className="field">
              <label htmlFor="ep-method">HTTP Method</label>
              <select id="ep-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ep-path">Endpoint Path or URL</label>
              <input
                id="ep-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/demo/orders"
                className="mono"
              />
            </div>
            <div className="field">
              <label htmlFor="ep-url">Full URL (optional)</label>
              <input
                id="ep-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.test/api/demo/orders"
                className="mono"
              />
            </div>
            <div className="field">
              <label htmlFor="ep-desc">Short Description</label>
              <textarea
                id="ep-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this endpoint does in your product"
              />
            </div>
            <div className="field">
              <label htmlFor="ep-auth">Authentication</label>
              <select id="ep-auth" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
              </select>
              <p className="helper" style={{ marginBottom: 0 }}>
                Use Bearer Token for endpoints that require an Authorization header in Swagger execution.
              </p>
            </div>
          </CollapsibleSection>
          <CollapsibleSection sectionId="sec-b" title="Section B: Request Samples" variant="form">
            <input
              ref={reqFileRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              multiple
              hidden
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) loadJsonFiles(files, setRequestSamples, emptyReq, 'Request sample file');
                e.target.value = '';
              }}
            />
            <div className="row-actions" style={{ marginBottom: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => reqFileRef.current?.click()}>
                Upload Request JSON (one or more)
              </button>
            </div>
            {requestSamples.map((s, i) => (
              <div key={s.id} className="field" style={{ borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                <label>Request sample {i + 1} (JSON)</label>
                <textarea
                  className="mono"
                  value={s.body}
                  onChange={(e) => {
                    const next = [...requestSamples];
                    next[i] = { ...s, body: e.target.value };
                    setRequestSamples(next);
                  }}
                  rows={5}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => setRequestSamples(requestSamples.filter((x) => x.id !== s.id))}
                >
                  Remove sample
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setRequestSamples([...requestSamples, emptyReq()])}>
              Add request sample
            </button>
          </CollapsibleSection>

          <CollapsibleSection sectionId="sec-c" title="Section C: Response Samples" variant="form">
            <input
              ref={resFileRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              multiple
              hidden
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) loadJsonFiles(files, setResponseSamples, emptyRes, 'Response sample file');
                e.target.value = '';
              }}
            />
            <div className="row-actions" style={{ marginBottom: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => resFileRef.current?.click()}>
                Upload Response JSON (one or more)
              </button>
            </div>
            {responseSamples.map((s, i) => (
              <div key={s.id} className="field" style={{ borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                <div className="field">
                  <label>HTTP status code</label>
                  <input
                    className="mono"
                    style={{ maxWidth: 100 }}
                    value={s.statusCode}
                    onChange={(e) => {
                      const next = [...responseSamples];
                      next[i] = { ...s, statusCode: e.target.value };
                      setResponseSamples(next);
                    }}
                  />
                </div>
                <label>Response body {i + 1} (JSON)</label>
                <textarea
                  className="mono"
                  value={s.body}
                  onChange={(e) => {
                    const next = [...responseSamples];
                    next[i] = { ...s, body: e.target.value };
                    setResponseSamples(next);
                  }}
                  rows={6}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => setResponseSamples(responseSamples.filter((x) => x.id !== s.id))}
                >
                  Remove sample
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setResponseSamples([...responseSamples, emptyRes()])}>
              Add response sample
            </button>
          </CollapsibleSection>

          <CollapsibleSection sectionId="sec-d" title="Section D: Infer Contract + Generate OpenAPI" variant="form">
            <p className="helper" style={{ marginTop: 0 }}>
              Analyze imported logs/samples to infer schemas, generate OpenAPI 3.1, and prepare typed boilerplate outputs.
            </p>
            {parseErrors.length > 0 && (
              <div className="badge badge-bad" style={{ marginBottom: 10, display: 'block', whiteSpace: 'pre-wrap' }}>
                {parseErrors.join('\n')}
              </div>
            )}
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={runAnalyze}>
                Analyze Inputs
              </button>
              <button type="button" className="btn" onClick={runGenerate}>
                Generate OpenAPI Spec
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleSaveClick()}>
                Save Contract
              </button>
              {isEdit && (
                <button type="button" className="btn" onClick={() => navigate(`/contracts/${contractId}`)}>
                  Cancel edit
                </button>
              )}
              <Link className="btn btn-ghost" to="/contracts">
                Cancel
              </Link>
            </div>
          </CollapsibleSection>

          {isEdit && existing && (
            <CollapsibleSection
              sectionId="sec-delete"
              title="Delete contract"
              variant="form"
              defaultOpen={false}
              className="collapsible-section--danger"
              style={{ marginTop: 20 }}
              titleStyle={{ color: 'var(--danger)' }}
            >
              <p className="helper" style={{ marginBottom: 12 }}>
                Permanently removes this endpoint contract, inferred schemas, and review-queue notes. This cannot be undone.
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 13 }}>
                {savedEndpointName.length > 0 ? (
                  <>
                    To confirm, type the <strong>endpoint name</strong> exactly as saved:{' '}
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {savedEndpointName}
                    </span>
                  </>
                ) : (
                  <>
                    This contract has no saved endpoint name. Type{' '}
                    <span className="mono" style={{ fontWeight: 600 }}>
                      DELETE
                    </span>{' '}
                    (all caps) to confirm.
                  </>
                )}
              </p>
              <div className="field">
                <label htmlFor="delete-confirm-name">
                  {savedEndpointName.length > 0 ? 'Endpoint name (must match exactly)' : 'Confirmation text'}
                </label>
                <input
                  id="delete-confirm-name"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteConfirmTarget}
                  autoComplete="off"
                  aria-invalid={deleteConfirmName.length > 0 && !deleteNameMatches}
                />
              </div>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!deleteNameMatches}
                onClick={async () => {
                  if (!deleteNameMatches) return;
                  const res = await deleteContract(contractId);
                  if (res?.ok !== false) navigate('/contracts');
                }}
              >
                Delete contract permanently
              </button>
            </CollapsibleSection>
          )}
        </div>

        <aside style={{ minWidth: 0 }}>
          <CollapsibleSection sectionId="sec-e" title="Section E: Analysis Preview" variant="card">
            {!analysis ? (
            <p className="helper">Run Analyze Samples to infer schemas and build OpenAPI 3.1.</p>
          ) : (
            <>
              <div className="field">
                <label>Inferred request fields</label>
                <div className="diff-box mono" style={{ fontSize: 11 }}>
                  {analysis.analysisMeta.requestFieldSummary?.length
                    ? analysis.analysisMeta.requestFieldSummary.map((r) => `${r.path}: ${r.type} req=${r.required}`).join('\n')
                    : '—'}
                </div>
              </div>
              <div className="field">
                <label>Inferred response fields</label>
                <div className="diff-box mono" style={{ fontSize: 11 }}>
                  {Object.entries(analysis.analysisMeta.responseFieldSummary || {})
                    .map(([code, rows]) => `[${code}]\n${rows.map((r) => `${r.path}: ${r.type}`).join('\n')}`)
                    .join('\n\n') || '—'}
                </div>
              </div>
              <div className="field">
                <label>Warnings</label>
                <div className="diff-box">{analysis.analysisMeta.warnings}</div>
              </div>
              <div className="field">
                <label>Type conflicts</label>
                <div className="diff-box">{analysis.analysisMeta.conflicts}</div>
              </div>
              <div className="field">
                <label>Nullable fields</label>
                <div className="diff-box">{analysis.analysisMeta.nullable}</div>
              </div>
              <div className="field">
                <label>Observed values (not enforced)</label>
                <div className="diff-box">{analysis.analysisMeta.enums}</div>
              </div>
              <div className="field">
                <label>OpenAPI 3.1 (YAML preview)</label>
                <pre className="diff-box mono" style={{ maxHeight: 200, overflow: 'auto', margin: 0, fontSize: 10 }}>
                  {previewYaml.slice(0, 4000)}
                  {previewYaml.length > 4000 ? '\n…' : ''}
                </pre>
              </div>
            </>
          )}
          </CollapsibleSection>
        </aside>
      </div>
    </>
  );
}
