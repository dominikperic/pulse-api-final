function toPascalCase(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}

function toCamelCase(input) {
  const p = toPascalCase(input);
  return p ? p[0].toLowerCase() + p.slice(1) : 'callApi';
}

export function generateWrapperSnippet(contract, typeMeta, zodMeta) {
  const opName = toCamelCase(contract?.name || `${contract?.method || 'call'} ${contract?.path || 'endpoint'}`);
  const requestType = typeMeta?.requestTypeName || 'Record<string, unknown>';
  const responseType = typeMeta?.primaryResponseTypeName || 'unknown';
  const responseSchema = zodMeta?.primaryResponseSchemaName || null;
  const endpoint = contract?.endpoint || `https://api.example.com${contract?.path || ''}`;
  const method = String(contract?.method || 'POST').toUpperCase();

  const validationLine = responseSchema
    ? `  const parsed = ${responseSchema}.safeParse(raw);\n  if (!parsed.success) throw new Error(parsed.error.message);\n  return parsed.data as ${responseType};`
    : `  return raw as ${responseType};`;

  return `export async function ${opName}(payload: ${requestType}): Promise<${responseType}> {
  const res = await fetch('${endpoint}', {
    method: '${method}',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(\`${method} ${contract?.path || '/'} failed with \${res.status}\`);
  }

  const raw = await res.json();
${validationLine}
}`;
}
