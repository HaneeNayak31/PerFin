# PerFin Frontend

Next.js 16 + React 19 + TypeScript + Tailwind CSS client for the PerFin API. See the [root README](../README.md) for the full setup.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
npm run lint
npm run build && npm start
```

The session cookie is httpOnly and set by the API. Requests go through `src/services/api.ts` with `withCredentials: true`, and a `401` sends the user to `/login`.
