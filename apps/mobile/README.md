# Mobile App (Expo / React Native)

The [YOURAPP] mobile client runs on Expo Router + React Native. It connects to Supabase for authentication and the FastAPI backend for registration flows.

---

## Requirements

- Node.js 20+
- npm 10+
- Xcode (iOS simulator) and/or Android Studio (emulator)
- Expo CLI (installed automatically via `npx`)
- Docker (optional, only if you want to run the API locally with `docker compose`)

> First-time Expo developer? Follow the official environment setup guide for your platform: [docs.expo.dev/get-started/set-up-your-environment](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build&buildEnv=local)

---

## Environment Variables

Create `apps/mobile/.env.local` (or `.env`) and populate the Expo public variables:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

These are bundled at build time, so restart Expo whenever you change them.

---

## Development Workflow

```bash
# 1. Start backend services (from repo root)
docker compose up --build   # API on http://localhost:8080

# 2. Run the native app (iOS example)
cd apps/mobile
npm install   # or run `make setup` once from repo root
npx expo run:ios            # first build + install

# 3. Leave Metro running (npm run start) and reload the simulator as you edit code
```

Shortcuts:

| Command | Description |
|---------|-------------|
| `make dev-mobile` | Starts Docker API + Expo Metro + launches the iOS simulator |
| `npm run start` | Metro bundler only (opens Expo dev tools) |
| `npm run ios` / `npm run android` | Build & run native shells |
| `npm run lint` | ESLint (Expo config) |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run generate-api` | Run Orval to refresh `lib/gen/**` from `packages/openapi/api.yaml` |

> Expo automatically chooses a free Metro port when starting via `make dev*`. If you run `npm run start` directly you can accept the suggested port or pass `--port`.

---

## Project Structure

- `app/` – Expo Router routes (auth stack, dashboard tab stack, modal)
- `components/` – Shared UI (auth shell, settings, etc.)
- `hooks/` – Supabase session syncing + navigation guards
- `lib/` – Supabase client, Orval fetch wrappers (`lib/gen/**`), and supporting utilities

---

## Notes & Tips

- **Auth flow** – Sign-in + forgot password use Supabase directly; registration posts to the FastAPI `/auth/sign-up` endpoint via the Orval client in `lib/gen/authentication/authentication.ts`.
- **Session guard** – `hooks/useSupabaseAuthSync.ts` keeps Expo Router stacks aligned with Supabase auth state.
- **API client** – Whenever `packages/openapi/api.yaml` changes, run `npm run generate-api` (or `make generate-api`) to rebuild the TypeScript client + models in `lib/gen/**`.
- **Metro vs. native build** – Only run `npx expo run:ios` when you need a fresh native build. Day-to-day edits only require Metro (`npm run start`) and the simulator already open.
- **Troubleshooting ports** – If the Expo CLI reports “port in use”, specify `npm run start -- --port 8083`.

Refer back to the root [`README.md`](../../README.md) for monorepo-wide tooling and workflows.
