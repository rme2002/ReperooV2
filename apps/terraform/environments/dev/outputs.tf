output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = module.cloud_run.service_url
}

output "cloud_run_service_name" {
  description = "Name of the Cloud Run service"
  value       = module.cloud_run.service_name
}

output "service_account_email" {
  description = "Email of the service account"
  value       = module.service_account.email
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = module.artifact_registry.repository_url
}

output "secret_ids" {
  description = "Map of secret names to IDs"
  value       = module.secrets.secret_ids
}

output "region" {
  description = "Deployment region"
  value       = var.region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# GitHub Actions Workload Identity Federation outputs
output "github_actions_sa_email" {
  description = "Service account email for GitHub Actions"
  value       = var.github_repository != "" ? google_service_account.github_actions[0].email : "Not configured (set github_repository variable)"
}

output "github_actions_workload_identity_provider" {
  description = "Workload Identity Provider ID for GitHub Actions (full resource name)"
  value       = var.github_repository != "" ? google_iam_workload_identity_pool_provider.github[0].name : "Not configured (set github_repository variable)"
}

output "github_actions_project_number" {
  description = "GCP project number (needed for GitHub Actions workflow)"
  value       = data.google_project.project.number
}
