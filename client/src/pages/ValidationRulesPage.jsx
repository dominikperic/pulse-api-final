import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ValidationRulesPage() {
  const { contracts } = useApp();
  const rows = [];
  contracts.forEach((c) => {
    const requestRows = c.analysisMeta?.requestFieldSummary || [];
    requestRows.forEach((r) =>
      rows.push({
        id: `${c.id}-req-${r.path}`,
        contractId: c.id,
        contractName: c.name,
        path: `request.${r.path}`,
        type: r.type,
        required: r.required,
        nullable: r.nullable,
        enumHint: r.enumHint,
        note: 'Inferred from request payload examples',
      })
    );
    Object.entries(c.analysisMeta?.responseFieldSummary || {}).forEach(([code, responseRows]) => {
      responseRows.forEach((r) =>
        rows.push({
          id: `${c.id}-${code}-${r.path}`,
          contractId: c.id,
          contractName: c.name,
          path: `response.${code}.${r.path}`,
          type: r.type,
          required: r.required,
          nullable: r.nullable,
          enumHint: r.enumHint,
          note: 'Inferred from response payload examples',
        })
      );
    });
  });

  return (
    <>
      <div className="page-header">
        <h1>Schema Notes</h1>
        <p className="helper" style={{ margin: 0, flex: '1 1 100%' }}>
          Field-level inference review across all contracts: type, required/optional, nullability, and observed values.
        </p>
      </div>
      <div className="table-wrap">
        <table className="data-table" aria-label="All inferred schema notes">
          <thead>
            <tr>
              <th scope="col">Contract / Endpoint</th>
              <th scope="col">JSON Path</th>
              <th scope="col">Inferred Type</th>
              <th scope="col">Required</th>
              <th scope="col">Nullable</th>
              <th scope="col">Observed Values</th>
              <th scope="col">Note</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/contracts/${r.contractId}`}>{r.contractName}</Link>
                </td>
                <td className="mono">{r.path}</td>
                <td>{r.type}</td>
                <td>{r.required}</td>
                <td>{r.nullable}</td>
                <td>{r.enumHint}</td>
                <td>{r.note}</td>
                <td>
                  <Link className="btn btn-sm" to={`/contracts/${r.contractId}`}>
                    Open Contract
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
