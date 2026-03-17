# bioqz

A minimal SaaS app: landing page, auth (email/password + optional Google), Stripe billing, and an **AI resume** MVP (Tiptap editor, DeepSeek rewrites, Rezi-style score, PDF export, usage caps).

## Tech stack

- **Frontend:** Vite, React 18, TypeScript, React Router
- **Styling:** Plain CSS with CSS variables; dark mode (`data-theme="dark"`)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL via **pg** driver (no Prisma)
- **Auth:** JWT (email/password, email verification); optional Google (Passport.js)
- **Billing:** Stripe (Checkout, Customer Portal, webhooks)
- **bioqz:** DeepSeek API, Tiptap editor, pdfmake (PDF export)

## Commands

```bash
npm install   # install dependencies
npm run dev   # start dev server
npm run build # production build
npm run preview # preview production build
```

## Design

- **Background:** Light gray-to-off-white gradient
- **Blobs:** SVG organic shapes with teal/blue-gray gradients and soft drop shadows
- **UI:** Glassmorphism cards and nav (backdrop blur, light borders, soft shadows)
- **Typography:** Outfit (clean sans-serif)
- **Texture:** Subtle noise overlay

---

## Auth (login, register, email confirmation)

The app includes a full auth flow that you can hook up to your API and PostgreSQL.

### Backend (Node + Express + PostgreSQL)

- **API:** `server/` — Express app with JWT auth and email verification.
- **Endpoints:**  
  `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/verify-email?token=...` · `POST /api/auth/resend-verification` · `GET /api/auth/me` (protected)
- **Database:** Run `server/schema.sql` against your Postgres DB to create the `users` table.
- **Config:** Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and optionally `APP_BASE_URL`, `PORT`, etc.

```bash
# Create DB and run schema (example)
psql -U postgres -d your_db -f server/schema.sql

# Run the auth API (from project root)
npm run server
# or with auto-reload: npm run dev:server
```

- **Email:** By default the server logs verification emails to the console. To send real email, implement the `EmailService` in `server/services/email.ts` (e.g. SendGrid, Resend, Nodemailer) and use it in `server/routes/auth.ts` instead of `stubEmailService`.

### Frontend

- **Routes:** `/` (landing), `/login`, `/register`, `/verify-email`, `/dashboard` (protected).
- **API base URL:** Set `VITE_API_URL` in `.env` (default `http://localhost:3001`).
- **Token:** Stored in `localStorage` and sent as `Authorization: Bearer <token>`.

### Flow

1. User registers → account created, verification email sent (or logged).
2. User clicks link in email → `GET /verify-email?token=...` → email marked verified.
3. User signs in at `/login` → receives JWT → can access `/dashboard` and other protected endpoints.

---

## bioqz (resume builder)

Full product design (features, data model, API, abuse protection, file map): **[docs/PRODUCT_DESIGN.md](docs/PRODUCT_DESIGN.md)**.

Open **/dashboard/resume** after signing in to use the resume builder.

### Features

- **Dashboard:** Upload resume (.txt) or paste text; paste job description; Tiptap editor (bold, italic, lists, Inter font, ATS-safe margins).
- **AI rewrite:** Select text → “Rewrite with AI” → DeepSeek rewrites with strong verbs and metrics; selection replaced in editor.
- **Rezi-style score (0–100):** Keyword match %, verb strength, length, ATS safety (regex); optional breakdown and keyword list for highlighting.
- **Side-by-side preview:** Original vs current; keywords from job description highlighted (e.g. yellow).
- **PDF export:** One-click export via pdfmake from editor state.
- **Templates:** One-column, two-column (skills sidebar), creative — switchable.
- **Abuse protection:** Usage logged in PostgreSQL (`usage_logs`); daily caps (50 free / 500 Pro); spam/lockout/suspend; rate limit 1 req/s; optional job-desc cache (in-memory or Redis).

### Env (resume builder)

Add to `.env`:

- `DEEPSEEK_API_KEY` — required for AI rewrite.
- Optional: `REDIS_URL` — for job-desc cache and lockout (otherwise in-memory).

Existing: `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL`, Stripe vars. Run migration `server/migrations/002_resume_builder.sql` (adds `usage_logs`, `users.is_pro`).

### Setup (full app)

```bash
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, DEEPSEEK_API_KEY, etc. (On Windows: copy .env.example .env)
psql -U postgres -d your_db -f server/schema.sql
psql -U postgres -d your_db -f server/migrations/002_resume_builder.sql
npm run dev        # Vite (frontend)
npm run server     # Express (API)
```

### Local test (step-by-step)

**Where env vars go:** One file only — **`.env`** in the **project root** (same folder as `package.json`). Both the backend and the Vite frontend read from it.

1. **Create `.env`** (in project root):
   ```bash
   cp .env.example .env
   ```
   On Windows: `copy .env.example .env`

2. **Edit `.env`** and set at least:
   - `DATABASE_URL` — your Postgres connection string (e.g. `postgresql://postgres:password@localhost:5432/frosted`)
   - `JWT_SECRET` — any long random string (e.g. `my-super-secret-jwt-key-change-me`)
   - `DEEPSEEK_API_KEY` — your DeepSeek API key (needed for “Rewrite with AI”)
   - `APP_BASE_URL=http://localhost:5173` (already in .env.example)

   Leave `VITE_API_URL` commented out or unset; the frontend will use `http://localhost:3001` in dev.

3. **Create the database and run migrations** (once per DB):
   ```bash
   psql -U postgres -d your_db -f server/schema.sql
   psql -U postgres -d your_db -f server/migrations/002_resume_builder.sql
   ```
   Replace `your_db` with the DB name from `DATABASE_URL`.

4. **Start backend and frontend** (two terminals, both from project root):

   **Terminal 1 — API**
   ```bash
   npm run server
   ```
   You should see: `Auth API running at http://localhost:3001`

   **Terminal 2 — Frontend**
   ```bash
   npm run dev
   ```
   You should see: `Local: http://localhost:5173`

5. **Test in the browser:** Open http://localhost:5173 → Register → check Terminal 1 for the verify-email link (or use the link from the logged email) → Verify → Sign in → go to **/dashboard/resume**.

**Production-like test (single process):**  
`npm run build` then `NODE_ENV=production npm start` → serves app + API on http://localhost:3001. Use this to verify the combined build before deploying.

---

### Deploy with Nixpacks (VPS / Railway / Render)

The repo includes **`nixpacks.toml`**. Nixpacks will run `npm install`, `npm run build`, then `npm start`. One process serves both the API and the built frontend.

**Required env on the VPS:**

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` (Nixpacks sets this) |
| `PORT` | Port the host binds (e.g. 3001 or platform-provided) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Strong secret for JWT signing |
| `APP_BASE_URL` | Full app URL (e.g. `https://your-app.up.railway.app`) |
| `DEEPSEEK_API_KEY` | Required for AI rewrite |

**Optional:** `STRIPE_*`, `REDIS_URL`, `VITE_API_URL` (leave unset for same-origin).

**Do before first deploy:** Run `server/schema.sql` and `server/migrations/002_resume_builder.sql` against your production Postgres. Point `DATABASE_URL` at that database.

**Stripe webhook:** If using Stripe, set the webhook URL to `https://your-app.example.com/api/auth/stripe-webhook` and add `STRIPE_WEBHOOK_SECRET` to env.
