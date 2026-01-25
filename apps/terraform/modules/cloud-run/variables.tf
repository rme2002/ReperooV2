variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,61}[a-z0-9]$", var.service_name))
    error_message = "Service name must be lowercase, alphanumeric, hyphens allowed, max 63 chars"
  }
}

variable "region" {
  description = "GCP region for the Cloud Run service"
  type        = string
  default     = "europe-west4"
}

variable "image" {
  description = "Docker image to deploy (full path including registry)"
  type        = string
}


variable "service_account_email" {
  description = "Email of the service account to run the service as"
  type        = string
}

variable "container_port" {
  description = "Port that the container listens on"
  type        = number
  default     = 8080
}

variable "min_instances" {
  description = "Minimum number of instances (0 for scale-to-zero)"
  type        = number
  default     = 0

  validation {
    condition     = var.min_instances >= 0 && var.min_instances <= 100
    error_message = "min_instances must be between 0 and 100"
  }
}

variable "max_instances" {
  description = "Maximum number of instances for auto-scaling"
  type        = number
  default     = 5

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 1000
    error_message = "max_instances must be between 1 and 1000"
  }
}

variable "cpu" {
  description = "Number of CPUs allocated to each instance (e.g., '1', '2', '4')"
  type        = string
  default     = "1"

  validation {
    condition     = contains(["1", "2", "4", "6", "8"], var.cpu)
    error_message = "cpu must be one of: 1, 2, 4, 6, 8"
  }
}

variable "memory" {
  description = "Memory allocated to each instance (e.g., '512Mi', '1Gi', '2Gi')"
  type        = string
  default     = "512Mi"

  validation {
    condition     = can(regex("^[0-9]+(Mi|Gi)$", var.memory))
    error_message = "memory must be in format like '512Mi' or '1Gi'"
  }
}

variable "env_vars" {
  description = "Environment variables as key-value pairs"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret Manager secrets to mount as environment variables (key = env var name, value = secret name)"
  type        = map(string)
  default     = {}
}

variable "health_check_path" {
  description = "HTTP path for health checks"
  type        = string
  default     = "/health"
}

variable "request_timeout" {
  description = "Maximum time a request can take (in seconds)"
  type        = string
  default     = "300s"

  validation {
    condition     = can(regex("^[0-9]+s$", var.request_timeout))
    error_message = "request_timeout must be in format like '300s'"
  }
}

variable "allow_unauthenticated" {
  description = "Allow public access without authentication"
  type        = bool
  default     = false
}

variable "vpc_connector_name" {
  description = "Name of VPC connector for private network access (optional)"
  type        = string
  default     = null
}

variable "vpc_egress" {
  description = "VPC egress setting (PRIVATE_RANGES_ONLY or ALL_TRAFFIC)"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"

  validation {
    condition     = contains(["PRIVATE_RANGES_ONLY", "ALL_TRAFFIC"], var.vpc_egress)
    error_message = "vpc_egress must be PRIVATE_RANGES_ONLY or ALL_TRAFFIC"
  }
}

variable "labels" {
  description = "Additional labels to apply to the service"
  type        = map(string)
  default     = {}
}
