function normalizeJsonText(input) {
  return String(input || '').trim();
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

function derivePath(entry) {
  if (entry.path) return String(entry.path).trim();
  if (entry.url) {
    try {
      const u = new URL(String(entry.url));
      return u.pathname || '/';
    } catch {
      return String(entry.url).trim() || '/';
    }
  }
  return '/';
}

function normalizeLogEntry(entry, idx) {
  if (!entry || typeof entry !== 'object') {
    return { error: `Entry ${idx + 1}: expected object` };
  }
  const method = String(entry.method || 'POST').toUpperCase();
  const path = derivePath(entry);
  const status = String(entry.response?.status ?? entry.status ?? '200');
  const requestBody = parseMaybeJson(entry.request?.body ?? entry.requestBody ?? entry.body ?? {});
  const responseBody = parseMaybeJson(entry.response?.body ?? entry.responseBody ?? entry.result ?? {});

  return {
    method,
    path,
    url: entry.url ? String(entry.url) : '',
    statusCode: status,
    requestBody,
    responseBody,
  };
}

export function parseLogImportJson(rawText) {
  const text = normalizeJsonText(rawText);
  if (!text) {
    return { ok: false, errors: ['Log JSON is empty'], entries: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Log JSON is not valid JSON'], entries: [] };
  }
  const source = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(source)) {
    return { ok: false, errors: ['Expected a JSON array (or { "entries": [...] })'], entries: [] };
  }

  const errors = [];
  const entries = source
    .map((entry, idx) => {
      const normalized = normalizeLogEntry(entry, idx);
      if (normalized.error) errors.push(normalized.error);
      return normalized;
    })
    .filter((x) => !x.error);

  return { ok: errors.length === 0, errors, entries };
}

export function groupLogEntries(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const key = `${entry.method} ${entry.path}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        method: entry.method,
        path: entry.path,
        url: entry.url || '',
        requestSamples: [],
        responseSamples: [],
      });
    }
    const group = map.get(key);
    group.requestSamples.push({
      body: JSON.stringify(entry.requestBody ?? {}, null, 2),
    });
    group.responseSamples.push({
      statusCode: String(entry.statusCode || '200'),
      body: JSON.stringify(entry.responseBody ?? {}, null, 2),
    });
  });
  return Array.from(map.values());
}
