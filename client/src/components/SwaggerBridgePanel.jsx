import { useMemo, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import { stringify } from 'yaml';
import { downloadTextFile } from '../lib/download.js';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerBridgePanel({ contract }) {
  const [copied, setCopied] = useState(false);
  const [handoffHint, setHandoffHint] = useState('');
  const specJson = useMemo(
    () => (contract?.openApiDocument ? JSON.stringify(contract.openApiDocument, null, 2) : ''),
    [contract]
  );
  const specYaml = useMemo(() => (contract?.openApiDocument ? stringify(contract.openApiDocument) : ''), [contract]);
  const requiresAuth = useMemo(() => {
    const doc = contract?.openApiDocument;
    if (!doc || typeof doc !== 'object') return false;
    if (Array.isArray(doc.security) && doc.security.length > 0) return true;
    const paths = doc.paths || {};
    return Object.values(paths).some((pathItem) =>
      Object.values(pathItem || {}).some((op) => Array.isArray(op?.security) && op.security.length > 0)
    );
  }, [contract]);

  async function handleCopy() {
    if (!specJson) return;
    try {
      await navigator.clipboard.writeText(specJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function openSwaggerEditor() {
    if (!specJson) return;
    try {
      await navigator.clipboard.writeText(specJson);
    } catch {
      // Clipboard may be blocked by browser permissions; copy button still exists.
    }
    window.open('https://editor.swagger.io/', '_blank', 'noopener,noreferrer');
    setHandoffHint(
      'Swagger Editor opened. OpenAPI spec copied — paste into the left pane (Ctrl/Cmd+V), or import the downloaded JSON/YAML file.'
    );
    setTimeout(() => setHandoffHint(''), 14000);
  }

  async function openSwaggerHub() {
    if (!specJson) return;
    try {
      await navigator.clipboard.writeText(specJson);
    } catch {
      // Clipboard may be blocked by browser permissions; copy button still exists.
    }
    window.open('https://app.swaggerhub.com/', '_blank', 'noopener,noreferrer');
    setHandoffHint('SwaggerHub opened. OpenAPI spec copied — paste/import it into SwaggerHub to continue the premium workflow.');
    setTimeout(() => setHandoffHint(''), 14000);
  }

  return (
    <div>
      <p className="helper" style={{ marginTop: 0 }}>
        SwaggerHub is the primary handoff for premium hosted workflows. Swagger Editor remains available as the free fallback.
      </p>
      {requiresAuth && (
        <p className="helper" style={{ marginTop: 0 }}>
          This endpoint requires authentication. In Swagger preview, click Authorize and enter a bearer token (use test
          credentials in development).
        </p>
      )}
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => void openSwaggerHub()}
          disabled={!specJson}
          title="Opens SwaggerHub and copies your generated spec for paste/import."
        >
          Open in SwaggerHub
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void openSwaggerEditor()}
          disabled={!specJson}
          title="Opens Swagger Editor and copies your generated spec."
        >
          Open in Swagger Editor
        </button>
        <button type="button" className="btn btn-sm" onClick={handleCopy} disabled={!specJson}>
          {copied ? 'Copied' : 'Copy OpenAPI Spec'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => downloadTextFile(`${contract?.id || 'contract'}.openapi.json`, specJson, 'application/json')}
          disabled={!specJson}
        >
          Download OpenAPI JSON
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => downloadTextFile(`${contract?.id || 'contract'}.openapi.yaml`, specYaml, 'text/yaml')}
          disabled={!specYaml}
        >
          Download OpenAPI YAML
        </button>
      </div>
      {handoffHint && (
        <p className="helper" style={{ marginBottom: 12 }}>
          {handoffHint}
        </p>
      )}
      <p className="helper" style={{ marginBottom: 8 }}>
        Preview in Swagger UI
      </p>
      {specJson ? (
        <div className="swagger-preview-wrap">
          <SwaggerUI spec={contract.openApiDocument} />
        </div>
      ) : (
        <p className="helper">No generated OpenAPI document yet.</p>
      )}
    </div>
  );
}
