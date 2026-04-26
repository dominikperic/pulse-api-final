/**
 * Build OpenAPI 3.1 document from inferred JSON Schemas.
 */

function operationIdFrom(method, path) {
  const safe = path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `${method.toLowerCase()}_${safe || 'root'}`.slice(0, 64);
}

function normalizeServerBaseUrl(serverUrl) {
  const raw = String(serverUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return raw;
  }
}

function buildSecurityBlocks(authConfig) {
  const type = String(authConfig?.type || 'none').toLowerCase();
  if (type === 'bearer') {
    return {
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    };
  }
  return {};
}

/**
 * @param {{
 *   title: string,
 *   version?: string,
 *   method: string,
 *   path: string,
 *   requestSchema?: object | null,
 *   requestContentType?: string,
 *   serverUrl?: string,
 *   authConfig?: { type?: 'none' | 'bearer' },
 *   responseSchemas?: Record<string, object>,
 * }} opts
 */
export function buildOpenApi31Document(opts) {
  const {
    title,
    version = '0.1.0',
    method,
    path: rawPath,
    requestSchema,
    requestContentType = 'application/json',
    serverUrl = '',
    authConfig = { type: 'none' },
    responseSchemas = {},
  } = opts;

  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const m = method.toLowerCase();
  const serverBaseUrl = normalizeServerBaseUrl(serverUrl);

  const op = {
    operationId: operationIdFrom(method, path),
    summary: title,
    responses: {},
  };

  const hasRequestBody =
    requestSchema &&
    requestSchema.properties &&
    Object.keys(requestSchema.properties).length > 0;

  if (hasRequestBody) {
    op.requestBody = {
      required: true,
      content: {
        [requestContentType]: {
          schema: requestSchema,
        },
      },
    };
  }

  const statusCodes = Object.keys(responseSchemas).length ? Object.keys(responseSchemas) : ['200'];
  for (const code of statusCodes) {
    const sch = responseSchemas[code] || { type: 'object', properties: {} };
    op.responses[code] = {
      description: code === 'default' ? 'Default response' : `HTTP ${code}`,
      content: {
        'application/json': {
          schema: sch,
        },
      },
    };
  }

  const securityBlocks = buildSecurityBlocks(authConfig);

  return {
    openapi: '3.1.0',
    info: {
      title,
      version,
    },
    ...(securityBlocks.components ? { components: securityBlocks.components } : {}),
    ...(securityBlocks.security ? { security: securityBlocks.security } : {}),
    ...(serverBaseUrl ? { servers: [{ url: serverBaseUrl }] } : {}),
    paths: {
      [path]: {
        [m]: op,
      },
    },
  };
}
