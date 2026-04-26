import { runImportAnalysis, runSampleCheck } from '../../lib/pipeline.js';
import { formatDriftSummary } from '../../lib/driftDetection.js';
import { SAMPLE_BUNDLES, SEED_RULES } from '../../lib/sampleData.js';
import { mergeRequestConfig } from '../../lib/requestConfigDefaults.js';
import { inferFromSamples, buildFieldSummary } from '../../lib/schemaInference.js';
import { rebuildOpenApiDocument } from '../../lib/contractRebuild.js';
import { loadPersistedState, savePersistedState } from '../../lib/persistence.js';

function buildContractFromBundle(bundle, analysis) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const conflictCount = analysis.mergedConflicts.length;
  const errCount = analysis.errors.length;
  let status = 'Spec Generated';
  if (errCount) status = 'Needs Review';
  else if (conflictCount > 0) status = 'Inference Warning';

  const sampleImportSnapshot = {
    requestSamples: bundle.requestSamples.map((r) => ({ body: r.body })),
    responseSamples: bundle.responseSamples.map((r) => ({
      statusCode: String(r.statusCode || '200'),
      body: r.body,
    })),
  };

  const partial = {
    id: bundle.id,
    name: bundle.name,
    description: bundle.description || '',
    method: bundle.method,
    path: bundle.path,
    endpoint: bundle.endpoint || '',
    authConfig: bundle.authConfig || { type: 'none' },
    lastUpdated: now,
    status,
    alertCount: conflictCount + errCount,
    specGenerated: errCount === 0,
    requestSchema: analysis.analysisMeta.requestSchema,
    responseSchemas: analysis.analysisMeta.responseSchemas,
    openApiDocument: analysis.openApiDocument,
    analysisMeta: analysis.analysisMeta,
    sampleImportSnapshot,
    sampleHistory: [],
  };

  partial.requestConfig = {
    ...mergeRequestConfig(partial),
    replayBodyJson: bundle.requestSamples[0]?.body || '{}',
    safeToReplay: String(bundle.method || 'GET').toUpperCase() === 'GET',
    expectedStatusCodes: Object.keys(analysis.analysisMeta.responseSchemas || { 200: 1 }),
  };

  return partial;
}

/** Demo timestamps (stable) so dashboard / lists read clearly after reload. */
const SEED_TS_CLEAN = '2026-04-01 16:45:00 UTC';
const SEED_TS_WARNINGS = '2026-04-01 13:18:42 UTC';
const SEED_TS_COMPLEX = '2026-04-01 11:02:15 UTC';

function applySeedDemoScenarios(contracts) {
  const seededRules = SEED_RULES.map((r) => ({ ...r }));
  const customers = contracts.find((c) => c.id === 'c_seed_customers');
  const pi = contracts.find((c) => c.id === 'c_seed_pi');
  const contacts = contracts.find((c) => c.id === 'c_seed_contacts');
  if (!customers || !pi || !contacts) return { contracts, alerts: [], seededRules };
  const piWarnings = {
    missingRequired: ['object'],
    extraProperties: [],
    typeMismatches: [{ path: 'amount', detail: 'expected integer|number, got string' }],
    nullRegressions: [],
    enumMismatches: [],
  };
  const piWarningLines = formatDriftSummary(piWarnings);

  customers.status = 'Types Ready';
  customers.alertCount = 0;
  customers.lastUpdated = SEED_TS_CLEAN;
  customers.sampleHistory = [
    {
      id: 'import-seed-customers',
      ts: SEED_TS_CLEAN,
      checkKind: 'import',
      sampleType: 'Sample import',
      http: '200',
      contractMatch: 'Full',
      drift: 'No',
      notes: 'Imported 3 request and 2 response samples. Spec generated cleanly.',
      checkResult: {
        summary: 'Inferred contract generated with no warnings.',
      },
    },
  ];

  pi.status = 'Inference Warning';
  pi.alertCount = piWarningLines.length;
  pi.lastUpdated = SEED_TS_WARNINGS;
  pi.sampleHistory = [
    {
      id: 'import-seed-pi',
      ts: SEED_TS_WARNINGS,
      checkKind: 'import',
      sampleType: 'Sample import',
      http: '200',
      contractMatch: 'Partial',
      drift: 'Yes',
      notes: 'Spec generated with warnings: object missing in some examples and amount type variance.',
      checkResult: {
        driftLines: piWarningLines,
        proposalSummary: [
          'Field "object" appears missing in some examples; verify if this field is guaranteed.',
          'Field "amount" is observed as integer and string; pick a final canonical type.',
        ],
      },
    },
  ];

  contacts.status = 'Types Ready';
  contacts.alertCount = 1;
  contacts.lastUpdated = SEED_TS_COMPLEX;
  contacts.sampleHistory = [
    {
      id: 'import-seed-contacts',
      ts: SEED_TS_COMPLEX,
      checkKind: 'import',
      sampleType: 'Sample import',
      http: '200',
      contractMatch: 'Full',
      drift: 'No',
      notes: 'Nested arrays and object structures inferred for CRM sync payloads.',
      checkResult: {
        summary: 'Richer schema inferred with nested contact arrays and metadata fields.',
      },
    },
  ];

  const alerts = [
    {
      id: 'rq-seed-pi-object',
      contractId: 'c_seed_pi',
      contractName: pi.name,
      failureType: 'Missing in Some Samples',
      path: 'object',
      summary: 'Field appears in some response examples but is absent in others.',
      time: SEED_TS_WARNINGS,
      severity: 'Medium',
      resolved: false,
    },
    {
      id: 'rq-seed-pi-amount',
      contractId: 'c_seed_pi',
      contractName: pi.name,
      failureType: 'Type Conflict',
      path: 'amount',
      summary: 'Observed multiple types for `amount` across imported samples.',
      time: SEED_TS_WARNINGS,
      severity: 'Medium',
      resolved: false,
    },
    {
      id: 'rq-seed-contacts-nullable',
      contractId: 'c_seed_contacts',
      contractName: contacts.name,
      failureType: 'Nullable Uncertainty',
      path: 'contacts[].tags',
      summary: 'Array field is present in some examples and omitted in others; confirm nullability and requiredness.',
      time: SEED_TS_COMPLEX,
      severity: 'Low',
      resolved: false,
    },
  ];

  return { contracts, alerts, seededRules };
}

