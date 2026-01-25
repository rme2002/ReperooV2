# Artifact Registry Module

Terraform module for creating Google Artifact Registry repositories for Docker images with IAM bindings for CI/CD pipelines.

## Features

- **Docker Repository**: DOCKER format repository for container images
- **IAM Management**: Optional writer/reader permissions for CI/CD
- **Lifecycle Protection**: Prevents accidental deletion
- **Labels**: Automatic labeling for resource management
- **Regional Storage**: Configurable location for reduced latency

## Usage

```hcl
module "artifact_registry" {
  source = "../../modules/artifact-registry"

  repository_id = "my-api-images"
  location      = "europe-west4"
  description   = "Docker images for My API"

  # Grant write permission to CI/CD service accounts
  writer_members = [
    "serviceAccount:github-actions@my-project.iam.gserviceaccount.com",
    "serviceAccount:cloudbuild@my-project.iam.gserviceaccount.com",
  ]

  # Grant read permission to Cloud Run (usually automatic)
  reader_members = []

  labels = {
    environment = "shared"
    team        = "backend"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `repository_id` | Repository ID (lowercase, alphanumeric, hyphens) | `string` | - | yes |
| `location` | GCP region for repository | `string` | `"europe-west4"` | no |
| `description` | Repository description | `string` | `"Managed by Terraform"` | no |
| `writer_members` | IAM members with push permission | `list(string)` | `[]` | no |
| `reader_members` | IAM members with pull permission | `list(string)` | `[]` | no |
| `labels` | Additional labels | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `repository_id` | ID of the repository |
| `repository_url` | Full URL for docker commands |
| `repository_name` | Fully-qualified name |
| `repository_location` | Repository location |

## Repository URL Format

The `repository_url` output is formatted for direct use with Docker:

```
{LOCATION}-docker.pkg.dev/{PROJECT}/{REPOSITORY}
```

Example:
```
europe-west4-docker.pkg.dev/my-project/my-api-images
```

## IAM Roles

### Writer Role (artifactregistry.writer)

Allows:
- Push Docker images
- Create tags
- Delete images and tags

Typical use:
```hcl
writer_members = [
  "serviceAccount:ci-cd@project.iam.gserviceaccount.com"
]
```

### Reader Role (artifactregistry.reader)

Allows:
- Pull Docker images
- List images and tags

Typical use:
```hcl
reader_members = [
  "serviceAccount:dev-team@project.iam.gserviceaccount.com"
]
```

**Note**: Cloud Run automatically gets reader permission when deploying from the same project.

## Pushing Images

### Authenticate Docker

```bash
# Configure Docker to use gcloud for authentication
gcloud auth configure-docker europe-west4-docker.pkg.dev
```

### Build and Push

```bash
# Get repository URL from Terraform output
REPO_URL=$(terraform output -raw repository_url)

# Build image
docker build -t $REPO_URL/my-api:v1.0.0 .

# Push image
docker push $REPO_URL/my-api:v1.0.0

# Tag as latest
docker tag $REPO_URL/my-api:v1.0.0 $REPO_URL/my-api:latest
docker push $REPO_URL/my-api:latest
```

## Image Management

### List Images

```bash
gcloud artifacts docker images list \
  europe-west4-docker.pkg.dev/PROJECT/REPOSITORY
```

### List Tags for an Image

```bash
gcloud artifacts docker tags list \
  europe-west4-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE
```

### Delete Old Images

```bash
# Delete specific version
gcloud artifacts docker images delete \
  europe-west4-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG

# Delete with confirmation skip
gcloud artifacts docker images delete \
  europe-west4-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG \
  --quiet
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Push

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
        env:
          REPO_URL: europe-west4-docker.pkg.dev/my-project/my-api-images
        run: |
          docker build -t $REPO_URL/api:latest .
          docker push $REPO_URL/api:latest
```

### Google Cloud Build

```yaml
steps:
  # Build image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'europe-west4-docker.pkg.dev/$PROJECT_ID/my-api-images/api:latest'
      - '.'

  # Push image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'europe-west4-docker.pkg.dev/$PROJECT_ID/my-api-images/api'

images:
  - 'europe-west4-docker.pkg.dev/$PROJECT_ID/my-api-images/api:$COMMIT_SHA'
  - 'europe-west4-docker.pkg.dev/$PROJECT_ID/my-api-images/api:latest'
```

## Tagging Strategy

### Semantic Versioning

```bash
# Tag with version
docker tag IMAGE:latest IMAGE:v1.2.3
docker push IMAGE:v1.2.3

# Also maintain latest
docker push IMAGE:latest
```

### Git Commit SHA

```bash
# Tag with commit SHA for traceability
docker tag IMAGE:latest IMAGE:${GIT_SHA}
docker push IMAGE:${GIT_SHA}
```

### Environment Tags

```bash
# Tag for specific environments
docker tag IMAGE:v1.2.3 IMAGE:dev
docker push IMAGE:dev

