'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { AppLogo } from '@/components/ui/app-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/hooks';
import { INVITE_CODE_ERROR, INVITE_CODE_MAX_LENGTH, INVITE_CODE_PATTERN } from '@/lib/constants';
import { INVITE_CODES_ENABLED } from '@/lib/feature-flags';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState('');
  const [campaignCode, setCampaignCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setValidationError('Please complete the captcha verification');
      return;
    }

    let normalizedCode: string | undefined;

    if (INVITE_CODES_ENABLED) {
      normalizedCode = campaignCode.trim().toUpperCase();
      if (!normalizedCode) {
        setValidationError('Invite code is required');
        return;
      }

      if (!INVITE_CODE_PATTERN.test(normalizedCode)) {
        setValidationError(INVITE_CODE_ERROR);
        return;
      }
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    try {
      await register(email, password, normalizedCode, captchaToken ?? undefined);
      setShowConfirmation(true);
    } catch {
      // Error is handled by the hook; reset captcha so the used token isn't resubmitted
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  };

  if (showConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <AppLogo size="lg" variant="color" orientation="horizontal" />
          </div>
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>
                We&apos;ve sent a confirmation link to <strong>{email}</strong>. Please verify your email address to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>Didn&apos;t receive the email? Check your spam folder or wait a few minutes for it to arrive.</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-5">
              <Button className="w-full" onClick={() => router.push('/auth/login')}>
                Go to sign in
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const cardDescription = INVITE_CODES_ENABLED
    ? 'Enter your email, invite code, and password to create your account.'
    : 'Enter your email and password to create your account.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AppLogo size="lg" variant="color" orientation="horizontal" />
        </div>
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {(error || validationError) && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{validationError || error}</div>
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
              {INVITE_CODES_ENABLED && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="01ARZ3NDEKTSV4RRFFQ69G5FAV"
                    value={campaignCode}
                    onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                    maxLength={INVITE_CODE_MAX_LENGTH}
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
