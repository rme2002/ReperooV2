# Cloud Run Module

Terraform module for deploying containerized applications to Google Cloud Run v2 with health checks, auto-scaling, and secret management.

## Features

- **Health Checks**: Startup and liveness probes on configurable HTTP endpoint
- **Auto-Scaling**: Min/max instance configuration with scale-to-zero support
- **Secret Management**: Seamless Secret Manager integration for environment variables
- **Resource Control**: CPU and memory limits with startup boost
- **VPC Support**: Optional VPC connector for private network access
- **Public/Private Access**: Configurable IAM for authenticated or public endpoints
- **CI/CD Friendly**: Ignores image tag changes (managed by deployment pipelines)

## Usage

```hcl
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = "my-api-dev"
  region                = "europe-west4"
  image                 = "europe-west4-docker.pkg.dev/my-project/repo/api:latest"
  service_account_email = "my-api-sa@my-project.iam.gserviceaccount.com"

  # Scaling configuration
  min_instances = 0  # Scale to zero
  max_instances = 10
  cpu           = "2"
  memory        = "1Gi"

  # Environment variables from Secret Manager
  secrets = {
    DATABASE_URL = "dev-database-url"
    API_KEY      = "dev-api-key"
  }

  # Regular environment variables
  env_vars = {
    ENVIRONMENT = "dev"
    LOG_LEVEL   = "info"
  }

  # Health check configuration
  health_check_path = "/health"
  request_timeout   = "300s"

  # Public access
  allow_unauthenticated = true

  # Optional: VPC connector for private DB access
  vpc_connector_name = "projects/my-project/locations/europe-west4/connectors/my-connector"
  vpc_egress        = "PRIVATE_RANGES_ONLY"

  labels = {
    environment = "dev"
    team        = "backend"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `service_name` | Name of the Cloud Run service | `string` | - | yes |
| `region` | GCP region for deployment | `string` | `"europe-west4"` | no |
| `image` | Docker image to deploy (full path) | `string` | - | yes |
| `service_account_email` | Service account email | `string` | - | yes |
| `container_port` | Port the container listens on | `number` | `8080` | no |
| `min_instances` | Minimum instances (0 for scale-to-zero) | `number` | `0` | no |
| `max_instances` | Maximum instances for auto-scaling | `number` | `5` | no |
| `cpu` | CPUs per instance (1, 2, 4, 6, 8) | `string` | `"1"` | no |
| `memory` | Memory per instance (e.g., "512Mi", "1Gi") | `string` | `"512Mi"` | no |
| `env_vars` | Environment variables (plaintext) | `map(string)` | `{}` | no |
| `secrets` | Secret Manager secrets as env vars | `map(string)` | `{}` | no |
| `health_check_path` | HTTP path for health checks | `string` | `"/health"` | no |
| `request_timeout` | Max request duration (e.g., "300s") | `string` | `"300s"` | no |
| `allow_unauthenticated` | Allow public access | `bool` | `false` | no |
| `vpc_connector_name` | VPC connector for private access | `string` | `null` | no |
| `vpc_egress` | VPC egress setting | `string` | `"PRIVATE_RANGES_ONLY"` | no |
| `labels` | Additional labels | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `service_url` | URL of the deployed Cloud Run service |
| `service_name` | Name of the Cloud Run service |
| `service_id` | Full resource ID |
| `service_location` | Deployment region |

## Health Checks

The module configures two types of health checks:

### Startup Probe
- **Purpose**: Checks if the application has started successfully
- **Configuration**: 10s initial delay, 10s period, 3 failure threshold
- **Behavior**: Prevents traffic until app is ready

### Liveness Probe
- **Purpose**: Monitors if the application is still healthy
- **Configuration**: 30s initial delay, 30s period, 3 failure threshold
- **Behavior**: Restarts container on repeated failures

Both probes hit the configured `health_check_path` (default: `/health`).

## Secret Management

Secrets are mounted as environment variables from Google Secret Manager:

```hcl
secrets = {
  DATABASE_URL = "my-database-secret"  # Secret name in Secret Manager
  API_KEY      = "my-api-key-secret"
}
```

The service account must have `roles/secretmanager.secretAccessor` on these secrets.

## Auto-Scaling

Cloud Run automatically scales instances based on:
- **Incoming requests**: More traffic = more instances
- **CPU utilization**: High CPU = scale up
- **Concurrency**: Requests per instance

Configuration:
```hcl
min_instances = 0   # Scale to zero when idle (saves costs)
max_instances = 20  # Maximum instances during peak load
```

## Resource Limits

CPU and memory must be configured together:

| CPU | Recommended Memory |
|-----|-------------------|
| 1 | 512Mi - 2Gi |
| 2 | 1Gi - 4Gi |
| 4 | 2Gi - 8Gi |

```hcl
cpu    = "2"
memory = "2Gi"
```

## VPC Connector

For accessing resources in a private VPC (e.g., Cloud SQL with private IP):

```hcl
vpc_connector_name = "projects/my-project/locations/europe-west4/connectors/my-connector"
vpc_egress        = "PRIVATE_RANGES_ONLY"  # Route only private IPs through VPC
```

**Note**: VPC connector must be created separately (not managed by this module).

## Public vs. Private Access

### Public (Unauthenticated)
```hcl
allow_unauthenticated = true
```
Anyone can access the service URL without authentication.

### Private (Authenticated)
```hcl
allow_unauthenticated = false
```
Requires valid Google ID token in `Authorization: Bearer <token>` header.

## CI/CD Integration

The module is designed to work with CI/CD pipelines:

1. **Terraform manages**: Service definition, scaling, IAM, secrets
2. **CI/CD manages**: Image deployments (using `gcloud run deploy`)

The `lifecycle.ignore_changes` block prevents Terraform from reverting CI/CD deployments:

```hcl
lifecycle {
  ignore_changes = [
    template[0].containers[0].image,
    template[0].revision,
  ]
}
```

## Example Deployment Workflow

```bash
# Initial infrastructure setup (Terraform)
terraform apply

