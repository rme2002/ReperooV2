# Monorepo CI/CD Pipeline

The workflow at `.github/workflows/monorepo-ci-cd.yml` runs lint, test, build, and deploy stages for every app in the monorepo. It builds a single Docker image for the API, pushes it to Artifact Registry, then deploys that image to Cloud Run: every push to `main` updates the dev service, and every tag matching `v*` updates prod.

## Workflow Overview

1. **Change detection** – `dorny/paths-filter` determines which apps changed (or if non-app files require full coverage). Jobs exit early when nothing relevant changed.
2. **Linting & Testing** – Each app has dedicated lint/test jobs (Python via `uv`, web/mobile via `npm`) that run only when their app changed.
3. **API build** – When `main` or a tag runs, the API job builds `apps/api`, authenticates to Google Cloud with Workload Identity Federation (WIF), and pushes `asia-southeast1-docker.pkg.dev/<PROJECT>/<REPOSITORY>/api:<SHA>`.
4. **Deployments** – Two Cloud Run jobs share the pushed image: `deploy-api-dev` triggers on `main` and targets the dev service, while `deploy-api-prd` triggers on tags and targets prod. Web uses the Vercel CLI (preview on `main`, prod on `v*` tags), and mobile uses Expo EAS with manual dispatch for the dev/beta channel plus `mobile-v*` tags for production stores.

## Required GitHub Variables

Create repository-level **Variables** (GitHub → Settings → Secrets and variables → Actions → Variables):

| Variable | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | Google Cloud project hosting Artifact Registry + Cloud Run |
| `GAR_LOCATION` | Artifact Registry region, e.g. `asia-southeast1` |
| `GAR_REPOSITORY` | Artifact Registry repository name (e.g., `starter-mono`) |
| `CLOUD_RUN_SERVICE_DEV` | Dev Cloud Run service name (e.g., `api-dev`) |
| `CLOUD_RUN_SERVICE_PRD` | Prod Cloud Run service name (e.g., `api-prd`) |
| `CLOUD_RUN_REGION` | Cloud Run region |
| `WIF_SERVICE_ACCOUNT` | Service account email the workflow impersonates |
| `WIF_PROVIDER` | Workload Identity Federation provider resource name |

Secrets such as API tokens still belong under **Secrets**; the workflow only needs these variables to resolve infrastructure targets.

## GCP + GitHub Setup Guide (UI)

The steps below use the Google Cloud Console and GitHub’s web UI so you can configure CI/CD without any CLI tooling.

### 1. Create the CI service account

1. GCP Console → **IAM & Admin** → **Service Accounts** → **Create**.
2. Name it `github-actions` (ID `github-actions`).
3. Grant project-level roles:

| Role | Why |
| --- | --- |
| `Artifact Registry Writer` | Push Docker images |
| `Cloud Run Developer` | Deploy new revisions |
| `Service Account User` | Allow CI to set the runtime service account |

Copy the generated email (`github-actions@<PROJECT_ID>.iam.gserviceaccount.com`) for later; it becomes `WIF_SERVICE_ACCOUNT`.

### 2. Enable Workload Identity Federation

1. **IAM & Admin** → **Workload Identity Federation** → **Create Pool**.
   - Name: `github-actions`
   - Provider type: OIDC
2. Inside the pool, click **Add Provider** and configure:
   - Name: `<REPO_NAME>` (exact GitHub repo slug, e.g., `starter-mono`)
   - Issuer: `https://token.actions.githubusercontent.com`
   - Attribute mapping:

| Google Attribute | OIDC Expression |
| --- | --- |
| `google.subject` | `assertion.sub` |
| `attribute.actor` | `assertion.actor` |
| `attribute.repository` | `assertion.repository` |
| `attribute.repository_owner` | `assertion.repository_owner` |

   - Condition: `assertion.repository == "<GITHUB_USERNAME>/<REPO_NAME>"`

3. After creation, open the provider details and copy the resource name (`projects/.../providers/...`) to use as `WIF_PROVIDER`.

### 3. Allow GitHub Actions to impersonate the service account

1. **IAM & Admin** → **Service Accounts** → select `github-actions`.
2. **Permissions** → **Grant Access**.
3. Principal: `principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/<GH_OWNER>/<GH_REPO>`
4. Role: `Workload Identity User`.

Replace `<PROJECT_NUMBER>`, `<GH_OWNER>`, and `<GH_REPO>` with your project number and GitHub repo values. This ties the WIF pool directly to the CI service account so the workflow can request temporary tokens without JSON keys.

### 4. Create the Artifact Registry repository

1. Go to [Artifact Registry](https://console.cloud.google.com/artifacts).
2. **Repositories** → **Create Repository**.
3. Settings:
   - Name: `<REPO_NAME>` (e.g., `starter-mono`)
   - Format: Docker
   - Location type: Region
   - Region: match `GAR_LOCATION` (example: `asia-southeast1`)
   - Mode: Standard
4. Click **Create**.

Record the push URL format: `asia-southeast1-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY>/api:<SHA>`. The workflow tags the API image with the commit SHA so both environments share the same artifact.

### 5. Create Cloud Run services for dev and prod

1. Visit [Cloud Run](https://console.cloud.google.com/run) → **Create Service**.
2. Configure the dev service:
   - Name: `api-dev` (or your `CLOUD_RUN_SERVICE_DEV`)
   - Region: match `CLOUD_RUN_REGION`
   - Container image: placeholder such as `gcr.io/cloudrun/hello`
   - Adjust CPU/autoscaling as needed (defaults are fine)
3. Repeat the same process for `api-prd` (your `CLOUD_RUN_SERVICE_PRD`).
4. For each service, add environment variables/DB URLs/keys specific to that environment.

### 6. Configure GitHub repository variables

1. GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables**.
2. Add every entry from the “Required GitHub Variables” table (project ID, locations, service names, region, WIF details).
3. Use the exact spellings because the workflow maps them to `env.PROJECT_ID`, `env.SERVICE_DEV`, etc.

### 7. Validate the workflow configuration

- Inspect the top of `.github/workflows/monorepo-ci-cd.yml` to confirm the environment block mirrors your values:

  ```yaml
  env:
    PROJECT_ID: ${{ vars.GCP_PROJECT_ID }}
    GAR_LOCATION: ${{ vars.GAR_LOCATION }}
    REPOSITORY: ${{ vars.GAR_REPOSITORY }}
    IMAGE_NAME: api
    REGION: ${{ vars.CLOUD_RUN_REGION }}
    SERVICE_DEV: ${{ vars.CLOUD_RUN_SERVICE_DEV }}
    SERVICE_PRD: ${{ vars.CLOUD_RUN_SERVICE_PRD }}
    WIF_PROVIDER: ${{ vars.WIF_PROVIDER }}
    WIF_SERVICE_ACCOUNT: ${{ vars.WIF_SERVICE_ACCOUNT }}
  ```

- When `main` runs, the workflow deploys to `${{ env.SERVICE_DEV }}`. When a tag like `v1.2.3` runs, only the prod deploy job triggers and targets `${{ env.SERVICE_PRD }}`.
- You can monitor each deployment in the Cloud Run console and Cloud Build/Artifact Registry logs to verify that the shared image is being promoted across environments.

After these UI steps are complete, CI/CD is fully automated—no JSON keys, one Artifact Registry repository, and two Cloud Run services managed straight from GitHub Actions.