docker tag IMAGE:v1.2.3 IMAGE:prod
docker push IMAGE:prod
```

## Cost Optimization

### Storage Costs

Artifact Registry charges for:
- Storage: ~$0.10/GB/month
- Network egress: ~$0.12/GB (outside region)

### Cleanup Strategies

1. **Delete old images**:
   ```bash
   # List images older than 30 days
   gcloud artifacts docker images list REPO_URL \
     --filter="createTime<2024-01-01" \
     --format="value(package)"
   ```

2. **Implement retention policy**:
   ```bash
   # Keep only last 10 versions
   gcloud artifacts repositories set-cleanup-policies REPOSITORY \
     --location=LOCATION \
     --policy=policy.json
   ```

   policy.json:
   ```json
   {
     "rules": [{
       "condition": {
         "tagState": "TAGGED",
         "olderThan": "2592000s"
       },
       "action": "DELETE"
     }]
   }
   ```

## Security Best Practices

### 1. Limit Write Access

Only grant writer permission to trusted CI/CD:

```hcl
writer_members = [
  "serviceAccount:github-actions@project.iam.gserviceaccount.com"
]
# Don't add individual users unless necessary
```

### 2. Use Separate Repositories

Different repositories for different environments or teams:

```hcl
module "api_images" {
  repository_id = "api-images"
  writer_members = ["serviceAccount:api-ci@project.iam.gserviceaccount.com"]
}

module "worker_images" {
  repository_id = "worker-images"
  writer_members = ["serviceAccount:worker-ci@project.iam.gserviceaccount.com"]
}
```

### 3. Scan Images for Vulnerabilities

```bash
# Enable vulnerability scanning
gcloud artifacts repositories update REPOSITORY \
  --location=LOCATION \
  --enable-vulnerability-scanning

# View scan results
gcloud artifacts docker images describe IMAGE_PATH \
  --show-deployment
```

### 4. Immutable Tags

Prevent tag overwrites:

```bash
# Coming soon to Artifact Registry
# Currently, tags are mutable (can be overwritten)
```

## Troubleshooting

### Permission Denied on Push

**Symptom**: "denied: Permission denied for resource"

**Solution**:
1. Verify authentication:
   ```bash
   gcloud auth configure-docker europe-west4-docker.pkg.dev
   ```

2. Check IAM permissions:
   ```bash
   gcloud artifacts repositories get-iam-policy REPOSITORY --location=LOCATION
   ```

3. Verify service account has writer role:
   ```hcl
   writer_members = ["serviceAccount:YOUR-SA@project.iam.gserviceaccount.com"]
   ```

### Repository Not Found

**Symptom**: "repository does not exist"

**Solution**:
1. Verify repository exists:
   ```bash
   gcloud artifacts repositories describe REPOSITORY --location=LOCATION
   ```

2. Check Terraform state:
   ```bash
   terraform state show module.artifact_registry.google_artifact_registry_repository.repository
   ```

3. Ensure correct region and project

### Image Pull Slow

**Symptom**: Long image pull times in Cloud Run

**Solution**:
1. Use same region for repository and Cloud Run:
   ```hcl
   location = "europe-west4"  # Same as Cloud Run
   ```

2. Check network egress costs (different region)

3. Consider using Artifact Registry cache

### High Storage Costs

**Symptom**: Unexpected Artifact Registry charges

**Solution**:
1. List all images and sizes:
   ```bash
   gcloud artifacts docker images list REPO_URL \
     --format="table(package, createTime, sizeBytes)"
   ```

2. Delete old images:
   ```bash
   # Delete images older than 30 days
   gcloud artifacts docker images list REPO_URL \
     --filter="createTime<$(date -d '30 days ago' +%Y-%m-%d)" \
     --format="value(package)" | \
     xargs -I {} gcloud artifacts docker images delete {} --quiet
   ```

3. Implement cleanup policy (see Cost Optimization)

## Migration from GCR

If migrating from Container Registry (gcr.io):

```bash
# Copy images from GCR to Artifact Registry
gcloud container images list --repository=gcr.io/PROJECT

gcr-cleaner copy \
  --src=gcr.io/PROJECT/IMAGE:TAG \
  --dest=LOCATION-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG
```

Update deployment configs:
```diff
- image: gcr.io/project/image:tag
+ image: europe-west4-docker.pkg.dev/project/repository/image:tag
```

## References

- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Docker Repository](https://cloud.google.com/artifact-registry/docs/docker)
- [IAM Roles](https://cloud.google.com/artifact-registry/docs/access-control)
- [Cleanup Policies](https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy)
- [Vulnerability Scanning](https://cloud.google.com/artifact-registry/docs/analysis)
