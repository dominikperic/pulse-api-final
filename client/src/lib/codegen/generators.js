import { exampleFromSchema, schemaToNamedTsInterfaces, pythonFieldComments } from './schemaUtils.js';

function toPascalFromOperationId(operationId) {
  const raw = String(operationId || 'apiCall')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return raw || 'ApiCall';
}

function methodHasBody(method) {
  return ['post', 'put', 'patch', 'delete'].includes(String(method).toLowerCase());
}

function buildFormUrlEncodedBodySection(schema) {
  const props = schema?.properties || {};
  const required = new Set(schema?.required || []);
  const keys = Object.keys(props);
  if (!keys.length) {
    return `  const params = new URLSearchParams();\n  const requestBody = params.toString();`;
  }

  const lines = ['  const params = new URLSearchParams();'];
  keys.forEach((key) => {
    const access = `body.${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `['${key.replace(/'/g, "\\'")}']`}`;
    const appendLine = `params.append(${JSON.stringify(key)}, String(${access}));`;
    if (required.has(key)) {
      lines.push(`  ${appendLine}`);
    } else {
      lines.push(`  if (${access} !== undefined) ${appendLine}`);
    }
  });
  lines.push('  const requestBody = params.toString();');
  return lines.join('\n');
}

/**
 * @param {ReturnType<import('./operationContext.js').buildGenerationContext>} ctx
 */
export function generateTypeScriptClient(ctx) {
  const base = toPascalFromOperationId(ctx.operationId);
  const reqName = `${base}RequestBody`;
  const resName = `${base}Response`;

  const reqBlocks = ctx.requestSchema
    ? schemaToNamedTsInterfaces(reqName, ctx.requestSchema).blocks
    : [`export type ${reqName} = Record<string, never>;`];

  const resBlocks = ctx.responseSchema
    ? schemaToNamedTsInterfaces(resName, ctx.responseSchema).blocks
    : [`export type ${resName} = unknown;`];

  const fnName = ctx.operationId
    ? String(ctx.operationId)
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^([0-9])/, '_$1')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'callApi'
    : 'callApi';

  const urlExpr = JSON.stringify(ctx.fullUrl);
  const methodStr = JSON.stringify(String(ctx.method || 'GET').toUpperCase());
  const requestContentType = String(ctx.requestContentType || 'application/json').toLowerCase();
  const useFormEncoding = requestContentType === 'application/x-www-form-urlencoded';

  const headerInit = ['Accept: application/json'];
  for (const h of ctx.securityHints || []) {
    headerInit.push(`${h.header}: ${h.value}`);
  }
  const headersObj = headerInit.map((line) => {
    const idx = line.indexOf(':');
    const k = idx >= 0 ? line.slice(0, idx).trim() : line;
    const v = idx >= 0 ? line.slice(idx + 1).trim() : '';
    return `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`;
  });

  const signalLine = '    ...(options?.signal ? { signal: options.signal } : {}),';
  const hasTypedBody = methodHasBody(ctx.method) && ctx.requestSchema;
  const requestParam = hasTypedBody ? `body: ${reqName}, ` : '';

  const requestBodyBuilder = useFormEncoding
    ? buildFormUrlEncodedBodySection(ctx.requestSchema)
    : '  const requestBody = JSON.stringify(body);';

  const bodySection = hasTypedBody
    ? `
${requestBodyBuilder}

  const res = await fetch(${urlExpr}, {
    method: ${methodStr},
    headers: {
${headersObj.join('\n')}
      'Content-Type': ${JSON.stringify(requestContentType)},
    },
    body: requestBody,
${signalLine}
  });`
    : `
  const res = await fetch(${urlExpr}, {
    method: ${methodStr},
    headers: {
${headersObj.join('\n')}
    },
${signalLine}
  });`;

  const impl = `/**
 * ${ctx.summary}
 * ${String(ctx.method || '').toUpperCase()} ${ctx.pathTemplate}
 * operationId: ${ctx.operationId}
 */
${[...reqBlocks, ...resBlocks].join('\n\n')}

export async function ${fnName}(${requestParam}options?: { signal?: AbortSignal }): Promise<${resName}> {${bodySection}

  if (!res.ok) {
    throw new Error(\`Request failed: \${res.status} \${res.statusText}\`);
  }

  return (await res.json()) as ${resName};
}
`;

  return impl.trim();
}

/**
 * @param {ReturnType<import('./operationContext.js').buildGenerationContext>} ctx
 */
