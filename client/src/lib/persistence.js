/** Reserved for future opt-in persistence. The mock session store is in-memory only (reload resets to seeds). */
const STORAGE_KEY = 'pulseapi_contracts_v2';

function scopedKey(scope) {
  const token = String(scope || '')
    .trim()
    .toLowerCase();
  if (!token || token === 'anonymous') return STORAGE_KEY;
  return `${STORAGE_KEY}:${token}`;
}

export function loadPersistedState(scope) {
  try {
    const raw = localStorage.getItem(scopedKey(scope));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePersistedState(state, scope) {
  try {
    localStorage.setItem(scopedKey(scope), JSON.stringify(state));
  } catch (e) {
    console.warn('pulseapi: localStorage save failed', e);
  }
}

export { STORAGE_KEY };
