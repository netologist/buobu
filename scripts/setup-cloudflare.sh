#!/usr/bin/env bash
#
# Infrastructure Setup Script
# Manages Cloudflare (Pages + Workers) and Supabase via Terraform,
# then pushes runtime secrets to GitHub Actions and Cloudflare Workers.
#
# Usage:
#   ./scripts/setup-cloudflare.sh [command]
#
# Commands:
#   infra     — terraform init + plan + apply (Cloudflare DNS, Pages, Worker domain, Supabase)
#   secrets   — push all secrets to GitHub Actions + Cloudflare Worker
#   worker    — deploy MCP Worker (production) via wrangler
#   migrate   — run Supabase migrations against production project
#   all       — run infra → worker → secrets → migrate in order
#   status    — print current deployment URLs and Terraform state summary
#   (none)    — interactive menu
#

set -euo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$ROOT_DIR/infra/terraform"
WORKER_DIR="$ROOT_DIR/workers/mcp"

# ─── Domains ──────────────────────────────────────────────────────────────────
# The apex domain this deployment lives on. Nothing else is hardcoded — set it
# to your own, or export it for a single run:
#   ROOT_DOMAIN=example.com ./scripts/setup-cloudflare.sh status
ROOT_DOMAIN="${ROOT_DOMAIN:-example.com}"
APP_URL="https://${ROOT_DOMAIN}"
MCP_URL="https://mcp.${ROOT_DOMAIN}"
REFERRAL_URL="https://referral.${ROOT_DOMAIN}"

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}▸ $*${NC}"; }
success() { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
error()   { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${NC}\n"; }
prompt()  { echo -en "${YELLOW}$* ${NC}"; }

read_secret() {
  local var_name="$1"
  local prompt_text="$2"
  echo -en "${YELLOW}${prompt_text}: ${NC}"
  read -rs value
  echo ""
  printf -v "$var_name" '%s' "$value"
}

# ─── Dependency Checks ────────────────────────────────────────────────────────
check_deps() {
  header "Checking Dependencies"
  local missing=()

  for cmd in terraform wrangler gh curl jq; do
    if command -v "$cmd" &>/dev/null; then
      success "$cmd $(${cmd} --version 2>&1 | head -1)"
    else
      warn "$cmd not found"
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo ""
    warn "Missing tools. Install with:"
    for tool in "${missing[@]}"; do
      case "$tool" in
        terraform) echo "  brew install terraform" ;;
        wrangler)  echo "  pnpm install (already in package.json)" ;;
        gh)        echo "  brew install gh && gh auth login" ;;
        curl)      echo "  brew install curl" ;;
        jq)        echo "  brew install jq" ;;
      esac
    done
    error "Please install missing tools and retry."
  fi
}

# ─── Auth Checks ──────────────────────────────────────────────────────────────
check_auth() {
  header "Checking Authentication"

  # Cloudflare via wrangler
  if pnpm exec wrangler whoami &>/dev/null 2>&1; then
    CF_USER=$(pnpm exec wrangler whoami 2>/dev/null | grep -E "account|You are" | head -1 || true)
    success "Cloudflare: logged in ($CF_USER)"
  else
    warn "Cloudflare: not authenticated"
    info "Running: pnpm exec wrangler login"
    pnpm exec wrangler login
  fi

  # GitHub CLI
  if gh auth status &>/dev/null 2>&1; then
    GH_USER=$(gh api user --jq .login 2>/dev/null || echo "unknown")
    success "GitHub: logged in as $GH_USER"
  else
    warn "GitHub: not authenticated"
    info "Running: gh auth login"
    gh auth login
  fi
}

