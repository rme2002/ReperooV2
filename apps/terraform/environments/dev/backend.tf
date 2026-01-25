terraform {
  backend "gcs" {
    bucket = "reperoo-terraform-state-dev"
    prefix = "terraform/state"
  }
}
