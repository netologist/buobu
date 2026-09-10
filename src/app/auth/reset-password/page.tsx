'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LOCAL_MODE } from '@/lib/feature-flags';
import { AppLogo } from '@/components/ui/app-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/hooks';

type RecoveryInitResult = 'ready' | 'invalid' | null;

async function hasActiveSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

async function waitForSession(attempts = 5, delayMs = 200): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    if (await hasActiveSession()) {
      return true;
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
  }
  return false;
}

async function tryRecoveryFromQuery(searchParams: ReadonlyURLSearchParams): Promise<RecoveryInitResult> {
  const explicitError = searchParams.get('error') ?? searchParams.get('error_description');
  if (explicitError) return 'invalid';

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    return error ? 'invalid' : 'ready';
  }

  // NOTE: Do NOT call exchangeCodeForSession manually here.
  // With detectSessionInUrl: true, the SDK already exchanges the `code` automatically.
  // A second call would consume the single-use code and produce an "invalid token" error.
  // Instead, callers should wait for the session that detectSessionInUrl establishes.

  return null;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  // Accept the two supported Supabase recovery link formats:
  // 1) token_hash + type=recovery  — OTP verification, no PKCE verifier needed
  // 2) code (PKCE exchange)        — handled automatically by detectSessionInUrl; fires PASSWORD_RECOVERY event
  //
  // Implicit-flow hash fragments (#access_token, #refresh_token, type=recovery)
  // are deliberately NOT accepted. That fragment is attacker-writable, so
  // adopting it let anyone plant their own session in a victim's browser by
  // sending a crafted link — everything the victim then typed, including the new
  // password, was written to the attacker's account. The project sets
  // flowType: 'pkce', so links of that shape are not issued.
  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) {
        setSessionReady(true);
        setInvalidLink(false);
      }
    };

    const markInvalid = () => {
      if (!cancelled) {
        setInvalidLink(true);
      }
    };

    // For PKCE code links, detectSessionInUrl exchanges the code automatically and fires
    // the PASSWORD_RECOVERY auth event. Listen for it here so we don't race with the SDK
    // by also calling exchangeCodeForSession manually (the code is single-use).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        markReady();
      }
    });

    const initRecoverySession = async () => {
      // Fast path: session already established (e.g. detectSessionInUrl completed synchronously).
      if (await waitForSession()) {
        markReady();
        return;
      }

      // Explicit error in URL — link is definitively invalid.
      const explicitError = searchParams.get('error') ?? searchParams.get('error_description');
      if (explicitError) {
        markInvalid();
        return;
      }

      // token_hash + type=recovery — OTP path, no PKCE verifier needed, works cross-browser.
      const queryResult = await tryRecoveryFromQuery(searchParams);
      if (queryResult === 'ready') {
        markReady();
        return;
      }
      if (queryResult === 'invalid') {
        markInvalid();
        return;
      }

      // For PKCE code links: detectSessionInUrl is exchanging the code asynchronously.
      // Wait up to 8 seconds for the PASSWORD_RECOVERY event / session to appear.
      if (await waitForSession(16, 500)) {
        markReady();
      } else {
        markInvalid();
      }
    };

    void initRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    try {
      await updatePassword(password);
      router.replace('/auth/login?reset=success');
    } catch {
      // Error is handled by the hook
    }
  };

  if (invalidLink) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
          <CardDescription>
            This password reset link is no longer valid. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          <Link href="/auth/forgot-password" className="w-full">
            <Button className="w-full">Request new reset link</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (!sessionReady) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Verifying reset link…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {(validationError || error) && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {validationError ?? error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-5">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Updating…' : 'Update password'}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  // Local Mode has no password to reset, and this form talks to the Supabase client
  // directly. Render nothing; the route gate sends the user back into the app.
  if (LOCAL_MODE) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AppLogo size="lg" variant="color" orientation="horizontal" />
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
