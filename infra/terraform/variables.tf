# ============================================================================
# Naming
# ============================================================================
# No defaults on purpose. This configuration names real Cloudflare and Supabase
# resources, so renaming is destructive: a default would let `terraform plan`
# quietly propose replacing everything. Without one, plan stops and says which
# value is missing.

# Names every resource this configuration creates: the Cloudflare Pages project
# and the Supabase project.
variable "project_name" {
  type        = string
  description = "Name for provisioned resources, e.g. \"example-app\"."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.project_name))
    error_message = "Use lowercase letters, digits and hyphens, starting and ending with a letter or digit."
  }
}

# The apex domain, which must already be a zone in your Cloudflare account.
# The app is served from this domain and from www.<root_domain>.
variable "root_domain" {
  type        = string
  description = "Apex domain, e.g. \"example.com\"."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}$", var.root_domain))
    error_message = "Give a bare domain with no scheme or trailing slash, e.g. \"example.com\"."
  }
}

# ============================================================================
# Cloudflare
# ============================================================================

# Cloudflare API token with:
#   - Cloudflare Pages:Edit
#   - Workers Scripts:Edit
#   - DNS:Edit
# Create at: https://dash.cloudflare.com/profile/api-tokens
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

# Cloudflare Account ID
# Find at: https://dash.cloudflare.com → Account → Overview → Account ID (right sidebar)
variable "cloudflare_account_id" {
  type = string
}

# ============================================================================
# Supabase
# ============================================================================

# Supabase Personal Access Token
# Create at: https://supabase.com/dashboard/account/tokens
variable "supabase_access_token" {
  type      = string
  sensitive = true
}

# Supabase Organization ID
# Find at: https://supabase.com/dashboard/org → Settings → Organization ID
variable "supabase_organization_id" {
  type = string
}

# Supabase database password (set a strong password)
# This is the PostgreSQL superuser password for the project
variable "supabase_db_password" {
  type      = string
  sensitive = true
}

# Supabase project region
# Options: ap-southeast-1, us-east-1, us-west-1, eu-central-1, ap-northeast-1, etc.
# See: https://supabase.com/docs/guides/platform/regions
variable "supabase_region" {
  type    = string
  default = "eu-central-1"
}

# Set to false when your organization hit the free project limit.
# This allows Cloudflare resources to be provisioned without failing on Supabase.
variable "create_supabase_project" {
  type    = bool
  default = false
}
