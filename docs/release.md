# Release Process

This repo uses trunk-based development. Every change merges into `main`, dev deploys immediately, and production advances only when you promote a tagged commit. See `docs/branching.md` for the branch philosophy; this page focuses on the release mechanics.

## Environments Recap
- **Dev** – Always runs the latest `main` commit. CI deploys automatically on each push.
- **Prod** – Runs a tagged commit from `main` (`v*`). Tagging is the “promote” switch.

## CI/CD Pipelines
The primary workflow is `monorepo-ci-cd.yml`, which keeps CI + CD inside a single file:

| Stage | Trigger | What runs |
|-------|---------|-----------|
| `paths-filter` | every run | Determines whether API/web/mobile changed. |
| `ci-api` / `ci-web` / `ci-mobile` | PRs + pushes (only when their paths changed, or for `v*` tags) | Lint/build/test for that surface, in parallel. |
| `deploy-dev` | Push to `main` with relevant changes | Reuses the same booleans to deploy only the surfaces that changed (API → Cloud Run, mobile → Expo dev channel, web → Vercel preview). |
| `deploy-prod` | Tags `v*` | Requires all CI jobs to be green, verifies the tag lives on `main`, then deploys all surfaces to prod targets. |

Legacy workflows (`api-ci.yml`, `mobile-ci.yml`, `web-ci.yml`, and `release.yml`) still live alongside the new pipeline if you ever need a lighter-weight or more targeted run, but `monorepo-ci-cd.yml` is the canonical trunk-based flow.

Within the combined workflow, dev jobs install dependencies, execute lint/tests, and push artifacts to the dev environment automatically. Prod jobs enforce that the tagged commit exists on `main`, rerun the same checks, apply any migrations (API), then deploy the exact tag. `CHANGELOG.md` tracks API + web releases, while `apps/mobile/CHANGELOG.md` tracks iOS/Android builds.

### Secrets required by CI
Configure these GitHub Action secrets so the workflows can authenticate with third parties:

| Name | Type (GitHub) | Used by | Purpose |
|------|---------------|---------|---------|
| `SUPABASE_DB_URL_DEV` / `SUPABASE_DB_URL_PROD` | Secret | API workflow | Connection string for `supabase db push` in dev/prod. |
| `GCP_SA_KEY_DEV` / `GCP_SA_KEY_PROD` | Secret | API workflow | JSON service account key for Cloud Build/Run auth. |
| `GCP_PROJECT_ID_DEV` / `GCP_PROJECT_ID_PROD` | Variable | API workflow | Cloud project IDs used to build images and deploy services. |
| `GCP_REGION_DEV` / `GCP_REGION_PROD` | Variable | API workflow | Cloud Run region for each environment. |
| `CLOUD_RUN_SERVICE_API_DEV` / `CLOUD_RUN_SERVICE_API_PROD` | Variable | API workflow | Cloud Run service names that receive the deployments. |
| `EXPO_TOKEN` | Secret | Mobile workflow | Expo token used for both dev/beta builds and production App/Play store builds. (All runtime env lives in EAS secrets per profile.) |
| `VERCEL_TOKEN` | Secret | Web workflow | Non-interactive token for `vercel pull/build/deploy`. |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Variable | Web workflow | Identifiers required for the Vercel CLI to target the correct project. |

### First-time web deployment prerequisites
Vercel must already know about the `apps/web` project before CI can deploy it. Run the following once (locally) to bootstrap the project and obtain the IDs referenced above:

1. `npm i -g vercel` – installs the CLI.
2. `vercel login` – follow the emailed link to authenticate.
3. `cd apps/web` – move into the Next.js app.
4. `vercel` – when prompted, select **No** for linking, provide the project name, choose the correct scope/team, and confirm the initial deploy.

This creates the project under your team without wiring up Git. Afterwards, copy the **Project ID** and **Team ID** (org) from Vercel → **Settings → General** into GitHub (either as repo variables or secrets) and create a `VERCEL_TOKEN` for CI. The first CI build may still fail until you add the Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) inside Vercel → Project → Settings → Environment Variables; expect the export error shown in the logs until those keys exist.

## Cutting a Release
1. **Verify `main` is releasable**  
   - CI is green, migrations are additive/backwards compatible, and any unfinished work is behind feature flags.
2. **Select the commit**  
   - Usually `main` HEAD. If you need an older commit, ensure it already lives on `main`.
3. **Tag it**  
   ```bash
   git tag -a v1.3.0 -m "Describe the release"
   git push origin v1.3.0
   ```
4. **Prod pipeline runs**  
   - GitHub Actions (triggered via `push` to tags `v*`) reruns lint/tests, applies migrations to the prod DB, builds the Docker image, and deploys to Cloud Run. The mobile and web pipelines simultaneously publish the tagged build to their production targets.
5. **Verify**  
   - Smoke test the prod endpoint(s), confirm migrations succeeded, and update release notes if needed.

`make release` automates these steps and commits `chore(release): vX.Y.Z`. The CI workflow skips dev deploys for branch pushes with that message, but tag-triggered prod runs still execute. This command only updates the API/web changelog (`CHANGELOG.md`).

### Mobile release flow
1. **Local development** – run the Expo app against Supabase dev using `.env` or Metro’s development profile. No CI needed.
2. **Manual beta/TestFlight builds** – open the `Monorepo CI-CD` workflow, click **Run workflow**, and choose `mobile_deploy_env=dev`. CI reruns lint/tests and triggers the EAS development profile; Supabase/API env vars are sourced from the profile’s EAS secrets, so GitHub only supplies the Expo token.
3. **Production stores** – run `make release-mobile`, choose the bump, and let the script push `chore(mobile-release): vX.Y.Z` plus the `mobile-vX.Y.Z` tag. The script also prepends an entry to `apps/mobile/CHANGELOG.md`. That tag triggers Expo EAS production builds with Supabase prod variables and App/Play store distribution.

`make release-mobile` only touches `apps/mobile/**` (package/app versions) and pushes the `mobile-v*` tag so web/API deployments remain untouched.

Hotfix flow matches the above: land the fix on `main`, tag a patch release (e.g., `v1.2.1`), and let the tag deploy to prod. If `main` is temporarily unsafe, branch off the prod tag, patch, tag, and then merge or cherry-pick the fix back into `main`.

## Secret Management During Releases
- **Docker images contain zero secrets.** Build normally; Cloud Run injects secrets at deploy time.
- **Preferred delivery**: use `gcloud run deploy ... --set-secrets ENV_NAME=projects/.../secrets/...:latest` to mount secrets as env vars, or mount them as files if you prefer.
- **Runtime resolution**: the FastAPI app calls `resolve_secret(...)`, which:
  1. Uses the env var if it’s already set (e.g., `.env` in dev or `--set-secrets` in prod).
  2. Otherwise reads `ENV_NAME_SECRET` and fetches the value via `SecretManagerServiceClient`.
  3. Caches the decoded value in-process for subsequent requests.

Caching matters because Cloud Run keeps instances warm for multiple requests. Even though services can scale to zero, each new instance only pays the secret-fetch penalty once at startup; all later requests reuse the cached value. When the instance terminates, the cache vanishes naturally.

## Checklist Before Tagging
- ✅ CI green (lint/tests/build)
- ✅ Supabase migrations merged and backwards compatible
- ✅ Secrets configured in Cloud Run (service account has `secretAccessor`, `ENV_SECRET` values set)
- ✅ Smoke-tested on dev after merge
- ✅ Release notes / version bump (if applicable)

Following this process keeps releases boring: merge to `main`, let dev verify, and tag when ready to promote that exact build to production.
