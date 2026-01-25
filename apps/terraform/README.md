# Reperoo Terraform Infrastructure

Complete Terraform configuration for deploying the Reperoo FastAPI application to Google Cloud Run.

## Overview

This Terraform setup manages the complete infrastructure for the Reperoo API across multiple environments:

- **Cloud Run**: Serverless FastAPI container deployment
- **Secret Manager**: Secure credential storage (database, Supabase)
- **Service Accounts**: Least-privilege IAM for Cloud Run
- **Artifact Registry**: Docker image repository

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Project                     │
│                        (reperoo)                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │  Artifact       │────────▶│   Cloud Run      │           │
│  │  Registry       │         │   Service        │           │
│  │  (Docker)       │         │   (FastAPI)      │           │
│  └─────────────────┘         └────────┬─────────┘           │
│                                       │                      │
│                              ┌────────▼─────────┐            │
│                              │  Service Account │            │
│                              │  (IAM Roles)     │            │
│                              └────────┬─────────┘            │
│                                       │                      │
│                              ┌────────▼─────────┐            │
│                              │  Secret Manager  │            │
│                              │  - DB URL        │            │
│                              │  - Supabase Keys │            │
│                              └──────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
apps/terraform/
├── modules/                    # Reusable Terraform modules
│   ├── cloud-run/             # Cloud Run service with health checks
│   ├── service-account/       # Service account + IAM bindings
│   ├── secrets/               # Secret Manager management
│   └── artifact-registry/     # Docker image repository
│
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment (active)
│   └── prod/                  # Production environment (prepared)
│
├── scripts/                   # Helper deployment scripts
└── README.md                  # This file
```

## Prerequisites

1. **GCP Project**: `reperoo` project with billing enabled
2. **gcloud CLI**: Authenticated and configured
   ```bash
   gcloud auth login
   gcloud config set project reperoo
   ```
3. **Terraform**: Version 1.5+ installed
4. **Required APIs**: Enable these GCP APIs
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     artifactregistry.googleapis.com \
     cloudresourcemanager.googleapis.com
   ```

## Quick Start (Dev Environment)

### 1. Create State Backend Bucket

```bash
gcloud storage buckets create gs://reperoo-terraform-state-dev \
  --project=reperoo \
  --location=europe-west4 \
  --uniform-bucket-level-access

gcloud storage buckets update gs://reperoo-terraform-state-dev --versioning
```

### 2. Initialize Terraform

```bash
cd environments/dev
terraform init
```

### 3. Deploy Infrastructure

```bash
# Review the plan
terraform plan

# Apply changes
terraform apply
```

### 4. Update Secret Values

Terraform creates secrets with placeholder values. Update them with actual credentials:

```bash
# Database connection string
gcloud secrets versions add dev-database-url \
  --data-file=- <<< "postgresql://user:pass@host:5432/reperoo"

# Supabase configuration
gcloud secrets versions add dev-supabase-url \
  --data-file=- <<< "https://xxxxx.supabase.co"

gcloud secrets versions add dev-supabase-secret-api-key \
  --data-file=- <<< "your-service-role-key"

gcloud secrets versions add dev-supabase-jwt-secret \
  --data-file=- <<< "your-jwt-secret"
```

### 5. Deploy Application Image

```bash
cd ../../../api  # Navigate to apps/api

# Build and tag Docker image
docker build -t europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest .

# Authenticate with Artifact Registry
gcloud auth configure-docker europe-west4-docker.pkg.dev

# Push image
docker push europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest

# Update Cloud Run service
gcloud run services update reperoo-api-dev \
  --image=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest \
  --region=europe-west4
```

### 6. Verify Deployment

```bash
cd ../../terraform/environments/dev

# Get service URL
CLOUD_RUN_URL=$(terraform output -raw cloud_run_url)

# Test health endpoint
curl $CLOUD_RUN_URL/health

# View logs
gcloud run services logs read reperoo-api-dev --region=europe-west4 --limit=50
```