# ─── Terraform Infrastructure ─────────────────────────────────────────────────
cmd_infra() {
  header "Terraform Infrastructure (Cloudflare + Supabase)"

  if [[ ! -f "$INFRA_DIR/terraform.tfvars" ]]; then
    warn "terraform.tfvars not found."
    echo ""
    echo "  Copy the example and fill in your values:"
    echo "  cp $INFRA_DIR/terraform.tfvars.example $INFRA_DIR/terraform.tfvars"
    echo "  edit $INFRA_DIR/terraform.tfvars"
    echo ""
    prompt "Open terraform.tfvars.example now? [y/N]"
    read -r ans
    if [[ "${ans,,}" == "y" ]]; then
      "${EDITOR:-nano}" "$INFRA_DIR/terraform.tfvars.example"
    fi
    error "Create terraform.tfvars first, then re-run this command."
  fi

  cd "$INFRA_DIR"

  info "terraform init"
  terraform init -upgrade

  info "terraform validate"
  terraform validate

  info "terraform plan"
  terraform plan -out=tfplan

  echo ""
  prompt "Apply this plan? [y/N]"
  read -r ans
  if [[ "${ans,,}" != "y" ]]; then
    warn "Apply cancelled. Plan saved to $INFRA_DIR/tfplan"
    return
  fi

  info "terraform apply"
  terraform apply tfplan

  echo ""
  success "Infrastructure apply complete."
  terraform output
}

# ─── Deploy MCP Worker ────────────────────────────────────────────────────────
cmd_worker() {
  header "Deploy MCP Worker (production)"

  info "Deploying the MCP Worker (env: production)..."

  # Collect secrets for the Worker
  echo ""
  echo "Worker secrets needed for deployment:"

  read_secret SUPA_URL   "  NEXT_PUBLIC_SUPABASE_URL  (e.g. https://xxx.supabase.co)"
  read_secret SUPA_KEY   "  SUPABASE_SERVICE_ROLE_KEY (service_role key from Supabase > API)"

  SECRETS_FILE="$WORKER_DIR/secrets.json"
  printf '%s' "{\"NEXT_PUBLIC_SUPABASE_URL\":\"$SUPA_URL\",\"SUPABASE_SERVICE_ROLE_KEY\":\"$SUPA_KEY\"}" \
    > "$SECRETS_FILE"

  pnpm exec wrangler deploy \
    --config "$WORKER_DIR/wrangler.jsonc" \
    --env production \
    --secrets-file "$SECRETS_FILE"

  rm -f "$SECRETS_FILE"
  success "Worker deployed: $MCP_URL"
  echo "  (custom domain becomes active after terraform apply binds it)"
}

# ─── Push Secrets to GitHub Actions ──────────────────────────────────────────
cmd_secrets() {
  header "Push Secrets to GitHub Actions"

  # Detect GitHub repo
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
  if [[ -z "$REPO" ]]; then
    error "Not inside a GitHub repository. Run from the project root."
  fi
  info "Repository: $REPO"

  echo ""
  echo "Enter the following values (input is hidden):"

  read_secret SUPA_URL       "  NEXT_PUBLIC_SUPABASE_URL     (https://xxx.supabase.co)"
  read_secret SUPA_ANON      "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  read_secret SUPA_SERVICE   "  SUPABASE_SERVICE_ROLE_KEY"
  read_secret CF_TOKEN       "  CLOUDFLARE_API_TOKEN"
  read_secret CF_ACCOUNT     "  CLOUDFLARE_ACCOUNT_ID"
  read_secret COMMENT_TOKEN  "  COMMENT_PAT (GitHub PAT for PR comments, press Enter to skip)"

  echo ""
  info "Setting GitHub organization variables..."

  gh variable set NEXT_PUBLIC_SUPABASE_URL --body "$SUPA_URL"       --repo "$REPO"
  gh variable set NEXT_PUBLIC_MCP_URL --body "$MCP_URL" --repo "$REPO"
  gh variable set NEXT_PUBLIC_REFERRAL_API_URL --body "$REFERRAL_URL" --repo "$REPO"

  info "Setting GitHub repository secrets..."

  echo "$SUPA_ANON"    | gh secret set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --repo "$REPO"
  echo "$SUPA_SERVICE" | gh secret set SUPABASE_SERVICE_ROLE_KEY      --repo "$REPO"
  echo "$CF_TOKEN"     | gh secret set CLOUDFLARE_API_TOKEN            --repo "$REPO"
  echo "$CF_ACCOUNT"   | gh secret set CLOUDFLARE_ACCOUNT_ID           --repo "$REPO"

  if [[ -n "$COMMENT_TOKEN" ]]; then
    echo "$COMMENT_TOKEN" | gh secret set COMMENT_PAT --repo "$REPO"
    success "COMMENT_PAT set"
  else
    warn "COMMENT_PAT skipped (PR comments in Actions won't work)"
  fi

  echo ""
  success "All secrets and variables pushed to GitHub."
  echo ""
  info "Verify at: https://github.com/$REPO/settings/secrets/actions"
}

