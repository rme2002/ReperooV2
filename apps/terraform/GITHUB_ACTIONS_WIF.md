# GitHub Actions with Workload Identity Federation

Complete guide for setting up secure, keyless authentication from GitHub Actions to Google Cloud using Workload Identity Federation (WIF).

## Why Use Workload Identity Federation?

**Traditional approach (❌ Insecure)**:
- Create service account keys (JSON files)
- Store keys as GitHub Secrets
- Keys can be stolen, leaked, or expire
- Hard to rotate and manage

**Workload Identity Federation (✅ Secure)**:
- No service account keys needed
- GitHub Actions gets temporary tokens via OIDC
- Tokens expire automatically (short-lived)
- Repository-scoped access
- Free and fully managed by Google

## Architecture

```
┌─────────────────────────┐
│   GitHub Actions        │
│   (Your Workflow)       │
└───────────┬─────────────┘
            │
            │ 1. Request OIDC token
            ▼
┌─────────────────────────┐
│   GitHub OIDC Provider  │
│   (token.actions.       │
│    githubusercontent.com)│
└───────────┬─────────────┘
            │
            │ 2. Exchange for GCP token
            ▼
┌─────────────────────────┐
│   Workload Identity     │
│   Pool & Provider       │
└───────────┬─────────────┘
            │
            │ 3. Impersonate service account
            ▼
┌─────────────────────────┐
│   Service Account       │
│   (github-actions-ci)   │
└───────────┬─────────────┘
            │
            │ 4. Push images, deploy services
            ▼
┌─────────────────────────┐
│   Artifact Registry     │
│   Cloud Run             │
└─────────────────────────┘
```

## Setup Guide

### Step 1: Configure Terraform

**Edit `environments/dev/terraform.auto.tfvars`:**

```hcl
# Set your GitHub repository
github_repository = "YOUR_ORG/YOUR_REPO"
# Example: github_repository = "anthropics/reperoo"
```

**Important**: Use the format `owner/repo` (not the full GitHub URL)

### Step 2: Deploy Infrastructure

```bash
cd environments/dev

# Initialize and preview changes
terraform init
terraform plan

# Apply changes
terraform apply
```

This creates:
- ✅ Workload Identity Pool (`github-actions-pool`)
- ✅ Workload Identity Provider (`github-provider`)
- ✅ Service Account (`github-actions-ci@reperoo.iam.gserviceaccount.com`)
- ✅ IAM bindings for Artifact Registry and Cloud Run

### Step 3: Get Configuration Values

After Terraform applies, get the required values:

```bash
# Get Workload Identity Provider ID
terraform output -raw github_actions_workload_identity_provider

# Get Service Account Email
terraform output -raw github_actions_sa_email

# Get Project Number
terraform output -raw github_actions_project_number
```

**Save these values** - you'll need them for GitHub Actions configuration.

### Step 4: Configure GitHub Actions Workflow

Create or update `.github/workflows/deploy.yml` in your repository:

```yaml
name: Build and Deploy to Cloud Run

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

# IMPORTANT: Required for Workload Identity Federation
permissions:
  contents: read
  id-token: write

env:
  PROJECT_ID: reperoo
  REGION: europe-west4
  SERVICE_NAME: reperoo-api-dev
  ARTIFACT_REGISTRY: europe-west4-docker.pkg.dev/reperoo/reperoo-api-images

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Authenticate to Google Cloud using Workload Identity Federation
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      # Set up Cloud SDK
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      # Configure Docker to use gcloud as a credential helper
      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker europe-west4-docker.pkg.dev

      # Build Docker image
      - name: Build Docker image
        run: |
          docker build -t ${{ env.ARTIFACT_REGISTRY }}/api:latest ./apps/api

      # Push Docker image to Artifact Registry
      - name: Push Docker image
        run: |
          docker push ${{ env.ARTIFACT_REGISTRY }}/api:latest

      # Deploy to Cloud Run (only on main branch)
      - name: Deploy to Cloud Run
        if: github.ref == 'refs/heads/main'
        run: |
          gcloud run services update ${{ env.SERVICE_NAME }} \
            --image=${{ env.ARTIFACT_REGISTRY }}/api:latest \
            --region=${{ env.REGION }}
```

