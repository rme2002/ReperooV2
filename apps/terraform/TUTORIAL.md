# Terraform Structure Tutorial

A complete guide to understanding how the Reperoo Terraform infrastructure is organized and how all the pieces connect together.

## Table of Contents

1. [Terraform Basics](#terraform-basics)
2. [File Relationships](#file-relationships)
3. [Variable Flow](#variable-flow)
4. [Module System](#module-system)
5. [How to Read the Code](#how-to-read-the-code)
6. [Execution Flow](#execution-flow)
7. [Common Patterns](#common-patterns)

---

## Terraform Basics

### What is Terraform?

Terraform is an Infrastructure as Code (IaC) tool that lets you define cloud resources using configuration files instead of clicking through web consoles.

**Key Concepts:**

1. **Resources**: Things you create (Cloud Run service, secrets, etc.)
2. **Modules**: Reusable groups of resources
3. **Variables**: Inputs that can be customized
4. **Outputs**: Values exposed after resources are created
5. **State**: Terraform's record of what it created

### File Types

- **`*.tf`**: Terraform configuration files
- **`*.tfvars`**: Variable values (like a settings file)
- **`backend.tf`**: Where to store state (our tracking database)
- **`.terraform/`**: Downloaded provider plugins (ignored by git)
- **`terraform.tfstate`**: Current state (ignored by git, stored in GCS)

---

## File Relationships

### Directory Layout

```
apps/terraform/
│
├── modules/                    # Reusable building blocks
│   ├── cloud-run/
│   │   ├── main.tf            # CREATES: Cloud Run service
│   │   ├── variables.tf       # DECLARES: What inputs this module accepts
│   │   ├── outputs.tf         # DECLARES: What values this module exposes
│   │   └── README.md          # EXPLAINS: How to use this module
│   │
│   ├── service-account/       # Similar structure
│   ├── secrets/
│   └── artifact-registry/
│
└── environments/              # Concrete deployments
    ├── dev/
    │   ├── main.tf            # USES: The modules above with dev settings
    │   ├── variables.tf       # DECLARES: What inputs dev environment accepts
    │   ├── outputs.tf         # EXPOSES: Final URLs and values
    │   ├── backend.tf         # CONFIGURES: Where to store dev state
    │   ├── terraform.auto.tfvars  # SETS: Default values for dev
    │   └── terraform.tfvars.example  # TEMPLATE: For customization
    │
    └── prod/                  # Same structure, production settings
```

### File Purpose Quick Reference

| File | Purpose | Contains |
|------|---------|----------|
| `main.tf` | Main configuration | Resource and module definitions |
| `variables.tf` | Input declarations | Variable types and defaults |
| `outputs.tf` | Output declarations | Values to expose after apply |
| `backend.tf` | State configuration | GCS bucket for state storage |
| `terraform.auto.tfvars` | Default values | Automatically loaded values |
| `terraform.tfvars` | Custom values | User-specific overrides (gitignored) |
| `README.md` | Documentation | Usage instructions |

---

## Variable Flow

This is the most important concept to understand. Let's trace how a variable flows through the system.

### Example: `service_name`

**Step 1: User sets value**
```hcl
# File: environments/dev/terraform.auto.tfvars
service_name = "reperoo-api-dev"
```

**Step 2: Environment declares it accepts this variable**
```hcl
# File: environments/dev/variables.tf
variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}
```

**Step 3: Environment passes it to a module**
```hcl
# File: environments/dev/main.tf
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name = var.service_name  # ← Uses the variable
  # ...
}
```

**Step 4: Module declares it accepts this input**
```hcl
# File: modules/cloud-run/variables.tf
variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}
```

**Step 5: Module uses it to create a resource**
```hcl
# File: modules/cloud-run/main.tf
resource "google_cloud_run_v2_service" "service" {
  name = var.service_name  # ← Actually creates the Cloud Run service
  # ...
}
```

### Visual Flow

```
User Input (tfvars)
        ↓
Environment Variables (variables.tf)
        ↓
Environment Main (main.tf) - passes to module
        ↓
Module Variables (variables.tf)
        ↓
Module Main (main.tf) - creates resource
```

---

## Module System

### What is a Module?

A module is a container for multiple resources that are used together. Think of it like a function in programming:

```python
# Programming analogy
def create_cloud_run(service_name, region, cpu, memory):
    service = create_service(name=service_name)
    iam = create_iam_binding(service)
    return service.url

# Terraform equivalent
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name = "my-api"
  region       = "europe-west4"
  cpu          = "1"
  memory       = "512Mi"
}
```

### Module Structure

Each module has three main files:

#### 1. `variables.tf` - Input Parameters

```hcl
# modules/cloud-run/variables.tf

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  # This is like a function parameter
}

variable "cpu" {
  description = "Number of CPUs"
  type        = string
  default     = "1"  # Optional: provides default if not specified
}
```

#### 2. `main.tf` - Implementation

```hcl
# modules/cloud-run/main.tf

resource "google_cloud_run_v2_service" "service" {
  name = var.service_name  # Uses the input variable

  template {
    containers {
      resources {
        limits = {
          cpu = var.cpu  # Uses another input variable
        }
      }
    }
  }
}
```

#### 3. `outputs.tf` - Return Values

```hcl
# modules/cloud-run/outputs.tf

output "service_url" {
  description = "URL of the deployed service"
  value       = google_cloud_run_v2_service.service.uri
  # This is like a function return value
}
```

### Using a Module

```hcl
# environments/dev/main.tf

module "cloud_run" {
  source = "../../modules/cloud-run"  # Where to find the module

  # Pass inputs to the module
  service_name = "reperoo-api-dev"
  cpu          = "1"
  memory       = "512Mi"
}

# Access module outputs
output "cloud_run_url" {
  value = module.cloud_run.service_url  # Get the URL back
}
```

---

## How to Read the Code

### Start from `environments/dev/main.tf`

This is the "entry point" - where everything comes together.

**Read it top to bottom:**

```hcl
# 1. Provider configuration - "We're using Google Cloud"
provider "google" {
  project = var.project_id
  region  = var.region
}

# 2. Artifact Registry module - Creates Docker repository
module "artifact_registry" {
  source = "../../modules/artifact-registry"

  repository_id = var.artifact_registry_repository_id
  location      = var.region
}

# 3. Secrets module - Creates secrets (no dependencies)
module "secrets" {
  source = "../../modules/secrets"

  secret_configs = { ... }
}

# 4. Service Account module - Creates SA and grants it access to secrets
module "service_account" {
  source = "../../modules/service-account"

  account_id = "${var.service_name}-sa"
  project_id = var.project_id
  secret_ids = module.secrets.secret_ids_list  # ← Using output from secrets module!

  depends_on = [module.secrets]  # ← Explicit dependency: wait for secrets first
}

# 5. Cloud Run module - Creates the actual service
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = var.service_name
  service_account_email = module.service_account.email  # ← Using output from service_account module!
  image                 = "${module.artifact_registry.repository_url}/api:latest"  # ← Using output from artifact_registry module!
}
```

### Key Reading Tips

1. **`var.something`** = Input from tfvars file or variables.tf default
2. **`module.name.output`** = Output from another module
3. **`resource.type.name.attribute`** = Direct resource reference
4. **`depends_on`** = "Wait for this before creating"

### Following Variable Chains

**Question: Where does `service_name` come from?**

1. Look at `environments/dev/main.tf`:
   ```hcl
   module "cloud_run" {
     service_name = var.service_name  # It's a variable
   }
   ```

2. Check `environments/dev/variables.tf`:
   ```hcl
   variable "service_name" {
     description = "Name of the Cloud Run service"
     type        = string
     # No default, so must be provided
   }
   ```

3. Look at `environments/dev/terraform.auto.tfvars`:
   ```hcl
   service_name = "reperoo-api-dev"  # Here's the actual value!
   ```

**Answer: It comes from `terraform.auto.tfvars`**

---

## Execution Flow

### What Happens When You Run `terraform apply`?

**Step 1: Load Configuration**
```
1. Read all *.tf files in current directory (environments/dev/)
2. Read all *.tfvars files (auto.tfvars loaded automatically)
3. Load module files from specified source paths
```

**Step 2: Build Dependency Graph**
```
Terraform analyzes relationships:

artifact_registry (no dependencies)
    ↓
service_account (no dependencies)
    ↓
secrets (depends on: service_account.member)
    ↓
cloud_run (depends on: service_account.email, artifact_registry.url, secrets)
```

**Step 3: Plan Execution**
```
1. artifact_registry: CREATE
2. service_account: CREATE
3. secrets: CREATE (waits for service_account)
4. cloud_run: CREATE (waits for all above)
```

**Step 4: Execute Plan**
```
Terraform makes API calls to Google Cloud:
1. POST /repositories (create Artifact Registry)
2. POST /serviceAccounts (create service account)
3. POST /secrets (create secrets, grant access to SA)
4. POST /services (create Cloud Run service)
```

**Step 5: Save State**
```
Store created resource IDs in terraform.tfstate:
{
  "artifact_registry": "projects/reperoo/locations/europe-west4/repositories/reperoo-api-images",
  "service_account": "reperoo-api-dev-sa@reperoo.iam.gserviceaccount.com",
  ...
}
```

---

## Common Patterns

### Pattern 1: Module Chaining (Passing Outputs)

```hcl
# Create secrets first (no dependencies)
module "secrets" {
  source = "../../modules/secrets"
  secret_configs = { ... }
}

# Create service account and use secrets output
module "service_account" {
  source = "../../modules/service-account"
  account_id = "my-sa"
  secret_ids = module.secrets.secret_ids_list
  #            ↑ This is an OUTPUT from secrets module

  depends_on = [module.secrets]
}

# Use service account outputs in Cloud Run module
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_account_email = module.service_account.email
  #                       ↑ OUTPUT from service_account module
  secrets = {
    DATABASE_URL = "dev-database-url"
    #              ↑ References secret created in secrets module
  }
}
```

### Pattern 2: Dynamic Secret Mapping

```hcl
# In environments/dev/main.tf

# Create secrets with environment prefix
module "secrets" {
  secret_configs = {
    "${var.environment}-database-url" = { description = "DB URL" }
    #  ↑ dev-database-url in dev, prod-database-url in prod
  }
}

# Reference them in Cloud Run
module "cloud_run" {
  secrets = {
    DATABASE_URL = "${var.environment}-database-url"
    #              ↑ Matches the secret name created above
  }
}
```

### Pattern 3: Conditional Resources

```hcl
# Only create public access if allowed
resource "google_cloud_run_service_iam_member" "public_access" {
  count = var.allow_unauthenticated ? 1 : 0
  #       ↑ If true, create 1 instance. If false, create 0 (none)

  role   = "roles/run.invoker"
  member = "allUsers"
}
```

### Pattern 4: For Each Loop

```hcl
# Create multiple IAM bindings
resource "google_project_iam_member" "roles" {
  for_each = toset(var.roles)
  #          ↑ Loop over ["role1", "role2", "role3"]

  role   = each.value  # "role1", then "role2", then "role3"
  member = "serviceAccount:..."
}
```

---

## Complete Example Walkthrough

Let's trace a complete example: **Creating the dev environment**

### 1. You Run the Command

```bash
cd environments/dev
terraform apply
```

### 2. Terraform Loads Variables

**From `terraform.auto.tfvars`:**
```hcl
project_id  = "reperoo"
environment = "dev"
service_name = "reperoo-api-dev"
min_instances = 0
max_instances = 5
cpu = "1"
memory = "512Mi"
```

### 3. Terraform Reads `main.tf`

**First module: Artifact Registry**
```hcl
module "artifact_registry" {
  source        = "../../modules/artifact-registry"
  repository_id = var.artifact_registry_repository_id  # From tfvars: "reperoo-api-images"
  location      = var.region                            # From tfvars: "europe-west4"
}
```

Terraform goes to `modules/artifact-registry/main.tf` and creates:
- Resource: `google_artifact_registry_repository.repository`
- Exposes output: `repository_url = "europe-west4-docker.pkg.dev/reperoo/reperoo-api-images"`

**Second module: Secrets**
```hcl
module "secrets" {
  source = "../../modules/secrets"

  secret_configs = {
    "${var.environment}-database-url" = { description = "..." }
    # Becomes: "dev-database-url"
  }
  # No dependencies - created first
}
```

Terraform goes to `modules/secrets/main.tf` and creates:
- 4 secrets: `dev-database-url`, `dev-supabase-url`, etc.
- Exposes output: `secret_ids_list = ["dev-database-url", "dev-supabase-url", ...]`

**Third module: Service Account**
```hcl
module "service_account" {
  source     = "../../modules/service-account"
  account_id = "${var.service_name}-sa"  # Becomes: "reperoo-api-dev-sa"
  project_id = var.project_id             # "reperoo"

  roles = [
    "roles/logging.logWriter",
    # ...
  ]

  secret_ids = module.secrets.secret_ids_list
  # Uses OUTPUT from secrets: ["dev-database-url", ...]
  # Grants service account access to these secrets

  depends_on = [module.secrets]
}
```

Terraform creates:
- Resource: `google_service_account.service_account`
- IAM bindings giving this service account access to all secrets
- Exposes outputs:
  - `email = "reperoo-api-dev-sa@reperoo.iam.gserviceaccount.com"`
  - `member = "serviceAccount:reperoo-api-dev-sa@reperoo.iam.gserviceaccount.com"`

**Fourth module: Cloud Run**
```hcl
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = var.service_name  # "reperoo-api-dev"
  image                 = "${module.artifact_registry.repository_url}/api:latest"
  # Uses OUTPUT: "europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest"

  service_account_email = module.service_account.email
  # Uses OUTPUT: "reperoo-api-dev-sa@reperoo.iam.gserviceaccount.com"

  secrets = {
    DATABASE_URL = "${var.environment}-database-url"  # "dev-database-url"
  }
}
```

Terraform creates:
- Cloud Run service configured with all the above values

### 4. Terraform Exposes Final Outputs

**From `environments/dev/outputs.tf`:**
```hcl
output "cloud_run_url" {
  value = module.cloud_run.service_url
  # Returns: "https://reperoo-api-dev-abcd1234-ew.a.run.app"
}
```

You can access this with:
```bash
terraform output cloud_run_url
```

---

## Variable Priority Order

Terraform loads variables in this order (later overrides earlier):

1. **Default values** in `variables.tf`:
   ```hcl
   variable "cpu" {
     default = "1"
   }
   ```

2. **Environment variables**:
   ```bash
   export TF_VAR_cpu="2"
   ```

3. **`terraform.tfvars`** (auto-loaded):
   ```hcl
   cpu = "2"
   ```

4. **`terraform.auto.tfvars`** (auto-loaded):
   ```hcl
   cpu = "1"
   ```

5. **`-var` flag**:
   ```bash
   terraform apply -var="cpu=4"
   ```

**In our setup:**
- We use `terraform.auto.tfvars` for committed defaults
- You can create `terraform.tfvars` (gitignored) for local overrides

---

## Reading Tips Summary

### When you see...

| Code | Meaning |
|------|---------|
| `var.something` | Variable input (check variables.tf and tfvars) |
| `module.name.output` | Output from another module (check that module's outputs.tf) |
| `resource.type.name.attr` | Direct resource attribute |
| `"${var.env}-name"` | String interpolation (e.g., "dev-name") |
| `for_each = toset(var.list)` | Loop over a list |
| `count = condition ? 1 : 0` | Conditional creation |
| `depends_on = [module.x]` | Wait for module x first |

### To understand a resource:

1. **Find where it's created**: Search for `resource "google_*"`
2. **Check its inputs**: Look at the attributes being set
3. **Trace variables back**: Follow `var.x` to variables.tf to tfvars
4. **Check outputs**: See what values it exposes in outputs.tf
5. **Find who uses it**: Search for `module.name.output`

### To debug a problem:

1. **Run `terraform plan`**: See what will change and why
2. **Check variable values**: `terraform console`, then type `var.service_name`
3. **View state**: `terraform show`
4. **See dependencies**: `terraform graph | dot -Tpng > graph.png`

---

## Practical Examples

### Example 1: "How do I change the Cloud Run memory?"

**Step 1: Find where memory is set**
```bash
cd environments/dev
grep -r "memory" .
```

**Step 2: Found in `terraform.auto.tfvars`**
```hcl
memory = "512Mi"
```

**Step 3: Change it**
```hcl
memory = "1Gi"
```

**Step 4: Apply**
```bash
terraform plan   # Review changes
terraform apply  # Apply changes
```

### Example 2: "How do I add a new secret?"

**Step 1: Add to secrets module** in `environments/dev/main.tf`:
```hcl
module "secrets" {
  secret_configs = {
    # ... existing secrets ...
    "${var.environment}-new-secret" = {
      description = "My new secret"
    }
  }
}
```

**Step 2: Add to Cloud Run** in same file:
```hcl
module "cloud_run" {
  secrets = {
    # ... existing secrets ...
    NEW_SECRET = "${var.environment}-new-secret"
  }
}
```

**Step 3: Apply and set value**:
```bash
terraform apply
gcloud secrets versions add dev-new-secret --data-file=- <<< "value"
```

### Example 3: "How do I add a new IAM role to the service account?"

**Step 1: Find service account module** in `environments/dev/main.tf`:
```hcl
module "service_account" {
  roles = [
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
    "roles/monitoring.metricWriter",
    # Add here:
    "roles/storage.objectViewer",
  ]
}
```

**Step 2: Apply**:
```bash
terraform apply
```

---

## Glossary

- **Module**: A reusable group of resources (like a function)
- **Resource**: A single cloud component (Cloud Run service, secret, etc.)
- **Variable**: An input parameter
- **Output**: A return value
- **State**: Terraform's record of what exists
- **Provider**: Plugin that talks to cloud APIs (google, aws, etc.)
- **Backend**: Where state is stored (GCS bucket in our case)
- **Root Module**: The top-level directory where you run terraform (environments/dev/)
- **Child Module**: A module called by the root module (our modules/ directory)

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    environments/dev/                         │
│                                                              │
│  terraform.auto.tfvars          variables.tf                │
│  ┌──────────────────┐          ┌───────────────┐           │
│  │ service_name =   │──────────▶│ variable      │           │
│  │ "reperoo-api-dev"│          │ service_name  │           │
│  └──────────────────┘          └───────┬───────┘           │
│                                         │                    │
│                                         ▼                    │
│                              main.tf                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  module "cloud_run" {                              │    │
│  │    source = "../../modules/cloud-run"              │    │
│  │    service_name = var.service_name ◀───────────────┼─┐  │
│  │    service_account_email = module.sa.email         │ │  │
│  │  }                                                  │ │  │
│  │                                                     │ │  │
│  │  module "service_account" {                        │ │  │
│  │    source = "../../modules/service-account"        │ │  │
│  │    account_id = "${var.service_name}-sa"  ◀────────┼─┘  │
│  │  }                                                  │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────────┐
         │  modules/cloud-run/      │
         │                          │
         │  variables.tf            │
         │  ┌────────────────────┐  │
         │  │ variable          │  │
         │  │ service_name {    │  │
         │  │   type = string   │  │
         │  │ }                 │  │
         │  └─────────┬──────────┘  │
         │            │             │
         │            ▼             │
         │  main.tf                │
         │  ┌────────────────────┐  │
         │  │ resource           │  │
         │  │ "...service" {     │  │
         │  │   name = var.      │  │
         │  │   service_name     │  │
         │  │ }                  │  │
         │  └────────┬───────────┘  │
         │           │              │
         │           ▼              │
         │  outputs.tf             │
         │  ┌────────────────────┐  │
         │  │ output             │  │
         │  │ service_url {      │  │
         │  │   value = ...uri   │  │
         │  │ }                  │  │
         │  └────────────────────┘  │
         └──────────────────────────┘
```

---

## Next Steps

Now that you understand the structure:

1. **Read `environments/dev/main.tf`**: Start here to see how modules connect
2. **Pick one module**: Read its main.tf, variables.tf, and outputs.tf
3. **Trace a variable**: Follow `service_name` from tfvars to resource creation
4. **Try a change**: Modify a value in terraform.auto.tfvars and run `terraform plan`
5. **Read the plan output**: Understand what Terraform will change and why

## Additional Resources

- [Terraform Language](https://www.terraform.io/language)
- [Google Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Module Composition](https://www.terraform.io/language/modules/develop/composition)
- Root README: `apps/terraform/README.md`
- Module READMEs: Each `modules/*/README.md`
