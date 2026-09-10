-- Prevent new user creation via Google OAuth.
-- Google sign-in is only allowed for existing users who have already
-- linked their Google account (via Account Settings).

CREATE OR REPLACE FUNCTION public.restrict_google_to_existing_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    IF NOT EXISTS (
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

CREATE TRIGGER restrict_google_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_google_to_existing_users();
