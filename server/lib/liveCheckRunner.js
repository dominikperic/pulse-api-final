/**
 * Live HTTP check + contract comparison (Node).
 * Imports shared drift/validation from the client lib tree (ESM).
 */
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { compareToSchema, formatDriftSummary } from '../../client/src/lib/driftDetection.js';
import { evaluateAllRules } from '../../client/src/lib/validationRules.js';

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);

/** Full URL from contract.endpoint (expected absolute); else https://api.example.com + path. */
function resolveRequestUrl(contract) {
  const ep = String(contract.endpoint || '').trim();
  const path = contract.path || '/';
  const q = contract.requestConfig?.queryParams || [];

  let urlStr;
  if (/^https?:\/\//i.test(ep)) {
    urlStr = ep;
  } else {
    const p = path.startsWith('/') ? path : `/${path}`;
    urlStr = `https://api.example.com${p}`;
  }

  const out = new URL(urlStr);
  for (const row of q) {
    if (row?.key) out.searchParams.set(row.key, row.value ?? '');
  }
  return out.toString();
}

function applyAuth(headers, authType, authValue) {
  const h = { ...headers };
  const v = String(authValue || '').trim();
  if (!v || authType === 'none' || !authType) return h;
  if (authType === 'bearer') {
    h.Authorization = `Bearer ${v}`;
  } else if (authType === 'apiKey') {
    h['X-API-Key'] = v;
  } else if (authType === 'basic') {
    h.Authorization = `Basic ${Buffer.from(v).toString('base64')}`;
  }
  return h;
}

function redactHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h || {})) {
    if (/^(authorization|x-api-key)$/i.test(k)) out[k] = '***redacted***';
    else out[k] = v;
  }
  return out;
}

function summarizeProposal(drift, liveBody) {
  const lines = [];
  for (const p of drift.missingRequired || []) {
    lines.push(`Field "${p}" was required in contract but missing in live response — consider relaxing required or documenting optional.`);
  }
  for (const p of drift.extraProperties || []) {
    lines.push(`New field "${p}" appeared in live response — consider adding to contract schema.`);
  }
  for (const m of drift.typeMismatches || []) {
    lines.push(`Type at "${m.path}" differs (${m.detail}) — update schema types if intentional.`);
  }
  for (const p of drift.nullRegressions || []) {
    lines.push(`Null at "${p}" where contract disallows null — consider nullable union.`);
  }
  for (const e of drift.enumMismatches || []) {
    lines.push(`Enum at "${e.path}": extend allowed values or fix upstream.`);
  }
  if (lines.length === 0 && liveBody != null) {
    lines.push('Live response matches contract structure; proposed example is the live payload.');
  }
  return lines;
}

function runAjvOnSchema(schema, data) {
  if (!schema || typeof schema !== 'object') {
    return { attempted: false, valid: true, errors: [] };
  }
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    return {
      attempted: true,
      valid,
      errors: (validate.errors || []).map((e) => ({
        path: e.instancePath || '(root)',
        message: e.message,
        keyword: e.keyword,
      })),
    };
  } catch (e) {
    return {
      attempted: true,
      valid: false,
      errors: [{ path: '(schema)', message: e?.message || 'Ajv compile failed' }],
      compileFailed: true,
    };
  }
}

/**
 * @param {{ contract: object, rules?: object[], overrideSafeToReplay?: boolean }}
 */
