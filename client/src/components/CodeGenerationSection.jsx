import { useMemo, useState, useCallback, useEffect } from 'react';
import { stringify } from 'yaml';
import {
  ARTIFACT_TABS,
  buildGenerationContext,
  generateArtifactText,
  artifactDownloadName,
} from '../lib/codegen/index.js';
import { downloadTextFile } from '../lib/download.js';
import CollapsibleSection from './CollapsibleSection.jsx';

const MIME_BY_EXT = {
  '.ts': 'text/typescript;charset=utf-8',
  '.py': 'text/x-python;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8',
  '.md': 'text/markdown;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.yaml': 'text/yaml;charset=utf-8',
  '.txt': 'text/plain;charset=utf-8',
};

function mimeForFilename(name) {
  const lower = name.toLowerCase();
  for (const [ext, mime] of Object.entries(MIME_BY_EXT)) {
    if (lower.endsWith(ext)) return mime;
  }
  return 'text/plain;charset=utf-8';
}

/**
 * @param {{ contract: object }} props
 */
export default function CodeGenerationSection({ contract }) {
  const [tab, setTab] = useState('curl');
  const [modalOpen, setModalOpen] = useState(false);
  const [copyHint, setCopyHint] = useState('');

  const ctx = useMemo(() => buildGenerationContext(contract), [contract]);

  const specJson = useMemo(
    () => (contract?.openApiDocument ? JSON.stringify(contract.openApiDocument, null, 2) : ''),
    [contract]
  );

  const specYaml = useMemo(() => {
    if (!contract?.openApiDocument) return '';
    try {
      return stringify(contract.openApiDocument);
    } catch {
      return '';
    }
  }, [contract]);

  const previewText = useMemo(() => generateArtifactText(tab, ctx), [tab, ctx]);

  const slug = ctx.operationId || contract?.id || 'contract';

  useEffect(() => {
    if (!copyHint) return undefined;
    const t = setTimeout(() => setCopyHint(''), 2200);
    return () => clearTimeout(t);
  }, [copyHint]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopyHint('Copied to clipboard');
    } catch {
      setCopyHint('Copy failed — select text manually');
    }
  }, [previewText]);

  const handleDownloadArtifact = useCallback(() => {
    const name = artifactDownloadName(tab, slug);
    downloadTextFile(name, previewText, mimeForFilename(name));
  }, [tab, slug, previewText]);

  const handleDownloadOpenApiJson = useCallback(() => {
    if (!specJson) return;
    downloadTextFile(`${slug}-openapi.json`, specJson, MIME_BY_EXT['.json']);
  }, [specJson, slug]);

  const handleDownloadOpenApiYaml = useCallback(() => {
    if (!specYaml) return;
    downloadTextFile(`${slug}-openapi.yaml`, specYaml, MIME_BY_EXT['.yaml']);
  }, [specYaml, slug]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const codegenBody = !contract?.openApiDocument ? (
    <p className="helper">Generate artifacts after an OpenAPI document exists for this contract.</p>
  ) : (
    <>
      <p className="helper">
        Derived from the stored OpenAPI document for{' '}
        <span className="mono">{String(ctx.method || 'GET').toUpperCase()}</span>{' '}
        <span className="mono">{ctx.pathTemplate}</span>
        {ctx.operationId ? (
          <>
            {' '}
            · <span className="mono">operationId: {ctx.operationId}</span>
          </>
        ) : null}
      </p>

      <p className="section-title" style={{ fontSize: 12, marginTop: 16 }}>
        Export contract
      </p>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleDownloadOpenApiJson}>
          Download OpenAPI JSON
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleDownloadOpenApiYaml}>
          Download OpenAPI YAML
        </button>
      </div>

      <p className="section-title" style={{ fontSize: 12 }}>
        Generate artifact
      </p>
      <div className="row-actions" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        {ARTIFACT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="row-actions" style={{ marginBottom: 10 }}>
        <button type="button" className="btn btn-sm" onClick={openModal}>
          Preview code
        </button>
        <button type="button" className="btn btn-sm" onClick={handleCopy}>
          Copy snippet
        </button>
        <button type="button" className="btn btn-sm" onClick={handleDownloadArtifact}>
          Download file
        </button>
      </div>
      {copyHint ? (
        <p className="helper" role="status" style={{ marginBottom: 8 }}>
          {copyHint}
        </p>
      ) : null}

      <pre
        className="diff-box mono"
        style={{ maxHeight: 280, overflow: 'auto', margin: 0, fontSize: 11 }}
        tabIndex={0}
      >
        {previewText || '—'}
      </pre>
    </>
  );

  return (
    <>
      <CollapsibleSection sectionId="codegen-section" title="B. Code generation / exports" variant="card">
        {codegenBody}
      </CollapsibleSection>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="codegen-modal-title"
          tabIndex={-1}
          onClick={closeModal}
        >
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 id="codegen-modal-title" className="section-title" style={{ margin: 0 }}>
                Preview: {ARTIFACT_TABS.find((x) => x.id === tab)?.label || tab}
              </h2>
              <button type="button" className="btn btn-sm" onClick={closeModal}>
                Close
              </button>
            </div>
            <div className="row-actions" style={{ margin: '12px 0' }}>
              {ARTIFACT_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`btn btn-sm ${tab === t.id ? 'btn-primary' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="row-actions" style={{ marginBottom: 10 }}>
              <button type="button" className="btn btn-sm" onClick={handleCopy}>
                Copy snippet
              </button>
              <button type="button" className="btn btn-sm" onClick={handleDownloadArtifact}>
                Download file
              </button>
            </div>
            <pre
              className="diff-box mono"
              style={{ maxHeight: 'min(70vh, 520px)', overflow: 'auto', margin: 0, fontSize: 11 }}
            >
              {previewText || '—'}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
