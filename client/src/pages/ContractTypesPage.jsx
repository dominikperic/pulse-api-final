import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateTypeModels } from '../lib/typegen.js';
import { generateZodModels } from '../lib/zodgen.js';
import { generateWrapperSnippet } from '../lib/wrapperGen.js';
import { generateRiskNotes } from '../lib/hardening.js';

export default function ContractTypesPage() {
  const { contractId } = useParams();
  const { contracts } = useApp();
  const c = contracts.find((x) => x.id === contractId);

  const typeModels = useMemo(() => (c ? generateTypeModels(c) : null), [c]);
  const zodModels = useMemo(() => (c ? generateZodModels(c) : null), [c]);
  const wrapper = useMemo(
    () => (c ? generateWrapperSnippet(c, typeModels, zodModels) : ''),
    [c, typeModels, zodModels]
  );
  const riskNotes = useMemo(() => (c ? generateRiskNotes(c) : []), [c]);

  if (!c) {
    return (
      <p>
        Contract not found. <Link to="/contracts">Back</Link>
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
        <Link to={`/contracts/${contractId}`}>{c.name}</Link>
        {' > '}
        <span>Types</span>
      </div>
      <div className="page-header">
        <h1>Typed Models &amp; Safe Integration Helpers</h1>
        <Link className="btn" to={`/contracts/${contractId}`}>
          Back to Contract
        </Link>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Generated TypeScript Models</h2>
        <pre className="diff-box mono" style={{ maxHeight: 320, overflow: 'auto', margin: 0 }}>
          {typeModels?.content}
        </pre>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Generated Zod Runtime Schemas</h2>
        <pre className="diff-box mono" style={{ maxHeight: 320, overflow: 'auto', margin: 0 }}>
          {zodModels?.content}
        </pre>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Safe Wrapper Function Example</h2>
        <pre className="diff-box mono" style={{ maxHeight: 260, overflow: 'auto', margin: 0 }}>
          {wrapper}
        </pre>
      </section>

      <section className="card">
        <h2 className="section-title">Weak Typing Risk Notes</h2>
        {riskNotes.length === 0 ? (
          <p className="helper">No major weak-typing risks found from current samples.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {riskNotes.map((line) => (
              <li key={line} style={{ marginBottom: 6 }}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
