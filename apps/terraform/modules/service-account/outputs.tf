output "email" {
  description = "Email address of the service account"
  value       = google_service_account.service_account.email
}

output "member" {
  description = "IAM member string for use in IAM bindings"
  value       = "serviceAccount:${google_service_account.service_account.email}"
}

output "account_id" {
  description = "The account ID of the service account"
  value       = google_service_account.service_account.account_id
}

output "name" {
  description = "The fully-qualified name of the service account"
  value       = google_service_account.service_account.name
}

output "unique_id" {
  description = "The unique ID of the service account"
  value       = google_service_account.service_account.unique_id
}
