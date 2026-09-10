terraform {
  required_version = ">= 1.6"

  # Terraform Cloud backend used for remote state + locking only.
  # Plan/apply execution runs locally (the GitHub Actions runner) by default.
  #
  # The organization and workspace prefix below must be edited for a fork: they
  # decide where state lives, and Terraform cannot read variables here, so this
  # is the one part of the configuration that naming variables cannot cover.
  # `TF_WORKSPACE` selects <prefix><TF_WORKSPACE>, so a prefix of "example-" with
  # TF_WORKSPACE=app reads and writes the workspace "example-app".
  #
  # To keep these values out of the repository entirely, use a partial
  # configuration instead: delete the two lines, add
  #
  #   terraform init -backend-config=backend.hcl
  #
  # and keep the values in a gitignored backend.hcl.
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "buobu"
    workspaces {
      prefix = "buobu-"
    }
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Optional: store state in Terraform Cloud or S3
  # backend "s3" {
  #   bucket = "your-terraform-state"
  #   key    = "cloudflare/terraform.tfstate"
  #   region = "eu-central-1"
  # }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}
