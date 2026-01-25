output "repository_id" {
  description = "ID of the Artifact Registry repository"
  value       = google_artifact_registry_repository.repository.repository_id
}

output "repository_url" {
  description = "URL for pushing/pulling images (format: LOCATION-docker.pkg.dev/PROJECT/REPOSITORY)"
  value       = "${google_artifact_registry_repository.repository.location}-docker.pkg.dev/${google_artifact_registry_repository.repository.project}/${google_artifact_registry_repository.repository.repository_id}"
}

output "repository_name" {
  description = "Fully-qualified repository name"
  value       = google_artifact_registry_repository.repository.name
}

output "repository_location" {
  description = "Location of the repository"
  value       = google_artifact_registry_repository.repository.location
}
