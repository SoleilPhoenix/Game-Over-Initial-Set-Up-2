/** Structured metadata written by the database refund reminder job. */
export interface RefundDueMeta {
  refundId: string;
  description: string;
  amountCents: number;
  expectedBy: string;
}

export function isRefundDueMeta(value: unknown): value is RefundDueMeta {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Record<string, unknown>;
  return (
    typeof metadata.refundId === 'string' &&
    typeof metadata.description === 'string' &&
    typeof metadata.amountCents === 'number' &&
    Number.isInteger(metadata.amountCents) &&
    metadata.amountCents > 0 &&
    typeof metadata.expectedBy === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(metadata.expectedBy)
  );
}
