# Release Process

This repo uses trunk-based development. Every change merges into `main`, dev deploys immediately, and production advances only when you promote a tagged commit. See `docs/branching.md` for the branch philosophy; this page focuses on the release mechanics.

## Environments Recap
- **Dev** – Always runs the latest `main` commit. CI deploys automatically on each push.
- **Prod** – Runs a tagged commit from `main` (`v*`). Tagging is the “promote” switch.

## API/Web Release Strategy
API + web share the same pipeline (`.github/workflows/monorepo-ci-cd.yml`) and version tag (`v*`). Key stages:

| Stage | Trigger | What runs |
|-------|---------|-----------|
| `paths-filter` | every run | Determines whether API/web changed (mobile ignored here). |
| `ci-api` / `ci-web` | PRs + pushes (or any `v*` tag) | Each surface runs lint + typecheck + tests (API adds integration) in parallel, and every check must pass before any build/deploy jobs. |
| `deploy-dev` | Push to `main` with relevant changes | API Docker image → Cloud Run, web → Vercel preview. |
| `deploy-prod` | Tags `v*` | Requires CI to be green, confirms tag lives on `main`, then deploys API → Cloud Run prod and web → Vercel prod. |

Dev jobs install deps, run each surface’s lint/typecheck/tests (API adds integration) concurrently, and push artifacts automatically. Production jobs ensure the tag is on `main`, re-run the checks, apply migrations (API), and deploy that exact artifact. Feature branches stop right after integration tests, `main` continues through build → migrate → deploy (dev), and tags rerun the whole flow with production targets. `CHANGELOG.md` documents these releases.

## Mobile Release Strategy
Mobile follows the same workflow file but uses separate triggers because Expo binaries are heavier to build:

| Stage | Trigger | What runs |
|-------|---------|-----------|
| `paths-filter` | every run | Determines whether `apps/mobile/**` changed. |
| `ci-mobile` | PRs + pushes (or any `v*` tag) | Lint and Jest tests for the Expo app. |
| `deploy-mobile-dev` | Manual `workflow_dispatch` (`mobile_deploy_env=dev`) | Builds dev clients (`eas build --profile dev`) for TestFlight/internal testing. |
| `deploy-mobile-prod` | Tags `mobile-v*` (cut via `make release-mobile`) | Builds store binaries (`eas build --profile prd`) for iOS/Android and waits for completion. |

`apps/mobile/CHANGELOG.md` tracks Expo releases independently. The manual dev trigger lets you opt in to TestFlight/EAS dev builds only when you need them, while production binaries are tied to `mobile-v*` tags so App/Play submissions happen deliberately.

### Manual workflow controls
Use **Run workflow** sparingly (CI spot checks or mobile deploys):
- `mobile_deploy_env=none` reruns lint/test for every surface without deploying.
- `mobile_deploy_env=dev` runs only the mobile CI + Expo dev-profile build (`eas build --profile dev --platform all`), leaving API/web jobs untouched.

### Secrets & variables required by CI
Populate these GitHub Action secrets/variables so `monorepo-ci-cd.yml` can authenticate with external services (keep API tokens under **Secrets** and infra coordinates under **Variables**):

| Name | Type | Used by | Purpose |
|------|------|--------|---------|
| `VERCEL_TOKEN` | Secret | Web jobs | Authenticates `vercel pull/build/deploy`. |
| `EXPO_TOKEN` | Secret | Mobile jobs | Authenticates Expo/EAS for dev + prod builds. |
| `SUPABASE_SECRET_API_KEY_DEV` | Secret | API integration tests | Service role key so tests can hit Supabase directly. |
| `DB_URL_DEV` | Secret | API jobs | Postgres DSN for dev (migrations + integration tests). |
| `DB_URL_PRD` | Secret | API jobs | Postgres DSN for prod migrations. |

| Name | Type | Used by | Purpose |
|------|------|--------|---------|
| `SUPABASE_URL_DEV` | Variable | API integration tests | Supabase dev project URL used during integration tests. |
| `GCP_PROJECT_ID` | Variable | API jobs | Google Cloud project hosting Artifact Registry + Cloud Run. |
| `GAR_LOCATION` | Variable | API jobs | Artifact Registry region, e.g., `us-central1`. |
| `GAR_REPOSITORY` | Variable | API jobs | Artifact Registry repo that stores the API image. |
| `CLOUD_RUN_REGION` | Variable | API jobs | Region for both dev/prod Cloud Run services. |
| `CLOUD_RUN_SERVICE_DEV` | Variable | API jobs | Dev Cloud Run service name. |
| `CLOUD_RUN_SERVICE_PRD` | Variable | API jobs | Prod Cloud Run service name. |
| `WIF_PROVIDER` | Variable | API jobs | Workload Identity Federation provider path (`projects/.../providers/...`). |
| `WIF_SERVICE_ACCOUNT` | Variable | API jobs | Service account email with deploy permissions. |
| `VERCEL_ORG_ID` | Variable | Web jobs | Vercel team/org ID used by the CLI. |
| `VERCEL_PROJECT_ID` | Variable | Web jobs | Vercel project ID for `apps/web`. |

