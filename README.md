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

---

## Local Development

### First-time setup

```bash
make setup   # installs uv deps for API + npm packages for web/mobile
```

### 1. Start backend services

```bash
docker compose up --build        # Start/refresh the FastAPI container
# or stop everything later
docker compose down
```

The API is available at [http://localhost:8080](http://localhost:8080).

### 2. Run apps natively

```bash
# Web
cd apps/web && npm install && npm run dev

# Mobile (iOS example)
cd apps/mobile && npm install && npx expo run:ios
```

### 3. One-command workflow (optional)

The Makefile orchestrates Docker + dev servers and cleans up on Ctrl+C:

```bash
make dev        # API + web + mobile
make dev-web    # API + web only
make dev-mobile # API + mobile only
```

Logs are prefixed (`[API]`, `[WEB]`, `[MOBILE]`, etc.) so you can see which service produced each line.

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

---

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

Orcall individual commands if you need to iterate quickly:

```bash
# API data models
cd apps/api
uv run datamodel-codegen --input ../../packages/openapi/api.yaml --input-file-type openapi --output src/models/model.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.13

# Web client
cd apps/web
npm run generate-api

# Mobile client
cd apps/mobile
npm run generate-api
```

Check regenerated files into git so the rest of the stack stays in sync.

---

## CI/CD Snapshot

- **GitHub Actions** – lint/test/build per app.
- **OpenAPI contract** – generated models referenced by API + clients.
- **Cloud Build / Cloud Run** – backend deployment pipeline.
- **Vercel** – web deployment from `main`.

---

## Handy Commands

| Command | Purpose |
|---------|---------|
| `make setup` | Install/sync dependencies (`uv sync` + `npm install`) |
| `make clean` / `make setup-clean` | Remove cached deps (uv/node_modules) or clean+reinstall |
| `make lint` / `make lint-fix` | Run ESLint/Ruff checks (or auto-fix) across API + web + mobile |
| `make generate-api` | Regenerate backend models + web/mobile Orval clients from OpenAPI |
| `make dev` / `make dev-web` / `make dev-mobile` | Start Docker API + local dev servers (auto cleanup on exit) |
| `docker compose up --build` / `down` | Manage API container manually |
| `cd apps/web && npm run dev` | Web dev server only |
| `cd apps/mobile && npx expo run:ios` | Launch Expo + simulator |
| `cd apps/api && uv run uvicorn src.main:app --reload` | Run FastAPI locally (see API README) |
