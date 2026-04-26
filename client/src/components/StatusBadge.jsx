export default function StatusBadge({ status }) {
  const s = status || '';
  let cls = 'badge';
  if (s === 'Types Ready' || s === 'Spec Generated' || s === 'Contract Generated') cls += ' badge-ok';
  else if (s === 'Needs Review' || s === 'Archived') cls += ' badge-muted';
  else if (s === 'Inference Warning' || s === 'Inconsistent Samples') cls += ' badge-warn';
  else if (s === 'Draft') cls += ' badge-muted';
  return (
    <span className={cls} title="Contract status">
      {status}
    </span>
  );
}
