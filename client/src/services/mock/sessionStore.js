import {
  initialMonitors,
  initialAlerts,
  allRulesIndex,
} from './fixtures';

function deepClone(value) {
  return structuredClone(value);
}

let monitors = deepClone(initialMonitors);
let alerts = deepClone(initialAlerts);
let extraRules = [];

export async function listMonitors() {
  return deepClone(monitors);
}

export async function createMonitor(payload) {
  const id = `m${Date.now()}`;
  const row = {
    id,
    name: payload.name,
    description: payload.description || '',
    endpoint: payload.endpoint,
    method: payload.method || 'GET',
    interval: payload.pollingInterval || '5 min',
    status: payload.status || 'Healthy',
    lastCheck: payload.lastCheck || '—',
    alertCount: 0,
    baselineEstablished: Boolean(payload.baselineEstablished),
    pollingInterval: payload.pollingIntervalLabel || 'Every 5 minutes',
  };
  monitors = [row, ...monitors];
  return id;
}

export async function updateMonitorStatus(id, status) {
  monitors = monitors.map((m) => (m.id === id ? { ...m, status } : m));
}

export async function listAlerts() {
  return deepClone(alerts);
}

export async function resolveAlert(alertId) {
  alerts = alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a));
}

export async function addValidationRule(monitorId, rule) {
  const id = `r${Date.now()}`;
  extraRules.push({
    id,
    monitorId,
    path: rule.path,
    ruleType: rule.ruleType,
    expected: rule.expected || '—',
    lastResult: 'Not run',
  });
}

export async function listValidationRules() {
  const withNames = extraRules.map((r) => ({
    ...r,
    monitorName: monitors.find((m) => m.id === r.monitorId)?.name || r.monitorId,
  }));
  return [...deepClone(allRulesIndex), ...withNames];
}