### Step 5: Configure GitHub Secrets

Add these secrets to your GitHub repository:

**Go to**: Repository → Settings → Secrets and variables → Actions → New repository secret

1. **WIF_PROVIDER**:
   - Value: Output from `terraform output -raw github_actions_workload_identity_provider`
   - Example: `projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`

2. **WIF_SERVICE_ACCOUNT**:
   - Value: Output from `terraform output -raw github_actions_sa_email`
   - Example: `github-actions-ci@reperoo.iam.gserviceaccount.com`

### Step 6: Test the Workflow

1. **Commit and push** your workflow file:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Actions workflow with WIF"
   git push
   ```

2. **Check the workflow run**:
   - Go to GitHub → Your repo → Actions tab
   - Click on the workflow run
   - Verify all steps complete successfully

3. **Verify the image was pushed**:
   ```bash
   gcloud artifacts docker images list \
     europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api
   ```

## Permissions Granted

The `github-actions-ci` service account has these permissions:

| Role | Purpose |
|------|---------|
| `artifactregistry.writer` | Push Docker images to Artifact Registry |
| `run.developer` | Deploy new revisions to Cloud Run |
| `iam.serviceAccountUser` | Deploy Cloud Run with specific service account |

**Security**: These permissions are scoped to your specific GitHub repository only.

## Troubleshooting

### Error: "Failed to generate Google Cloud access token"

**Cause**: Workload Identity Provider not configured correctly

**Solution**:
1. Verify `WIF_PROVIDER` secret is correct:
   ```bash
   terraform output -raw github_actions_workload_identity_provider
   ```
2. Ensure it starts with `projects/` and ends with `/providers/github-provider`
3. Check the value matches exactly in GitHub Secrets

### Error: "Permission denied" when pushing to Artifact Registry

**Cause**: Service account missing `artifactregistry.writer` role

**Solution**:
```bash
# Check IAM bindings
gcloud projects get-iam-policy reperoo \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-ci@reperoo.iam.gserviceaccount.com"

# Should show roles/artifactregistry.writer
```

If missing, re-run `terraform apply`.

### Error: "Repository not allowed"

**Cause**: `github_repository` variable doesn't match actual repository

**Solution**:
1. Check your repository name: `YOUR_ORG/YOUR_REPO`
2. Update `terraform.auto.tfvars`:
   ```hcl
   github_repository = "correct-org/correct-repo"
   ```
3. Re-apply: `terraform apply`

### Error: "Workload Identity Pool not found"

**Cause**: WIF resources not created yet

**Solution**:
```bash
cd environments/dev
terraform apply

# Verify resources created
gcloud iam workload-identity-pools list --location=global
```

### Authentication works but deployment fails

**Cause**: Service account missing Cloud Run permissions

**Solution**:
Check IAM roles:
```bash
gcloud projects get-iam-policy reperoo \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-ci@reperoo.iam.gserviceaccount.com"
```

Should see:
- `roles/run.developer`
- `roles/iam.serviceAccountUser`

## Advanced Configuration

### Deploy to Multiple Environments

You can configure WIF for both dev and prod:

**In `environments/prod/terraform.auto.tfvars`:**
```hcl
github_repository = "your-org/your-repo"
```

Then create separate workflows or use different branches:

```yaml
# .github/workflows/deploy-dev.yml
on:
  push:
    branches: [main]

# .github/workflows/deploy-prod.yml
on:
  push:
    tags:
      - 'v*'
```

### Restrict by Branch

The current setup allows any branch in your repository. To restrict to specific branches:

**Update `environments/dev/github-actions.tf`:**
```hcl
attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main'"
```

Then `terraform apply`.

### Add Additional Repositories

To allow multiple repositories:

1. Create separate Workload Identity Pools per repository, OR
2. Use attribute conditions with multiple repositories:
   ```hcl
   attribute_condition = "assertion.repository in ['org/repo1', 'org/repo2']"
   ```

### Use Environment-Specific Service Accounts

For stricter isolation, use different service accounts per environment:

```hcl
# Dev
resource "google_service_account" "github_actions_dev" {
  account_id = "github-actions-dev"
  # ... only Artifact Registry writer, no Cloud Run
}

