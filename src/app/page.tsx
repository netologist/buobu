"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPostLoginPath } from "@/lib/navigation/post-login-path";
import { LOCAL_MODE } from "@/lib/feature-flags";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    async function redirect() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
      );

      // Check for OAuth errors (query params with PKCE, hash with implicit)
      const errorDescription =
        searchParams.get("error_description") ?? hashParams.get("error_description");

      if (errorDescription) {
        const friendly = errorDescription
          .toLowerCase()
          .includes("database error saving new user")
          ? "Sign-in failed. If you have an account, please sign in with your email and password."
          : errorDescription;
        router.replace(`/auth/login?error=${encodeURIComponent(friendly)}`);
        return;
      }

      // Local Mode is always the Local User. There is no OAuth code to exchange and
      // no Supabase client to ask.
      if (LOCAL_MODE) {
        router.replace(getPostLoginPath(isMobile));
        return;
      }

      // If a PKCE code is present, wait for the official client to exchange it
      // for tokens before navigating away (getSession awaits the exchange).
      if (searchParams.has("code")) {
        await supabase.auth.getSession();
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(getPostLoginPath(isMobile));
      } else {
        setShowLanding(true);
      }
    }

    redirect();
  }, [router, isMobile]);

  if (showLanding) return <LandingPage />;
  return null;
}