export async function runLiveEndpointCheck({ contract, rules = [], overrideSafeToReplay = false }) {
  const rc = contract.requestConfig || {};
  let safe;
  if (rc.safeToReplay === true) safe = true;
  else if (rc.safeToReplay === false) safe = false;
  else safe = String(contract.method || 'GET').toUpperCase() === 'GET';

  if (!safe && !overrideSafeToReplay) {
    return {
      ok: false,
      blocked: true,
      error: 'This contract is marked not safe to replay. Enable override in the UI to run anyway.',
      code: 'UNSAFE_REPLAY',
    };
  }

  const method = String(contract.method || 'GET').toUpperCase();
  const url = resolveRequestUrl(contract);
  let headers = { Accept: 'application/json' };
  for (const row of rc.headers || []) {
    if (row?.key) headers[row.key] = row.value ?? '';
  }
  headers = applyAuth(headers, rc.authType, rc.authValue);

  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  let body = undefined;
  if (hasBody) {
    const raw = rc.replayBodyJson != null ? String(rc.replayBodyJson) : '{}';
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: `Invalid replay body JSON: ${e?.message || 'parse error'}`,
        code: 'BAD_BODY',
      };
    }
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const timeoutMs = Math.min(Math.max(Number(rc.timeoutMs) || 15000, 1000), 120000);
  const expectedCodes = (rc.expectedStatusCodes?.length ? rc.expectedStatusCodes : ['200']).map(String);

  const t0 = Date.now();
  let latencyMs;
  let statusCode;
  let responseData;
  let rawText;
  let operationalError;
  let errorType = null;

  try {
    const res = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: timeoutMs,
      validateStatus: () => true,
      responseType: 'text',
      transformResponse: [(d) => d],
    });
    latencyMs = Date.now() - t0;
    statusCode = res.status;
    rawText = typeof res.data === 'string' ? res.data : String(res.data ?? '');
    try {
      responseData = rawText ? JSON.parse(rawText) : null;
    } catch {
      responseData = null;
    }
  } catch (err) {
    latencyMs = Date.now() - t0;
    if (err.code === 'ECONNABORTED') {
      errorType = 'timeout';
      operationalError = `Request timed out after ${timeoutMs}ms`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorType = 'network';
      operationalError = err.message || 'Network error';
    } else {
      errorType = 'error';
      operationalError = err.message || 'Request failed';
    }
  }

  const operationalOk = !operationalError;
  const expectedStatusMatch =
    operationalOk && expectedCodes.includes(String(statusCode));

  let contractMatch = 'Unknown';
  let drift = null;
  let driftLines = [];
  let hasDrift = false;
  let validationResults = [];
  let ajvResult = { attempted: false, valid: true, errors: [] };
  let proposedExampleResponse = null;
  let proposalSummary = [];

  if (operationalOk && responseData !== null && typeof responseData === 'object') {
    const code = String(statusCode);
    const schema =
      contract.responseSchemas?.[code] || contract.responseSchemas?.['200'] || contract.responseSchemas?.[expectedCodes[0]];

    if (schema) {
      drift = compareToSchema(responseData, schema);
      driftLines = formatDriftSummary(drift);
      hasDrift =
        (drift.missingRequired?.length || 0) > 0 ||
        (drift.extraProperties?.length || 0) > 0 ||
        (drift.typeMismatches?.length || 0) > 0 ||
        (drift.nullRegressions?.length || 0) > 0 ||
        (drift.enumMismatches?.length || 0) > 0;

      ajvResult = runAjvOnSchema(schema, responseData);
      validationResults = evaluateAllRules(responseData, rules || []);
      const valFail = validationResults.some((v) => !v.pass);
      const ajvFail = ajvResult.attempted && !ajvResult.valid;

      if (!hasDrift && !valFail && !ajvFail && expectedStatusMatch) contractMatch = 'Full';
      else if (!hasDrift && !valFail && !ajvFail) contractMatch = 'Partial';
      else contractMatch = 'Partial';

      proposedExampleResponse = responseData;
      proposalSummary = summarizeProposal(drift, responseData);
      if (ajvFail) {
        proposalSummary.push(
          `Ajv reported ${ajvResult.errors.length} structural issue(s) — review keyword violations vs JSON Schema.`
        );
      }
      if (!expectedStatusMatch) {
        proposalSummary.push(
          `Status code ${statusCode} was not in expected list [${expectedCodes.join(', ')}].`
        );
      }
    } else {
      contractMatch = 'Unknown';
      proposalSummary = ['No stored response schema for this status code — import samples or extend contract.'];
      proposedExampleResponse = responseData;
    }
  } else if (operationalOk && responseData === null && rawText) {
    contractMatch = 'Partial';
    proposalSummary = ['Response was not valid JSON — contract JSON schema check skipped.'];
  } else if (!operationalOk) {
    contractMatch = 'N/A';
    proposalSummary = ['Operational failure — no contract comparison performed.'];
  }

  return {
    ok: true,
    operational: {
      ok: operationalOk,
      statusCode: statusCode ?? null,
      latencyMs,
      errorType,
      message: operationalError || null,
      expectedStatusMatch,
      expectedStatusCodes: expectedCodes,
    },
    contract: {
      contractMatch,
      hasDrift,
      drift,
      driftLines,
      ajv: ajvResult,
    },
    validationResults,
    proposedExampleResponse,
    proposalSummary,
    responseBodyPreview: rawText != null ? rawText.slice(0, 8000) : '',
    requestMeta: {
      url,
      method,
      headersSent: redactHeaders(headers),
    },
  };
}