# Prod (requires manual approval)
resource "google_service_account" "github_actions_prod" {
  account_id = "github-actions-prod"
  # ... full Cloud Run deployment permissions
}
```

## Security Best Practices

### 1. Least Privilege

Only grant permissions needed for CI/CD:
- ✅ `artifactregistry.writer` - Push images
- ✅ `run.developer` - Deploy Cloud Run
- ❌ Don't grant `roles/owner` or `roles/editor`

### 2. Repository Scoping

Always use `attribute_condition` to restrict to specific repositories:
```hcl
attribute_condition = "assertion.repository == 'your-org/your-repo'"
```

### 3. Audit Logs

Monitor WIF usage:
```bash
gcloud logging read "protoPayload.serviceName=iam.googleapis.com" \
  --filter="protoPayload.authenticationInfo.principalEmail:github-actions-ci" \
  --limit=50
```

### 4. Separate Environments

Use different Workload Identity Pools for dev and prod:
- `github-actions-pool-dev`
- `github-actions-pool-prod`

### 5. Branch Protection

Enable branch protection on `main`:
- Require pull request reviews
- Require status checks
- Prevent force pushes

### 6. Secrets Management

Never commit these to your repository:
- ❌ Service account keys (not needed with WIF!)
- ❌ API keys
- ❌ Database passwords

Use Google Secret Manager and mount in Cloud Run instead.

## Cost

**Workload Identity Federation is FREE**:
- No charge for authentication
- No charge for token exchange
- Only pay for Cloud Run and Artifact Registry usage

## Migration from Service Account Keys

If you're currently using service account keys:

1. **Deploy WIF** (this guide)
2. **Update workflows** to use `google-github-actions/auth@v2`
3. **Remove key secrets** from GitHub
4. **Delete service account keys**:
   ```bash
   gcloud iam service-accounts keys list \
     --iam-account=old-sa@reperoo.iam.gserviceaccount.com

   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=old-sa@reperoo.iam.gserviceaccount.com
   ```
5. **Delete old service account** (optional):
   ```bash
   gcloud iam service-accounts delete old-sa@reperoo.iam.gserviceaccount.com
   ```

## Comparison: WIF vs Service Account Keys

| Feature | Workload Identity Federation | Service Account Keys |
|---------|------------------------------|----------------------|
| **Security** | ✅ Keyless, token-based | ❌ Long-lived credentials |
| **Expiration** | ✅ Automatic (1 hour) | ❌ Never (unless rotated) |
| **Rotation** | ✅ Not needed | ❌ Manual, complex |
| **Leak Risk** | ✅ Low (tokens expire) | ❌ High (permanent access) |
| **Setup** | ⚠️ More initial config | ✅ Simple download |
| **Cost** | ✅ Free | ✅ Free |
| **Audit** | ✅ Full OIDC audit trail | ⚠️ Basic logging |

**Verdict**: Always use WIF for production systems.

## Resources

- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)
- [Artifact Registry Authentication](https://cloud.google.com/artifact-registry/docs/docker/authentication)

## Support

For issues with this setup:
1. Check [Troubleshooting](#troubleshooting) section above
2. Verify Terraform outputs match GitHub secrets
3. Check GitHub Actions logs for detailed error messages
4. Review GCP audit logs for permission issues

## Example: Full Workflow with Tests

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          cd apps/api
          pip install -r requirements.txt
          pytest

  build-and-deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Build and push Docker image
        run: |
          gcloud auth configure-docker europe-west4-docker.pkg.dev

          IMAGE=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api

          docker build -t $IMAGE:latest ./apps/api
          docker push $IMAGE:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run services update reperoo-api-dev \
            --image=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest \
            --region=europe-west4

      - name: Verify deployment
        run: |
          URL=$(gcloud run services describe reperoo-api-dev --region=europe-west4 --format='value(status.url)')
          curl -f "$URL/health" || exit 1
```

## Summary

Workload Identity Federation provides **secure, keyless authentication** from GitHub Actions to Google Cloud. Follow this guide to set it up in your repository and eliminate the need for service account keys.

**Next Steps**:
1. Set `github_repository` in `terraform.auto.tfvars`
2. Run `terraform apply`
3. Copy outputs to GitHub Secrets
4. Create `.github/workflows/deploy.yml`
5. Push and watch it work! 🎉
