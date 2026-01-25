terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Data source to get project number
data "google_project" "project" {
  project_id = var.project_id
}

# Artifact Registry for Docker images (shared across environments)
# Note: This may already exist from dev environment
# If it does, import it: terraform import module.artifact_registry.google_artifact_registry_repository.repository projects/reperoo/locations/europe-west4/repositories/reperoo-api-images
module "artifact_registry" {
  source = "../../modules/artifact-registry"

  repository_id = var.artifact_registry_repository_id
  location      = var.region
  description   = "Docker images for Reperoo API"

  # CI/CD service accounts can push images
  writer_members = var.artifact_registry_writer_members

  labels = {
    environment = "shared"
    app         = "reperoo-api"
  }
}

# Secret Manager secrets (created first, no dependencies)
module "secrets" {
  source = "../../modules/secrets"

  project_id = var.project_id

  secret_configs = {
    "${var.environment}-database-url" = {
      description = "PostgreSQL database connection string for ${var.environment}"
    }
    "${var.environment}-supabase-url" = {
      description = "Supabase project URL for ${var.environment}"
    }
    "${var.environment}-supabase-secret-api-key" = {
      description = "Supabase service role key for ${var.environment}"
    }
    "${var.environment}-supabase-jwt-secret" = {
      description = "Supabase JWT signing secret for ${var.environment}"
    }
  }

  labels = {
    environment = var.environment
    app         = "reperoo-api"
  }
}

# Service account for Cloud Run (grants itself access to secrets)
module "service_account" {
  source = "../../modules/service-account"

  account_id   = "${var.service_name}-sa"
  display_name = "Reperoo API ${title(var.environment)} Service Account"
  description  = "Service account for Reperoo API running in ${var.environment} environment"
  project_id   = var.project_id

  roles = [
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
    "roles/monitoring.metricWriter",
  ]

  # Grant access to all secrets created above
  secret_ids = module.secrets.secret_ids_list

  depends_on = [module.secrets]
}

# Cloud Run service
module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = var.service_name
  region                = var.region
  image                 = "${module.artifact_registry.repository_url}/api:latest"
  service_account_email = module.service_account.email

  min_instances = var.min_instances
  max_instances = var.max_instances
  cpu           = var.cpu
  memory        = var.memory

  # Mount secrets as environment variables
  secrets = {
    DATABASE_URL              = "${var.environment}-database-url"
    SUPABASE_URL              = "${var.environment}-supabase-url"
    SUPABASE_SECRET_API_KEY   = "${var.environment}-supabase-secret-api-key"
    SUPABASE_JWT_SECRET       = "${var.environment}-supabase-jwt-secret"
  }

  # Additional environment variables
  env_vars = {
    ENVIRONMENT = var.environment
    LOG_LEVEL   = var.log_level
  }

  health_check_path     = "/api/v1/health"
  request_timeout       = "300s"
  allow_unauthenticated = var.allow_unauthenticated

  labels = {
    environment = var.environment
    app         = "reperoo-api"
  }
}
