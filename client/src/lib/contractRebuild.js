import { buildOpenApi31Document } from './openapi.js';

/**
 * Rebuild openApiDocument from stored schemas + metadata (after response schema change).
 * @param {object} contract
 */
export function rebuildOpenApiDocument(contract) {
  const v = contract.openApiDocument?.info?.version;
  return buildOpenApi31Document({
    title: contract.name || 'Inferred API',
    version: typeof v === 'string' ? v : '0.1.0',
    method: contract.method || 'POST',
    path: contract.path || '/',
    requestSchema: contract.requestSchema,
    requestContentType: contract.analysisMeta?.requestContentType || 'application/json',
    serverUrl: contract.endpoint || '',
    authConfig: contract.authConfig || { type: 'none' },
    responseSchemas: contract.responseSchemas || {},
  });
}
