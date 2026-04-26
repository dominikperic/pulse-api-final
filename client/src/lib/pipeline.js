import { inferFromSamples, buildFieldSummary, formatMetaLines } from './schemaInference.js';
import { buildOpenApi31Document } from './openapi.js';
import { compareToSchema, formatDriftSummary } from './driftDetection.js';
import { evaluateAllRules } from './validationRules.js';

function safeParseJson(text, label) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: `${label}: ${e?.message || 'invalid JSON'}` };
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeContentType(headerValue) {
  const raw = String(headerValue || '').trim().toLowerCase();
  if (!raw) return '';
  return raw.split(';')[0].trim();
}

function detectLogEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Boolean(
    value.request ||
      value.response ||
      value.operationId ||
      value.endpointGroup ||
      value.endpointTemplate ||
      value.timestamp ||
      value.method ||
      value.path ||
      value.url ||
      value.status ||
      value.headers ||
      value.latencyMs
  );
}

function parseMaybeJson(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function extractPayloadAndMeta(entry, fallbackStatusCode, mode) {
  const isEnvelope = detectLogEnvelope(entry);
  if (!isEnvelope) {
    return {
      requestPayload: mode === 'request' ? entry : {},
      responsePayload: mode === 'response' ? entry : {},
      responseStatus: String(fallbackStatusCode || '200'),
      requestContentType: '',
      isEnvelope: false,
    };
  }

  const reqHeaders = entry.request?.headers || entry.headers || {};
  const reqContentType =
    normalizeContentType(reqHeaders['content-type']) ||
    normalizeContentType(reqHeaders['Content-Type']) ||
    normalizeContentType(entry.request?.contentType) ||
    normalizeContentType(entry.contentType);

  const requestPayload = parseMaybeJson(entry.request?.body ?? entry.requestBody ?? entry.body ?? {});
  const responsePayload = parseMaybeJson(
    entry.response?.body ??
      entry.responseBody ??
      // Response-only logs are often shaped as { status, headers, body }.
      (mode === 'response' ? entry.body : undefined) ??
      entry.result ??
      {}
  );
  const responseStatus = String(entry.response?.status ?? entry.status ?? fallbackStatusCode ?? '200');

  return {
    requestPayload,
    responsePayload,
    responseStatus,
    requestContentType: reqContentType,
    isEnvelope: true,
  };
}

function preferredRequestContentType(contentTypes) {
  if (!contentTypes.length) return 'application/json';
  const counts = new Map();
  contentTypes.forEach((ct) => {
    counts.set(ct, (counts.get(ct) || 0) + 1);
  });
  let best = 'application/json';
  let bestCount = -1;
  for (const [ct, count] of counts.entries()) {
    if (count > bestCount) {
      best = ct;
      bestCount = count;
    }
  }
  return best;
}

/**
 * @param {{
 *   name: string,
 *   method: string,
 *   path: string,
 *   authConfig?: { type?: 'none' | 'bearer' },
 *   requestSamples: { body: string }[],
 *   responseSamples: { statusCode: string, body: string }[],
 * }} input
 */
export function runImportAnalysis(input) {
  const errors = [];
  const requestPayloads = [];
  const observedRequestContentTypes = [];
  let extractedFromLogWrappers = 0;
  for (let i = 0; i < input.requestSamples.length; i++) {
    const r = safeParseJson(input.requestSamples[i].body, `Request sample ${i + 1}`);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    for (const item of toArray(r.value)) {
      const extracted = extractPayloadAndMeta(item, '200', 'request');
      requestPayloads.push(extracted.requestPayload);
      if (extracted.requestContentType) observedRequestContentTypes.push(extracted.requestContentType);
      if (extracted.isEnvelope) extractedFromLogWrappers += 1;
    }
  }

  const responseByStatus = {};
  for (let i = 0; i < input.responseSamples.length; i++) {
    const s = input.responseSamples[i];
    const fallbackCode = String(s.statusCode || '200').trim() || '200';
    const r = safeParseJson(s.body, `Response ${fallbackCode} sample ${i + 1}`);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    for (const item of toArray(r.value)) {
      const extracted = extractPayloadAndMeta(item, fallbackCode, 'response');
      const code = String(extracted.responseStatus || fallbackCode);
      if (!responseByStatus[code]) responseByStatus[code] = [];
      responseByStatus[code].push(extracted.responsePayload);
      if (extracted.isEnvelope) extractedFromLogWrappers += 1;
    }
  }

  const reqInference = inferFromSamples(requestPayloads, 'request');
  const responseSchemas = {};
  const responseMeta = {};

  for (const [code, vals] of Object.entries(responseByStatus)) {
    const inf = inferFromSamples(vals, `response.${code}`);
    responseSchemas[code] = inf.schema;
    responseMeta[code] = inf.meta;
  }

  if (Object.keys(responseSchemas).length === 0) {
    responseSchemas['200'] = { type: 'object', properties: {}, additionalProperties: false };
  }

  const mergedConflicts = [
    ...reqInference.meta.typeConflicts,
    ...Object.values(responseMeta).flatMap((m) => m.typeConflicts),
  ];
  const mergedWarnings = [
    ...reqInference.meta.warnings,
    ...Object.values(responseMeta).flatMap((m) => m.warnings),
  ];
  const mergedNullable = [
    ...reqInference.meta.nullableFields,
    ...Object.values(responseMeta).flatMap((m) => m.nullableFields),
  ];
  const mergedObservedValues = [
    ...reqInference.meta.observedValueCandidates,
    ...Object.values(responseMeta).flatMap((m) => m.observedValueCandidates),
  ];

  const fmt = formatMetaLines({
    typeConflicts: mergedConflicts,
    warnings: mergedWarnings,
    nullableFields: mergedNullable,
    observedValueCandidates: mergedObservedValues,
  });

  const analysisMeta = {
    ...fmt,
    requestFieldSummary: buildFieldSummary(reqInference.schema),
    responseFieldSummary: Object.fromEntries(
      Object.keys(responseSchemas).map((c) => [c, buildFieldSummary(responseSchemas[c])])
    ),
    requestSchema: reqInference.schema,
    responseSchemas,
    requestContentType: preferredRequestContentType(observedRequestContentTypes),
    sourceEntryCount: requestPayloads.length + Object.values(responseByStatus).reduce((n, rows) => n + rows.length, 0),
    logWrapperEntriesExtracted: extractedFromLogWrappers,
  };

  const openApiDocument = buildOpenApi31Document({
    title: input.name || 'Inferred API',
    method: input.method,
    path: input.path,
    requestSchema: reqInference.schema,
    responseSchemas,
    requestContentType: analysisMeta.requestContentType,
    serverUrl: input.url || input.endpoint || '',
    authConfig: input.authConfig || { type: 'none' },
  });

  return {
    errors,
    openApiDocument,
    analysisMeta,
    mergedConflicts,
    mergedWarnings,
  };
}

export function runSampleCheck({ sampleJsonText, sampleKind, statusCode, contract, rules }) {
  const parsed = safeParseJson(sampleJsonText, 'Sample');
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const body = parsed.value;

  const code = String(statusCode || '200');
  const schema =
    sampleKind === 'request'
      ? contract.requestSchema
      : contract.responseSchemas?.[code] || contract.responseSchemas?.['200'];

  if (!schema) {
    return { ok: false, error: 'No schema for this sample type / status code.' };
  }

  const drift = compareToSchema(body, schema);
  const driftLines = formatDriftSummary(drift);
  const hasDrift =
    drift.missingRequired.length > 0 ||
    drift.extraProperties.length > 0 ||
    drift.typeMismatches.length > 0 ||
    drift.nullRegressions.length > 0 ||
    (drift.enumMismatches && drift.enumMismatches.length > 0);

  const validationResults = evaluateAllRules(body, rules || []);
  const valFail = validationResults.some((v) => !v.pass);

  return {
    ok: true,
    body,
    drift,
    driftLines,
    hasDrift,
    validationResults,
    contractMatch: !hasDrift && !valFail ? 'Full' : 'Partial',
  };
}

export { compareToSchema, formatDriftSummary, evaluateAllRules };
