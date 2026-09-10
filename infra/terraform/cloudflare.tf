# ============================================================================
# Zone — the apex domain must already be in your Cloudflare account
# Cloudflare Dashboard → Add a domain
# ============================================================================
data "cloudflare_zone" "app" {
  name = var.root_domain
}

# ============================================================================
# Cloudflare Pages — the static export
# ============================================================================
# Terraform manages the project container only. Publishing is `wrangler pages
# deploy`, run by CI or by hand — see .github/workflows/deploy.yml.disabled.
resource "cloudflare_pages_project" "app" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "main"

  lifecycle {
    # The Pages project holds the deployed site; losing it means an outage.
    prevent_destroy = true
  }
}

# ============================================================================
# DNS and custom domains
# ============================================================================

# Apex: the root domain serves the Pages project.
resource "cloudflare_record" "apex" {
  zone_id = data.cloudflare_zone.app.id
  name    = var.root_domain
  type    = "CNAME"
  content = "${cloudflare_pages_project.app.subdomain}.pages.dev"
  ttl     = 1 # 1 = automatic, required when proxied
  proxied = true
}

resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.app.name
  domain       = var.root_domain
}

# www: the same project under the www host.
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.app.id
  name    = "www"
  type    = "CNAME"
  content = "${cloudflare_pages_project.app.subdomain}.pages.dev"
  ttl     = 1
  proxied = true
}

resource "cloudflare_pages_domain" "www" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.app.name
  domain       = "www.${var.root_domain}"
}

# ============================================================================
# Worker custom domains
# ============================================================================
# Not managed here. The Workers are deployed by wrangler, and their custom
# domains are declared in workers/*/wrangler.jsonc, so Terraform would fight
# with wrangler over the same binding. It also cannot create the binding before
# the Worker exists.
#
# To attach a domain, either set `routes` in the Worker's wrangler.jsonc, or add
# it by hand: Cloudflare Dashboard → Workers & Pages → <worker> → Settings →
# Domains & Routes.