function seedDatabase() {
  const contracts = [];
  for (const bundle of SAMPLE_BUNDLES) {
    const analysis = runImportAnalysis({
      name: bundle.name,
      method: bundle.method,
      path: bundle.path,
      requestSamples: bundle.requestSamples,
      responseSamples: bundle.responseSamples,
    });
    contracts.push(buildContractFromBundle(bundle, analysis));
  }
  const { alerts, seededRules } = applySeedDemoScenarios(contracts);
  return {
    contracts,
    alerts,
    extraRules: [],
    seededRules,
  };
}

/** Demo mode: always start from bundled samples; nothing is written to localStorage. Reload = reset. */
function loadOrSeed() {
  const persisted = loadPersistedState();
  if (persisted && typeof persisted === 'object') {
    return {
      contracts: Array.isArray(persisted.contracts) ? persisted.contracts : [],
      alerts: Array.isArray(persisted.alerts) ? persisted.alerts : [],
      extraRules: Array.isArray(persisted.extraRules) ? persisted.extraRules : [],
      seededRules: Array.isArray(persisted.seededRules) ? persisted.seededRules : [],
    };
  }
  if (import.meta.env.VITE_ENABLE_DEMO_SEED === 'true') {
    return seedDatabase();
  }
  return {
    contracts: [],
    alerts: [],
    extraRules: [],
    seededRules: [],
  };
}

let state = loadOrSeed();

function persist() {
  savePersistedState(state);
}

export async function listContracts() {
  return structuredClone(state.contracts);
}

export async function createContract(payload) {
  const id = `c${Date.now()}`;
  const row = {
    id,
    name: payload.name,
    description: payload.description || '',
    method: payload.method || 'POST',
    path: payload.path || '/unknown',
    endpoint: payload.endpoint || '',
    authConfig: payload.authConfig || { type: 'none' },
    lastUpdated: payload.lastUpdated || new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    status: payload.status || 'Draft',
    alertCount: payload.alertCount ?? 0,
    specGenerated: Boolean(payload.specGenerated),
    requestSchema: payload.requestSchema,
    responseSchemas: payload.responseSchemas,
    openApiDocument: payload.openApiDocument,
    analysisMeta: payload.analysisMeta,
    sampleHistory: payload.sampleHistory || [],
    sampleImportSnapshot: payload.sampleImportSnapshot ?? null,
  };
  row.requestConfig = payload.requestConfig
    ? { ...mergeRequestConfig(row), ...payload.requestConfig }
    : mergeRequestConfig(row);
  state.contracts = [row, ...state.contracts];
  persist();
  return id;
}

