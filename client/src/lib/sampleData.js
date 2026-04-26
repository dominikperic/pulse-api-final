/** Realistic multi-sample bundles for seeding (POST examples). */

export const SAMPLE_BUNDLES = [
  {
    id: 'c_seed_customers',
    name: 'Stripe Customer Create',
    description: 'POST /v1/customers — inferred from samples',
    method: 'POST',
    path: '/v1/customers',
    endpoint: 'https://api.stripe.com/v1/customers',
    requestSamples: [
      { body: JSON.stringify({ email: 'jane@acme.com', name: 'Jane' }, null, 2) },
      { body: JSON.stringify({ email: 'bob@acme.com', phone: '+15551234' }, null, 2) },
      { body: JSON.stringify({ email: 'null@acme.com', phone: null }, null, 2) },
    ],
    responseSamples: [
      {
        statusCode: '200',
        body: JSON.stringify(
          { id: 'cus_a1', object: 'customer', email: 'jane@acme.com', balance: 0 },
          null,
          2
        ),
      },
      {
        statusCode: '200',
        body: JSON.stringify(
          { id: 'cus_a2', object: 'customer', email: null, balance: 100 },
          null,
          2
        ),
      },
    ],
  },
  {
    id: 'c_seed_pi',
    name: 'Stripe Payment Intent Create',
    description: 'POST /v1/payment_intents',
    method: 'POST',
    path: '/v1/payment_intents',
    endpoint: 'https://api.stripe.com/v1/payment_intents',
    requestSamples: [
      { body: JSON.stringify({ amount: 2000, currency: 'usd', payment_method_types: ['card'] }, null, 2) },
      { body: JSON.stringify({ amount: 500, currency: 'eur' }, null, 2) },
    ],
    responseSamples: [
      {
        statusCode: '200',
        body: JSON.stringify(
          { id: 'pi_1', object: 'payment_intent', amount: 2000, currency: 'usd', status: 'requires_payment_method' },
          null,
          2
        ),
      },
    ],
  },
  {
    id: 'c_seed_contacts',
    name: 'CRM Contacts Sync',
    description: 'POST /contacts/sync',
    method: 'POST',
    path: '/contacts/sync',
    endpoint: 'https://crm.example.com/contacts/sync',
    requestSamples: [
      {
        body: JSON.stringify(
          { contacts: [{ id: '1', email: 'a@b.com', tags: ['vip'] }, { id: '2', email: 'c@d.com' }] },
          null,
          2
        ),
      },
      {
        body: JSON.stringify({ contacts: [{ id: '3', email: 'e@f.com', tags: ['trial', 'vip'] }] }, null, 2),
      },
    ],
    responseSamples: [
      {
        statusCode: '200',
        body: JSON.stringify({ synced: 2, errors: [] }, null, 2),
      },
    ],
  },
];

export const SEED_RULES = [
  {
    id: 'r_seed_1',
    contractId: 'c_seed_customers',
    path: 'email',
    ruleType: 'Non-Null',
    expected: 'non-null string',
    lastResult: 'Pass',
  },
  {
    id: 'r_seed_2',
    contractId: 'c_seed_customers',
    path: 'id',
    ruleType: 'Field Exists',
    expected: 'present',
    lastResult: 'Pass',
  },
  {
    id: 'r_seed_pi_obj',
    contractId: 'c_seed_pi',
    path: 'object',
    ruleType: 'Field Exists',
    expected: 'payment_intent',
    lastResult: 'Fail',
  },
  {
    id: 'r_seed_pi_amt',
    contractId: 'c_seed_pi',
    path: 'amount',
    ruleType: 'Expected Type',
    expected: 'integer',
    lastResult: 'Fail',
  },
  {
    id: 'r_seed_cr_synced',
    contractId: 'c_seed_contacts',
    path: 'synced',
    ruleType: 'Field Exists',
    expected: 'present',
    lastResult: 'Pass',
  },
];
