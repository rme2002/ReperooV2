# Development Environment

Terraform configuration for deploying the Reperoo API to Google Cloud Run in the development environment.

## Quick Start

### 1. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=reperoo
```

### 2. Create State Backend Bucket

```bash
gcloud storage buckets create gs://reperoo-terraform-state-dev \
  --project=reperoo \
  --location=europe-west4 \
  --uniform-bucket-level-access

gcloud storage buckets update gs://reperoo-terraform-state-dev --versioning
```

### 3. Initialize Terraform

```bash
cd apps/terraform/environments/dev
terraform init
```

### 4. Review and Apply

```bash
# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

### 5. Update Secret Values

After Terraform creates the secrets, update them with actual values:

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

### 6. Deploy Application Image

```bash
# Navigate to API directory
cd ../../../../api

# Build Docker image
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

### 7. Verify Deployment

```bash
cd ../../terraform/environments/dev

# Get service URL
terraform output cloud_run_url

# Test health endpoint
curl $(terraform output -raw cloud_run_url)/health

# View logs
gcloud run services logs read reperoo-api-dev --region=europe-west4 --limit=50
```

## Configuration

### Default Settings (terraform.auto.tfvars)

- **Project**: `reperoo`
- **Region**: `europe-west4` (Netherlands)
- **Service Name**: `reperoo-api-dev`
- **Scaling**: 0-5 instances (scale to zero enabled)
- **Resources**: 1 CPU, 512Mi memory
- **Access**: Public (unauthenticated)

### Customization (terraform.tfvars)

Copy the example file and customize:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your preferences
```

**Note**: `terraform.tfvars` is gitignored and won't be committed.

## Infrastructure Components

### Created Resources

1. **Artifact Registry Repository**: `reperoo-api-images`
   - Docker image storage
   - Shared across all environments

2. **Service Account**: `reperoo-api-dev-sa`
   - Least-privilege IAM
   - Secret Manager access
   - Cloud logging/monitoring

3. **Secret Manager Secrets**:
   - `dev-database-url` - PostgreSQL connection
   - `dev-supabase-url` - Supabase project URL
   - `dev-supabase-secret-api-key` - Supabase service key
   - `dev-supabase-jwt-secret` - JWT signing secret

4. **Cloud Run Service**: `reperoo-api-dev`
   - Auto-scaling (0-5 instances)
   - Health checks on `/health`
   - Public access enabled

### State Management

Terraform state is stored in:
```
gs://reperoo-terraform-state-dev/terraform/state
```

State features:
- Versioning enabled (state recovery)
- Isolated from production
- Automatic locking

## Common Operations

### View Outputs

```bash
terraform output

# Get specific output
terraform output -raw cloud_run_url
```

### Update Configuration

```bash
# Modify terraform.auto.tfvars or terraform.tfvars
# Example: Change max_instances to 10

terraform plan   # Review changes
terraform apply  # Apply changes
```

### View Service Status

```bash
gcloud run services describe reperoo-api-dev --region=europe-west4
```

### View Secret Values

```bash
# List secrets
gcloud secrets list --filter="name:dev-*"

# View specific secret (requires permissions)
gcloud secrets versions access latest --secret=dev-database-url
```

### Update Secret Value

```bash
# Add new version (becomes latest automatically)
gcloud secrets versions add dev-database-url \
  --data-file=- <<< "new-connection-string"

# Cloud Run will pick up the new value on next cold start
# Or force restart:
gcloud run services update reperoo-api-dev --region=europe-west4
```

### View Logs

```bash
# Recent logs
gcloud run services logs read reperoo-api-dev --region=europe-west4 --limit=50

# Tail logs (real-time)
gcloud run services logs tail reperoo-api-dev --region=europe-west4

# Filter by severity
gcloud run services logs read reperoo-api-dev --region=europe-west4 --log-filter="severity>=ERROR"
```

### Scale Service

```bash
# Update min/max instances in terraform.auto.tfvars
min_instances = 1  # Keep 1 instance warm
max_instances = 10

terraform apply
```

## Troubleshooting

### Terraform Init Fails

**Error**: "Error loading backend: bucket does not exist"

**Solution**: Create the state bucket (see step 2 above)

### Secret Access Denied

**Error**: Service can't access secrets

**Solution**:
1. Verify secrets exist: `gcloud secrets list --filter="name:dev-*"`
2. Check IAM: `gcloud secrets get-iam-policy dev-database-url`
3. Wait 1-2 minutes for IAM propagation

### Health Check Failing

**Error**: Cloud Run service not receiving traffic

**Solution**:
1. Check `/health` endpoint exists in FastAPI app
2. Verify container port is 8080
3. Check logs: `gcloud run services logs read reperoo-api-dev --region=europe-west4`
4. Test locally: `docker run -p 8080:8080 IMAGE curl localhost:8080/health`

### Database Connection Error

**Error**: Can't connect to database

**Solution**:
1. Verify DATABASE_URL format: `postgresql://user:pass@host:5432/db`
2. Check secret value: `gcloud secrets versions access latest --secret=dev-database-url`
3. Test connection from Cloud Shell:
   ```bash
   psql "$(gcloud secrets versions access latest --secret=dev-database-url)"
   ```

### Image Pull Failed

**Error**: "Failed to pull image"

**Solution**:
1. Verify image exists:
   ```bash
   gcloud artifacts docker images list europe-west4-docker.pkg.dev/reperoo/reperoo-api-images
   ```
2. Check service account has Artifact Registry reader permission (automatic in same project)
3. Push image again

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Dev

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker
        run: gcloud auth configure-docker europe-west4-docker.pkg.dev

      - name: Build and Push
        run: |
          docker build -t europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest ./apps/api
          docker push europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run services update reperoo-api-dev \
            --image=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest \
            --region=europe-west4
```

## Cost Estimate

**Monthly cost** (approximate):
- Cloud Run: $5-10 (scale to zero, minimal traffic)
- Secret Manager: $0.10 (4 secrets)
- Artifact Registry: $0.10 (image storage)
- State Storage: $0.01
- **Total**: ~$5-15/month

## Next Steps

1. Set up custom domain mapping
2. Configure Cloud Monitoring alerts
3. Enable Cloud Trace for APM
4. Set up log-based metrics
5. Implement CI/CD pipeline
6. Configure Cloud Armor (if needed)

## References

- [Root README](../../README.md) - Complete setup guide
- [Cloud Run Module](../../modules/cloud-run/README.md)
- [Service Account Module](../../modules/service-account/README.md)
- [Secrets Module](../../modules/secrets/README.md)
- [Artifact Registry Module](../../modules/artifact-registry/README.md)
