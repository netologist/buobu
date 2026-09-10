-- When a user changes their email, automatically delete any Google identity
-- in auth.identities that matches the OLD email address.
-- This prevents the old Google account from being used to sign in after
-- the user has changed their registered email.

CREATE OR REPLACE FUNCTION public.cleanup_google_identity_on_email_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    DELETE FROM auth.identities
    WHERE user_id = NEW.id
      AND provider = 'google'
      AND identity_data->>'email' = OLD.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cleanup_google_identity_on_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_google_identity_on_email_change();
