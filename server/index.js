import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PulseAPI — API</title></head>
<body style="font-family:system-ui;max-width:520px;margin:48px auto;padding:0 16px;line-height:1.5">
  <h1 style="margin:0 0 8px">PulseAPI backend</h1>
  <p style="color:#444;margin:0 0 16px">This port serves the <strong>API only</strong>. There is no web UI here.</p>
  <p style="margin:0 0 8px"><strong>Open the app:</strong></p>
  <p style="margin:0"><a href="http://localhost:5173">http://localhost:5173</a> (run <code>npm run dev</code> for UI only, or <code>npm run dev:stack</code> for UI + this API)</p>
  <p style="margin:24px 0 8px"><strong>Health check:</strong></p>
  <p style="margin:0"><a href="/api/health">/api/health</a></p>
</body></html>`);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'pulseapi-api', note: 'Prototype backend' });
});

/*
 * Full-stack mode: client uses repositories → httpJson when VITE_USE_MOCK_API=false
 * (see client/.env.example). Implement these routes to match the shapes returned by
 * mock mode (client/src/services/mock/sessionStore.js + fixtures.js):
 *
 *   GET    /api/monitors
 *   POST   /api/monitors
 *   PATCH  /api/monitors/:id
 *   GET    /api/alerts
 *   PATCH  /api/alerts/:id
 *   GET    /api/validation-rules
 *   POST   /api/monitors/:monitorId/rules
 */

app.listen(PORT, () => {
  console.log(`PulseAPI API  http://localhost:${PORT}  (UI: http://localhost:5173)`);
});
