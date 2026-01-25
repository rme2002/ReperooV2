output "secret_ids" {
  description = "Map of secret names to their IDs"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.secret_id }
}

output "secret_names" {
  description = "Map of secret names to their fully-qualified names"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.name }
}

output "secret_ids_list" {
  description = "List of secret IDs (for use in service account module)"
  value       = [for k, v in google_secret_manager_secret.secrets : v.secret_id]
}
