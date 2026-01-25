# Service Account Module

Terraform module for creating Google Cloud service accounts with least-privilege IAM roles and Secret Manager access.

## Features

- **Service Account Creation**: Creates service account with configurable ID and display name
- **Project-Level IAM**: Grants specified roles at the project level
- **Secret Manager Access**: Automatically grants `secretAccessor` role for specified secrets
- **Clean Outputs**: Provides email and properly formatted member strings for IAM bindings

## Usage

```hcl
module "service_account" {
  source = "../../modules/service-account"

  account_id   = "my-api-dev-sa"
  display_name = "My API Dev Service Account"
  description  = "Service account for My API in dev environment"
  project_id   = "my-project"

  # Project-level IAM roles
  roles = [
    "roles/cloudsql.client",      # Access Cloud SQL databases
    "roles/logging.logWriter",    # Write logs to Cloud Logging
    "roles/cloudtrace.agent",     # Write traces to Cloud Trace
    "roles/monitoring.metricWriter", # Write metrics to Cloud Monitoring
  ]

  # Secrets to grant accessor permission
  secret_ids = [
    "dev-database-url",
    "dev-api-key",
    "dev-supabase-url",
  ]
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `account_id` | Service account ID (6-30 chars, lowercase) | `string` | - | yes |
| `display_name` | Human-readable display name | `string` | - | yes |
| `description` | Description of the service account | `string` | `"Managed by Terraform"` | no |
| `project_id` | GCP project ID | `string` | - | yes |
| `roles` | Project-level IAM roles to grant | `list(string)` | `[]` | no |
| `secret_ids` | Secret Manager secret IDs for accessor permission | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| `email` | Email address of the service account |
| `member` | IAM member string (`serviceAccount:EMAIL`) |
| `account_id` | The account ID |
| `name` | Fully-qualified name |
| `unique_id` | Unique numeric ID |

## Common IAM Roles

### Cloud Run Services

```hcl
roles = [
  "roles/cloudsql.client",      # Connect to Cloud SQL
  "roles/logging.logWriter",    # Write logs
  "roles/cloudtrace.agent",     # Write traces
  "roles/monitoring.metricWriter", # Write metrics
]
```

### Storage Access

```hcl
roles = [
  "roles/storage.objectViewer",  # Read from Cloud Storage
  "roles/storage.objectCreator", # Write to Cloud Storage
]
```

### Pub/Sub

```hcl
roles = [
  "roles/pubsub.publisher",   # Publish messages
  "roles/pubsub.subscriber",  # Consume messages
]
```

### BigQuery

```hcl
roles = [
  "roles/bigquery.dataViewer", # Read data
  "roles/bigquery.jobUser",    # Run queries
]
```

## Secret Manager Access

The module automatically grants `roles/secretmanager.secretAccessor` permission for each secret in `secret_ids`:

```hcl
secret_ids = [
  "dev-database-url",
  "dev-api-key",
]
```

This allows Cloud Run services using this service account to:
1. Read secret values at runtime
2. Mount secrets as environment variables
3. Access the latest version automatically

## Least Privilege Principles

**Only grant necessary permissions**:

Bad example (too permissive):
```hcl
roles = [
  "roles/owner",               # NEVER use this
  "roles/editor",              # Too broad
]
```

Good example (least privilege):
```hcl
roles = [
  "roles/cloudsql.client",     # Specific to Cloud SQL
  "roles/logging.logWriter",   # Only write logs (not read)
]
```

## Using Outputs

### Cloud Run Service

```hcl
module "service_account" {
  source = "../../modules/service-account"
  # ... configuration
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  service_account_email = module.service_account.email
  # ... other configuration
}
```

### Additional IAM Bindings

```hcl
resource "google_storage_bucket_iam_member" "bucket_access" {
  bucket = "my-bucket"
  role   = "roles/storage.objectViewer"
  member = module.service_account.member  # Uses the formatted member string
}
```

## Security Best Practices

### 1. Separate Service Accounts per Service

Don't reuse service accounts across different services:

Bad:
```hcl
# One service account for everything
module "shared_sa" {
  roles = [
    "roles/cloudsql.client",
    "roles/storage.admin",
    "roles/pubsub.editor",
  ]
}
```

Good:
```hcl
# Dedicated service account per service
module "api_sa" {
  account_id = "my-api-sa"
  roles      = ["roles/cloudsql.client"]
}