## Environment Details

### Dev Environment

- **Service Name**: `reperoo-api-dev`
- **Region**: `europe-west4` (Netherlands)
- **Scaling**: 0-5 instances (scale to zero enabled)
- **Resources**: 1 CPU, 512Mi memory
- **Access**: Public (unauthenticated)
- **Purpose**: Testing and continuous deployment
- **Status**: Active and ready to deploy

### Prod Environment

- **Service Name**: `reperoo-api-prod`
- **Region**: `europe-west4` (Netherlands)
- **Scaling**: 0-20 instances (scale to zero enabled)
- **Resources**: 2 CPU, 1Gi memory
- **Access**: Public (recommend adding Cloud Armor)
- **Purpose**: Production workloads
- **Status**: Structure prepared, deployment deferred

To deploy production:
```bash
# Create prod state bucket
gcloud storage buckets create gs://reperoo-terraform-state-prod \
  --project=reperoo \
  --location=europe-west4 \
  --uniform-bucket-level-access

# Initialize and deploy
cd environments/prod
terraform init
terraform plan
terraform apply
```

## Secret Management

Terraform creates Secret Manager secrets but **does not** manage their values. This prevents secrets from being stored in Terraform state.

### Secret Lifecycle

1. **Creation**: Terraform creates secrets with `"PLACEHOLDER_UPDATE_ME"` values
2. **Configuration**: `ignore_changes = [secret_data]` prevents Terraform from updating values
3. **Updates**: Use `gcloud` CLI or CI/CD to set actual values
4. **Rotation**: Update via `gcloud secrets versions add`

### Required Secrets (per environment)

| Secret Name | Description | Example Format |
|------------|-------------|----------------|
| `{env}-database-url` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `{env}-supabase-url` | Supabase project URL | `https://xxxxx.supabase.co` |
| `{env}-supabase-secret-api-key` | Supabase service role key | `eyJhbGc...` |
| `{env}-supabase-jwt-secret` | JWT signing secret | `your-jwt-secret` |

### Updating Secrets

```bash
# Add new version (becomes latest automatically)
gcloud secrets versions add SECRET_NAME --data-file=- <<< "new-value"

# List versions
gcloud secrets versions list SECRET_NAME

# View secret (requires permissions)
gcloud secrets versions access latest --secret=SECRET_NAME
```

## Modules Documentation

### cloud-run Module

Manages Cloud Run v2 service with health checks, auto-scaling, and secret mounting.

**Key Features**:
- Health probes (startup + liveness) on `/health` endpoint
- Auto-scaling with min/max instance configuration
- Secret Manager environment variable injection
- Resource limits (CPU/memory)
- Public/private access control

**Usage**:
```hcl
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = "reperoo-api-dev"
  region                = "europe-west4"
  image                 = "europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest"
  service_account_email = module.service_account.email

  min_instances = 0
  max_instances = 5
  cpu           = "1"
  memory        = "512Mi"

  secrets = {
    DATABASE_URL              = "dev-database-url"
    SUPABASE_URL             = "dev-supabase-url"
    SUPABASE_SECRET_API_KEY  = "dev-supabase-secret-api-key"
    SUPABASE_JWT_SECRET      = "dev-supabase-jwt-secret"
  }

  allow_unauthenticated = true
}
```

### service-account Module

Creates service account with least-privilege IAM roles.

**Key Features**:
- Project-level role bindings
- Secret Manager accessor permissions
- Clean IAM member formatting

**Usage**:
```hcl
module "service_account" {
  source = "../../modules/service-account"

  account_id   = "reperoo-api-dev-sa"
  display_name = "Reperoo API Dev Service Account"
  project_id   = "reperoo"

  roles = [
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
  ]

  secret_ids = [
    "dev-database-url",
    "dev-supabase-url",
    "dev-supabase-secret-api-key",
    "dev-supabase-jwt-secret",
  ]
}
```

### secrets Module

