import { useMockApi } from '../config';
import { httpJson } from '../http/httpClient';
import * as mockSession from '../mock/sessionStore';

/**
 * Live API contract (implement on Express under /api):
 *   GET    /api/monitors           -> Monitor[]
 *   POST   /api/monitors           -> body: CreateMonitorPayload; response: { id: string } | Monitor
 *   PATCH  /api/monitors/:id       -> body: { status: string }
 */
export async function listMonitors() {
  if (useMockApi()) return mockSession.listMonitors();
  return httpJson('GET', '/api/monitors');
}

export async function createMonitor(payload) {
  if (useMockApi()) return mockSession.createMonitor(payload);
  const res = await httpJson('POST', '/api/monitors', payload);
  return res.id ?? res.monitorId ?? res._id;
}

export async function updateMonitorStatus(id, status) {
  if (useMockApi()) return mockSession.updateMonitorStatus(id, status);
  await httpJson('PATCH', `/api/monitors/${id}`, { status });
}
