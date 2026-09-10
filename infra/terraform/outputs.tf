output "app_url" {
  description = "App URL"
  value       = "https://${var.root_domain}"
}

output "mcp_url" {
  description = "MCP Worker URL"
  value       = "https://mcp.${var.root_domain}"
}

output "referral_url" {
  description = "Referral Worker URL"
  value       = "https://referral.${var.root_domain}"
}

output "pages_project_name" {
  description = "Cloudflare Pages project name — pass to `wrangler pages deploy`"
  value       = cloudflare_pages_project.app.name
}

output "pages_dev_url" {
  description = "Cloudflare Pages *.pages.dev URL"
  value       = "https://${cloudflare_pages_project.app.subdomain}.pages.dev"
}

output "supabase_project_id" {
  description = "Supabase project reference ID (use in SUPABASE_PROJECT_REF)"
  value       = var.create_supabase_project ? supabase_project.app[0].id : null
}

output "supabase_api_url" {
  description = "Supabase API URL (use in NEXT_PUBLIC_SUPABASE_URL)"
  value       = var.create_supabase_project ? "https://${supabase_project.app[0].id}.supabase.co" : null
}

output "supabase_db_url" {
  description = "Supabase direct database connection URL"
  value       = var.create_supabase_project ? "postgresql://postgres.${supabase_project.app[0].id}:<DB_PASSWORD>@aws-0-${var.supabase_region}.pooler.supabase.com:6543/postgres" : null
  sensitive   = false
}

output "next_steps" {
  description = "Actions required after terraform apply"
  value       = <<-EOT
    ============================================================
    Next steps after `terraform apply`
    ============================================================

     1. SUPABASE KEYS  (only when create_supabase_project = true)
        https://supabase.com/dashboard/project/${var.create_supabase_project ? supabase_project.app[0].id : "<existing-project-ref>"}/settings/api

          publishable key  -> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          service_role key -> SUPABASE_SERVICE_ROLE_KEY  (server and Workers only)

     2. APP CONFIGURATION
        NEXT_PUBLIC_SUPABASE_URL=https://${var.create_supabase_project ? supabase_project.app[0].id : "<existing-project-ref>"}.supabase.co
        See .env.example for the rest.

     3. DEPLOY THE WORKERS  (they must exist before their domains resolve)
        pnpm deploy:mcp -- --env production
        pnpm deploy:referral -- --env production

     4. APPLY THE DATABASE MIGRATIONS
        pnpm exec supabase db push --project-ref ${var.create_supabase_project ? supabase_project.app[0].id : "<existing-project-ref>"}
        See docs/setup/supabase.md.

     5. PUBLISH THE APP
        pnpm build
        pnpm exec wrangler pages deploy out --project-name=${var.project_name}
        Or arm .github/workflows/deploy.yml.disabled to do it from CI.
    ============================================================
  EOT
}
