import { loadUserSettings } from './userSettings.js';

function parseStoredTimestamp(ts) {
  const raw = String(ts || '').trim();
  if (!raw) return null;
  const normalized = raw.includes('UTC') ? raw.replace(' UTC', 'Z').replace(' ', 'T') : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function getUserTimezone() {
  const tz = String(loadUserSettings().tz || '').trim();
  return tz || 'UTC';
}

export function formatTimestampForTimezone(ts, timezone) {
  const parsed = parseStoredTimestamp(ts);
  if (!parsed) return String(ts || '—');
  try {
    const formatted = new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(parsed);
    return `${formatted} ${timezone || 'UTC'}`;
  } catch {
    return String(ts || '—');
  }
}
