# 🧩 Monorepo Starter Template

Unified workspace for the [YOURAPP] stack: a Next.js web app, an Expo mobile client, and a FastAPI backend that share a single OpenAPI contract.

---

## Repository Layout

| Path | Description |
|------|-------------|
| `apps/web` | Next.js + Mantine front-end (see [`apps/web/README.md`](apps/web/README.md)) |
| `apps/mobile` | Expo / React Native client (see [`apps/mobile/README.md`](apps/mobile/README.md)) |
| `apps/api` | FastAPI backend (see [`apps/api/README.md`](apps/api/README.md)) |
| `packages/openapi` | Source-of-truth OpenAPI specification (`api.yaml`) |
| `docker-compose.yml` | Local infrastructure (currently API only) |
| `scripts/` | Utility scripts (e.g., `dev-run.sh`) |

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20.x | Web + mobile apps |
| npm | comes with Node | |
| Python | ≥ 3.13 | Backend + tooling |
| `uv` | latest | Python dependency manager |
| Docker | latest | API + infra services |
| Xcode / Android Studio | latest | Running the mobile client locally |

Each app README details its own environment variables and additional prerequisites.

### Supabase (required for auth + Postgres)

This stack assumes you have a Supabase project providing Auth + Postgres locally or in the cloud. The FastAPI service ships with Alembic migrations, so instead of running SQL by hand just point `DATABASE_URL` at your Supabase instance and apply the initial revision:

```bash
cd apps/api
uv sync --all-extras --dev   # one-time tooling install
uv run --env-file .env.local alembic upgrade head

# When you need a new migration from model changes
uv run --env-file .env.local alembic revision --autogenerate -m "describe change"
```

That migration creates `public.profiles` with an `id` FK to `auth.users(id)` + `ON DELETE CASCADE`, so deleting a Supabase auth user automatically removes the profile row. Emails (and other auth claims) already live in `auth.users`, so the profile table only tracks timestamps until you add custom fields.

---

## Local Development

### First-time setup

```bash
make setup   # installs uv deps for API + npm packages for web/mobile
```

### Core workflows

| Make target | Includes | Manual equivalent |
|-------------|----------|-------------------|
| `make dev` | FastAPI (Docker) + web dev server + Expo Metro + iOS simulator | `docker compose up --build api`<br>`npm run dev --prefix apps/web`<br>`npm run start -- --port <metro> --prefix apps/mobile`<br>`npm run ios --prefix apps/mobile` |
| `make dev-web` | FastAPI (Docker) + web | `docker compose up --build api`<br>`npm run dev --prefix apps/web` |
| `make dev-mobile` | FastAPI (Docker) + mobile | `docker compose up --build api`<br>`npm run start -- --port <metro> --prefix apps/mobile`<br>`npm run ios --prefix apps/mobile` |
| `make stop` | Stops docker compose + running dev servers | `pkill -f "next dev"`<br>`pkill -f "expo start"`<br>`docker compose down` |

Each target streams prefixed logs (`[API]`, `[WEB]`, `[MOBILE]`, etc.) so you always know which service produced a line. Drop down to the per-app READMEs when you need to run a custom script (e.g., Expo builds or Next.js lint commands).

> **Ports:** API `8080`, Web `3000`, Expo Metro `19000/19001/19002` (auto-selected), Metro bundle `8081+`.

### Expo iOS simulator setup

To run the Expo mobile app inside the iOS Simulator, follow the official Expo environment guide for a local development build: https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated&mode=development-build&buildEnv=local. It walks through installing Xcode (+ command-line tools), configuring the simulator, and preparing your first `expo run:ios` so the `make dev`/`make dev-mobile` targets can boot the client automatically.

---

## Project Documents

| Area | Documentation |
|------|---------------|
| Web app | [`apps/web/README.md`](apps/web/README.md) |
| Mobile app | [`apps/mobile/README.md`](apps/mobile/README.md) |
| API | [`apps/api/README.md`](apps/api/README.md) |
| OpenAPI contract | [`packages/openapi/api.yaml`](packages/openapi/api.yaml) |

Each document covers environment variables, scripts, and workflow tips specific to that surface.

## OpenAPI & Code Generation

`packages/openapi/api.yaml` is the single source of truth for request/response contracts. Each surface consumes that spec through its own generator:

| Surface | Tool | Output |
|---------|------|--------|
| API | `datamodel-codegen` (Pydantic v2) | `apps/api/src/models/model.py` |
| Web | `orval` (fetch client + models) | `apps/web/lib/gen/**` |
| Mobile | `orval` (fetch client + models) | `apps/mobile/lib/gen/**` |

Run everything at once with:

```bash
make generate-api
```

Each surface README covers its per-app generator if you need to wire it into a tighter inner loop (for example, running Orval directly while iterating on the web client). Check regenerated files into git so the rest of the stack stays in sync.

---

## Handy Commands