Manages Secret Manager lifecycle and IAM bindings.

**Key Features**:
- Creates secrets with placeholder values
- Auto-replication across regions
- IAM bindings for accessor service accounts
- Prevents accidental deletion
- Ignores value changes (update via gcloud)

**Usage**:
```hcl
# Create secrets
module "secrets" {
  source = "../../modules/secrets"

  project_id = "reperoo"

  secret_configs = {
    "dev-database-url" = {
      description = "PostgreSQL database connection string for dev"
    }
    "dev-supabase-url" = {
      description = "Supabase project URL for dev"
    }
  }
}

# Grant service account access to secrets
module "service_account" {
  source = "../../modules/service-account"

  account_id = "my-api-sa"
  secret_ids = module.secrets.secret_ids_list

  depends_on = [module.secrets]
}
```

**Note**: IAM bindings are managed by the service-account module to avoid circular dependencies.

### artifact-registry Module

Manages Docker image repository for Cloud Run deployments.

**Key Features**:
- DOCKER format repository
- Optional IAM bindings for CI/CD
- Prevents accidental deletion

**Usage**:
```hcl
module "artifact_registry" {
  source = "../../modules/artifact-registry"

  repository_id = "reperoo-api-images"
  location      = "europe-west4"
  description   = "Docker images for Reperoo API"

  writer_members = [
    "serviceAccount:github-actions@reperoo.iam.gserviceaccount.com"
  ]
}
```

## CI/CD Integration

This Terraform setup is designed to work alongside your existing GitHub Actions workflow.

### Division of Responsibilities

| Tool | Manages | Updates |
|------|---------|---------|
| **Terraform** | Infrastructure baseline | Manual (`terraform apply`) |
| **GitHub Actions** | Application deployments | Automatic (on git push) |

### Terraform Manages

- Cloud Run service definition (scaling, resources, IAM)
- Secret Manager structure (not values)
- Service accounts and IAM roles
- Artifact Registry repository

### GitHub Actions Manages

- Building Docker images
- Pushing to Artifact Registry
- Deploying new Cloud Run revisions
- Running database migrations

### No Conflicts

Both tools coexist peacefully because:
- Terraform creates the service baseline
- GitHub Actions uses `gcloud run deploy --image=...` which only updates the revision
- Cloud Run allows both declarative (Terraform) and imperative (gcloud) updates

### GitHub Actions with Workload Identity Federation (Recommended)

**Set up secure, keyless authentication** for GitHub Actions:

1. **Configure**: Set `github_repository` in `terraform.auto.tfvars`
   ```hcl
   github_repository = "your-org/your-repo"
   ```

2. **Deploy**: Run `terraform apply`

3. **Configure GitHub**: Add secrets from Terraform outputs
   ```bash
   terraform output github_actions_workload_identity_provider
   terraform output github_actions_sa_email
   ```

4. **Create workflow**: See [QUICKSTART_GITHUB_ACTIONS.md](./QUICKSTART_GITHUB_ACTIONS.md)

**Why WIF?**
- ✅ No service account keys (more secure)
- ✅ Automatic token rotation
- ✅ Repository-scoped access
- ✅ Free and fully managed

**Full guide**: [GITHUB_ACTIONS_WIF.md](./GITHUB_ACTIONS_WIF.md)

## Common Operations

### View Terraform Outputs

```bash
cd environments/dev
terraform output

# Get specific output
terraform output -raw cloud_run_url
```

### Update Cloud Run Configuration

```bash
# Modify variables in terraform.auto.tfvars
# Example: Change max_instances from 5 to 10

terraform plan   # Review changes
terraform apply  # Apply changes
```

### Add New Secret

```bash
# 1. Add to secrets module configuration in main.tf
# 2. Add to service account secret_ids
# 3. Add to cloud_run secrets map
# 4. Apply Terraform
terraform apply

# 5. Set actual value
gcloud secrets versions add dev-new-secret --data-file=- <<< "value"
```

