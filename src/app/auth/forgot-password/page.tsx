'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { AppLogo } from '@/components/ui/app-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/hooks';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail, isLoading, error } = useAuth();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setValidationError('Please complete the captcha verification');
      return;
    }

    try {
      await sendPasswordResetEmail(email, captchaToken ?? undefined);
      setSubmitted(true);
    } catch {
      // Error is handled by the hook; reset captcha so the used token isn't resubmitted
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AppLogo size="lg" variant="color" orientation="horizontal" />
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly. Check your inbox and spam folder.
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {(error || validationError) && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {validationError ?? error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {TURNSTILE_SITE_KEY && (
                  <div className="w-full overflow-visible">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      className="w-full"
                      options={{ theme: 'auto', appearance: 'interaction-only', size: 'flexible', retry: 'auto', refreshExpired: 'auto' }}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onExpire={() => {
                        setCaptchaToken(null);
                        turnstileRef.current?.reset();
                      }}
                      onError={(errorCode) => {
                        setCaptchaToken(null);
                        const suffix = typeof errorCode === 'string' && errorCode ? ` (${errorCode})` : '';
                        setValidationError(`Captcha verification failed. Please try again${suffix}.`);
                        turnstileRef.current?.reset();
                      }}
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-5">
                <Button type="submit" className="w-full" disabled={isLoading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}>
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </CardFooter>
            </form>
          )}

          <CardFooter className="justify-center pb-6 pt-0">
            <p className="text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
