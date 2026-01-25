# Quick Start: GitHub Actions with WIF

5-minute setup for secure GitHub Actions authentication to Google Cloud.

## 1. Configure Repository

Edit `environments/dev/terraform.auto.tfvars`:

```hcl
github_repository = "YOUR_ORG/YOUR_REPO"
```

Example: `github_repository = "romnickevangelista/ReperooV2"`

## 2. Deploy

```bash
cd environments/dev
terraform apply
```

## 3. Get Values

```bash
# Copy these values
terraform output github_actions_workload_identity_provider
terraform output github_actions_sa_email
```

## 4. Add GitHub Secrets

Go to: **Your Repo → Settings → Secrets and variables → Actions**

Add two secrets:

| Name | Value |
|------|-------|
| `WIF_PROVIDER` | Output from step 3 (first command) |
| `WIF_SERVICE_ACCOUNT` | Output from step 3 (second command) |

## 5. Create Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write  # Required for WIF

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Build and push
        run: |
          gcloud auth configure-docker europe-west4-docker.pkg.dev
          docker build -t europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest ./apps/api
          docker push europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest

      - name: Deploy
        run: |
          gcloud run services update reperoo-api-dev \
            --image=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest \
            --region=europe-west4
```

## 6. Push and Test

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow"
git push
```

Check: **Your Repo → Actions** tab to see the workflow run.

## Done! 🎉

Your GitHub Actions can now push to Artifact Registry and deploy to Cloud Run **without any service account keys**.

**Full documentation**: See [GITHUB_ACTIONS_WIF.md](./GITHUB_ACTIONS_WIF.md)