module "worker_sa" {
  account_id = "my-worker-sa"
  roles      = ["roles/pubsub.subscriber"]
}
```

### 2. Environment Isolation

Use separate service accounts for dev and prod:

```hcl
# Dev
module "dev_sa" {
  account_id = "my-api-dev-sa"
  roles      = ["roles/cloudsql.client"]
  secret_ids = ["dev-database-url"]
}

# Prod
module "prod_sa" {
  account_id = "my-api-prod-sa"
  roles      = ["roles/cloudsql.client"]
  secret_ids = ["prod-database-url"]
}
```

### 3. Audit Role Grants

Regularly review granted roles:

```bash
# List all service accounts
gcloud iam service-accounts list

# Get IAM policy for a service account
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:my-api-sa@PROJECT_ID.iam.gserviceaccount.com"
```

### 4. Avoid Owner/Editor Roles

Never use these roles in production:
- `roles/owner` - Full control over everything
- `roles/editor` - Can modify almost everything
- `roles/viewer` - Read access to everything

Use specific roles instead:
- `roles/cloudsql.client` instead of `roles/editor`
- `roles/logging.logWriter` instead of `roles/logging.admin`

## Troubleshooting

### Permission Denied Errors

**Symptom**: Service gets "403 Forbidden" or "Permission denied"

**Solution**:
1. Check service account has necessary role:
   ```bash
   gcloud projects get-iam-policy PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:EMAIL"
   ```

2. Verify secret access:
   ```bash
   gcloud secrets get-iam-policy SECRET_NAME
   ```

3. Check role propagation (can take up to 80 seconds):
   ```bash
   # Wait a minute, then retry
   ```

### Service Account Not Found

**Symptom**: "Service account EMAIL does not exist"

**Solution**:
1. Verify service account exists:
   ```bash
   gcloud iam service-accounts describe EMAIL
   ```

2. Check for typos in account_id or project_id

3. Ensure Terraform apply completed successfully:
   ```bash
   terraform state show module.service_account.google_service_account.service_account
   ```

### Too Many Roles

**Symptom**: Service account has excessive permissions

**Solution**:
1. List current roles:
   ```bash
   gcloud projects get-iam-policy PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:EMAIL"
   ```

2. Remove unnecessary roles from `roles` variable

3. Apply Terraform to remove excess permissions:
   ```bash
   terraform apply
   ```

## Examples

### Minimal Service Account

```hcl
module "minimal_sa" {
  source = "../../modules/service-account"

  account_id   = "my-app-sa"
  display_name = "My App Service Account"
  project_id   = "my-project"

  # No additional roles
  roles      = []
  secret_ids = []
}
```

### Full-Featured Service Account

```hcl
module "full_sa" {
  source = "../../modules/service-account"

  account_id   = "my-api-prod-sa"
  display_name = "My API Production Service Account"
  description  = "Service account for My API production environment"
  project_id   = "my-project"

  roles = [
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
    "roles/monitoring.metricWriter",
    "roles/cloudprofiler.agent",
  ]

  secret_ids = [
    "prod-database-url",
    "prod-api-key",
    "prod-jwt-secret",
  ]
}
```

### Multiple Service Accounts

```hcl
# API service account
module "api_sa" {
  source = "../../modules/service-account"

  account_id   = "my-api-sa"
  display_name = "API Service Account"
  project_id   = "my-project"

  roles = [
    "roles/cloudsql.client",
    "roles/logging.logWriter",
  ]

  secret_ids = ["dev-database-url"]
}

# Worker service account
module "worker_sa" {
  source = "../../modules/service-account"

  account_id   = "my-worker-sa"
  display_name = "Worker Service Account"
  project_id   = "my-project"

  roles = [
    "roles/pubsub.subscriber",
    "roles/storage.objectCreator",
  ]

  secret_ids = []
}
```

## References

- [Service Accounts Overview](https://cloud.google.com/iam/docs/service-accounts)
- [Understanding Roles](https://cloud.google.com/iam/docs/understanding-roles)
- [Secret Manager IAM](https://cloud.google.com/secret-manager/docs/access-control)
- [IAM Best Practices](https://cloud.google.com/iam/docs/best-practices)
