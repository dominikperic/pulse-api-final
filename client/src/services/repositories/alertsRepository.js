import { useMockApi } from '../config';
import { httpJson } from '../http/httpClient';
import * as mockSession from '../mock/sessionStore';

/**
 * Live API contract:
 *   GET   /api/alerts
 *   PATCH /api/alerts/:id  -> body: { resolved: true }
 */
export async function listAlerts() {
  if (useMockApi()) return mockSession.listAlerts();
  return httpJson('GET', '/api/alerts');
}

export async function resolveAlert(alertId) {
  if (useMockApi()) return mockSession.resolveAlert(alertId);
  await httpJson('PATCH', `/api/alerts/${alertId}`, { resolved: true });
}
