/** Reserved for future opt-in persistence. The mock session store is in-memory only (reload resets to seeds). */
const STORAGE_KEY = 'pulseapi_contracts_v2';

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePersistedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('pulseapi: localStorage save failed', e);
  }
}

export { STORAGE_KEY };
