/**
 * Authentication Library
 * Supports Email/Password, Apple, Google, and Facebook Sign-In
 */

export { auth, AuthError } from './auth';
export { signInWithApple, isAppleSignInAvailable } from './apple';
export { useGoogleAuth } from './google';
export { useFacebookAuth } from './facebook';
export { tokenStorage } from './storage';
