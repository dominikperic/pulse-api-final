/**
 * Data access entry points. UI and context should import from here (or from
 * repositories/*) — not from mock/fixtures or sessionStore directly.
 */
export { useMockApi, apiBaseUrl } from './config';
export * as contractsRepository from './repositories/contractsRepository';
export * as alertsRepository from './repositories/alertsRepository';
export * as validationRulesRepository from './repositories/validationRulesRepository';
