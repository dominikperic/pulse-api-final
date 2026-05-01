# PulseAPI

## Must have

- Node.js 18+ (Node 20 recommended)
- npm

## 1) Install dependencies

From the repo root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```


## 2) Run frontend and backend together

From the repo root:

```bash
npm run dev:stack
```

This starts:
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3001`

## 3) Verify Working

- Open the app at `http://localhost:5173`
- Check backend health at `http://localhost:3001/api/health`
