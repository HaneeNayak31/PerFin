# PerFin

PerFin is a full-stack personal finance app. You can track accounts, income and expenses, set monthly budgets per category, see analytics, and ask an AI assistant (Google Gemini) about your month.

It is a portfolio project focused on **correct money handling**: balances are updated atomically with exact decimal arithmetic, every query is scoped to the signed-in user, and the AI never computes numbers itself.

## Main features

- Register, log in and log out. Sessions use an httpOnly cookie that holds a JWT.
- Accounts (savings, checking, cash, credit) with an opening balance and a currency.
- Income and expense transactions with create, edit and delete. The account balance is always adjusted in the same database transaction.
- Server-side pagination, filters (type, account, category, date range), search and sorting.
- Categories (income or expense, names unique per user regardless of case).
- Monthly budgets per expense category, with spent, remaining and percentage computed by PostgreSQL.
- Analytics: income, expenses, net cash flow, balances, a monthly series and a breakdown by category. Months are cut in a configurable time zone.
- CSV import and export. Import validates every row; export neutralises spreadsheet formulas.
- AI (optional): transaction categorisation, insights and chat. All output is validated, and the app falls back safely when the AI is off or fails.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts, axios |
| Backend | Node.js 22+, Express 5, TypeScript |
| Database | PostgreSQL 15+ |
| ORM | Prisma 8 (`@prisma/orm-postgres`, contract-first) |
| Auth | JWT (`jsonwebtoken`, HS256) in an httpOnly cookie, bcrypt (cost 12) |
| Validation | class-validator and class-transformer DTOs |
| AI | Google Gemini via `@google/generative-ai` (model configurable) |
| Tests | Vitest and Supertest against a real PostgreSQL test database |

## Architecture

```
Browser (Next.js)  ──axios, withCredentials──▶  Express API  ──Prisma 8──▶  PostgreSQL
                                                    │
                                                    └──(optional)──▶ Gemini
```

A request travels through the backend like this:

```
route (URL + middleware)  →  controller (read req, send res)  →  service (business rules)  →  Prisma / SQL
          │
          ├─ requireAuth: verify the JWT cookie and set req.user
          ├─ validateBody(Dto): reject bad input with a 400
          └─ errors bubble up to error.middleware, which returns clean JSON
```

## Project structure

```
PerFin/
├── Backend/
│   ├── src/
│   │   ├── app.ts                 # builds the Express app (middleware + routes)
│   │   ├── server.ts              # starts HTTP, DB check, graceful shutdown
│   │   ├── config/env.ts          # loads and validates environment variables
│   │   ├── middleware/            # auth, validation, errors, CSRF origin check, logging
│   │   ├── routes/                # one router per resource
│   │   ├── controllers/           # thin HTTP handlers
│   │   ├── services/              # business logic (transactions, analytics, AI…)
│   │   ├── validation/            # DTO classes with class-validator rules
│   │   ├── utils/                 # money, dates, pagination, CSV, errors
│   │   └── prisma/                # contract.prisma + generated contract files + db.ts
│   ├── migrations/                # Prisma 8 migrations (unchanged)
│   ├── tests/unit/                # pure logic tests (no DB)
│   ├── tests/integration/         # HTTP tests against a real test database
│   └── prisma.config.ts
└── frontend/
    └── src/
        ├── app/                   # pages: login, dashboard, accounts, transactions, budgets, analytics, ai
        ├── components/            # layout, modal, form controls, TransactionForm
        ├── hooks/                 # useApiData, useCurrentUser
        ├── services/              # typed API calls
        ├── lib/format.ts          # money and date formatting
        └── types/api.ts           # API response types
```

## Prerequisites

- Node.js **22 or newer** (`node -v`)
- PostgreSQL **15 or newer**
- (Optional) a Gemini API key from Google AI Studio

## Setup

### 1. PostgreSQL

Create a development database and a separate test database:

```sql
CREATE DATABASE perfin;
CREATE DATABASE perfin_test;  -- only used by integration tests; its tables get emptied
```

### 2. Backend environment

```bash
cd Backend
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Development database connection string |
| `JWT_SECRET` | yes | 32+ random characters used to sign tokens |
| `FRONTEND_ORIGIN` | no (`http://localhost:3000`) | Allowed origin(s) for CORS and the CSRF check, comma-separated |
| `PORT` | no (`4000`) | API port |
| `JWT_EXPIRES_IN_SECONDS` | no (`86400`) | Session length |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | no (`false` in dev, `true` in production / `lax`) | Cookie flags |
| `AUTH_RATE_LIMIT_MAX` | no (`10`) | Login and register attempts per IP per 15 minutes |
| `REPORTING_TIMEZONE` | no (`Asia/Kolkata`) | Time zone for month boundaries and `YYYY-MM-DD` dates |
| `AI_API_KEY` | no | Gemini key. Without it, AI endpoints return calculated figures only |
| `GEMINI_MODEL` | no (`gemini-3.8-flash`) | Gemini model id |
| `AI_TIMEOUT_MS` | no (`15000`) | Timeout for one Gemini call |
| `TEST_DATABASE_URL` | for integration tests | Disposable test database. Its name must contain `test` |

