/**
 * Web stub for usePaymentSheet.
 * Stripe React Native uses native modules incompatible with web.
 * This stub satisfies the import on web without pulling in native code.
 */

import { useState, useCallback } from 'react';

export function usePaymentSheet() {
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const processPayment = useCallback(async () => {
    return { success: false, error: 'Payments are not supported on web.' };
  }, []);

  const showError = useCallback((_message: string) => {
    // no-op on web
  }, []);

  return { processPayment, isLoading, error, showError };
}
