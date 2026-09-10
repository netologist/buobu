# Deployment

`next.config.ts` sets `output: "export"`. `pnpm build` writes a static site to `out/`: HTML, JS, CSS and assets. There is no application server to run and `pnpm start` does not work.

That has consequences beyond hosting:

- `src/app/api/**` route handlers never exist in a deployed artifact. They are a `pnpm dev` convenience. Anything that must run server-side in production belongs in a Worker or in Supabase.
- `NEXT_PUBLIC_*` values are inlined during the build, so a built artifact cannot be reconfigured. Supplying environment variables to an existing `out/` has no effect.
- Every route is prerendered, so anything that reads the URL must do so on the client.

## Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

A Cloud Mode build needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing either stops the build with an error naming both remedies — the build does **not** fall back to Local Mode.

Never set `NEXT_PUBLIC_LOCAL_MODE` in a deploy environment. A stray `true` would ship a local-only app, which is exactly the failure the flag exists to prevent.

Optional at build time: `NEXT_PUBLIC_MCP_URL`, `NEXT_PUBLIC_REFERRAL_API_URL`, `NEXT_PUBLIC_BILLING_ENABLED`, `NEXT_PUBLIC_INVITE_CODES_ENABLED`, `NEXT_PUBLIC_HOME_PAGE_ENABLED`, `NEXT_PUBLIC_STORAGE_INDICATOR_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_BUILD_VERSION`, `NEXT_PUBLIC_BUILD_TIME`, and the two `NEXT_PUBLIC_STRIPE_PRICE_*` values. See [`.env.example`](../../.env.example).

## Host it

`out/` is a plain static site: any host works — Cloudflare Pages, Netlify, S3 behind a CDN, nginx, a local `npx serve out`.

Three things to get right:

1. **SPA fallback is not needed and not wanted.** The export contains a real HTML file per route; a host that rewrites everything to `index.html` breaks deep links.
2. **Serve the security headers.** [`public/_headers`](../../public/_headers) carries CSP and companion headers for hosts that read that file (Cloudflare Pages, Netlify). Elsewhere, configure the equivalents.
3. **`/api/*` is not part of the artifact.** Checkout, portal and webhook routes must be hosted elsewhere if you use billing — see [billing.md](./billing.md).

## GitHub Actions

Two things live here: a pipeline that runs, and recipes that do not.

**`ci.yml` runs.** On every pull request and every push to `main` it typechecks, lints, runs `pnpm test:run`, and builds both modes — Local Mode, which is what a fresh clone runs, and Cloud Mode with placeholder Supabase values, which proves the other code path compiles. It holds no secrets and needs none, so it behaves the same way on a fork as it does here.

**The other three are templates.** They carry a `.disabled` extension:

| File | What it does when armed |
|---|---|
| `deploy.yml.disabled` | build → publish `out/` to a static host → optionally deploy both Workers |
| `infra.yml.disabled` | Terraform plan on pull requests, apply on a push to `main` |
| `e2e.yml.disabled` | the Playwright suite against a real Supabase project, on demand |

GitHub only runs workflow files whose name ends in `.yml` or `.yaml`, so none of them trigger. Each file's opening comment says what to replace — `example-app` for the hosting project, `example.com` for the domain — and which secrets and variables to add. There is no staging or production split: one environment, one deployment.

They stay disabled because they cannot be made generic. A deploy needs an account, credentials and a project to point at, and arming one writes to somebody's Cloudflare and Supabase accounts. Treat arming one as adopting a deployment, not as switching on a neutral pipeline.

One thing the templates do not cover: [`main.tf`](../../infra/terraform/main.tf) still names a Terraform Cloud organization and workspace prefix in its `backend` block, which cannot read variables. Edit that block, or move it to a partial backend configuration, before applying. Everything else — the Pages project, the Supabase project, the domains — comes from `project_name` and `root_domain`.

## Terraform (optional)

[`infra/terraform`](../../infra/terraform) provisions the Cloudflare zone's DNS records and Pages project, and optionally the Supabase project itself. Worker custom domains are deliberately **not** managed here: they are attached in the Cloudflare dashboard, so that neither Terraform nor wrangler has to own that binding.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
# fill it in — terraform.tfvars is gitignored
cd infra/terraform && terraform init && terraform plan && terraform apply
```

Two variables are **required and have no defaults**:

| Variable | Names |
|---|---|
| `project_name` | the Cloudflare Pages project, and the Supabase project if one is created |
| `root_domain` | the apex domain — the app is served from it and from `www.<root_domain>`. It must already be a zone in your Cloudflare account |

They have no defaults on purpose. They name real resources, so a wrong default would let `plan` quietly propose replacing your infrastructure; without them, plan stops and says which value is missing.

This configuration is single-environment, and its resource addresses assume it. If you applied an earlier revision that had a staging/production split, addresses have changed since: `plan` will read that as a rename, and `prevent_destroy` turns it into a hard error rather than an outage. Move the state explicitly with `terraform state mv` before applying, or start from a clean workspace. New deployments have nothing to migrate.

One thing those variables cannot cover: a `backend` block may not read variables, so the Terraform Cloud organization and workspace prefix in [`main.tf`](../../infra/terraform/main.tf) are literals. Edit them for your account, or move them out of the repository with a partial configuration (`terraform init -backend-config=backend.hcl`) and keep the values in a gitignored file.

`scripts/setup-cloudflare.sh` wraps the same flow (`infra`, `secrets`, `worker`, `migrate`, `all`, `status`) and also pushes secrets to GitHub and to the Workers. It expects `terraform`, `wrangler`, `gh`, `curl` and `jq`, and an authenticated `wrangler` and `gh`. It takes the apex domain from `ROOT_DOMAIN`, so point it at your own:

```bash
ROOT_DOMAIN=example.com ./scripts/setup-cloudflare.sh status
```