# CI/CD deploys new image (GitHub Actions)
gcloud run services update my-api-dev \
  --image=europe-west4-docker.pkg.dev/my-project/repo/api:v1.2.3 \
  --region=europe-west4

# Terraform doesn't revert the image on next apply
terraform apply  # No changes to image
```

## Labels

All services are automatically labeled with:
```hcl
labels = {
  managed-by = "terraform"
  app        = "reperoo-api"
  # ... your custom labels
}
```

Use labels for:
- Cost tracking
- Resource grouping
- Ownership identification

## Troubleshooting

### Health Check Failing

**Symptom**: Service doesn't receive traffic, logs show health check failures

**Solution**:
1. Verify `/health` endpoint returns 200 OK
2. Check container port matches actual app port
3. Increase `initial_delay_seconds` if app takes longer to start
4. Check logs: `gcloud run services logs read SERVICE_NAME`

### Service Won't Scale Down

**Symptom**: Instances stay running even with no traffic

**Solution**:
1. Verify `min_instances = 0`
2. Check for long-running requests preventing shutdown
3. Reduce `request_timeout` if appropriate

### Secret Access Denied

**Symptom**: Container crashes with "permission denied" for secrets

**Solution**:
1. Verify service account has `secretmanager.secretAccessor` role
2. Check secret names are correct
3. Ensure secrets exist: `gcloud secrets list`

### High Costs

**Symptom**: Unexpected Cloud Run charges

**Solution**:
1. Set `min_instances = 0` for scale-to-zero
2. Lower `max_instances` to prevent runaway scaling
3. Reduce `cpu` and `memory` if over-provisioned
4. Check request timeout (long timeouts = longer billable time)

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run v2 API](https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.services)
- [Health Checks](https://cloud.google.com/run/docs/configuring/healthchecks)
- [VPC Access](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)