export function generateJavaScriptClient(ctx) {
  let fnName = ctx.operationId
    ? String(ctx.operationId)
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^([0-9])/, '_$1')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    : 'callApi';
  if (!fnName || /^[0-9]/.test(fnName)) fnName = `_${fnName || 'callApi'}`;

  const method = String(ctx.method || 'GET').toUpperCase();
  const requestContentType = String(ctx.requestContentType || 'application/json').toLowerCase();
  const useFormEncoding = requestContentType === 'application/x-www-form-urlencoded';
  const headerInit = { Accept: 'application/json' };
  for (const h of ctx.securityHints || []) {
    headerInit[h.header] = h.value;
  }
  const hasBody = methodHasBody(ctx.method) && ctx.requestSchema;
  const payload = ctx.exampleBody != null ? ctx.exampleBody : exampleFromSchema(ctx.requestSchema);

  const jsDoc = `/**
 * ${ctx.summary}
 * ${method} ${ctx.pathTemplate}
 * operationId: ${ctx.operationId}
 * @param {Object} [params]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<Object>}
 */`;

  return `${jsDoc}
export async function ${fnName}(params = {}) {
  const headers = ${JSON.stringify(headerInit, null, 2)};
${hasBody ? `  headers['Content-Type'] = ${JSON.stringify(requestContentType)};` : ''}
${hasBody ? `  const body = ${JSON.stringify(payload ?? {}, null, 2)};` : ''}
${hasBody ? `  const requestBody = ${useFormEncoding ? "new URLSearchParams(body).toString()" : "JSON.stringify(body)"};` : ''}

  const response = await fetch(${JSON.stringify(ctx.fullUrl)}, {
    method: ${JSON.stringify(method)},
    headers,
${hasBody ? `    body: requestBody,` : ''}
    ...(params.signal ? { signal: params.signal } : {}),
  });

  if (!response.ok) {
    throw new Error(\`Request failed: \${response.status} \${response.statusText}\`);
  }

  // Keep wrapper safe for weakly typed integrations.
  const data = await response.json();
  if (data == null || typeof data !== 'object') {
    throw new Error('Expected JSON object response');
  }
  return data;
}`.trim();
}

/**
 * @param {ReturnType<import('./operationContext.js').buildGenerationContext>} ctx
 */
export function generatePythonClient(ctx) {
  let fn = ctx.operationId
    ? String(ctx.operationId)
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^([0-9])/, '_$1')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    : 'call_api';
  if (!fn || /^[0-9]/.test(fn)) fn = `_${fn || 'call_api'}`;

  const url = ctx.fullUrl;
  const method = String(ctx.method || 'GET').toUpperCase();
  const requestContentType = String(ctx.requestContentType || 'application/json').toLowerCase();
  const useFormEncoding = requestContentType === 'application/x-www-form-urlencoded';

  const fieldLines = ctx.requestSchema ? pythonFieldComments(ctx.requestSchema) : [];
  const payload = ctx.exampleBody != null ? ctx.exampleBody : exampleFromSchema(ctx.requestSchema);

  const headersDict = { Accept: 'application/json' };
  for (const h of ctx.securityHints || []) {
    headersDict[h.header] = h.value;
  }

  const headersRepr = JSON.stringify(headersDict, null, 4)
    .split('\n')
    .map((l) => (l.trim() ? `    ${l.trim()}` : ''))
    .filter(Boolean)
    .join('\n');

  const hasBody = methodHasBody(ctx.method) && ctx.requestSchema;

  const doc = `"""${ctx.summary}
Generated from OpenAPI operationId \`${ctx.operationId}\`.
Endpoint: ${method} ${ctx.pathTemplate}
"""`;

  const payloadJsonBlock = JSON.stringify(payload ?? {}, null, 2);

  if (!hasBody) {
    return `${doc}
import requests

def ${fn}(timeout: float = 30.0) -> dict:
    url = ${JSON.stringify(url)}
    headers = {
${headersRepr}
    }
    response = requests.request(${JSON.stringify(method)}, url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()
`.trim();
  }

  return `${doc}
import json
import requests

def ${fn}(timeout: float = 30.0) -> dict:
    url = ${JSON.stringify(url)}
    headers = {
${headersRepr},
        "Content-Type": ${JSON.stringify(requestContentType)},
    }
${fieldLines.length ? fieldLines.join('\n') + '\n' : ''}    payload = json.loads(r'''
${payloadJsonBlock}
''')
    response = requests.request(${JSON.stringify(method)}, url, headers=headers, ${
      useFormEncoding ? 'data=payload' : 'json=payload'
    }, timeout=timeout)
    response.raise_for_status()
    return response.json()
`.trim();
}

/**
 * Express route stub from contract operation.
 * @param {ReturnType<import('./operationContext.js').buildGenerationContext>} ctx
 */
export function generateExpressStub(ctx) {
  const method = String(ctx.method || 'get').toLowerCase();
  const path = ctx.pathTemplate || '/';
  const opId = ctx.operationId || 'handler';
  const required = ctx.requestSchema?.required?.length
    ? ctx.requestSchema.required.map((f) => `// TODO: validate required body field: ${f}`).join('\n')
    : '// No required fields declared on request schema';
  const props = ctx.requestSchema?.properties
    ? Object.keys(ctx.requestSchema.properties)
        .map((k) => `//   req.body.${k} — ${JSON.stringify(ctx.requestSchema.properties[k]?.type || 'unknown')}`)
        .join('\n')
    : '// (empty request schema)';

  const exampleRes = ctx.responseSchema ? exampleFromSchema(ctx.responseSchema) : { ok: true };
  const status = String(ctx.responseStatusCode || '200');

  return `/**
 * ${ctx.summary}
 * OpenAPI operationId: ${opId}
 * ${method.toUpperCase()} ${path}
 */
// app.${method}(${JSON.stringify(path)}, async (req, res) => {
router.${method}(${JSON.stringify(path)}, async (req, res) => {
${required}
${props}

  // TODO: implement business logic; below is a placeholder shape from the inferred response schema
  const responseBody = ${JSON.stringify(exampleRes, null, 4)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `  ${l}`))
    .join('\n')};

  res.status(${JSON.stringify(status)}).json(responseBody);
});
`.trim();
}
