import { useMockApi, apiBaseUrl } from '../config';
import { httpJson } from '../http/httpClient';
import * as mockSession from '../mock/sessionStore';

function liveCheckUrl() {
  const base = apiBaseUrl();
  const path = '/api/contracts/live-check';
  return base ? `${base}${path}` : path;
}

/**
 * Live API contract (implement on Express under /api):
 *   GET    /api/contracts
 *   POST   /api/contracts
 *   PATCH  /api/contracts/:id
 */
export async function listContracts() {
  if (useMockApi()) return mockSession.listContracts();
  return httpJson('GET', '/api/contracts');
}

export async function createContract(payload) {
  if (useMockApi()) return mockSession.createContract(payload);
  const res = await httpJson('POST', '/api/contracts', payload);
  return res.id ?? res.contractId ?? res._id;
}

export async function updateContractStatus(id, status) {
  if (useMockApi()) return mockSession.updateContractStatus(id, status);
  await httpJson('PATCH', `/api/contracts/${id}`, { status });
}

export async function updateContract(id, payload) {
  if (useMockApi()) return mockSession.updateContract(id, payload);
  await httpJson('PATCH', `/api/contracts/${id}`, payload);
}

export async function deleteContract(id) {
  if (useMockApi()) return mockSession.deleteContract(id);
  await httpJson('DELETE', `/api/contracts/${id}`);
  return { ok: true };
}

export async function recordSampleCheck(contractId, opts) {
  if (useMockApi()) return mockSession.recordSampleCheck(contractId, opts);
  return httpJson('POST', `/api/contracts/${contractId}/check`, opts);
}

/** Execute live HTTP check via Express (proxied in Vite dev). */
export async function runLiveEndpointCheck(body) {
  const res = await fetch(liveCheckUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, httpStatus: res.status, ...data };
  }
  return data;
}

export async function recordLiveCheck(contractId, liveResult) {
  if (useMockApi()) return mockSession.recordLiveCheck(contractId, liveResult);
  throw new Error('Check history persistence requires mock API mode in this prototype.');
}

export async function applyProposedResponse(contractId, payload) {
  if (useMockApi()) return mockSession.applyProposedResponseUpdate(contractId, payload);
  throw new Error('Apply proposed response requires mock API mode in this prototype.');
}