export async function updateContract(id, payload) {
  state.contracts = state.contracts.map((c) =>
    c.id === id
      ? {
          ...c,
          ...payload,
          id: c.id,
          lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        }
      : c
  );
  persist();
}

export async function deleteContract(id) {
  const before = state.contracts.length;
  state.contracts = state.contracts.filter((c) => c.id !== id);
  if (state.contracts.length === before) return { ok: false, error: 'Contract not found' };
  state.extraRules = state.extraRules.filter((r) => r.contractId !== id);
  state.seededRules = (state.seededRules || []).filter((r) => r.contractId !== id);
  state.alerts = (state.alerts || []).filter((a) => a.contractId !== id);
  persist();
  return { ok: true };
}

export async function updateContractStatus(id, status) {
  state.contracts = state.contracts.map((c) => (c.id === id ? { ...c, status } : c));
  persist();
}

export async function listAlerts() {
  return structuredClone(state.alerts);
}

export async function resolveAlert(alertId) {
  state.alerts = state.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a));
  persist();
}

export async function addValidationRule(contractId, rule) {
  const id = `r${Date.now()}`;
  state.extraRules.push({
    id,
    contractId,
    path: rule.path,
    ruleType: rule.ruleType,
    expected: rule.expected || '—',
    lastResult: 'Not run',
  });
  persist();
}

function allRules() {
  return [...(state.seededRules || []), ...state.extraRules];
}

export async function listValidationRules() {
  return allRules().map((r) => ({
    ...r,
    contractName: state.contracts.find((c) => c.id === r.contractId)?.name || r.contractId,
  }));
}

function updateRuleLastResults(contractId, validationResults) {
  for (const vr of validationResults) {
    const path = vr.rule.path;
    const rt = vr.rule.ruleType;
    const hit = (r) => r.contractId === contractId && r.path === path && r.ruleType === rt;
    const seededIdx = state.seededRules.findIndex(hit);
    if (seededIdx >= 0) {
      state.seededRules[seededIdx] = {
        ...state.seededRules[seededIdx],
        lastResult: vr.pass ? 'Pass' : 'Fail',
      };
    }
    const extraIdx = state.extraRules.findIndex(hit);
    if (extraIdx >= 0) {
      state.extraRules[extraIdx] = {
        ...state.extraRules[extraIdx],
        lastResult: vr.pass ? 'Pass' : 'Fail',
      };
    }
  }
}

export async function recordSampleCheck(contractId, { sampleJsonText, sampleKind, statusCode }) {
  const c = state.contracts.find((x) => x.id === contractId);
  if (!c) return { ok: false, error: 'Contract not found' };

  const rules = allRules().filter((r) => r.contractId === contractId);
  const check = runSampleCheck({
    sampleJsonText,
    sampleKind,
    statusCode,
    contract: c,
    rules,
  });

  if (!check.ok) {
    return check;
  }

  updateRuleLastResults(contractId, check.validationResults);

  const entry = {
    id: `chk-${Date.now()}`,
    ts: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
    sampleType: sampleKind === 'request' ? 'Request' : 'Response',
    http: String(statusCode || '200'),
    contractMatch: check.contractMatch,
    drift: check.hasDrift ? 'Yes' : 'No',
    notes: check.driftLines[0] || (check.validationResults.some((v) => !v.pass) ? 'Validation failed' : '—'),
    checkKind: 'paste',
    checkResult: {
      driftLines: check.driftLines,
      drift: check.drift,
      validationResults: check.validationResults,
      samplePreview: sampleJsonText.slice(0, 2000),
    },
  };

  const idx = state.contracts.findIndex((x) => x.id === contractId);
  if (idx < 0) return { ok: false, error: 'Contract not found' };

  const next = { ...c, sampleHistory: [entry, ...(c.sampleHistory || [])].slice(0, 40) };
  const valFail = check.validationResults.some((v) => !v.pass);
  if (check.hasDrift || valFail) {
    next.alertCount = (c.alertCount || 0) + 1;
    if (check.hasDrift) next.status = 'Drift Detected';
    else if (valFail) next.status = 'Needs Review';
    state.alerts.unshift({
      id: `a${Date.now()}`,
      contractId,
      contractName: c.name,
      failureType: check.hasDrift ? 'Drift Detected' : 'Validation Failure',
      path: check.drift.missingRequired[0] || check.validationResults.find((v) => !v.pass)?.rule.path || '—',
      summary: check.driftLines[0] || 'Contract check failed',
      time: entry.ts,
      severity: 'Medium',
      resolved: false,
    });
  }
  state.contracts[idx] = next;
  persist();
  return { ok: true, check, entryId: entry.id };
}

