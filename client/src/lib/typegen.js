function toPascalCase(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}

function normalizeSchemaType(schema) {
  const t = schema?.type;
  if (!t) return { base: null, nullable: false, nullOnly: false };
  if (Array.isArray(t)) {
    const nullable = t.includes('null');
    const base = t.find((x) => x !== 'null') || null;
    return { base, nullable, nullOnly: nullable && !base };
  }
  return { base: t, nullable: false, nullOnly: false };
}

function tsLiteral(v) {
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  return JSON.stringify(v);
}

function tsFromSchema(schema, nameHint, nested, level = 0) {
  if (!schema || typeof schema !== 'object') return 'unknown';
  const { base, nullable, nullOnly } = normalizeSchemaType(schema);
  const enumVals = Array.isArray(schema.enum) ? schema.enum : null;
  const addNull = (typeText) => (nullable ? `${typeText} | null` : typeText);

  if (nullOnly) return 'null';

  if (enumVals?.length) {
    return addNull(enumVals.map(tsLiteral).join(' | '));
  }
  if (base === 'string') return addNull('string');
  if (base === 'integer' || base === 'number') return addNull('number');
  if (base === 'boolean') return addNull('boolean');
  if (base === 'array') {
    const itemName = `${nameHint}Item`;
    const item = tsFromSchema(schema.items || { type: 'unknown' }, itemName, nested, level + 1);
    return addNull(`(${item})[]`);
  }
  if (base === 'object' || schema.properties) {
    const typeName = toPascalCase(nameHint);
    const props = schema.properties || {};
    if (Object.keys(props).length === 0) {
      const closedObject = schema.additionalProperties === false;
      return addNull(closedObject ? 'Record<string, never>' : 'Record<string, unknown>');
    }
    const required = new Set(schema.required || []);
    const lines = Object.entries(props).map(([key, val]) => {
      const safeKey = /^[a-zA-Z_]\w*$/.test(key) ? key : `'${key}'`;
      const optional = required.has(key) ? '' : '?';
      const childName = `${typeName}${toPascalCase(key)}`;
      const childType = tsFromSchema(val, childName, nested, level + 1);
      return `  ${safeKey}${optional}: ${childType};`;
    });
    nested.push(`export interface ${typeName} {\n${lines.join('\n')}\n}`);
    return addNull(typeName);
  }
  return addNull('unknown');
}

export function generateTypeModels(contract) {
  const baseName = toPascalCase(contract?.name || `${contract?.method || 'Api'}${contract?.path || 'Endpoint'}`) || 'ApiOperation';
  const nested = [];
  const requestRootName = `${baseName}Request`;
  const requestType = tsFromSchema(contract?.requestSchema || {}, requestRootName, nested);
  const responseCodes = Object.keys(contract?.responseSchemas || {}).sort();
  const responseLines = [];
  for (const code of responseCodes) {
    const typeName = `${baseName}Response${code}`;
    const outType = tsFromSchema(contract.responseSchemas[code], typeName, nested);
    if (outType !== typeName) {
      responseLines.push(`export type ${typeName} = ${outType};`);
    }
  }
  const mainResponseName = responseCodes[0] ? `${baseName}Response${responseCodes[0]}` : 'unknown';

  const content = [
    ...(requestType === requestRootName ? [] : [`export type ${requestRootName} = ${requestType};`]),
    ...responseLines,
    ...nested.filter((v, i, arr) => arr.indexOf(v) === i),
  ].join('\n\n');

  return {
    baseName,
    requestTypeName: requestRootName,
    primaryResponseTypeName: mainResponseName,
    responseCodes,
    content,
  };
}
