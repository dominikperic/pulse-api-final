export default function StatusBadge({ status }) {
  const s = status || '';
  let cls = 'badge';
  if (s === 'Healthy') cls += ' badge-ok';
  else if (s === 'Paused') cls += ' badge-muted';
  else if (s === 'Drift Detected') cls += ' badge-warn';
  else if (s === 'Validation Failed') cls += ' badge-bad';
  return (
    <span className={cls} title="Monitor status">
      {status}
    </span>
  );
}
