import { apiBaseUrl } from '../config';

function buildUrl(path) {
  const base = apiBaseUrl();
  if (!path.startsWith('/')) path = `/${path}`;
  return base ? `${base}${path}` : path;
}

/**
 * JSON request helper for live API mode.
 * Implement matching routes on Express (see server/index.js stubs).
 */
export async function httpJson(method, path, body) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API ${method} ${path}: expected JSON, got ${res.status}`);
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    throw new Error(`API ${method} ${path}: ${res.status} ${msg}`);
  }
  return data;
}
