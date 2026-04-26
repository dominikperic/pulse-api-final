/**
 * Compare a JSON value against an inferred JSON Schema (subset).
 */

function schemaAllowsNull(schema) {
  if (!schema?.type) return false;
  return schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'));
}

function schemaPrimaryTypes(schema) {
  if (!schema?.type) return [];
  const t = schema.type;
  return Array.isArray(t) ? t.filter((x) => x !== 'null') : [t];
}

function valueJsonType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return t;
}

function typeMatches(value, schema) {
  if (value === undefined) return { ok: false, reason: 'missing' };
  if (value === null) {
    return { ok: schemaAllowsNull(schema), reason: schemaAllowsNull(schema) ? null : 'null not allowed' };
  }
  const vt = valueJsonType(value);
  const allowed = schemaPrimaryTypes(schema);
  if (allowed.length === 0) return { ok: true, reason: null };
  if (vt === 'integer' && allowed.includes('number')) return { ok: true, reason: null };
  if (allowed.includes(vt)) return { ok: true, reason: null };
  return { ok: false, reason: `expected ${allowed.join('|')}, got ${vt}` };
}

/**
 * @returns {{
 *   missingRequired: string[],
 *   extraProperties: string[],
 *   typeMismatches: { path: string, detail: string }[],
 *   nullRegressions: string[],
 *   enumMismatches: { path: string, value: any, allowed: any[] }[],
 * }}
 */
export function compareToSchema(value, schema, basePath = '') {
  const missingRequired = [];
  const extraProperties = [];
  const typeMismatches = [];
  const nullRegressions = [];
  const enumMismatches = [];

  function walk(val, sch, p) {
    if (!sch || typeof sch !== 'object') return;

    const tm = typeMatches(val, sch);
    if (tm.reason === 'missing') {
      return;
    }
    if (!tm.ok && tm.reason === 'null not allowed') {
      nullRegressions.push(p || '(root)');
      return;
    }
    if (!tm.ok && tm.reason?.startsWith('expected')) {
      typeMismatches.push({ path: p || '(root)', detail: tm.reason });
      return;
    }

    if (val === null || val === undefined) return;

    if (sch.enum && Array.isArray(sch.enum)) {
      if (!sch.enum.includes(val)) {
        enumMismatches.push({ path: p || '(root)', value: val, allowed: sch.enum });
      }
    }

    if (schemaPrimaryTypes(sch).includes('object') && sch.properties && typeof val === 'object' && !Array.isArray(val)) {
      const req = sch.required || [];
      for (const key of req) {
        if (!(key in val) || val[key] === undefined) {
          missingRequired.push(p ? `${p}.${key}` : key);
        }
      }
      for (const key of Object.keys(val)) {
        if (!sch.properties[key]) {
          if (sch.additionalProperties === false) {
            extraProperties.push(p ? `${p}.${key}` : key);
          }
        } else {
          walk(val[key], sch.properties[key], p ? `${p}.${key}` : key);
        }
      }
      return;
    }

    if (schemaPrimaryTypes(sch).includes('array') && Array.isArray(val) && sch.items) {
      val.forEach((item, i) => {
        walk(item, sch.items, `${p}[${i}]`);
      });
    }
  }

  walk(value, schema, basePath);

  return {
    missingRequired,
    extraProperties,
    typeMismatches,
    nullRegressions,
    enumMismatches,
  };
}

/** Flatten drift result to human-readable lines */
export function formatDriftSummary(drift) {
  const lines = [];
  drift.missingRequired.forEach((path) => lines.push(`Missing required: ${path}`));
  drift.extraProperties.forEach((path) => lines.push(`Extra property (not in contract): ${path}`));
  drift.typeMismatches.forEach((m) => lines.push(`Type mismatch at ${m.path}: ${m.detail}`));
  drift.nullRegressions.forEach((path) => lines.push(`Null regression at ${path}`));
  (drift.enumMismatches || []).forEach((m) =>
    lines.push(`Enum mismatch at ${m.path}: got ${JSON.stringify(m.value)}, allowed ${m.allowed?.join(', ')}`)
  );
  return lines;
}
