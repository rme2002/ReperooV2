variable "project_id" {
  description = "GCP project ID where secrets will be created"
  type        = string
}

variable "secret_configs" {
  description = "Map of secret configurations (key = secret ID, value = config object)"
  type = map(object({
    description = string
  }))

  validation {
    condition     = alltrue([for k, v in var.secret_configs : can(regex("^[a-zA-Z0-9_-]+$", k))])
    error_message = "Secret IDs must contain only alphanumeric characters, underscores, and hyphens"
  }
}

variable "labels" {
  description = "Additional labels to apply to secrets"
  type        = map(string)
  default     = {}
}
