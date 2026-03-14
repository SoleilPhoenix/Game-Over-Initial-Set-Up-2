/**
 * Web stub — Stripe React Native uses native modules incompatible with web.
 * This no-op wrapper prevents the native import from entering the web bundle.
 */
import React from 'react';

interface Props {
  publishableKey?: string;
  merchantIdentifier?: string;
  urlScheme?: string;
  children: React.ReactNode;
}

export function StripeProviderWrapper({ children }: Props) {
  return <>{children}</>;
}
