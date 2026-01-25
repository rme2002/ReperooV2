# GitHub Actions CI/CD with Workload Identity Federation
# This file configures secure authentication for GitHub Actions to push Docker images
#
# To enable: Set github_repository variable in terraform.auto.tfvars
# Example: github_repository = "myorg/myrepo"

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github_actions" {
  count = var.github_repository != "" ? 1 : 0

  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions CI/CD"
  disabled                  = false
}

# Workload Identity Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  count = var.github_repository != "" ? 1 : 0

  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.aud"        = "assertion.aud"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service Account for GitHub Actions
resource "google_service_account" "github_actions" {
  count = var.github_repository != "" ? 1 : 0

  account_id   = "github-actions-ci"
  display_name = "GitHub Actions CI/CD"
  description  = "Service account for GitHub Actions to push images and deploy"
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_actions_workload_identity" {
  count = var.github_repository != "" ? 1 : 0

  service_account_id = google_service_account.github_actions[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions[0].name}/attribute.repository/${var.github_repository}"
}

# Grant Artifact Registry Writer permission
resource "google_project_iam_member" "github_actions_artifact_registry" {
  count = var.github_repository != "" ? 1 : 0

  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}

# Grant Cloud Run Developer permission (for deployments)
resource "google_project_iam_member" "github_actions_cloud_run" {
  count = var.github_repository != "" ? 1 : 0

  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}

# Grant Service Account User permission (to deploy as other service accounts)
resource "google_project_iam_member" "github_actions_sa_user" {
  count = var.github_repository != "" ? 1 : 0

  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}
