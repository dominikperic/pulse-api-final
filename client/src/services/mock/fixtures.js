/** Static seed data for the wireframe / mock session. Not mutated directly. */

export const initialMonitors = [
  {
    id: 'm1',
    name: 'Stripe Customer Sync',
    description: 'Polls Stripe customers for internal CRM sync.',
    endpoint: 'https://api.stripe.com/v1/customers',
    method: 'GET',
    interval: '5 min',
    status: 'Drift Detected',
    lastCheck: '2026-04-01 09:42 UTC',
    alertCount: 3,
    baselineEstablished: true,
    pollingInterval: 'Every 5 minutes',
  },
  {
    id: 'm2',
    name: 'Auth0 User Metadata',
    description: 'User profile JSON for app settings.',
    endpoint: 'https://tenant.auth0.com/api/v2/users/usr_01',
    method: 'GET',
    interval: '15 min',
    status: 'Healthy',
    lastCheck: '2026-04-01 09:40 UTC',
    alertCount: 0,
    baselineEstablished: true,
    pollingInterval: 'Every 15 minutes',
  },
  {
    id: 'm3',
    name: 'Partner Inventory Webhook Echo',
    description: 'POST inventory deltas to partner test endpoint.',
    endpoint: 'https://partner.example.com/api/v2/inventory',
    method: 'POST',
    interval: '1 min',
    status: 'Validation Failed',
    lastCheck: '2026-04-01 09:38 UTC',
    alertCount: 5,
    baselineEstablished: true,
    pollingInterval: 'Every 1 minute',
  },
  {
    id: 'm4',
    name: 'Legacy Billing API',
    description: 'Paused during migration.',
    endpoint: 'https://billing.internal/api/charges',
    method: 'GET',
    interval: '30 min',
    status: 'Paused',
    lastCheck: '2026-03-28 14:10 UTC',
    alertCount: 0,
    baselineEstablished: false,
    pollingInterval: 'Every 30 minutes',
  },
];

export const schemaDriftItems = [
  {
    path: 'data.customer.email',
    label: 'Type Change',
    baseline: '"jane@acme.com"',
    current: 'null',
  },
  {
    path: 'data.customer.metadata.tier',
    label: 'Missing Field',
    baseline: '"enterprise"',
    current: '(absent)',
  },
  {
    path: 'data.customer.created',
    label: 'Added Field',
    baseline: '(absent)',
    current: '1711958400',
  },
];

export const validationRulesForM1 = [
  {
    id: 'r1',
    path: 'data.customer.email',
    ruleType: 'Non-Null',
    expected: 'non-null string',
    lastResult: 'Fail',
  },
  {
    id: 'r2',
    path: 'data.customer.id',
    ruleType: 'Field Exists',
    expected: 'present',
    lastResult: 'Pass',
  },
  {
    id: 'r3',
    path: 'data.customer.balance',
    ruleType: 'Expected Type',
    expected: 'number',
    lastResult: 'Pass',
  },
];

export const runHistoryM1 = [
  {
    id: 'run-104',
    ts: '2026-04-01 09:42:11 UTC',
    http: 200,
    result: 'Fail',
    drift: 'Yes',
    validation: 'Fail',
  },
  {
    id: 'run-103',
    ts: '2026-04-01 09:37:02 UTC',
    http: 200,
    result: 'Pass',
    drift: 'No',
    validation: 'Pass',
  },
  {
    id: 'run-102',
    ts: '2026-04-01 09:32:00 UTC',
    http: 200,
    result: 'Pass',
    drift: 'No',
    validation: 'Pass',
  },
];

export const initialAlerts = [
  {
    id: 'a1',
    monitorId: 'm1',
    monitorName: 'Stripe Customer Sync',
    failureType: 'Schema Drift',
    path: 'data.customer.email',
    summary: 'Expected string, received null',
    time: '2026-04-01 09:42 UTC',
    severity: 'High',
    resolved: false,
  },
  {
    id: 'a2',
    monitorId: 'm1',
    monitorName: 'Stripe Customer Sync',
    failureType: 'Validation Failure',
    path: 'data.customer.email',
    summary: 'Non-Null rule failed',
    time: '2026-04-01 09:42 UTC',
    severity: 'High',
    resolved: false,
  },
  {
    id: 'a3',
    monitorId: 'm3',
    monitorName: 'Partner Inventory Webhook Echo',
    failureType: 'Monitor Down',
    path: '—',
    summary: 'HTTP 503 — upstream timeout',
    time: '2026-04-01 09:15 UTC',
    severity: 'Critical',
    resolved: false,
  },
  {
    id: 'a4',
    monitorId: 'm2',
    monitorName: 'Auth0 User Metadata',
    failureType: 'Schema Drift',
    path: 'app_metadata.plan',
    summary: 'Added Field — new optional key detected',
    time: '2026-03-31 18:22 UTC',
    severity: 'Low',
    resolved: true,
  },
];

export const allRulesIndex = [
  ...validationRulesForM1.map((r) => ({
    ...r,
    monitorName: 'Stripe Customer Sync',
    monitorId: 'm1',
  })),
  {
    id: 'r4',
    path: 'items[0].sku',
    ruleType: 'Allowed Value',
    expected: 'SKU-100|SKU-200',
    lastResult: 'Pass',
    monitorName: 'Partner Inventory Webhook Echo',
    monitorId: 'm3',
  },
];
