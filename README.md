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

### Supabase bootstrap

The FastAPI service expects a `profiles` table linked to Supabase Auth. Create it once in the SQL editor before running the stack:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Emails (and other auth claims) already live in `auth.users`, so this table only tracks profile lifecycle timestamps for now—you can add more columns later.

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

Use `make release` to automate version bumps, changelog entries, and git tagging:

1. Ensure your working tree is clean (all work merged into `main`).
2. Run `make release` and choose the SemVer bump (patch/minor/major) when prompted.
3. The script looks at commits since the previous tag, groups them by surface based on touched paths (`apps/api`, `apps/web`, `apps/mobile`), adds an “Other” bucket for everything else (docs, CI, infra), and auto-populates the changelog sections (the first release defaults to “Kickoff project” for each surface).
4. It synchronizes `VERSION`, `apps/api/pyproject.toml` + `apps/api/uv.lock`, and each app’s `package.json`/`package-lock.json` so every surface (and its lockfiles) share the same SemVer.
5. It then updates `CHANGELOG.md`, creates a `Release vX.Y.Z` commit, tags it, and pushes both the commit and tag upstream.
6. Follow up with `make release-mobile` whenever you ship the Expo client; it bumps `apps/mobile/package.json` + `app.json`, refreshes `apps/mobile/CHANGELOG.md`, and pushes a `mobile-vX.Y.Z` tag so the standalone mobile release history stays in sync.

Use descriptive commit messages so the generated changelog remains readable.
