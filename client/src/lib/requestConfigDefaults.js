/**
 * Default / migrated request replay configuration for live endpoint checks.
 * @param {object} contract
 * @returns {object}
 */
export function defaultRequestConfig(contract) {
  const method = String(contract?.method || 'GET').toUpperCase();
  const codes = contract?.responseSchemas ? Object.keys(contract.responseSchemas) : ['200'];
  let replayBody = '{}';
  const snap = contract?.sampleImportSnapshot?.requestSamples?.[0]?.body;
  if (typeof snap === 'string' && snap.trim()) {
    try {
      JSON.parse(snap);
      replayBody = snap;
    } catch {
      replayBody = '{}';
    }
  }

  return {
    headers: [],
    authType: 'none',
    authValue: '',
    queryParams: [],
    timeoutMs: 15000,
    safeToReplay: method === 'GET',
    expectedStatusCodes: codes.length ? codes : ['200'],
    replayBodyJson: replayBody,
  };
}

export function mergeRequestConfig(contract) {
  const base = defaultRequestConfig(contract);
  const rc = contract?.requestConfig;
  if (!rc || typeof rc !== 'object') return base;
  return {
    ...base,
    ...rc,
    headers: Array.isArray(rc.headers) ? rc.headers : base.headers,
    queryParams: Array.isArray(rc.queryParams) ? rc.queryParams : base.queryParams,
    expectedStatusCodes:
      Array.isArray(rc.expectedStatusCodes) && rc.expectedStatusCodes.length
        ? rc.expectedStatusCodes.map(String)
        : base.expectedStatusCodes,
  };
}
