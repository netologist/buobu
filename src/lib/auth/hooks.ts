'use client';

import { useState } from 'react';
import {
  login as authLogin,
  loginWithOAuth as authLoginWithOAuth,
  register as authRegister,
  sendPasswordResetEmail as authSendPasswordResetEmail,
  updatePassword as authUpdatePassword,
  type User,
} from './service';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string, captchaToken?: string): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      return await authLogin(email, password, captchaToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'github'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authLoginWithOAuth(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, campaignCode?: string, captchaToken?: string): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      return await authRegister(email, password, campaignCode, captchaToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string, captchaToken?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authSendPasswordResetEmail(email, captchaToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authUpdatePassword(newPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, loginWithOAuth, register, sendPasswordResetEmail, updatePassword, isLoading, error };
}
