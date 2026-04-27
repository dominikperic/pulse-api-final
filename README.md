# PulseAPI Mockup

Quick local setup for the **entire app** (frontend + backend API).

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm

## 1) Install dependencies

From the repo root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

## 2) Enable full-stack mode in the client

Create `client/.env.development` with:

```env
VITE_USE_MOCK_API=false
VITE_API_URL=
```

Leaving `VITE_API_URL` empty makes the client call `/api/*`, which Vite proxies to the backend on `http://localhost:3001`.

## 3) Run frontend + backend together

From the repo root:

```bash
npm run dev:stack
```

This starts:
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3001`

## 4) Quick verification

- Open the app at `http://localhost:5173`
- Check backend health at `http://localhost:3001/api/health`