The server validates these at startup. If anything is missing or invalid, it lists every problem and exits; secret values are never printed.

### 3. Apply the database migrations

```bash
cd Backend
npm install
npm run db:migrate        # applies migrations/ to DATABASE_URL
npm run db:status         # optional: shows applied/pending migrations
```

No schema change was needed for the Express migration: the existing `20260923T0559_init` migration is still the only one.

### 4. Frontend environment

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
```

## Running

| What | Command (run in) |
| --- | --- |
| Backend dev server (auto-reload) | `npm run dev` (`Backend/`) |
| Frontend dev server | `npm run dev` (`frontend/`), then open http://localhost:3000 |
| Backend production build | `npm run build && npm start` (`Backend/`) |
| Frontend production build | `npm run build && npm start` (`frontend/`) |
| Type-check backend | `npm run typecheck` (`Backend/`) |
| Lint | `npm run lint` (`Backend/` and `frontend/`) |
| Unit tests (no DB needed) | `npm test` (`Backend/`) |
| Integration tests (needs `TEST_DATABASE_URL`) | `npm run test:integration` (`Backend/`) |
| Both test suites | `npm run test:all` (`Backend/`) |

## API

All endpoints except `/health*`, `/auth/register`, `/auth/login` and `/auth/logout` need a session. Money values are **decimal strings** in both directions (numbers are accepted as input). Dates are either `YYYY-MM-DD` (midnight in `REPORTING_TIMEZONE`) or ISO timestamps with an offset. Errors look like:

```json
{ "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": ["amount must be a positive amount with at most 2 decimal places (e.g. \"1250.50\")"] }
```

| Method & path | Description |
| --- | --- |
| `GET /health`, `GET /health/db` | Liveness, database connectivity |
| `POST /auth/register` | `{ email, password, name }` → `201 { id, email, name }` |
| `POST /auth/login` | `{ email, password }` → sets the `perfin_token` cookie, returns `{ user }` |
| `POST /auth/logout` | Clears the cookie → `204` |
| `GET /auth/me` | Current user |
| `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id` | Accounts. `balance` is only accepted on create. Deleting an account that still has transactions → `409` |
| `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id` | Categories (`type`: `income` or `expense`) |
| `GET /transactions` | `?page&limit(≤100)&type&accountId&categoryId&startDate&endDate&search&sortBy=date\|amount\|createdAt&sortOrder=asc\|desc` → `{ data, meta: { page, limit, total, totalPages } }` |
| `POST /transactions`, `GET/PATCH/DELETE /transactions/:id` | Transaction CRUD with atomic balance updates |
| `GET /transactions/export` | CSV download |
| `POST /transactions/import` | Raw CSV body (`Content-Type: text/csv`) with columns `date,amount,type,accountId[,categoryId,description,merchant]`, ≤ 1000 rows |
| `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/:id` | Budgets (expense categories only, one per category per month) |
| `GET /budgets/current?year&month` | Budgets with `spent`, `remaining`, `percentageUsed` |
| `GET /analytics/overview` | `totalIncome, totalExpenses, savings (net), currentBalance, numberOfTransactions`. Optional `startDate/endDate` |
| `GET /analytics/monthly` (alias `/analytics/cashflow`) | `[{ month: "YYYY-MM", income, expense, net }]` |
| `GET /analytics/categories` | Expenses per category, including `Uncategorized` |
| `POST /ai/categorize` | `{ merchant?, description?, type? }` → a suggestion from **your** categories, or `null` |
| `GET /ai/insights` | Calculated `facts` plus AI `insights` for a period (default: this month) |
| `POST /ai/chat` | `{ query }` (≤ 500 chars) → `{ reply, source: "gemini" \| "calculated" }` |

Example session with curl:

```bash
curl -c jar -H 'Content-Type: application/json' -d '{"email":"me@example.com","password":"password123","name":"Me"}' localhost:4000/auth/register
curl -c jar -b jar -H 'Content-Type: application/json' -d '{"email":"me@example.com","password":"password123"}' localhost:4000/auth/login
curl -b jar -H 'Content-Type: application/json' -d '{"name":"HDFC","type":"savings","balance":"1000.00"}' localhost:4000/accounts
curl -b jar -H 'Content-Type: application/json' -d '{"accountId":1,"amount":"250.25","type":"expense","merchant":"Cafe","date":"2026-10-18"}' localhost:4000/transactions
curl -b jar 'localhost:4000/transactions?search=cafe&sortBy=amount&sortOrder=desc'
```

## Authentication flow

1. `POST /auth/register` stores a bcrypt hash (cost 12). The password itself is never stored or returned.
2. `POST /auth/login` checks the password. Unknown emails take the same time and get the same error as wrong passwords. On success it sets the cookie `perfin_token` (`HttpOnly`, `SameSite=Lax`, `Secure` in production) holding a signed JWT that expires after 1 day by default.
3. The frontend calls the API with `withCredentials: true`, so the browser sends the cookie automatically. Page JavaScript cannot read the token, which protects it from XSS theft. An `Authorization: Bearer` header is also accepted for API clients.
4. `requireAuth` verifies the token (HS256 only) and sets `req.user`. Every service query filters by `req.user.id`, never by an id from the request body.
5. CSRF protection: state-changing requests whose `Origin` isn't in `FRONTEND_ORIGIN` get a `403`, and the cookie is `SameSite=Lax`.
6. `POST /auth/logout` clears the cookie.

## How balances stay consistent

- **Exact arithmetic.** Amounts are validated as decimal strings (at most 12 integer digits and 2 decimal places; values with more decimals are rejected rather than rounded). Balances change with `UPDATE account SET balance = balance + $delta`, so PostgreSQL's `numeric` type does the maths and JavaScript floats never touch money.
- **Atomic.** Create, update and delete each run inside `db.transaction(...)`. The balance change and the transaction row are committed together or not at all. A test makes the row insert fail *after* the balance change and checks that the balance is rolled back.
- **One rule for edits.** Updating a transaction first undoes its old effect on its old account, then applies its new effect to its (possibly new) account. That covers amount changes, income ↔ expense, and moving between accounts.
- **Concurrency.** The edited or deleted transaction row is locked with `SELECT … FOR UPDATE`. Balance updates are relative increments, so parallel requests can't overwrite each other, and accounts are always locked in id order to avoid deadlocks. Tests cover 25 parallel creates, concurrent edit + delete of the same transaction, and crossed account moves.
- **Ownership.** The account and category must belong to the user. The category type must match the transaction type.
- **The balance isn't editable directly.** Only the opening balance is set by hand; after that, changes go through transactions.

## AI behaviour and limitations

- The database computes every figure. Gemini only phrases insights, classifies merchants, or answers questions about a supplied summary.
- Only aggregates are sent for insights and chat (totals and top categories). Categorisation sends one merchant and description plus the user's own category names. Nothing else (no account names, transaction lists or emails) is sent.
- Model output is parsed and validated. Category suggestions must exactly match one of the user's categories (case-insensitive), or they're dropped.
- No fake confidence scores and no canned answers presented as AI. Responses carry `source: "gemini" | "calculated" | "unavailable"`.
- Calls have a timeout (`AI_TIMEOUT_MS`) and a 20 requests per minute per user limit. Errors are logged by type only; prompts and keys are never logged.
- Chat can only see **this month's** totals, balances and top categories. It is told to say so for anything else (individual transactions, other months, forecasts).

## Security notes and current limitations

Be precise about what this is: a carefully built portfolio app, not an audited production banking system.

- **JWTs are stateless.** Logout clears the browser cookie, but a token copied before logout stays valid until it expires (1 day by default). Server-side revocation would need a token denylist or session table.
- **Rate limiting is in memory, per process.** It resets on restart and isn't shared across multiple instances.
- **The CSRF defence** is the `Origin` check plus `SameSite=Lax`. If you host the frontend and API on different sites, you need `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`, and should consider adding CSRF tokens.
- **No multi-currency maths.** Each account has a currency, but analytics totals add amounts across accounts without conversion. The UI shows "Multiple currencies" instead of a wrong total.
- **Case-insensitive category names are enforced in the service layer.** The database's unique index is case-sensitive, so two simultaneous requests could still race.
- **No email verification, password reset or account deletion** yet.
- **No transfers between accounts** as a single operation. Record an expense and an income instead.
- `GET /transactions/export` builds the whole CSV in memory, which is fine for personal-scale data.

## Possible next steps

- Transfers between accounts, recurring transactions, multi-currency conversion
- A refresh-token or session table for revocable logins
- A database-level case-insensitive unique index for category names (needs a migration)
- Playwright end-to-end tests in CI
