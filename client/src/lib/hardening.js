function hasText(v) {
  return Boolean(v && String(v).trim() && String(v).trim() !== '—');
}

export function generateRiskNotes(contract) {
  const notes = [];
  const nullable = String(contract?.analysisMeta?.nullable || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && x !== '—');
  nullable.forEach((path) => {
    notes.push(`Field \`${path}\` is nullable in observed samples; do not assume non-null usage downstream.`);
  });

  const conflictLines = String(contract?.analysisMeta?.conflicts || '')
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && x !== '—');
  conflictLines.forEach((line) => {
    notes.push(`${line}. Add a runtime guard before using this field as a fixed type.`);
  });

  const warningLines = String(contract?.analysisMeta?.warnings || '')
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && x !== '—');
  warningLines.forEach((line) => notes.push(line));

  const requestRows = (contract?.analysisMeta?.requestFieldSummary || []).map((row) => ({
    ...row,
    scopedPath: `request.${row.path}`,
  }));
  const responseRows = Object.entries(contract?.analysisMeta?.responseFieldSummary || {}).flatMap(([code, rows]) =>
    (rows || []).map((row) => ({
      ...row,
      scopedPath: `response[${code}].${row.path}`,
    }))
  );
  [...requestRows, ...responseRows].forEach((row) => {
    if (String(row.required) === 'No') {
      notes.push(`Field \`${row.scopedPath}\` is optional in inferred models; typed wrappers should handle missing values.`);
    }
    if (hasText(row.enumHint) && row.enumHint !== '—') {
      notes.push(
        `Field \`${row.scopedPath}\` has repeated observed values (${row.enumHint}); treat them as sampled hints, not enforced enums.`
      );
    }
    if (String(row.path).includes('[]')) {
      notes.push(`Array field \`${row.scopedPath}\` should be validated at runtime to avoid weakly typed item assumptions.`);
    }
  });

  return [...new Set(notes)];
}
