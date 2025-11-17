# Project Context

## Purpose
YOURAPP is a workspace operations platform that ships a shared experience across web, mobile, and backend services. The monorepo keeps the Next.js dashboard, Expo mobile client, and FastAPI API aligned around a single OpenAPI contract, shared authentication (Supabase), and consistent onboarding flows (login, registration, forgot password). The goal is to keep all surfaces in sync so that UI experiments, authentication changes, and future workspace features can be prototyped quickly without duplicating contracts or infrastructure code.

## Tech Stack
- **Web:** Next.js 15 (App Router, React 19) with TypeScript, Mantine UI, CSS modules, and Supabase SSR helpers. Runs on Node 20+ and deploys to Vercel.
- **Mobile:** Expo Router + React Native 0.81 with TypeScript, Supabase JS client, and Orval-generated fetch wrappers. Targets iOS (Xcode) and Android (Android Studio) simulators.
- **API:** FastAPI 0.116 on Python 3.13 with Supabase service-role integration, uvicorn, and `uv` for dependency/runtime management.
- **Shared tooling:** `packages/openapi/api.yaml` as the single source of truth, Orval for TypeScript clients, `datamodel-codegen` (Pydantic v2) for backend models, Docker + docker-compose for local containers, and the repo-level Makefile/shell scripts for orchestration.

## Project Conventions

### Code Style
- TypeScript is `strict` across web/mobile with the `@/*` alias; prefer functional React components, Mantine primitives, and CSS modules (`*.module.css`) for styling. Prettier is wired through ESLint (`npm run lint` / `lint:fix`).
- Expo code uses `StyleSheet.create` + theme tokens for consistency with the native platforms. Keep hooks in `hooks/`, shared UI under `components/`, and route files in `app/` per Expo Router conventions.
- Python adheres to Ruff defaults for lint + formatting (`uvx ruff check` / `ruff format`). Service/repository classes live under `src/services` and `src/repositories`, and async Supabase helpers live in `src/core`.
- Generated files (`apps/api/src/models/model.py`, `apps/*/lib/gen/**`) should not be edited manually; regenerate them from the OpenAPI spec.

### Architecture Patterns
- Monorepo layout: `apps/` for deployable surfaces (web, mobile, api), `packages/openapi` for shared contracts, `scripts/` and the Makefile for orchestration, and `openspec/` for change proposals/specs.
- Contract-first development: every surface depends on `packages/openapi/api.yaml`. After modifying the spec, run `make generate-api` to rebuild the FastAPI models and Orval clients to keep the stack type-safe.
- Supabase is the canonical identity provider. Publishable keys live in the clients (`.env.local` files) while service-role keys stay server-side (`apps/api/.env` loaded via python-dotenv). Backend services use Supabase auth for sign-up, then persist user profiles via a repository abstraction.
- The FastAPI app separates routers (`src/routes`), services (`src/services`), and persistence helpers (`src/repositories`). Web + mobile apps focus on UI/auth flows while the API is responsible for privileged actions (e.g., user creation).
- Local dev flows rely on Docker for the API plus `make dev`, `make dev-web`, or `make dev-mobile` to launch the stack. `scripts/dev-run.sh` handles prefixed logs and cleans up processes on exit.

### Testing Strategy
- Static analysis is mandatory before every commit/PR: `make lint` runs Ruff for the API and ESLint for both clients. CI (GitHub Actions) enforces the same lint/build gates.
- Contract compilation doubles as an integration check—regenerating the FastAPI models and Orval clients from `api.yaml` will fail if the schema contains breaking changes.
- Manual QA currently covers end-to-end auth flows (login/register/forgot password) across web/mobile plus exercising the FastAPI endpoints via the generated clients. When adding business logic, include targeted FastAPI tests under `apps/api/tests` and React/React Native component tests as needed.

### Git Workflow
- Work on short-lived feature branches that reference an OpenSpec change when behavior shifts. For net-new capabilities or architectural changes, scaffold `openspec/changes/<change-id>/` (proposal + tasks) before touching implementation.
- Keep branches rebased on `main`, open PRs for review, and land through squash/merge. `main` is the deploy branch—Vercel builds the web app from it and Cloud Build/Run deploy the API container, so it must stay green.
- Always commit regenerated API clients/models whenever the OpenAPI spec changes to avoid dangling contracts.

## Domain Context
- YOURAPP targets workspace leads who need a consolidated view of project health, usage limits, and security queues. UI copy references metrics such as “Active projects,” “Monthly spend,” notifications (usage alerts, invites, invoices), and security tasks (device approvals, rotations).
- Authentication is hybrid: sign-in + forgot-password go directly to Supabase from clients, while registration posts to `POST /auth/sign-up` on the FastAPI backend so we can call Supabase with a service role and persist workspace users.
- Both clients assume the API base URL `http://localhost:8080/api/v1` during development; production deployments route through the same versioned path behind Cloud Run.

## Important Constraints
- Tooling versions: Node.js ≥20, npm 10, Python 3.13, `uv` for Python deps, Docker latest, and current Expo CLI/Xcode/Android Studio.
- Single OpenAPI contract: treat `packages/openapi/api.yaml` as authoritative—never hand-edit generated clients, and rerun `make generate-api` (or the individual commands) after any schema or endpoint change.
- Secrets: Supabase publishable keys (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) belong in client `.env.local` files. The service-role key must only exist in backend environments (`apps/api/.env`, Secret Manager in Cloud Build).
- Ports are fixed unless overridden: API `8080`, web `3000`, Expo Metro auto-selects `19000+`, and Make targets assume these defaults.
- Follow OpenSpec instructions for any change that introduces new behavior, capabilities, or architectural shifts; proposals must validate cleanly before implementation work begins.

## External Dependencies
- **Supabase:** Authentication + user storage for every surface (service-role key for API, publishable keys for clients).
- **GitHub Actions:** CI pipeline that runs lint/build/test stages for each app on PRs and `main`.
- **Google Cloud Build + Cloud Run:** Backend container build/deploy flow defined in `apps/api/cloudbuild.yaml`; secrets are pulled from Secret Manager.
- **Vercel:** Production hosting for the Next.js web app (deploys from `main`).
- **Expo tooling:** Expo CLI/dev services plus Apple/Google simulators for building and validating the mobile client.