### Destroy Infrastructure

```bash
cd environments/dev

# Review what will be destroyed
terraform plan -destroy

# Destroy (use with caution!)
terraform destroy
```

**Note**: Some resources have `prevent_destroy` lifecycle rules and must be manually removed from state first:
```bash
terraform state rm module.secrets.google_secret_manager_secret.secrets[\"dev-database-url\"]
```

## Troubleshooting

### Error: Backend bucket does not exist

**Solution**: Create the GCS state bucket first
```bash
gcloud storage buckets create gs://reperoo-terraform-state-dev \
  --project=reperoo \
  --location=europe-west4 \
  --uniform-bucket-level-access
```

### Error: Permission denied on Secret Manager

**Cause**: Service account missing `secretAccessor` role

**Solution**: Check IAM bindings in `modules/service-account/main.tf`
```bash
gcloud secrets get-iam-policy dev-database-url
```

### Health Check Failing

**Cause**: `/health` endpoint not returning 200 OK

**Solution**:
1. Check Cloud Run logs: `gcloud run services logs read reperoo-api-dev --region=europe-west4`
2. Verify FastAPI health endpoint exists
3. Check startup time (may need to increase `initial_delay_seconds`)

### Database Connection Failed

**Cause**: Invalid `DATABASE_URL` secret value

**Solution**:
1. Verify secret format: `postgresql://user:pass@host:5432/dbname`
2. Check secret value: `gcloud secrets versions access latest --secret=dev-database-url`
3. Update if needed: `gcloud secrets versions add dev-database-url --data-file=-`

### Terraform Shows Changes on Every Run

**Cause**: Resource drift or missing `ignore_changes`

**Solution**:
1. Check for `ignore_changes` lifecycle blocks
2. Import existing resources: `terraform import module.name.resource id`
3. Review `terraform plan` output for specific changes

## Cost Optimization

### Current Costs (Dev)

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Cloud Run | $5-10 | Scale to zero, minimal traffic |
| Secret Manager | $0.10 | 4 secrets |
| Artifact Registry | $0.10 | Image storage |
| GCS State | $0.01 | Terraform state |
| **Total** | **~$5-15** | |

### Cost Reduction Strategies

1. **Scale to Zero**: Dev already configured (`min_instances = 0`)
2. **Image Cleanup**: Delete old Artifact Registry images
   ```bash
   gcloud artifacts docker images list europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api
   gcloud artifacts docker images delete IMAGE_PATH
   ```
3. **Log Retention**: Configure log retention policies
4. **Request Timeout**: Lower timeout for faster failures (default 300s)

## Security Best Practices

### Implemented

- Least privilege IAM (service accounts only have necessary roles)
- Secrets never in Terraform state or git
- State isolation (separate GCS buckets per environment)
- Lifecycle protection on critical resources
- Health checks for automatic restart
- Scaling limits to prevent runaway costs
- Resource labels for cost tracking

### Recommended Additions

1. **VPC Connector**: Private network for database connections
2. **Cloud Armor**: WAF and DDoS protection for production
3. **Binary Authorization**: Only deploy signed images
4. **Workload Identity**: For GKE integration
5. **Audit Logging**: Track all infrastructure changes
6. **Secret Rotation**: Automated secret rotation policies

## Future Enhancements

### Short Term

1. Add custom domain mapping (api.reperoo.com)
2. Set up Cloud Monitoring alerts
3. Configure Cloud Trace for APM
4. Add load testing configuration

### Long Term

1. Multi-region deployment for HA
2. Cloud SQL Terraform module
3. Redis/Memorystore for caching
4. Cloud CDN for static assets
5. VPC Service Controls for security perimeter

## Support

### Documentation

- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)

### Getting Help

1. Check module-specific README files
2. Review `terraform plan` output carefully
3. Check Cloud Run logs for runtime issues
4. Verify IAM permissions with `gcloud` commands

## License

Part of the Reperoo project.
