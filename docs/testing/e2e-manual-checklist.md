# Manual E2E Checklist

`e2e/auth/google-oauth.spec.ts` checks what can be checked without a real identity provider: that the Google button renders, that clicking it starts a redirect, and that an error arriving in the URL surfaces a readable message. The round-trip through Google's consent screen is manual. This is that procedure.

Run it against a Cloud Mode deployment whose Supabase project has the Google provider enabled.

## Configuration to confirm first

- Supabase → **Authentication → Providers → Google**: enabled, with a client ID and secret.
- Supabase → **Authentication → URL Configuration**: the origin you are testing is in the redirect allow-list.
- Google Cloud Console → **APIs & Services → Credentials**: the OAuth client's authorized redirect URI is the Supabase callback, `https://<project-ref>.supabase.co/auth/v1/callback` — not your app's origin.

## Checklist

1. Go to `/auth/login`.
   - **Expect:** a "Continue with Google" button.
2. Click it.
   - **Expect:** a redirect away from the app to Google's consent screen.
3. Choose the account that already exists in this Supabase project.
   - **Expect:** the consent screen completes and you are redirected back to the app.
   - **Expect:** you land on `/tasks/kanban-view`, not on the login page.
4. Check the header.
   - **Expect:** the account menu shows the account's identity rather than a generic placeholder.
5. In the Supabase dashboard, open **Authentication → Users**.
   - **Expect:** a user whose identity matches the Google account. No duplicate row was created.
6. Sign out, then repeat step 2 with a Google account that has **never** been seen by this project.
   - **Expect:** a readable error, not a signed-in session. Registration through Google is restricted to existing identities by the `restrict_google_to_existing_users` migration.
7. Still signed out, visit `/?error_description=Database+error+saving+new+user`.
   - **Expect:** a redirect to `/auth/login` carrying a visible error message.
8. Visit `/auth/login?error=Sign-in+failed`.
   - **Expect:** an inline error message on the page.

## When something fails

| Symptom | Look at |
|---|---|
| Redirect returns to the login page with an auth error | Provider disabled, wrong client secret, or the origin is missing from the redirect allow-list. |
| `redirect_uri_mismatch` from Google | The authorized redirect URI in Google Cloud Console is wrong; it must be the Supabase callback. |
| Signed in but no data loads | The project's migrations are not applied. |
| A brand-new Google account signs in successfully | The `restrict_google_to_existing_users` migration is missing. |
| The button is missing on the login page | The build has no Supabase configuration, so it is running in Local Mode. |
