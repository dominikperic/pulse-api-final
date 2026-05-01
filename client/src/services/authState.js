let activeUserKey = 'anonymous';

function normalizeUserKey(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  return raw || 'anonymous';
}

export function setActiveUserKey(value) {
  activeUserKey = normalizeUserKey(value);
}

export function getActiveUserKey() {
  return activeUserKey;
}
