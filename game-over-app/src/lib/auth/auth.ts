/**
 * Core Authentication Functions
 * Email/Password authentication with Supabase
 */

import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

// Validation schemas
export const emailSchema = z.string().email('Invalid email address').max(255);
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Name is required').max(100).optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// Custom error class for auth errors
export class AuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// Map Supabase error codes to user-friendly messages
function mapAuthError(error: unknown): AuthError {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    const message = (error as { message?: string }).message || 'Authentication failed';

    switch (code) {
      case 'user_already_exists':
        return new AuthError(code, 'An account with this email already exists');
      case 'invalid_credentials':
        return new AuthError(code, 'Invalid email or password');
      case 'email_not_confirmed':
        return new AuthError(code, 'Please verify your email address');
      case 'too_many_requests':
        return new AuthError(code, 'Too many attempts. Please try again later');
      case 'weak_password':
        return new AuthError(code, 'Password is too weak');
      default:
        return new AuthError(code, message);
    }
  }
  return new AuthError('unknown', 'An unexpected error occurred');
}

export const auth = {
  /**
   * Sign up with email and password
   */
  async signUp({ email, password, fullName }: SignUpInput) {
    // Validate input
    const validation = signUpSchema.safeParse({ email, password, fullName });
    if (!validation.success) {
      throw new AuthError('validation_error', validation.error.errors[0].message);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'gameover://auth/callback',
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw mapAuthError(error);
    return data;
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInInput) {
    // Validate input
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      throw new AuthError('validation_error', validation.error.errors[0].message);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw mapAuthError(error);
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw mapAuthError(error);
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      throw new AuthError('validation_error', 'Please enter a valid email address');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'gameover://auth/reset-password',
    });

    if (error) throw mapAuthError(error);
  },

  /**
   * Update password (after reset)
   */
  async updatePassword(newPassword: string) {
    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      throw new AuthError('validation_error', validation.error.errors[0].message);
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw mapAuthError(error);
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw mapAuthError(error);
    return data.session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw mapAuthError(error);
    return data.user;
  },

  /**
   * Refresh session
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw mapAuthError(error);
    return data;
  },
};
