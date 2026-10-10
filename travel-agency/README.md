# Voyage — frontend

React 19 + TypeScript + Vite. See the [root README](../README.md) for the full project, architecture and how to run everything.

```bash
npm install
npm run dev          # http://localhost:5173 (expects the API at VITE_API_URL, default http://localhost:5000/api)
npm run typecheck && npm run lint && npm test && npm run build
```

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL (e.g. `/api` behind Nginx) |
| `VITE_DEMO_MODE` | `true` shows demo admin credentials on the Login page. Only for a disposable demo database. Never enable on a public deployment |
