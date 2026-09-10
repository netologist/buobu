-- Fix: Allow Google sign-in when the Google account is already linked
-- as an identity to an existing user (even if the emails differ).
-- Previously, only same-email matches in auth.users were allowed,
-- blocking linked accounts with a different email (e.g. ali@gmail.com
-- account with veli@gmail.com Google identity linked).

CREATE OR REPLACE FUNCTION public.restrict_google_to_existing_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    -- Allow if the Google email is already a linked identity (veli@gmail.com case),
    -- OR if the email belongs to a registered user (new email after email change case).
    -- Completely unknown Google accounts are blocked.
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE provider = 'google'
        AND identity_data->>'email' = NEW.email
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE email = NEW.email
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Google sign-in is only available for existing accounts. Please register with an invite code first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
