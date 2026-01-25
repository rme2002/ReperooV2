terraform {
  backend "gcs" {
    bucket = "reperoo-terraform-state-prod"
    prefix = "terraform/state"
  }
}
