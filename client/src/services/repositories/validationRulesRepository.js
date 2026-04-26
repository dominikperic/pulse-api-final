import { useMockApi } from '../config';
import { httpJson } from '../http/httpClient';
import * as mockSession from '../mock/sessionStore';

/**
 * Live API contract:
 *   GET  /api/validation-rules     -> Rule[] (include contractId, contractName)
 *   POST /api/contracts/:contractId/rules  -> body: { path, ruleType, expected }
 */
export async function listValidationRules() {
  if (useMockApi()) return mockSession.listValidationRules();
  return httpJson('GET', '/api/validation-rules');
}

export async function addValidationRule(contractId, rule) {
  if (useMockApi()) return mockSession.addValidationRule(contractId, rule);
  await httpJson('POST', `/api/contracts/${contractId}/rules`, rule);
}
