import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { stringify } from 'yaml';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import SwaggerBridgePanel from '../components/SwaggerBridgePanel.jsx';
import { buildFieldSummary } from '../lib/schemaInference.js';
import { generateTypeModels } from '../lib/typegen.js';
import { generateZodModels } from '../lib/zodgen.js';
import { generateRiskNotes } from '../lib/hardening.js';
import { downloadTextFile } from '../lib/download.js';
import { buildGenerationContext, generateTypeScriptClient, generateJavaScriptClient, generatePythonClient } from '../lib/codegen/index.js';
import { formatTimestampForTimezone, getUserTimezone } from '../lib/timezone.js';
import { SETTINGS_UPDATED_EVENT } from '../lib/userSettings.js';

function isMeaningfulNote(line) {
  const value = String(line || '').trim();
  return Boolean(value && value !== '—');
}

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const { contracts } = useApp();
  const c = contracts.find((x) => x.id === contractId);
  const [specFormat, setSpecFormat] = useState('yaml');
  const [selectedClientLanguage, setSelectedClientLanguage] = useState('typescript');
  const [selectedModelOutput, setSelectedModelOutput] = useState('tsModels');
  const [timezone, setTimezone] = useState(() => getUserTimezone());

  const requestRows = useMemo(() => {
    if (c?.analysisMeta?.requestFieldSummary?.length) return c.analysisMeta.requestFieldSummary;
    if (c?.requestSchema) return buildFieldSummary(c.requestSchema);
    return [];
  }, [c]);

  const responseRows = useMemo(() => {
    if (!c?.responseSchemas) return [];
    const out = [];
    for (const [code, sch] of Object.entries(c.responseSchemas)) {
      const rows = c.analysisMeta?.responseFieldSummary?.[code]?.length
        ? c.analysisMeta.responseFieldSummary[code]
        : buildFieldSummary(sch);
      rows.forEach((r) => out.push({ ...r, statusCode: code }));
    }
    return out;
  }, [c]);

  const specYaml = useMemo(() => {
    if (!c?.openApiDocument) return '';
    try {
      return stringify(c.openApiDocument);
    } catch {
      return '';
    }
  }, [c]);
  const specJson = useMemo(() => (c?.openApiDocument ? JSON.stringify(c.openApiDocument, null, 2) : ''), [c]);
  const selectedSpecArtifact = useMemo(() => {
    if (specFormat === 'json') {
      return {
        label: 'JSON',
        copyLabel: 'Copy JSON',
        downloadLabel: 'Download JSON',
        filename: `${c?.id || 'contract'}.openapi.json`,
        mime: 'application/json',
        content: specJson || '',
      };
    }
    return {
      label: 'YAML',
      copyLabel: 'Copy YAML',
      downloadLabel: 'Download YAML',
      filename: `${c?.id || 'contract'}.openapi.yaml`,
      mime: 'text/yaml',
      content: specYaml || '',
    };
  }, [specFormat, specJson, specYaml, c?.id]);
  const typeModels = useMemo(() => (c ? generateTypeModels(c) : null), [c]);
  const zodModels = useMemo(() => (c ? generateZodModels(c) : null), [c]);
  const riskNotes = useMemo(() => (c ? generateRiskNotes(c) : []), [c]);
  const warningLines = useMemo(
    () =>
      [c?.analysisMeta?.warnings, c?.analysisMeta?.conflicts]
        .filter(isMeaningfulNote)
        .join('\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(isMeaningfulNote),
    [c]
  );
  const visibleRiskNotes = useMemo(() => riskNotes.filter(isMeaningfulNote), [riskNotes]);
  const codegenCtx = useMemo(() => (c ? buildGenerationContext(c) : null), [c]);
  const tsClient = useMemo(() => (codegenCtx ? generateTypeScriptClient(codegenCtx) : ''), [codegenCtx]);
  const jsClient = useMemo(() => (codegenCtx ? generateJavaScriptClient(codegenCtx) : ''), [codegenCtx]);
  const pythonClient = useMemo(() => (codegenCtx ? generatePythonClient(codegenCtx) : ''), [codegenCtx]);
  const selectedClientArtifact = useMemo(() => {
    if (selectedClientLanguage === 'javascript') {
      return {
        label: 'JavaScript Client Starter',
        copyLabel: 'Copy JavaScript client',
        downloadLabel: 'Download JavaScript file',
        filename: `${c?.id || 'contract'}.client.js`,
        mime: 'text/javascript',
        content: jsClient || '',
      };
    }
    if (selectedClientLanguage === 'python') {
      return {
        label: 'Python Typed Client Starter',
        copyLabel: 'Copy Python client',
        downloadLabel: 'Download Python file',
        filename: `${c?.id || 'contract'}.client.py`,
        mime: 'text/x-python',
        content: pythonClient || '',
      };
    }
    return {
      label: 'TypeScript Typed Client Starter',
      copyLabel: 'Copy TypeScript client',
      downloadLabel: 'Download TypeScript file',
      filename: `${c?.id || 'contract'}.client.ts`,
      mime: 'text/typescript',
      content: tsClient || '',
    };
  }, [selectedClientLanguage, jsClient, pythonClient, tsClient, c?.id]);

  const selectedModelArtifact = useMemo(() => {
    if (selectedModelOutput === 'zodSchemas') {
      return {
        label: 'Zod Schemas',
        copyLabel: 'Copy Zod schema',
        downloadLabel: 'Download Zod file',
        filename: `${c?.id || 'contract'}.zod.ts`,
        mime: 'text/typescript',
        content: zodModels?.content || '',
      };
    }
    return {
      label: 'TypeScript Models',
      copyLabel: 'Copy TypeScript models',
      downloadLabel: 'Download TypeScript models',
      filename: `${c?.id || 'contract'}.models.ts`,
      mime: 'text/typescript',
      content: typeModels?.content || '',
    };
  }, [selectedModelOutput, zodModels?.content, typeModels?.content, c?.id]);

  useEffect(() => {
    function syncTimezone() {
      setTimezone(getUserTimezone());
    }
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, syncTimezone);
  }, []);

  if (!c) {
    return (
      <p>
        Contract not found. <Link to="/contracts">Back to Contracts</Link>
      </p>
    );
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        {' > '}
        <Link to="/contracts">Contracts</Link>
        {' > '}
        <span>{c.name}</span>
      </div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {c.name}
            <StatusBadge status={c.status} />
          </h1>
          <p className="mono" style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
            {c.method} {c.path}
            {c.endpoint ? ` · ${c.endpoint}` : ''}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn" to={`/contracts/${contractId}/edit`}>
            Edit Inputs
          </Link>
          <Link className="btn" to={`/contracts/${contractId}/types`}>
            View Types
          </Link>
          <Link className="btn btn-primary" to={`/contracts/${contractId}/check`}>
            Swagger Handoff
          </Link>
        </div>
      </div>

      <CollapsibleSection sectionId="contract-metadata" title="Contract metadata" variant="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          <div>
            <label>Last updated</label>
            <div>{formatTimestampForTimezone(c.lastUpdated, timezone)}</div>
          </div>
          <div>
            <label>OpenAPI status</label>
            <div>{c.specGenerated ? 'Spec Generated' : 'Draft'}</div>
          </div>
          <div>
            <label>Warnings to review</label>
            <div>{warningLines.length + visibleRiskNotes.length}</div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="openapi-spec"
        title="A. Generated OpenAPI Spec"
        variant="card"
        headerActions={
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigator.clipboard.writeText(selectedSpecArtifact.content)}
              disabled={!selectedSpecArtifact.content}
            >
              {selectedSpecArtifact.copyLabel}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                downloadTextFile(selectedSpecArtifact.filename, selectedSpecArtifact.content, selectedSpecArtifact.mime)
              }
              disabled={!selectedSpecArtifact.content}
            >
              {selectedSpecArtifact.downloadLabel}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${specFormat === 'yaml' ? 'btn-primary' : ''}`}
              onClick={() => setSpecFormat('yaml')}
            >
              YAML
            </button>
            <button
              type="button"
              className={`btn btn-sm ${specFormat === 'json' ? 'btn-primary' : ''}`}
              onClick={() => setSpecFormat('json')}
            >
              JSON
            </button>
          </div>
        }
      >
        <p className="helper">OpenAPI 3.1 inferred from observed request/response traffic and sample payloads.</p>
        <pre className="diff-box mono" style={{ maxHeight: 320, overflow: 'auto', margin: 0, fontSize: 11 }}>
          {selectedSpecArtifact.content || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection sectionId="typed-client-boilerplate" title="B. Typed Client Boilerplate" variant="card">
        <div className="row-actions" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="helper" style={{ marginRight: 4 }}>
            Language
          </span>
          <button
            type="button"
            className={`btn btn-sm ${selectedClientLanguage === 'typescript' ? 'btn-primary' : ''}`}
            onClick={() => setSelectedClientLanguage('typescript')}
          >
            TypeScript
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedClientLanguage === 'python' ? 'btn-primary' : ''}`}
            onClick={() => setSelectedClientLanguage('python')}
          >
            Python
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedClientLanguage === 'javascript' ? 'btn-primary' : ''}`}
            onClick={() => setSelectedClientLanguage('javascript')}
          >
            JavaScript
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigator.clipboard.writeText(selectedClientArtifact.content)}
            disabled={!selectedClientArtifact.content}
          >
            {selectedClientArtifact.copyLabel}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              downloadTextFile(selectedClientArtifact.filename, selectedClientArtifact.content, selectedClientArtifact.mime)
            }
            disabled={!selectedClientArtifact.content}
          >
            {selectedClientArtifact.downloadLabel}
          </button>
        </div>
        <p className="section-title" style={{ fontSize: 12 }}>
          {selectedClientArtifact.label}
        </p>
        <pre className="diff-box mono" style={{ maxHeight: 260, overflow: 'auto', margin: 0 }}>
          {selectedClientArtifact.content || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection sectionId="typed-models" title="C. Typed Models" variant="card">
        <div className="row-actions" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="helper" style={{ marginRight: 4 }}>
            Model Output
          </span>
          <button
            type="button"
            className={`btn btn-sm ${selectedModelOutput === 'tsModels' ? 'btn-primary' : ''}`}
            onClick={() => setSelectedModelOutput('tsModels')}
          >
            TypeScript Models
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedModelOutput === 'zodSchemas' ? 'btn-primary' : ''}`}
            onClick={() => setSelectedModelOutput('zodSchemas')}
          >
            Zod Schemas
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigator.clipboard.writeText(selectedModelArtifact.content)}
            disabled={!selectedModelArtifact.content}
          >
            {selectedModelArtifact.copyLabel}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              downloadTextFile(selectedModelArtifact.filename, selectedModelArtifact.content, selectedModelArtifact.mime)
            }
            disabled={!selectedModelArtifact.content}
          >
            {selectedModelArtifact.downloadLabel}
          </button>
        </div>
        <p className="section-title" style={{ fontSize: 12 }}>
          {selectedModelArtifact.label}
        </p>
        <pre className="diff-box mono" style={{ maxHeight: 260, overflow: 'auto', margin: 0 }}>
          {selectedModelArtifact.content || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection sectionId="schema-summary" title="D. Schema Summary" variant="card">
        <p className="section-title" style={{ fontSize: 12 }}>
          Request Schema Summary
        </p>
        <div className="table-wrap">
          <table className="data-table" aria-label="Request schema summary">
            <thead>
              <tr>
                <th scope="col">Field path</th>
                <th scope="col">Required</th>
                <th scope="col">Type</th>
                <th scope="col">Nullable</th>
                <th scope="col">Observed values</th>
              </tr>
            </thead>
            <tbody>
              {requestRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="helper">
                    No request schema.
                  </td>
                </tr>
              ) : (
                requestRows.map((row) => (
                  <tr key={row.path}>
                    <td className="mono">{row.path}</td>
                    <td>{row.required}</td>
                    <td>{row.type}</td>
                    <td>{row.nullable}</td>
                    <td>{row.enumHint}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="section-title" style={{ fontSize: 12, marginTop: 16 }}>
          Response Schema Summary
        </p>
        <div className="table-wrap">
          <table className="data-table" aria-label="Response schema summary">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Field path</th>
                <th scope="col">Required</th>
                <th scope="col">Type</th>
                <th scope="col">Nullable</th>
                <th scope="col">Observed values</th>
              </tr>
            </thead>
            <tbody>
              {responseRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="helper">
                    No response schema.
                  </td>
                </tr>
              ) : (
                responseRows.map((row) => (
                  <tr key={`${row.statusCode}-${row.path}`}>
                    <td className="mono">{row.statusCode}</td>
                    <td className="mono">{row.path}</td>
                    <td>{row.required}</td>
                    <td>{row.type}</td>
                    <td>{row.nullable}</td>
                    <td>{row.enumHint}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection sectionId="hardening-notes" title="E. Hardening Notes / Risk Notes" variant="card">
        {warningLines.length === 0 && visibleRiskNotes.length === 0 ? (
          <p className="helper">No inference warnings for this contract.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {[...warningLines, ...visibleRiskNotes].map((line) => (
              <li key={line} style={{ marginBottom: 6 }}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection sectionId="swagger-bridge" title="F. Swagger Bridge" variant="card">
        <SwaggerBridgePanel contract={c} />
      </CollapsibleSection>
    </>
  );
}
