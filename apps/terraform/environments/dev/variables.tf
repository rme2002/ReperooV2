variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "europe-west4"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID for Docker images"
  type        = string
}

variable "artifact_registry_writer_members" {
  description = "IAM members allowed to push images to Artifact Registry"
  type        = list(string)
  default     = []
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 5
}

variable "cpu" {
  description = "Number of CPUs per Cloud Run instance"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory per Cloud Run instance"
  type        = string
  default     = "512Mi"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "allow_unauthenticated" {
  description = "Allow public access to Cloud Run service"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo' (e.g., 'myorg/myrepo')"
  type        = string
  default     = ""
}
