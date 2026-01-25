terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Create Secret Manager secrets
resource "google_secret_manager_secret" "secrets" {
  for_each = var.secret_configs

  secret_id = each.key
  project   = var.project_id

  labels = merge(
    var.labels,
    {
      managed-by = "terraform"
    }
  )

  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Note: Secret versions are NOT managed by Terraform
# This allows you to update secret values freely without Terraform interference
# Create secret versions using:
#   gcloud secrets versions add SECRET_NAME --data-file=-
# Or through the Google Cloud Console

# Note: IAM bindings for secret access are managed by the service-account module
# This avoids circular dependency issues with module outputs