## GCP + GitHub setup guide (UI)
Use the GCP Console + GitHub UI to configure CI/CD without JSON key files.

### 1. Create the CI service account
1. GCP Console → **IAM & Admin → Service Accounts → Create**.
2. Name it `github-actions` (ID `github-actions`).
3. Grant project-level roles:

| Role | Reason |
|------|--------|
| `Artifact Registry Writer` | Push Docker images. |
| `Cloud Run Developer` | Deploy new revisions. |
| `Service Account User` | Let Cloud Run set the runtime service account. |
| `Secret Manager Secret Accessor` | Allow CI to pull runtime secrets at deploy time. |

Copy the generated email (`github-actions@<PROJECT_ID>.iam.gserviceaccount.com`) for `WIF_SERVICE_ACCOUNT`.

### 2. Enable Workload Identity Federation (WIF)
1. **IAM & Admin → Workload Identity Federation → Create pool**.
   - Name: `github-actions`
   - Provider type: OIDC
2. Inside the pool, **Add provider**:
   - Name: `<REPO_NAME>` (e.g., `starter-mono`)
   - Issuer: `https://token.actions.githubusercontent.com`
   - Attribute mapping:

| Google attribute | Value |
|------------------|-------|
| `google.subject` | `assertion.sub` |
| `attribute.actor` | `assertion.actor` |
| `attribute.repository` | `assertion.repository` |
| `attribute.repository_owner` | `assertion.repository_owner` |

   - Condition: `assertion.repository == "<GH_OWNER>/<REPO_NAME>"`

3. Copy the provider resource (`projects/.../providers/...`) as `WIF_PROVIDER`.

### 3. Grant WIF access to the service account
1. **IAM & Admin → Service Accounts → github-actions → Permissions → Grant access** (under **Principals with access**).
2. Principal: `principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions/attribute.repository/<GH_OWNER>/<GH_REPO>`
3. Role: `Workload Identity User`.

This lets GitHub Actions impersonate the service account without JSON keys.

