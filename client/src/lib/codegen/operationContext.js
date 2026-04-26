const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

export function getServerBaseUrl(doc) {
  const s = doc?.servers?.[0]?.url;
  if (typeof s === 'string' && s.trim()) return s.replace(/\/$/, '');
  return 'https://api.example.com';
}

function deriveBaseFromEndpoint(endpoint, pathTemplate) {
  const raw = String(endpoint || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const p = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`;
    if (u.pathname.endsWith(p)) {
      return `${u.origin}${u.pathname.slice(0, u.pathname.length - p.length)}`.replace(/\/$/, '');
    }
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * @param {object} doc OpenAPI document
 * @param {{ path?: string, method?: string }} contract
 */
export function extractPrimaryOperation(doc, contract) {
  const rawPath = contract?.path || '/';
  const fallbackPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const fallbackMethod = String(contract?.method || 'GET').toLowerCase();

  const paths = doc?.paths || {};
  const pathKeys = Object.keys(paths);
  if (pathKeys.length === 0) {
    return { pathTemplate: fallbackPath, method: fallbackMethod, operation: null };
  }

  const pathKey =
    pathKeys.find((p) => p === fallbackPath || p === contract?.path) || pathKeys[0];
  const item = paths[pathKey] || {};
  let method = fallbackMethod;
  if (!item[method]) {
    method = HTTP_METHODS.find((m) => item[m]) || fallbackMethod;
  }
  const operation = item[method] || null;

  return { pathTemplate: pathKey, method, operation };
}

export function getRequestBodySchema(operation) {
  const content = operation?.requestBody?.content || {};
  const contentType =
    Object.keys(content).find((k) => k.toLowerCase() === 'application/json') || Object.keys(content)[0] || 'application/json';
  return { schema: content?.[contentType]?.schema ?? null, contentType };
}

export function getPrimaryResponseSchema(operation) {
  const responses = operation?.responses || {};
  const codes = Object.keys(responses).sort((a, b) => Number(a) - Number(b));
  const two = codes.find((c) => /^(2\d\d|default)$/.test(c));
  const code = two || codes[0] || '200';
  const entry = responses[code];
  const sch = entry?.content?.['application/json']?.schema ?? null;
  return { statusCode: code, schema: sch, description: entry?.description };
}

/**
 * @param {object} doc
 * @param {object | null} operation
 * @returns {{ header: string, value: string, scheme?: string }[]}
 */
export function extractSecurityHeaderHints(doc, operation) {
  const hints = [];
  const schemes = doc?.components?.securitySchemes || {};

  const opSec = operation?.security;
  const globalSec = doc?.security;
  const useSecurity = (opSec && opSec.length ? opSec : globalSec) || [];

  for (const secReq of useSecurity) {
    for (const name of Object.keys(secReq)) {
      const sch = schemes[name];
      if (sch?.type === 'http' && sch.scheme === 'bearer') {
        hints.push({ header: 'Authorization', value: 'Bearer YOUR_ACCESS_TOKEN', scheme: name });
      }
      if (sch?.type === 'apiKey' && sch.in === 'header') {
        hints.push({ header: sch.name || 'X-API-Key', value: 'YOUR_API_KEY', scheme: name });
      }
    }
  }

  if (hints.length === 0) {
    for (const [name, sch] of Object.entries(schemes)) {
      if (sch?.type === 'http' && sch.scheme === 'bearer') {
        hints.push({ header: 'Authorization', value: 'Bearer YOUR_ACCESS_TOKEN', scheme: name });
      }
    }
  }

  return hints;
}

/**
 * @param {object} contract App contract row
 */
export function buildGenerationContext(contract) {
  const doc = contract?.openApiDocument;
  const { pathTemplate, method, operation } = extractPrimaryOperation(doc || {}, contract || {});

  const docBaseUrl = getServerBaseUrl(doc || {});
  const fallbackBase = deriveBaseFromEndpoint(contract?.endpoint, pathTemplate);
  const baseUrl = docBaseUrl === 'https://api.example.com' && fallbackBase ? fallbackBase : docBaseUrl;
  const fullUrl = `${baseUrl}${pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`}`;

  const operationId =
    operation?.operationId ||
    `${method}_${pathTemplate.replace(/^\//, '').replace(/\//g, '_') || 'root'}`.replace(/__+/g, '_');

  const summary = operation?.summary || contract?.name || 'API operation';

  const reqBody = getRequestBodySchema(operation);
  const requestSchema = reqBody?.schema || contract?.requestSchema || null;
  const requestContentType = reqBody?.schema
    ? reqBody.contentType
    : contract?.analysisMeta?.requestContentType || 'application/json';

  const { statusCode, schema: opResponseSchema } = getPrimaryResponseSchema(operation);
  const responseSchemas = contract?.responseSchemas || {};
  const responseSchema =
    opResponseSchema || responseSchemas[statusCode] || responseSchemas['200'] || null;

  const securityHints = extractSecurityHeaderHints(doc || {}, operation);

  return {
    contract,
    doc: doc || {},
    pathTemplate,
    method,
    operation,
    baseUrl,
    fullUrl,
    operationId,
    summary,
    requestSchema,
    requestContentType,
    responseSchema,
    responseStatusCode: statusCode,
    securityHints,
  };
}
