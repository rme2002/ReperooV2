variable "repository_id" {
  description = "ID of the Artifact Registry repository"
  type        = string

  validation {
    condition     = can(regex("^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$", var.repository_id))
    error_message = "repository_id must be lowercase, alphanumeric, hyphens allowed, max 63 chars"
  }
}

variable "location" {
  description = "GCP region for the repository"
  type        = string
  default     = "europe-west4"
}

variable "description" {
  description = "Description of the repository"
  type        = string
  default     = "Managed by Terraform"
}

variable "writer_members" {
  description = "IAM members to grant writer permission (can push images)"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for m in var.writer_members : can(regex("^(user:|serviceAccount:|group:)", m))])
    error_message = "Members must be in format: 'serviceAccount:email', 'user:email', or 'group:email'"
  }
}

variable "reader_members" {
  description = "IAM members to grant reader permission (can pull images)"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for m in var.reader_members : can(regex("^(user:|serviceAccount:|group:)", m))])
    error_message = "Members must be in format: 'serviceAccount:email', 'user:email', or 'group:email'"
  }
}

variable "labels" {
  description = "Additional labels to apply to the repository"
  type        = map(string)
  default     = {}
}
