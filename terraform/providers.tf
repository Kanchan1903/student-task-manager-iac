# ============================================================
# providers.tf
# Configures the Cloudflare Terraform provider.
#
# The API token is passed via a Terraform variable (which is
# set through an environment variable or GitHub Secret) so
# that the token is NEVER hard-coded in source code.
# ============================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
