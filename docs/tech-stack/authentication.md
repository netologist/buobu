# Authentication

## Overview

buobu uses **Supabase Auth** through the official `@supabase/supabase-js` client. Cloud Mode authenticates; Local Mode has no auth at all.

Primary code paths:

- `src/lib/supabase.ts` — the Supabase client, configured once for the whole app
- `src/lib/auth/service.ts` — the app-facing auth service (sign-in, OAuth, sign-out, profile)
- `src/components/auth/AuthProvider.tsx` — boot-time auth resolution, client-side route guard and the expired-session dialog
- `src/lib/supabase-replication.ts` — uses the access token for PostgREST and Realtime

## Client Configuration

`src/lib/supabase.ts` creates a single client:

```typescript
createClient(...cloudCredentials(), {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

- `flowType: 'pkce'` — authorization-code + PKCE, so OAuth returns a `?code=` that the client exchanges for tokens.
- `autoRefreshToken: true` — the client refreshes the access token on its own before expiry. The app does not run its own refresh timer.
- `persistSession: true` — the session survives a page reload.
- `detectSessionInUrl: true` — the client picks up the OAuth redirect itself.

If `NEXT_PUBLIC_SUPABASE_URL` or the publishable key is missing while in Cloud Mode, this module throws at import time with an error naming both remedies. In Local Mode the client is never constructed: `supabase` is a proxy that throws on any access, naming the property path that touched it.

## Session Storage

| Item | Where | Contents |
|------|-------|----------|
| Supabase session | `localStorage`, under the client's own key `sb-<project-ref>-auth-token` | Access token, refresh token, expiry, user |
| Cached user | `localStorage`, key `buobu_user` | `{ id, avatarUrl? }` only — never the email or tokens |
| Last visited section | `localStorage`, key `buobu_last_visited_path` | Path restored after login |

The cached user exists so the app can resolve an identity synchronously on first paint; `getSessionUser()` refreshes it from `supabase.auth.getUser()` and clears it when that returns no user.

`hasPersistedSession()` derives the project ref from `NEXT_PUBLIC_SUPABASE_URL` and checks whether the client's `sb-<project-ref>-auth-token` key is present. It always returns `false` in Local Mode.

## Login Flows

| Flow | Implementation |
|------|----------------|
| Email + password sign-in | `supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })` |
| Registration | `supabase.auth.signUp()` after validating an invite or referral code through RPCs (`validate_campaign_code`, `validate_referral_code`), then `consume_campaign_code` / `use_referral_code` and `apply_campaign_benefit` |
| OAuth | `supabase.auth.signInWithOAuth({ provider })` for `google` and `github`, redirecting back to the app origin |
| Password reset | `supabase.auth.resetPasswordForEmail()` with a redirect to `/auth/reset-password` |
| Password / email change | `supabase.auth.updateUser()` |
| Linked identities | `getUserIdentities()`, `linkIdentity()`, `unlinkIdentity()` |
| Avatar upload | `supabase.storage.from('avatars')` |

Captcha is Cloudflare Turnstile: the auth screens render the widget and pass its token into the calls above.

The boot route `src/app/page.tsx` finishes the OAuth round trip. It surfaces `error_description` from either the query string or the hash on the login page, awaits `supabase.auth.getSession()` when a `?code=` is present so the exchange completes before navigation, and then redirects an authenticated user or renders the landing page.

## Auth Events and Session Expiry

`onAuthStateChange` in `src/lib/auth/service.ts` wraps the client's listener and maps events to:

`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `INITIAL_SESSION`, `SESSION_EXPIRED`

A `SIGNED_OUT` that the app did not initiate becomes **`SESSION_EXPIRED`**: `logout()` sets an `_intentionalSignOut` flag before calling `supabase.auth.signOut()`, so an unexpected sign-out — an expired or revoked session — is distinguishable from a user action.

Expiry reaches the UI along two paths:

1. On boot, `AuthProvider` sets `sessionExpired` when a persisted session existed but no user could be resolved (`hasPersistedSession() && !currentUser`).
2. At runtime, the `SESSION_EXPIRED` event sets the same state.

When set, `AuthProvider` stops replication, closes the database and resets the stores, then shows a blocking dialog that cannot be dismissed by clicking outside or pressing Escape:

- Title: `Login required`
- Body: `Your session has expired. Please sign in again to continue syncing and editing your data.`
- Action: `Go to login`, which clears the flag and navigates to `/auth/login`

Signing out is the other path: `AuthProvider.logout()` stops the user's replication, closes the database, resets the stores, clears the cached user and the last-visited path, then navigates to `/auth/login`.

## Route Protection

Protection is client-side, in `AuthProvider`. There is no `middleware.ts` and no server-side check — a static export has no server to run one.

Public paths are `/`, `/auth/login`, `/auth/register`, `/auth/forgot-password` and `/auth/reset-password`. An unauthenticated user on any other path is redirected to `/auth/login`; an authenticated user on a public path is redirected to their post-login page, with `/auth/reset-password` as the one exception (Cloud Mode only).

## Local Mode

Local Mode has no authentication, and the code paths above are bypassed rather than stubbed out silently:

- No Supabase client exists; touching it throws.
- `getSessionUser()` returns the **Local User** (`{ id: 'local' }`) and caches it, because the database layer requires a user id.
- `onAuthStateChange()` returns a no-op subscription: there is no auth state to change.
- `logout()` returns immediately — there is no account to sign out of.
- `hasPersistedSession()` returns `false`, so the expired-session flow never fires.
- `getLinkedIdentities()` returns an empty list.
- The reset-password route renders nothing, and the route guard redirects the authenticated Local User away from the other auth pages before they can be used.

The Local User is not an account: it has no credentials, cannot sign in and cannot sign out. See [ADR-014: Local Mode](../adr/014-local-mode.md) and the [Glossary](../domain/glossary.md) for the vocabulary.

## References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase JavaScript auth API: https://supabase.com/docs/reference/javascript/auth-api

## Related

- [Backend](./backend.md)
- [Database](./database.md)
