# PerFin API (Backend)

Express 5 + TypeScript + PostgreSQL + Prisma 8. Full documentation (setup, API reference, auth flow, how balances stay consistent, limitations) is in the [root README](../README.md).

## Quick start

```bash
cp .env.example .env          # set DATABASE_URL and JWT_SECRET (32+ chars)
npm install
npm run db:migrate            # apply migrations
npm run dev                   # http://localhost:4000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with auto-reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run it with Node |
| `npm run typecheck` | `tsc --noEmit` for source and tests |
| `npm run lint` | `oxlint --type-aware` |
| `npm test` | Unit tests (no database, Gemini never called) |
| `npm run test:integration` | HTTP + database tests against `TEST_DATABASE_URL` (migrated automatically; tables are emptied) |
| `npm run db:migrate` / `npm run db:status` | Apply migrations / show migration status |
| `npm run contract:emit` | Regenerate `src/prisma/contract.json` + `contract.d.ts` after editing `contract.prisma` |

See [`prisma-8.md`](prisma-8.md) for Prisma 8 notes. Prisma 8 maps `DateTime` columns to `Temporal` values. `src/prisma/db.ts` loads `temporal-polyfill`, because Node 22 and 24 have no built-in `Temporal`.
