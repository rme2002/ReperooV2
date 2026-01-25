# Secrets Module

Terraform module for managing Google Secret Manager secrets with automatic IAM bindings and placeholder values.

## Features

- **Secret Creation**: Creates secrets with auto-replication across regions
- **Placeholder Values**: Initializes secrets with `"PLACEHOLDER_UPDATE_ME"` to avoid storing sensitive data in Terraform state
- **Ignore Changes**: Configured to ignore secret value updates (update via `gcloud` instead)
- **Lifecycle Protection**: Prevents accidental deletion of secrets
- **Labels**: Automatic labeling for resource management

**Note**: IAM bindings for secret access are managed by the `service-account` module to avoid circular dependencies.

## Usage

```hcl
module "secrets" {
  source = "../../modules/secrets"

  project_id = "my-project"

  secret_configs = {
    "dev-database-url" = {
      description = "PostgreSQL database connection string for dev"
    }
    "dev-api-key" = {
      description = "Third-party API key for dev environment"
    }
    "dev-supabase-url" = {
      description = "Supabase project URL for dev"
    }
    "dev-supabase-secret-api-key" = {
      description = "Supabase service role key for dev"
    }
  }

  labels = {
    environment = "dev"
    managed-by  = "terraform"
  }
}

# Grant service account access to secrets
module "service_account" {
  source = "../../modules/service-account"

  account_id = "my-api-dev-sa"
  project_id = "my-project"

  # This grants the service account access to all secrets
  secret_ids = module.secrets.secret_ids_list

  depends_on = [module.secrets]
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `project_id` | GCP project ID | `string` | - | yes |
| `secret_configs` | Map of secret configurations | `map(object)` | - | yes |
| `labels` | Additional labels for secrets | `map(string)` | `{}` | no |

### secret_configs Object

```hcl
{
  "secret-name" = {
    description = "Human-readable description of the secret"
  }
}
```

## Outputs

| Name | Description |
|------|-------------|
| `secret_ids` | Map of secret names to IDs |
| `secret_names` | Map of secret names to fully-qualified names |
| `secret_ids_list` | List of secret IDs |

## Secret Lifecycle

### 1. Creation (Terraform)

Terraform creates the secret with a placeholder value:

```bash
terraform apply
# Creates secret with value "PLACEHOLDER_UPDATE_ME"
```

### 2. Update Value (gcloud CLI)

Update the secret with the actual value using `gcloud`:

```bash
# Add new version with actual value
gcloud secrets versions add dev-database-url \
  --data-file=- <<< "postgresql://user:pass@host:5432/db"

# Verify
gcloud secrets versions access latest --secret=dev-database-url
```

### 3. Terraform Ignores Changes

The module is configured with `ignore_changes` for secret data:

```hcl
lifecycle {
  ignore_changes = [secret_data]
}
```

This means Terraform won't revert your `gcloud` updates.

### 4. Rotation

To rotate a secret, just add a new version:

```bash
# Old version becomes previous, new version becomes latest
gcloud secrets versions add dev-database-url \
  --data-file=- <<< "new-value"

# Cloud Run automatically picks up latest version
```

## IAM Access Control

**Important**: This module creates secrets but does NOT manage IAM bindings. IAM bindings are handled by the `service-account` module to avoid circular dependency issues.

### Granting Access

To grant a service account access to secrets:

```hcl
# 1. Create secrets
module "secrets" {
  source = "../../modules/secrets"
  secret_configs = { ... }
}

# 2. Create service account and grant it access
module "service_account" {
  source = "../../modules/service-account"

  account_id = "my-api-sa"
  secret_ids = module.secrets.secret_ids_list  # Grants access to all secrets

  depends_on = [module.secrets]
}
```

### Permissions Granted

The `service-account` module grants `roles/secretmanager.secretAccessor` which allows:
- Read secret values
- List secret versions
- Access latest or specific versions

It does NOT allow:
- Create or delete secrets
- Update IAM policies
- Modify secret metadata

## Secret Naming Conventions

### Recommended Format

```
{environment}-{service}-{purpose}
```

Examples:
- `dev-database-url` - Dev database connection
- `prod-api-key` - Production API key
- `staging-jwt-secret` - Staging JWT secret

### Best Practices

1. **Include environment**: `dev-`, `staging-`, `prod-`
2. **Be descriptive**: `database-url` not `db`
3. **Use hyphens**: `api-key` not `api_key` or `apiKey`
4. **Lowercase only**: `dev-key` not `Dev-Key`

## Security Best Practices

### 1. Never Commit Secret Values

Bad:
```hcl
# DON'T DO THIS
resource "google_secret_manager_secret_version" "bad" {
  secret_data = "my-actual-password"  # Stored in Terraform state!
}
```

Good:
```hcl
# This module creates placeholder, you update via gcloud
module "secrets" {
  source = "../../modules/secrets"
  # Secret values never in Terraform
}
```

### 2. Separate Secrets by Environment

```hcl
# Dev secrets
module "dev_secrets" {
  secret_configs = {
    "dev-database-url" = { description = "Dev DB" }
  }
}

module "dev_sa" {
  account_id = "dev-sa"
  secret_ids = module.dev_secrets.secret_ids_list
  depends_on = [module.dev_secrets]
}

# Prod secrets
module "prod_secrets" {
  secret_configs = {
    "prod-database-url" = { description = "Prod DB" }
  }
}

module "prod_sa" {
  account_id = "prod-sa"
  secret_ids = module.prod_secrets.secret_ids_list
  depends_on = [module.prod_secrets]
}
```

### 3. Least Privilege Access

Only grant service accounts access to secrets they actually need:

Bad:
```hcl
# One service account gets access to all secrets
module "service_account" {
  secret_ids = module.all_secrets.secret_ids_list
  # Gets access to API, worker, and admin secrets!
}
```

Good:
```hcl
# Create separate secret groups for different services
module "api_secrets" {
  secret_configs = {
    "dev-database-url" = { description = "API DB" }
  }
}

