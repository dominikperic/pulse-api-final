import { useMockApi } from '../config';
import { httpJson } from '../http/httpClient';
import * as mockSession from '../mock/sessionStore';

/**
 * Live API contract:
 *   GET  /api/validation-rules     -> ValidationRule[] (include monitorId, monitorName)
 *   POST /api/monitors/:monitorId/rules  -> body: { path, ruleType, expected }
 */
export async function listValidationRules() {
  if (useMockApi()) return mockSession.listValidationRules();
  return httpJson('GET', '/api/validation-rules');
}

export async function addValidationRule(monitorId, rule) {
  if (useMockApi()) return mockSession.addValidationRule(monitorId, rule);
  await httpJson('POST', `/api/monitors/${monitorId}/rules`, rule);
}
