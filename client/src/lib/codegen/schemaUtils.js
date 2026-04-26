/**
 * JSON Schema (OpenAPI-style) → example values and TypeScript-ish types.
 */

function normalizeJsonSchemaType(type) {
  if (type == null) return ['unknown'];
  if (Array.isArray(type)) return type.length ? type : ['unknown'];
  return [type];
}

/**
 * Build a plausible example JSON object from a JSON Schema object.
 * @param {object | null | undefined} schema
 * @param {number} depth
 * @returns {unknown}
 */
export function exampleFromSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 14) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  const types = normalizeJsonSchemaType(schema.type);

  if (schema.enum?.length) return schema.enum[0];

  if (types.includes('object') || schema.properties) {
    const out = {};
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    for (const [key, sub] of Object.entries(props)) {
      if (!required.has(key) && Object.keys(props).length > 12) {
        continue;
      }
      out[key] = exampleFromSchema(sub, depth + 1);
    }
    return out;
  }

  if (types.includes('array')) {
    const item = schema.items ? exampleFromSchema(schema.items, depth + 1) : null;
    if (item === undefined) return [];
    return [item];
  }

  if (types.includes('string')) return 'example_string';
  if (types.includes('integer')) return 0;
  if (types.includes('number')) return 0;
  if (types.includes('boolean')) return false;
  if (types.includes('null')) return null;

  return null;
}

function sanitizeIdentifier(part) {
  const s = String(part || 'field').replace(/[^a-zA-Z0-9_]+/g, '_');
  const cleaned = s.replace(/^([0-9])/, '_$1');
  return cleaned || 'Field';
}

function tsPropKey(name) {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return name;
  return `'${String(name).replace(/'/g, "\\'")}'`;
}

/**
 * @param {object | null | undefined} schema
 * @param {string} indent
 * @param {number} depth
 * @returns {string}
 */
export function schemaToTsType(schema, indent = '  ', depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 12) return 'unknown';
  if (schema.$ref) return 'unknown';

  const types = normalizeJsonSchemaType(schema.type);
  const nullable = types.includes('null');
  const nonNullTypes = types.filter((t) => t !== 'null');

  const wrapNull = (inner) => (nullable ? `${inner} | null` : inner);

  if (nullable && nonNullTypes.length === 0) {
    return 'null';
  }

  if (schema.enum?.length && nonNullTypes.every((t) => t === 'string' || t === 'unknown')) {
    const union = schema.enum.map((v) => (typeof v === 'string' ? JSON.stringify(v) : String(v))).join(' | ');
    return wrapNull(union || 'string');
  }

  if (nonNullTypes.includes('object') || schema.properties) {
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    if (Object.keys(props).length === 0) {
      const closedObject = schema.additionalProperties === false;
      return wrapNull(closedObject ? 'Record<string, never>' : 'Record<string, unknown>');
    }
    const inner = `${indent}  `;
    const lines = Object.entries(props).map(([key, sub]) => {
      const opt = required.has(key) ? '' : '?';
      const t = schemaToTsType(sub, inner, depth + 1);
      return `${inner}${tsPropKey(key)}${opt}: ${t};`;
    });
    return wrapNull(`{\n${lines.join('\n')}\n${indent}}`);
  }

  if (nonNullTypes.includes('array')) {
    const item = schema.items ? schemaToTsType(schema.items, indent, depth + 1) : 'unknown';
    return wrapNull(`${item}[]`);
  }

  let core = 'unknown';
  if (nonNullTypes.length === 1) {
    const t = nonNullTypes[0];
    if (t === 'string') core = 'string';
    else if (t === 'integer' || t === 'number') core = 'number';
    else if (t === 'boolean') core = 'boolean';
    else if (t === 'null') core = 'null';
  } else if (nonNullTypes.length > 1) {
    core = nonNullTypes
      .map((t) => {
        if (t === 'integer' || t === 'number') return 'number';
        if (t === 'string' || t === 'boolean') return t;
        return 'unknown';
      })
      .join(' | ');
  }

  return wrapNull(core);
}

/**
 * Export named interfaces for request/response when schema is an object with properties.
 * @param {string} baseName PascalCase base
 * @param {object | null} schema
 * @returns {{ blocks: string[], refName: string }}
 */
export function schemaToNamedTsInterfaces(baseName, schema) {
  const blocks = [];
  if (!schema || typeof schema !== 'object') {
    blocks.push(`export type ${baseName} = unknown;`);
    return { blocks, refName: baseName };
  }

  const types = normalizeJsonSchemaType(schema.type);
  const isObj = types.includes('object') || schema.properties;
  if (!isObj || !schema.properties || Object.keys(schema.properties).length === 0) {
    const alias = schemaToTsType(schema);
    blocks.push(`export type ${baseName} = ${alias};`);
    return { blocks, refName: baseName };
  }

  const lines = [];
  const required = new Set(schema.required || []);
  for (const [key, sub] of Object.entries(schema.properties)) {
    const opt = required.has(key) ? '' : '?';
    const t = schemaToTsType(sub, '  ', 0);
    lines.push(`  ${tsPropKey(key)}${opt}: ${t};`);
  }
  blocks.push(`export interface ${baseName} {\n${lines.join('\n')}\n}`);
  return { blocks, refName: baseName };
}

/**
 * One-line Python type comment from schema (lightweight).
 * @param {object | null} schema
 * @returns {string}
 */
export function schemaToPythonTypeComment(schema) {
  if (!schema || typeof schema !== 'object') return 'Any';
  const types = normalizeJsonSchemaType(schema.type);
  const nullable = types.includes('null');
  const wrapOptional = (base) => (nullable ? `Optional[${base}]` : base);
  if (types.includes('object') || schema.properties) return wrapOptional('dict[str, Any]');
  if (types.includes('array')) return wrapOptional('list[Any]');
  if (types.includes('string')) return wrapOptional('str');
  if (types.includes('integer') || types.includes('number')) return wrapOptional('int | float');
  if (types.includes('boolean')) return wrapOptional('bool');
  if (types.includes('null')) return 'None';
  return 'Any';
}

export function pythonFieldComments(schema) {
  if (!schema?.properties) return [];
  const required = new Set(schema.required || []);
  return Object.entries(schema.properties).map(([key, sub]) => {
    const req = required.has(key) ? 'required' : 'optional';
    return `#   ${key}: ${req}, ${schemaToPythonTypeComment(sub)}`;
  });
}

export { sanitizeIdentifier };
