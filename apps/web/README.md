# Web App (Next.js + Mantine)

[YOURAPP] web client is built with Next.js 15, Mantine UI, and Supabase authentication. This document covers local development, environment variables, and useful scripts.

---

## Requirements

- Node.js 20+
- npm 10+ (ships with Node 20)
- Optional: Docker (only if you want to run the API locally via `docker compose`)

Install dependencies once (or run `make setup` from the repo root):

```bash
cd apps/web
npm install
```

---

## Environment Variables

Create `apps/web/.env.local` with the Supabase public credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

These values are consumed by the Supabase helpers in `utils/supabase/*`. Restart `npm run dev` after editing the file.

---

## Development Workflow

```bash
# Start the FastAPI backend (optional, from repo root)
docker compose up --build

# Start the web dev server with hot reload
cd apps/web
npm run dev
```

Or use the Makefile wrapper to spin up API + web together:

```bash
make dev-web    # runs docker compose + npm run dev (with prefixed logs)
```

The app lives at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server with Fast Refresh |
| `npm run build` | Production build (`.next/`) |
| `npm run start` | Run the compiled app (`next start`) |
| `npm run lint` | ESLint (flat config) |
| `npm run lint:fix` | ESLint with `--fix` (runs Prettier via the config) |
| `npm run generate-api` | Run Orval to refresh `lib/gen/**` from the shared OpenAPI spec |

---

## Notes & Tips

- **Authentication** – Sign-in/forgot-password flows use Supabase server actions; registration posts to the backend’s `/auth/sign-up`.
- **Styling** – Mantine theme overrides live in `theme.ts`. Component-level styles use CSS modules (e.g., `components/Register/Register.module.css`).
- **Supabase helpers** – Browser, server, and middleware clients are defined in `utils/supabase/`.
- **API client** – Orval builds strongly typed fetch helpers in `lib/gen/**`. Run `npm run generate-api` (or `make generate-api`) whenever `packages/openapi/api.yaml` changes.
- **Middleware** – `middleware.ts` enforces auth redirects (`/login`, `/register`, `/forgot-password` remain public).

See the root [`README.md`](../../README.md) for end-to-end workflows and shared tooling.
