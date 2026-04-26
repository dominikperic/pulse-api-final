import { getByPath } from './jsonPath.js';

function actualTypeLabel(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return t;
}

/**
 * @param {any} root — request or response JSON root
 * @param {{ path: string, ruleType: string, expected?: string }} rule
 */
export function evaluateRule(root, rule) {
  const path = rule.path;
  const val = getByPath(root, path);
  const exists = val !== undefined;

  switch (rule.ruleType) {
    case 'Field Exists': {
      const pass = exists;
      return {
        pass,
        message: pass ? 'Field present' : `Path "${path}" missing`,
      };
    }
    case 'Non-Null': {
      const pass = exists && val !== null;
      return {
        pass,
        message: pass ? 'Non-null' : !exists ? `Path "${path}" missing` : 'Value is null',
      };
    }
    case 'Expected Type': {
      if (!exists) {
        return { pass: false, message: `Path "${path}" missing` };
      }
      const expected = (rule.expected || 'string').toLowerCase().trim();
      const actual = actualTypeLabel(val);
      const ok =
        expected === actual ||
        (expected === 'number' && actual === 'integer') ||
        (expected === 'integer' && actual === 'integer');
      return {
        pass: ok,
        message: ok ? `Type ${actual}` : `Expected type ${expected}, got ${actual}`,
      };
    }
    case 'Allowed Value': {
      if (!exists) {
        return { pass: false, message: `Path "${path}" missing` };
      }
      const raw = rule.expected || '';
      const allowed = raw.split('|').map((s) => s.trim());
      const strVal = typeof val === 'string' ? val : JSON.stringify(val);
      const pass = allowed.includes(strVal);
      return {
        pass,
        message: pass ? 'Value allowed' : `Got ${strVal}, allowed: ${allowed.join(', ')}`,
      };
    }
    default:
      return { pass: false, message: `Unknown rule type: ${rule.ruleType}` };
  }
}

export function evaluateAllRules(root, rules) {
  return rules.map((rule) => ({
    rule,
    ...evaluateRule(root, rule),
  }));
}
