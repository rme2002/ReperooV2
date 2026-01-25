variable "account_id" {
  description = "The account ID for the service account (must be unique within project)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.account_id))
    error_message = "account_id must be 6-30 chars, lowercase, alphanumeric, hyphens allowed"
  }
}

variable "display_name" {
  description = "Human-readable display name for the service account"
  type        = string
}

variable "description" {
  description = "Description of what this service account is used for"
  type        = string
  default     = "Managed by Terraform"
}

variable "project_id" {
  description = "GCP project ID where the service account will be created"
  type        = string
}

variable "roles" {
  description = "List of project-level IAM roles to grant to the service account"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for role in var.roles : can(regex("^roles/", role))])
    error_message = "All roles must start with 'roles/'"
  }
}

variable "secret_ids" {
  description = "List of Secret Manager secret IDs to grant accessor permission"
  type        = list(string)
  default     = []
}
