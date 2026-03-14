/**
 * Native wrapper — delegates to the real Stripe provider.
 */
import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

interface Props {
  publishableKey: string;
  merchantIdentifier?: string;
  urlScheme?: string;
  children: React.ReactNode;
}

export function StripeProviderWrapper({ children, ...props }: Props) {
  return <StripeProvider {...props}>{children as any}</StripeProvider>;
}
