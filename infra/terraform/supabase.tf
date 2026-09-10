# ============================================================================
# Supabase Project
# ============================================================================
# Only created when `create_supabase_project = true`. If you already have a
# project, leave that false and supply its keys to the app instead — see
# docs/setup/supabase.md.
#
# Creation takes a minute or two. Afterwards, retrieve the keys from:
#   https://supabase.com/dashboard/project/<id>/settings/api
# ============================================================================

resource "supabase_project" "app" {
  count             = var.create_supabase_project ? 1 : 0
  name              = var.project_name
  organization_id   = var.supabase_organization_id
  database_password = var.supabase_db_password
  region            = var.supabase_region

  lifecycle {
    # Prevent accidental deletion of the database.
    # To destroy: first run `terraform state rm supabase_project.app`
    prevent_destroy = true
  }
}