# ─── Supabase Migrations ──────────────────────────────────────────────────────
cmd_migrate() {
  header "Supabase Migrations"

  if ! command -v supabase &>/dev/null; then
    warn "Supabase CLI not found. Install with: brew install supabase/tap/supabase"
    error "Install Supabase CLI first."
  fi

  prompt "Supabase project ref (from dashboard or terraform output supabase_project_id): "
  read -r PROJECT_REF

  if [[ -z "$PROJECT_REF" ]]; then
    error "Project ref is required."
  fi

  info "Linking to project: $PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF"

  info "Pushing migrations..."
  supabase db push

  success "Migrations applied to project $PROJECT_REF"
}

# ─── Status ───────────────────────────────────────────────────────────────────
cmd_status() {
  header "Deployment Status"

  echo "URLs:"
  echo "  App          : $APP_URL"
  echo "  MCP Worker   : $MCP_URL"
  echo "  Referral API : $REFERRAL_URL"
  echo ""

  # Check if Cloudflare Worker responds
  info "Checking MCP Worker health..."
  if curl -sf "${MCP_URL}/health" &>/dev/null; then
    success "${MCP_URL}/health → OK"
  else
    warn "${MCP_URL}/health → not reachable (may not be deployed yet)"
  fi

  # Check Pages
  info "Checking app..."
  HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    success "${ROOT_DOMAIN} → 200 OK"
  else
    warn "${ROOT_DOMAIN} → HTTP $HTTP_STATUS (may not be deployed yet)"
  fi

  echo ""
  if [[ -d "$INFRA_DIR/.terraform" ]]; then
    info "Terraform state summary:"
    (cd "$INFRA_DIR" && terraform show -json 2>/dev/null | jq -r '.values.root_module.resources[].address' 2>/dev/null || true)
  else
    warn "Terraform not initialized. Run: $0 infra"
  fi
}

# ─── All: infra → worker → secrets → migrate ─────────────────────────────────
cmd_all() {
  cmd_infra
  cmd_worker
  cmd_secrets
  cmd_migrate

  header "Setup Complete"
  echo ""
  echo "  App        : $APP_URL"
  echo "  MCP Worker : $MCP_URL"
  echo ""
  echo "  Push to main for CI, or arm .github/workflows/deploy.yml.disabled to deploy from GitHub Actions."
}

# ─── Interactive Menu ─────────────────────────────────────────────────────────
menu() {
  echo ""
  echo -e "${BOLD}${BLUE}╔══════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║   Infrastructure Setup           ║${NC}"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════╝${NC}"
  echo ""
  echo "  1) Full setup (infra + worker + secrets + migrate)"
  echo "  2) Terraform — apply Cloudflare + Supabase infrastructure"
  echo "  3) Deploy MCP Worker to production"
  echo "  4) Push secrets to GitHub Actions"
  echo "  5) Run Supabase migrations"
  echo "  6) Status check"
  echo "  7) Exit"
  echo ""
  prompt "Select [1-7]:"
  read -r CHOICE

  case "$CHOICE" in
    1) check_deps; check_auth; cmd_all ;;
    2) check_deps; check_auth; cmd_infra ;;
    3) check_deps; cmd_worker ;;
    4) check_deps; cmd_secrets ;;
    5) cmd_migrate ;;
    6) cmd_status ;;
    7) exit 0 ;;
    *) error "Invalid choice: $CHOICE" ;;
  esac
}

# ─── Entry Point ──────────────────────────────────────────────────────────────
cd "$ROOT_DIR"

case "${1:-}" in
  infra)   check_deps; check_auth; cmd_infra ;;
  secrets) check_deps; cmd_secrets ;;
  worker)  check_deps; cmd_worker ;;
  migrate) cmd_migrate ;;
  all)     check_deps; check_auth; cmd_all ;;
  status)  cmd_status ;;
  "")      check_deps; menu ;;
  *)       error "Unknown command: $1\nUsage: $0 [infra|secrets|worker|migrate|all|status]" ;;
esac
