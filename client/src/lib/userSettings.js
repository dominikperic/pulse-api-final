import { getActiveUserKey } from '../services/authState.js';

export const SETTINGS_STORAGE_KEY = 'pulseapi_user_settings_v1';
export const SETTINGS_UPDATED_EVENT = 'pulseapi:settings-updated';

export const DEFAULT_SETTINGS = {
  email: '',
  organization: '',
  notifyEmail: true,
  notifySlack: false,
  tz: 'UTC',
  exportFmt: 'yaml',
  typeOutput: 'both',
  typeStrictness: 'balanced',
};

function scopedSettingsKey() {
  const scope = String(getActiveUserKey() || '')
    .trim()
    .toLowerCase();
  if (!scope || scope === 'anonymous') return SETTINGS_STORAGE_KEY;
  return `${SETTINGS_STORAGE_KEY}:${scope}`;
}

export function loadUserSettings() {
  try {
    const raw = localStorage.getItem(scopedSettingsKey());
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveUserSettings(nextSettings) {
  localStorage.setItem(scopedSettingsKey(), JSON.stringify(nextSettings));
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
}

export function buildUserDisplayName(settings) {
  const email = String(settings?.email || '').trim();
  const localPart = email.split('@')[0] || '';
  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') || 'Engineer';
}
