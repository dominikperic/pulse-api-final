import express from 'express';
import cors from 'cors';
import { runLiveEndpointCheck } from './lib/liveCheckRunner.js';

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

/**
 * Live HTTP replay + contract validation (Ajv + drift + rules).
 * Body: { contract, rules?, overrideSafeToReplay? }
 */
app.post('/api/contracts/live-check', async (req, res) => {
  try {
    const { contract, rules, overrideSafeToReplay } = req.body || {};
    if (!contract || typeof contract !== 'object') {
      res.status(400).json({ ok: false, error: 'Missing contract in body' });
      return;
    }
    const result = await runLiveEndpointCheck({
      contract,
      rules: Array.isArray(rules) ? rules : [],
      overrideSafeToReplay: Boolean(overrideSafeToReplay),
    });
    if (result.blocked) {
      res.status(409).json(result);
      return;
    }
    if (!result.ok && result.error) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (e) {
    console.error('live-check', e);
    res.status(500).json({ ok: false, error: e?.message || 'Live check failed' });
  }
});

/*
 * Full-stack mode: client uses repositories → httpJson when VITE_USE_MOCK_API=false
 * (see client/.env.example). Implement these routes to match the shapes returned by
 * mock mode (client/src/services/mock/sessionStore.js + fixtures.js):
 *
 *   GET    /api/contracts
 *   POST   /api/contracts
 *   PATCH  /api/contracts/:id
 *   DELETE /api/contracts/:id
 *   GET    /api/alerts
 *   PATCH  /api/alerts/:id
 *   GET    /api/validation-rules
 *   POST   /api/contracts/:contractId/rules
 */

app.listen(PORT, () => {
  console.log(`PulseAPI API  http://localhost:${PORT}  (UI: http://localhost:5173)`);
});
