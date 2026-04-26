import { exampleFromSchema } from './schemaUtils.js';

function escapeShellSingleQuotes(s) {
  return String(s).replace(/'/g, `'\"'\"'`);
}

function methodHasBody(method) {
  return ['post', 'put', 'patch', 'delete'].includes(String(method).toLowerCase());
}

/**
 * @param {import('./operationContext.js').buildGenerationContext extends Function ? never : any} ctx
 */
export function generateCurlSnippet(ctx) {
  const method = String(ctx.method || 'GET').toUpperCase();
  const url = ctx.fullUrl;
  const lines = [`curl -X ${method} '${escapeShellSingleQuotes(url)}'`];

  for (const h of ctx.securityHints || []) {
    lines.push(`  -H "${h.header}: ${h.value}"`);
  }

  const hasJsonBody = methodHasBody(ctx.method) && ctx.requestSchema;

  if (hasJsonBody) {
    lines.push('  -H "Content-Type: application/json"');
    const body = ctx.exampleBody != null ? ctx.exampleBody : exampleFromSchema(ctx.requestSchema);
    const json = JSON.stringify(body ?? {}, null, 0);
    const escaped = escapeShellSingleQuotes(json);
    lines.push(`  -d '${escaped}'`);
  }

  return lines.join(' \\\n');
}

/**
 * @param {object} ctx generation context with exampleBody optional
 */
export function generateFetchSnippet(ctx) {
  const method = String(ctx.method || 'GET').toUpperCase();
  const url = ctx.fullUrl;
  const headers = { Accept: 'application/json' };
  for (const h of ctx.securityHints || []) {
    headers[h.header] = h.value;
  }

  const hasBody = methodHasBody(ctx.method) && ctx.requestSchema;
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const bodyObj =
    hasBody && ctx.requestSchema
      ? ctx.exampleBody != null
        ? ctx.exampleBody
        : exampleFromSchema(ctx.requestSchema)
      : null;

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');

  if (!hasBody) {
    return `const response = await fetch(${JSON.stringify(url)}, {
  method: ${JSON.stringify(method)},
  headers: {
${headerLines}
  },
});

if (!response.ok) {
  throw new Error(\`HTTP \${response.status}\`);
}

const data = await response.json();
return data;
`;
  }

  const bodyJson = JSON.stringify(bodyObj ?? {}, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');

  return `const response = await fetch(${JSON.stringify(url)}, {
  method: ${JSON.stringify(method)},
  headers: {
${headerLines}
  },
  body: JSON.stringify(
${bodyJson}
  ),
});

if (!response.ok) {
  throw new Error(\`HTTP \${response.status}\`);
}

const data = await response.json();
return data;
`;
}