### 4. Create the Artifact Registry repository
1. [Artifact Registry](https://console.cloud.google.com/artifacts) → **Repositories → Create**.
2. Name: `starter-mono` (or your `GAR_REPOSITORY`), Format: Docker, Location: Region (e.g., `asia-southeast1`), Mode: Standard.
3. Note the push URL: `<GAR_LOCATION>-docker.pkg.dev/<GCP_PROJECT_ID>/<GAR_REPOSITORY>/api:<SHA>`.

### 5. Create Cloud Run services
1. [Cloud Run](https://console.cloud.google.com/run) → **Create Service** for dev:
   - Name: `api-dev` (`CLOUD_RUN_SERVICE_DEV`)
   - Region: `CLOUD_RUN_REGION`
   - Image: placeholder (`gcr.io/cloudrun/hello`) just to finish creation
2. Repeat for prod (`api-prd` / `CLOUD_RUN_SERVICE_PRD`).
3. Configure env vars/DB URLs per environment (Cloud Run handles secrets as env vars).

### 6. Configure GitHub repository variables
1. GitHub → **Settings → Secrets and variables → Actions → Variables**.
2. Add every entry from the “Secrets & variables” tables (project ID, GAR, services, region, WIF values, Vercel IDs).
3. Exact casing matters because the workflow maps them into `env.PROJECT_ID`, etc.

### 7. Validate the workflow configuration
Ensure the top of `.github/workflows/monorepo-ci-cd.yml` mirrors your values:

```yaml
env:
  PROJECT_ID: ${{ vars.GCP_PROJECT_ID }}
  GAR_LOCATION: ${{ vars.GAR_LOCATION }}
  GAR_REPOSITORY: ${{ vars.GAR_REPOSITORY }}
  CLOUD_RUN_REGION: ${{ vars.CLOUD_RUN_REGION }}
  CLOUD_RUN_SERVICE_DEV: ${{ vars.CLOUD_RUN_SERVICE_DEV }}
  CLOUD_RUN_SERVICE_PRD: ${{ vars.CLOUD_RUN_SERVICE_PRD }}
  WIF_PROVIDER: ${{ vars.WIF_PROVIDER }}
  WIF_SERVICE_ACCOUNT: ${{ vars.WIF_SERVICE_ACCOUNT }}
```

Pushes to `main` deploy to `${{ env.CLOUD_RUN_SERVICE_DEV }}`; `v*` tags deploy to `${{ env.CLOUD_RUN_SERVICE_PRD }}`. Monitor Cloud Run + Artifact Registry to confirm the shared image is reused across environments.

### First-time web deployment prerequisites
Vercel must already know about the `apps/web` project before CI can deploy it. Run the following once (locally) to bootstrap the project and obtain the IDs referenced above:

1. `npm i -g vercel` – installs the CLI.
2. `vercel login` – follow the emailed link to authenticate.
3. `cd apps/web` – move into the Next.js app.
4. `vercel` – when prompted, select **No** for linking, provide the project name, choose the correct scope/team, and confirm the initial deploy.

This creates the project under your team without wiring up Git. Afterwards, copy the **Project ID** and **Team ID** (org) from Vercel → **Settings → General** into GitHub (either as repo variables or secrets) and create a `VERCEL_TOKEN` for CI. The first CI build may still fail until you add the Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) inside Vercel → Project → Settings → Environment Variables; expect the export error shown in the logs until those keys exist. Add `NEXT_PUBLIC_API_URL=<API URL LOCATION>` alongside those env vars so Vercel web builds know where to reach the deployed API.

## Cutting a Prd Release
1. **Verify `main` is releasable**  
   - CI is green, migrations are additive/backwards compatible, and any unfinished work is behind feature flags.
2. **Select the commit**  
   - Usually `main` HEAD. If you need an older commit, ensure it already lives on `main`.
3. **Tag it**  
   - Run `make release` and follow the prompts. The script bumps versions, updates `CHANGELOG.md`, commits `chore(release): vX.Y.Z`, tags `vX.Y.Z`, and pushes both the commit and tag upstream.
4. **Prod pipeline runs**  
   - GitHub Actions (triggered via `push` to tags `v*`) reruns lint/tests, applies migrations to the prod DB, builds the Docker image, and deploys to Cloud Run. Web deploys to Vercel from the same tag. Mobile binaries ship separately: `make release-mobile` creates a `mobile-v*` tag that triggers the Expo production build.
5. **Verify**  
   - Smoke test the prod endpoint(s), confirm migrations succeeded, and update release notes if needed.

`make release` bundles the tagging/commit/push steps described above; the CI workflow skips dev deploys for branch pushes with that message, but tag-triggered prod runs still execute. This command only updates the API/web changelog (`CHANGELOG.md`).

### Mobile release flow
1. **Local development** – run the Expo app against Supabase dev using `.env` or Metro’s development profile. No CI needed.
2. **Manual beta/TestFlight builds** – open the `Monorepo CI-CD` workflow, click **Run workflow**, and choose `mobile_deploy_env=dev`. CI reruns lint/tests and triggers the EAS development profile; Supabase/API env vars are sourced from the profile’s EAS secrets, so GitHub only supplies the Expo token.
3. **Production stores** – run `make release-mobile`, choose the bump, and let the script push `chore(mobile-release): vX.Y.Z` plus the `mobile-vX.Y.Z` tag (keeping mobile version history in sync). The `mobile-v*` tag automatically triggers the `deploy-mobile-prod` job, which runs `eas build --profile prd` for both platforms and waits for the binaries.
> **Expo env vars:** Configure your Supabase + API URLs in EAS (Project Settings → Environment variables or via `eas secret:create`) for both the `dev` and `prd` profiles. The GitHub workflow does not inject runtime env—EAS must provide them at build time.

`make release-mobile` only touches `apps/mobile/**` (package/app versions) and pushes the `mobile-v*` tag so web/API deployments remain untouched. Those tags double as the trigger for Expo’s production builds, so no extra workflow dispatch is required for App/Play submissions.

> **Expo certificate prep:** Run the following once per platform to let Expo collect signing credentials. Repeat whenever you rotate certificates or onboard a new environment:
> ```
> npx eas build --profile dev --platform android
> npx eas build --profile dev --platform ios
> npx eas build --profile prd --platform android
> npx eas build --profile prd --platform ios
> ```

Hotfix flow matches the above: land the fix on `main`, tag a patch release (e.g., `v1.2.1`), and let the tag deploy to prod. If `main` is temporarily unsafe, branch off the prod tag, patch, tag, and then merge or cherry-pick the fix back into `main`.

## Secret Management During Releases
- **Docker images contain zero secrets.** Build normally; Cloud Run injects secrets at deploy time.
- **Preferred delivery**: use `--set-secrets` (env vars) or `--set-env-vars` pointing to Secret Manager versions when calling `gcloud run deploy`. Cloud Run exposes the decoded value as an environment variable at runtime, so the FastAPI app can read `os.environ["SUPABASE_URL"]`, etc., directly in `lifespan`.
- **Local dev**: `.env` / `.env.local` supply the same keys so you can run `uvicorn` without hitting Secret Manager.

## Checklist Before Tagging
- ✅ CI green (lint/tests/build)
- ✅ Supabase migrations merged and backwards compatible
- ✅ Secrets configured in Cloud Run (service account has `secretAccessor`, `ENV_SECRET` values set)
- ✅ Smoke-tested on dev after merge
- ✅ Release notes / version bump (if applicable)

Following this process keeps releases boring: merge to `main`, let dev verify, and tag when ready to promote that exact build to production.
