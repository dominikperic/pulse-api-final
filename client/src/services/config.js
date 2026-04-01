/**
 * API mode for PulseAPI client.
 *
 * GitHub Pages / static mockup: leave defaults (mock on, no server).
 * Local + Express: run `npm run dev:stack` and use client/.env.development with:
 *   VITE_USE_MOCK_API=false
 *   VITE_API_URL=   (empty = same-origin /api, proxied by Vite to localhost:3001)
 *
 * Production + real API: set VITE_USE_MOCK_API=false and VITE_API_URL to your API origin.
 */

export function useMockApi() {
  return import.meta.env.VITE_USE_MOCK_API !== 'false';
}

/** Empty string = use relative URLs (Vite dev proxy, or same host as the SPA). */
export function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || raw === '') return '';
  return String(raw).replace(/\/$/, '');
}
