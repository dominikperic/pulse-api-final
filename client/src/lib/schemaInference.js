/**
 * Infer JSON Schema–style structures from multiple JSON values (OpenAPI 3.1 compatible).
 */

const MAX_OBSERVED_VALUES = 8;

export const MISSING = Symbol('missing');

function jsonTypeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  if (t === 'object') return 'object';
  return t;
}

function unique(arr) {
  return [...new Set(arr)];
}

/**
 * @param {any[]} values — may include MISSING or null
 * @returns {{ schema: object, required: boolean, conflicts: string[], nullable: boolean }}
 */
export function inferJsonValues(values, pathLabel = 'root') {
  const conflicts = [];
  const anyMissing = values.some((v) => v === MISSING);
  const anyNull = values.some((v) => v === null);
  const present = values.filter((v) => v !== MISSING);

  if (present.length === 0) {
    return {
      schema: { type: 'null' },
      required: !anyMissing,
      conflicts,
      nullable: true,
    };
  }

  const nonNull = present.filter((v) => v !== null);
  if (nonNull.length === 0) {
    return {
      schema: { type: anyMissing ? ['null'] : 'null' },
      required: !anyMissing,
      conflicts,
      nullable: true,
    };
  }

  const types = unique(nonNull.map((v) => jsonTypeOf(v)));
  if (types.length > 1) {
    conflicts.push(`Type conflict at ${pathLabel}: ${types.join(', ')}`);
  }

  const t = jsonTypeOf(nonNull[0]);

  if (t === 'boolean') {
    const observed = unique(nonNull.filter((v) => typeof v === 'boolean'));
    const s = {
      type: anyNull ? ['boolean', 'null'] : 'boolean',
      ...(observed.length ? { 'x-observedValues': observed.slice(0, MAX_OBSERVED_VALUES) } : {}),
    };
    return { schema: s, required: !anyMissing, conflicts, nullable: anyNull };
  }

  if (t === 'number' || t === 'integer') {
    const allInt = nonNull.every((v) => typeof v === 'number' && Number.isInteger(v));
    const ty = allInt ? 'integer' : 'number';
    const observed = unique(nonNull.filter((v) => typeof v === 'number'));
    const s = {
      type: anyNull ? [ty, 'null'] : ty,
      ...(observed.length ? { 'x-observedValues': observed.slice(0, MAX_OBSERVED_VALUES) } : {}),
    };
    return { schema: s, required: !anyMissing, conflicts, nullable: anyNull };
  }

  if (t === 'string') {
    const strs = nonNull.filter((v) => typeof v === 'string');
    let s;
    const uniq = unique(strs);
    // Do not infer strict enums from observed samples by default.
    s = {
      type: 'string',
      ...(uniq.length ? { 'x-observedValues': uniq.slice(0, MAX_OBSERVED_VALUES).sort() } : {}),
    };
    if (anyNull) {
      s = { ...s, type: Array.isArray(s.type) ? s.type : [s.type, 'null'] };
    }
    return { schema: s, required: !anyMissing, conflicts, nullable: anyNull };
  }

  if (t === 'array') {
    const allElements = nonNull.flatMap((a) => (Array.isArray(a) ? a : []));
    const itemInfer =
      allElements.length > 0
        ? inferJsonValues(allElements, `${pathLabel}[]`)
        : { schema: {}, required: true, conflicts: [], nullable: false };
    conflicts.push(...itemInfer.conflicts);
    let schema = { type: 'array', items: itemInfer.schema };
    if (anyNull) {
      schema = { ...schema, type: ['array', 'null'] };
    }
    return { schema, required: !anyMissing, conflicts, nullable: anyNull };
  }

  if (t === 'object') {
    const objs = nonNull.filter((v) => typeof v === 'object' && !Array.isArray(v));
    if (objs.length === 0) {
      return {
        schema: { type: anyNull ? ['object', 'null'] : 'object', properties: {}, additionalProperties: false },
        required: !anyMissing,
        conflicts,
        nullable: anyNull,
      };
    }
    const allKeys = new Set();
    objs.forEach((o) => Object.keys(o).forEach((k) => allKeys.add(k)));
    const properties = {};
    const required = [];
    for (const key of allKeys) {
      const keyVals = values.map((v) => {
        if (v === MISSING || v === null) return v;
        if (typeof v === 'object' && !Array.isArray(v) && key in v) return v[key];
        return MISSING;
      });
      const sub = inferJsonValues(keyVals, `${pathLabel}.${key}`);
      properties[key] = sub.schema;
      if (sub.required) required.push(key);
      conflicts.push(...sub.conflicts);
    }
    let schema = {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
    if (anyNull) {
      schema = { ...schema, type: ['object', 'null'] };
    }
    return { schema, required: !anyMissing, conflicts, nullable: anyNull };
  }

  return { schema: { type: 'string' }, required: !anyMissing, conflicts, nullable: anyNull };
}

/**
 * Infer from parsed JSON roots (objects expected).
 */
export function inferFromSamples(values, label = 'root') {
  const meta = {
    typeConflicts: [],
    warnings: [],
    nullableFields: [],
    observedValueCandidates: [],
  };

  const objects = values.filter((v) => v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v));
  if (objects.length === 0) {
    meta.warnings.push('No object samples; returning empty object schema.');
    return { schema: { type: 'object', properties: {}, additionalProperties: false }, meta };
  }
  if (objects.length < values.length) {
    meta.warnings.push(`${values.length - objects.length} non-object sample(s) skipped.`);
  }

  const wrapped = objects.map((o) => o);
  const keyVals = (key) => wrapped.map((o) => (key in o ? o[key] : MISSING));

  const allKeys = new Set();
  wrapped.forEach((o) => Object.keys(o).forEach((k) => allKeys.add(k)));
  const properties = {};
  const required = [];
  const conflicts = [];

  for (const key of allKeys) {
    const sub = inferJsonValues(keyVals(key), `${label}.${key}`);
    properties[key] = sub.schema;
    if (sub.required) required.push(key);
    conflicts.push(...sub.conflicts);
  }

  const schema = {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };

  meta.typeConflicts = conflicts;

  function walkObservedValues(s, p) {
    if (!s || typeof s !== 'object') return;
    if (Array.isArray(s['x-observedValues']) && s['x-observedValues'].length) {
      meta.observedValueCandidates.push({ path: p || '(root)', values: s['x-observedValues'] });
    }
    if (s.properties) {
      for (const k of Object.keys(s.properties)) {
        walkObservedValues(s.properties[k], p ? `${p}.${k}` : k);
      }
    }
    if (s.items) walkObservedValues(s.items, `${p}[]`);
  }
  walkObservedValues(schema, '');

  function walkNullable(s, p) {
    if (!s || typeof s !== 'object') return;
    const t = s.type;
    if (Array.isArray(t) && t.includes('null')) {
      meta.nullableFields.push(p || '(root)');
    }
    if (s.properties) {
      for (const k of Object.keys(s.properties)) {
        walkNullable(s.properties[k], p ? `${p}.${k}` : k);
      }
    }
    if (s.items) walkNullable(s.items, `${p}[]`);
  }
  walkNullable(schema, '');

  return { schema, meta };
}