/**
 * Persist a live endpoint check result (after POST /api/contracts/live-check).
 * @param {string} contractId
 * @param {object} liveResult — server JSON body from runLiveEndpointCheck
 */
export async function recordLiveCheck(contractId, liveResult) {
  const c = state.contracts.find((x) => x.id === contractId);
  if (!c) return { ok: false, error: 'Contract not found' };

  const rules = allRules().filter((r) => r.contractId === contractId);
  const vr = liveResult.validationResults || [];
  updateRuleLastResults(contractId, vr);

  const op = liveResult.operational || {};
  const cr = liveResult.contract || {};
  const driftLines = cr.driftLines || [];
  const hasDrift = Boolean(cr.hasDrift);
  const valFail = vr.some((v) => !v.pass);
  const ajvFail = cr.ajv?.attempted && !cr.ajv?.valid;
  const statusMismatch = op.ok && !op.expectedStatusMatch;

  const notes =
    op.message ||
    driftLines[0] ||
    (valFail ? 'Validation failed' : null) ||
    (ajvFail ? 'Ajv schema validation failed' : null) ||
    (statusMismatch ? 'Unexpected status code' : null) ||
    '—';

  const entry = {
    id: `chk-live-${Date.now()}`,
    ts: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
    checkKind: 'live',
    sampleType: 'Live check',
    http: op.statusCode != null ? String(op.statusCode) : '—',
    latencyMs: op.latencyMs,
    contractMatch: cr.contractMatch || 'Unknown',
    drift: hasDrift ? 'Yes' : 'No',
    notes,
    checkResult: {
      liveOperational: op,
      driftLines,
      drift: cr.drift,
      validationResults: vr,
      ajv: cr.ajv,
      samplePreview: (liveResult.responseBodyPreview || '').slice(0, 2000),
      responseBodyPreview: liveResult.responseBodyPreview,
      proposedExampleResponse: liveResult.proposedExampleResponse,
      proposalSummary: liveResult.proposalSummary || [],
      requestMeta: liveResult.requestMeta,
    },
  };

  const idx = state.contracts.findIndex((x) => x.id === contractId);
  if (idx < 0) return { ok: false, error: 'Contract not found' };

  const next = { ...c, sampleHistory: [entry, ...(c.sampleHistory || [])].slice(0, 40) };
  if (hasDrift || valFail || ajvFail || statusMismatch || !op.ok) {
    next.alertCount = (c.alertCount || 0) + 1;
    if (hasDrift) next.status = 'Drift Detected';
    else if (!op.ok) next.status = 'Needs Review';
    else if (valFail || ajvFail || statusMismatch) next.status = 'Needs Review';
    state.alerts.unshift({
      id: `a${Date.now()}`,
      contractId,
      contractName: c.name,
      failureType: !op.ok ? 'Live check failed' : hasDrift ? 'Drift Detected' : 'Validation / status mismatch',
      path: cr.drift?.missingRequired?.[0] || vr.find((v) => !v.pass)?.rule.path || '—',
      summary: notes,
      time: entry.ts,
      severity: 'Medium',
      resolved: false,
    });
  }
  state.contracts[idx] = next;
  persist();
  return { ok: true, entryId: entry.id };
}

/**
 * Merge live response into contract response schema for a status code and rebuild OpenAPI.
 */
export async function applyProposedResponseUpdate(contractId, { statusCode, proposedJson }) {
  const c = state.contracts.find((x) => x.id === contractId);
  if (!c) return { ok: false, error: 'Contract not found' };

  let parsed;
  try {
    parsed = typeof proposedJson === 'string' ? JSON.parse(proposedJson) : proposedJson;
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e?.message || 'parse error'}` };
  }

  const code = String(statusCode || '200');
  const inf = inferFromSamples([parsed], `response.${code}`);
  const responseSchemas = { ...c.responseSchemas, [code]: inf.schema };
  const responseFieldSummary = {
    ...(c.analysisMeta?.responseFieldSummary || {}),
    [code]: buildFieldSummary(inf.schema),
  };
  const analysisMeta = {
    ...c.analysisMeta,
    responseSchemas,
    responseFieldSummary,
  };

  const next = {
    ...c,
    responseSchemas,
    analysisMeta,
    openApiDocument: rebuildOpenApiDocument({ ...c, responseSchemas }),
    status: 'Contract Generated',
  };

  state.contracts = state.contracts.map((row) => (row.id === contractId ? next : row));
  persist();
  return { ok: true };
}
