# Standard Feature Workflow

Use this checklist whenever you add or expand a tech feature in this monorepo. The goal is to move from user intent → spec changes → generated code → working API + clients without breaking the shared OpenAPI contract or the OpenSpec process.

## 1. Define the Feature (User Requirements)

1. Capture the request strictly as user-facing requirements using this template:
   - `User must be able to …`
   - `User must not be able to …`
   - Add company-level rules (reporting, admin controls, audit needs) with the same wording when relevant.
2. Keep requirements feature-scoped. Example: “User must be able to resend their workspace invite email”; “User must not be able to delete another workspace’s invites.”
3. If the feature triggers the OpenSpec workflow (new capability, behavior change, architectural shift), create/extend the change proposal under `openspec/changes/<change-id>/` before touching code. Reference `openspec/AGENTS.md` for the approval gates.

## 2. Update the OpenAPI Specification

1. Edit the source-of-truth spec in `packages/openapi/api.yaml`.
2. Reuse existing naming patterns:
   - Paths live under `/api/v1/*`.
   - Tags, `operationId`s, and schema names follow the existing kebab-to-camel conversions (inspect nearby endpoints first).
   - Errors follow the shared problem+detail format already defined in `components`.
3. Define/adjust every contract your feature needs:
   - Paths + HTTP verbs.
   - Query/path params and request bodies.
   - Success + error responses (schemas + status codes).
4. When a requirement maps to multiple endpoints, document all of them so Orval/datamodel-codegen stay consistent.
5. Validate the spec (e.g., `npm run lint` in clients will fail fast if the spec is malformed) before generating code.

## 3. Autogenerate Models and Services

1. Run `make generate-api` from the repo root to refresh:
   - FastAPI Pydantic models at `apps/api/src/models/model.py` via `datamodel-codegen`.
   - Web client fetch helpers + types in `apps/web/lib/gen/**` via Orval.
   - Mobile client helpers + types in `apps/mobile/lib/gen/**` via Orval.
2. If you only need one surface while iterating, use the surface-specific commands from each README (`uv run datamodel-codegen`, `npm run generate-api`, etc.) but finish by running the full `make generate-api` to keep every app in sync.
3. Check generated artifacts into git. Never hand-edit files inside `lib/gen/**` or the auto-built Pydantic module—regenerate instead.

## 4. Implement the API Endpoints (`apps/api`)

1. Follow the existing layering:
   - **Routes** (`src/routes/*`): define FastAPI routers, request/response models, and dependency wiring.
   - **Services** (`src/services/*`): contain business logic, validation, and orchestration.
   - **Repositories** (`src/repositories/*`): interact with Supabase or other data sources.
   - **Core** (`src/core/*`): shared config, auth helpers, and utilities.
2. Mirror the OpenAPI contract exactly—status codes, fields, and error envelopes must stay aligned with `api.yaml` and the generated models.
3. Update or add tests under `apps/api/tests/` (pytest). Run `cd apps/api && uv run pytest` plus `uvx ruff check .` when relevant.
4. Keep logging, auth, and error handling consistent with nearby modules. Prefer existing helpers in `src/core`.

## 5. Implement the Frontend Functionality

### Web (`apps/web`)

1. Consume the Orval-generated clients from `lib/gen/**`. Never call the API with ad-hoc fetch wrappers when a generated helper already exists.
2. Fit features into the existing Next.js structure:
   - Route handlers/components under `app/`.
   - Shared UI in `components/`.
   - State + hooks under `hooks/` or feature folders.
3. Reuse Mantine components and theme tokens defined in `theme.ts`; continue using CSS modules for scoped styles.
4. Handle Supabase auth via the established helpers in `utils/supabase/*`.
5. Validate behavior with `npm run lint` (and `npm run test` if/when tests exist), then run/spot-check via `npm run dev`.

### Mobile (`apps/mobile`)

1. Use the generated Orval clients in `lib/gen/**` together with utilities in `lib/`.
2. Place screens within the Expo Router hierarchy under `app/` (auth stack, tabs, modals). Shared UI lives in `components/`.
3. Keep Supabase session handling inside the existing hooks (`hooks/useSupabaseAuthSync.ts`, etc.) so navigation guards remain consistent.
4. Run `npm run lint` before committing and validate manually via `npm run start` + simulator (`npx expo run:ios`/`android` as needed).

## 6. Final Verification

1. Ensure every requirement from Step 1 is satisfied in the API + both clients (if applicable). If the feature is limited to one surface, explicitly note that the other surfaces remain unchanged.
2. Run the relevant test + lint suites:
   - `make lint` to cover API + web + mobile.
   - `cd apps/api && uv run pytest` (backend tests).
   - Any feature-specific scripts (e.g., `npm run test` if front-end unit tests exist).
3. Re-run `make generate-api` if you made last-minute spec tweaks and confirm no git diffs remain in generated folders.
4. Update the OpenSpec change checklist (`openspec/changes/<change-id>/tasks.md`) before handing the work off for review or deployment.

Following this workflow keeps the OpenAPI contract authoritative, the generated clients accurate, and all three apps aligned on every user-facing capability.