function summarizeSchemaFields(schema, prefix = '') {
  if (!schema?.properties) return [];
  const rows = [];
  for (const [k, v] of Object.entries(schema.properties)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const req = schema.required?.includes(k) ? 'Yes' : 'No';
    const typ = Array.isArray(v.type) ? v.type.join(' | ') : v.type || 'any';
    const nul = Array.isArray(v.type) && v.type.includes('null') ? 'Yes' : 'No';
    const observed = Array.isArray(v['x-observedValues']) ? v['x-observedValues'].join(', ') : '—';
    rows.push({ path, required: req, type: typ, nullable: nul, enumHint: observed });
    if (v.properties) {
      rows.push(...summarizeSchemaFields(v, path));
    }
    if (v.items?.properties) {
      rows.push(...summarizeSchemaFields(v.items, `${path}[]`));
    }
  }
  return rows;
}

export function buildFieldSummary(schema) {
  return summarizeSchemaFields(schema);
}

export function formatMetaLines(meta) {
  return {
    warnings: meta.warnings.join('\n') || '—',
    conflicts: meta.typeConflicts.join('\n') || '—',
    nullable: meta.nullableFields.join(', ') || '—',
    enums: meta.observedValueCandidates.map((e) => `${e.path}: [${e.values.join(', ')}]`).join('\n') || '—',
  };
}