| Command | Purpose |
|---------|---------|
| `make setup` | Install/sync dependencies (`uv sync` + `npm install`) |
| `make clean` / `make setup-clean` | Remove cached deps (uv/node_modules) or clean+reinstall |
| `make lint` / `make lint-fix` | Run ESLint/Ruff checks (or auto-fix) across API + web + mobile |
| `make generate-api` | Regenerate backend models + web/mobile Orval clients from OpenAPI |
| `make dev` / `make dev-web` / `make dev-mobile` | Start Docker API + local dev servers (auto cleanup on exit) |
| `make release` / `make release-mobile` | Cut repo-wide releases + Expo/mobile releases |

While a `make dev*` target is running you can hit `Ctrl+C` to gracefully shut down the API container, Expo Metro, and any Next.js processes—the helper script traps the signal and cleans everything up for you.

## Release Workflow

See `docs/release.md` for the end-to-end strategy (branching, CI/CD, and environment promotion). Both commands below cut production (`prd`) releases—run them only when the tagged commit is ready for prod. At a high level the repo uses two separate flows:

### `make release` (API + web)

1. Ensure your working tree is clean (all work merged into `main`).
2. Run `make release` and choose the SemVer bump (patch/minor/major) when prompted.
3. The script analyzes commits since the previous tag, groups them by surface (`apps/api`, `apps/web`, `apps/mobile`, “Other”), and populates `CHANGELOG.md`.
4. It syncs `VERSION`, `apps/api/pyproject.toml`, `apps/api/uv.lock`, and every app’s `package.json`/`package-lock.json` so the stack shares one SemVer.
5. It commits `Release vX.Y.Z`, tags `vX.Y.Z`, and pushes both upstream so CI can promote that tag.
6. The `vX.Y.Z` tag triggers GitHub Actions to run the full production deployment: FastAPI → Cloud Run and Next.js → Vercel (see `docs/release.md` for environment specifics).

### `make release-mobile` (Expo client)

1. Run after cutting the repo-wide release whenever you have mobile changes to ship.
2. The script bumps `apps/mobile/package.json` + `app.json`, refreshes `apps/mobile/CHANGELOG.md`, and commits `mobile-release vX.Y.Z`.
3. It tags `mobile-vX.Y.Z` so Expo EAS can build/test/publish from the same version history without touching the API/web surfaces.
4. That mobile tag kicks off the Expo workflow to build and distribute the production binary with the `prd` profile.

Use descriptive commit messages so the generated changelog stays useful.

## Suggested Feature Workflow

Use this checklist whenever you add or expand a capability so the API contract, generated clients, and three apps stay in sync:

1. **Capture requirements + spec intent**
   - Write user-facing requirements (“User must be able to…”) and note constraints.
   - If the change is significant (new endpoint, breaking behavior, infra shift), follow the OpenSpec process in `openspec/AGENTS.md` before touching code.
2. **Update the OpenAPI contract**
   - Edit `packages/openapi/api.yaml` first; add/modify schemas, params, and responses that reflect the requirements.
   - Keep naming + status codes consistent with existing endpoints under `/api/v1/*`.
3. **Regenerate shared artifacts**
   - Run `make generate-api` to refresh FastAPI models plus the Orval clients for web/mobile.
   - Commit regenerated files; never hand-edit anything inside `apps/*/lib/gen/**` or `apps/api/src/models/model.py`.
4. **Implement backend behavior**
   - Add routes under `apps/api/src/routes/**`, business logic in `src/services/**`, and data access in `src/repositories/**`.
   - Reuse helpers in `src/core/**`, wire Supabase access via the existing patterns, and add/adjust pytest coverage.
5. **Implement web + mobile surfaces**
   - Consume the generated clients from `apps/web/lib/gen/**` and `apps/mobile/lib/gen/**`.
   - Keep UI code in the established folders (Next.js `app/**`, Expo Router `app/**`), reuse shared components/hooks, and run `npm run lint` (plus tests when applicable).
6. **Verify + release**
   - Smoke-test via `make dev`, run `make lint`, and execute targeted suites (`uv run pytest`, `npm run test`, etc.).
   - Once the feature is production-ready, cut releases with `make release` (and `make release-mobile` for Expo changes); deployment details live in `docs/release.md`.

## Create a New App from This Template

Spin up a standalone repo based on one of the app branches while keeping a clean path to pull future template updates:

1. **Clone the template**  
   ```bash
   git clone git@github.com:you/starter-mono.git my-new-app
   cd my-new-app
   ```
2. **Check out the app branch** (e.g., `git checkout app/reservations`) so the working tree matches that app.
3. **Rename the remote** – keep the template as `upstream`: `git remote rename origin upstream`.
4. **Create the new empty repo** – provision it in GitHub (no files) and copy its SSH URL.
5. **Add it as `origin`** – `git remote add origin git@github.com:you/new-app.git`.
6. **Push the branch**  
   - Recommended: `git push -u origin app/<app-name>:main` (renames on push).  
   - Alternative: `git push -u origin app/<app-name>` (keeps the same branch name).
7. **Stay in sync** – when you want template fixes/tooling, fetch from `upstream` and merge/rebase on top of your app:
   ```bash
   git fetch upstream
   git merge upstream/main   # or git rebase upstream/main
   ```

This keeps your app repo independent while still letting you pull updates from the template over time.