module "worker_secrets" {
  secret_configs = {
    "dev-queue-credentials" = { description = "Worker queue" }
  }
}

# Each service account only gets its secrets
module "api_sa" {
  account_id = "api-sa"
  secret_ids = module.api_secrets.secret_ids_list
}

module "worker_sa" {
  account_id = "worker-sa"
  secret_ids = module.worker_secrets.secret_ids_list
}
```

### 4. Enable Audit Logging

```bash
# Enable Data Access audit logs for Secret Manager
gcloud projects get-iam-policy PROJECT_ID > policy.yaml

# Edit policy.yaml to add:
# auditConfigs:
# - auditLogConfigs:
#   - logType: DATA_READ
#   - logType: DATA_WRITE
#   service: secretmanager.googleapis.com

gcloud projects set-iam-policy PROJECT_ID policy.yaml
```

## Common Operations

### List All Secrets

```bash
gcloud secrets list --project=my-project
```

### View Secret Value

```bash
# Latest version
gcloud secrets versions access latest --secret=dev-database-url

# Specific version
gcloud secrets versions access 1 --secret=dev-database-url
```

### Add New Secret Version

```bash
# From stdin
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# From file
gcloud secrets versions add SECRET_NAME --data-file=secret.txt

# From heredoc
gcloud secrets versions add SECRET_NAME --data-file=- <<< "new-value"
```

### List Secret Versions

```bash
gcloud secrets versions list dev-database-url

# Output:
# NAME  STATE    CREATED              DESTROYED
# 2     enabled  2024-01-15T10:30:00  -
# 1     enabled  2024-01-01T08:00:00  -
```

### Destroy Secret Version

```bash
# Disable version (can be re-enabled)
gcloud secrets versions disable 1 --secret=dev-database-url

# Permanently destroy version
gcloud secrets versions destroy 1 --secret=dev-database-url
```

### View IAM Policy

```bash
gcloud secrets get-iam-policy dev-database-url

# Output:
# bindings:
# - members:
#   - serviceAccount:api-sa@project.iam.gserviceaccount.com
#   role: roles/secretmanager.secretAccessor
```

## Using with Cloud Run

### Complete Example

```hcl
# 1. Create secrets
module "secrets" {
  source = "../../modules/secrets"

  secret_configs = {
    "dev-database-url" = { description = "Database URL" }
  }
}

# 2. Create service account with secret access
module "service_account" {
  source = "../../modules/service-account"

  account_id = "my-api-sa"
  secret_ids = module.secrets.secret_ids_list

  depends_on = [module.secrets]
}

# 3. Create Cloud Run service
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_account_email = module.service_account.email

  secrets = {
    DATABASE_URL = "dev-database-url"  # References the secret created above
  }
}
```

### Access in Application Code

Python (FastAPI):
```python
import os

database_url = os.environ["DATABASE_URL"]
# Cloud Run automatically injects the secret value
```

Node.js:
```javascript
const databaseUrl = process.env.DATABASE_URL;
// Secret value is available as environment variable
```

## Troubleshooting

### Secret Already Exists

**Symptom**: "Error 409: Secret already exists"

**Solution**:
1. Import existing secret into Terraform state:
   ```bash
   terraform import 'module.secrets.google_secret_manager_secret.secrets["dev-database-url"]' projects/PROJECT_ID/secrets/dev-database-url
   ```

2. Or delete and recreate:
   ```bash
   gcloud secrets delete dev-database-url
   terraform apply
   ```

### Permission Denied

**Symptom**: Service can't access secret

**Solution**:
1. Verify IAM bindings exist:
   ```bash
   gcloud secrets get-iam-policy SECRET_NAME
   ```

2. Check service account has secrets in `secret_ids`:
   ```hcl
   module "service_account" {
     account_id = "my-sa"
     secret_ids = module.secrets.secret_ids_list  # Make sure this is set
     depends_on = [module.secrets]
   }
   ```

3. Verify the service account was created after secrets:
   ```bash
   terraform state show 'module.service_account.google_secret_manager_secret_iam_member.secret_access["SECRET_NAME"]'
   ```

4. Wait for IAM propagation (up to 80 seconds)

### Placeholder Value in Production

**Symptom**: Application fails with "PLACEHOLDER_UPDATE_ME" error

**Solution**:
You forgot to update the secret value:
```bash
gcloud secrets versions add SECRET_NAME --data-file=- <<< "actual-value"
```

### Can't Delete Secret

**Symptom**: "Error: lifecycle prevent_destroy"

**Solution**:
1. Remove from state (keeps secret in GCP):
   ```bash
   terraform state rm 'module.secrets.google_secret_manager_secret.secrets["SECRET_NAME"]'
   ```

2. Or remove prevent_destroy and apply:
   ```hcl
   # In main.tf, remove:
   lifecycle {
     prevent_destroy = true
   }
   ```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Update Secrets
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    echo "$DATABASE_URL" | gcloud secrets versions add dev-database-url --data-file=-
```

### Google Cloud Build Example

```yaml
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        echo "$$DATABASE_URL" | gcloud secrets versions add dev-database-url --data-file=-
    secretEnv: ['DATABASE_URL']

availableSecrets:
  secretManager:
    - versionName: projects/PROJECT_ID/secrets/ci-database-url/versions/latest
      env: 'DATABASE_URL'
```

## References

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Secret Manager API](https://cloud.google.com/secret-manager/docs/reference/rest)
- [IAM Roles for Secret Manager](https://cloud.google.com/secret-manager/docs/access-control)
- [Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
