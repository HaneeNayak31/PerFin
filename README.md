# PerFin (Personal Finance)

PerFin is a modern, full-stack Personal Finance application built to help users manage their money, track expenses, and gain insights using cutting-edge AI.

## 🚀 Tech Stack

### Frontend (Next.js)

- **Framework:** Next.js 16.3 (App Router with Turbopack)
- **Library:** React 19
- **Styling:** Tailwind CSS v4
- **UI Components:** Lucide-React (Icons), Recharts (Data Visualization)
- **Language:** TypeScript

### Backend (NestJS)

- **Framework:** NestJS v12
- **Database ORM:** Prisma 8 (`@prisma/orm-postgres`)
- **Authentication:** Passport-JWT, Bcrypt
- **AI Integration:** `@google/generative-ai` (Google Gemini)
- **Testing:** Vitest

## 🧠 AI Capabilities

PerFin utilizes Google's Gemini AI to act as a smart financial assistant. The AI engine can:

1. **Auto-Categorize Transactions:** Reads merchant names and descriptions to automatically assign spending categories (e.g., Food, Transport).
2. **Generate Financial Insights:** Analyzes a user's recent spending history and budgets to provide contextual advice.
3. **Conversational Agent:** Chat interface allowing users to query their balance, spending habits, and get financial advice in natural language.

## 📂 Core Data Models

- **User**: Handles authentication and manages user relationships across all data.
- **Account**: Supports multiple account types (Checking, Savings, Cash, Credit) and tracks balances in multiple currencies (defaulting to INR).
- **Transaction**: Tracks individual income and expenses, linking them to specific accounts and categories. Includes merchant details and timestamps.
- **Category**: Custom categorization for transactions (Income/Expense).
- **Budget**: Allows users to set monthly spending limits per category and tracks progress.

## 🛠 Project Structure

### `frontend/`

Contains the Next.js application.

- `src/app/`: The core routing (Dashboard, Budgets, Analytics, Transactions, AI Chat).
- `src/components/`: Reusable UI components (like the Topbar).
- `src/services/`: API integration layers (e.g., `analytics.ts`).

### `Backend/`

Contains the NestJS API.

- `src/auth/`: JWT-based authentication.
- `src/accounts/`, `src/budgets/`, `src/categories/`, `src/transactions/`: Core CRUD REST modules.
- `src/ai/`: The Gemini AI Service (`ai.service.ts`).
- `src/analytics/`: Data aggregation endpoints for frontend charts.
- `src/prisma/`: Prisma schema (`contract.prisma`) mapping to PostgreSQL.

## Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL 15 or newer
- A Google Gemini API key for the full AI experience (optional)

### Configuration

The backend requires `DATABASE_URL` and `JWT_SECRET`. `AI_API_KEY` is optional; without it, AI features use their fallback behavior. The backend reads these values from its process environment. For example, in PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/perfin"
$env:JWT_SECRET = "replace-with-a-long-random-secret"
$env:AI_API_KEY = "your-gemini-api-key"
```

The Prisma CLI also reads `Backend/.env`; start from `Backend/.env.example` when running Prisma commands.

### Run the Backend

```bash
cd Backend
npm install
npm run start:dev
```

The API listens on port `4000` by default. Its Swagger documentation is available at `http://localhost:4000/api/docs`.

### Run the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `http://localhost:4000` as its API by default. Set `NEXT_PUBLIC_API_URL` before starting it to use a different API URL.
