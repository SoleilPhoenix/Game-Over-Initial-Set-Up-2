/**
 * Shared HTTP helpers for edge functions.
 * - corsHeaders: origin-allowlisted CORS (was previously '*' everywhere).
 * - timingSafeEqual: constant-time string comparison for shared-secret auth.
 */

const DEFAULT_ALLOWED_ORIGINS = ['https://game-over.app'];

/**
 * Build CORS headers scoped to an allowlist.
 *
 * Native app / server-to-server callers send no Origin header — CORS does not
 * apply to them, so we simply omit Access-Control-Allow-Origin. Browser callers
 * only get ACAO reflected when their Origin is on the allowlist. Configure extra
 * origins via the ALLOWED_ORIGINS env (comma-separated).
 */
export function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  const origin = req.headers.get('Origin');
  if (!origin) return headers; // native / non-browser caller

  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/**
 * Constant-time comparison so shared-secret checks don't leak length/content
 * via response timing.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);

  if (ab.length !== bb.length) {
    let diff = 1;
    const len = Math.max(ab.length, bb.length);
    for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
    return false;
  }

  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/** Compare an "Authorization: Bearer <secret>" header against an expected secret. */
export function bearerMatches(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader || !expectedSecret) return false;
  return timingSafeEqual(authHeader, `Bearer ${expectedSecret}`);
}

/**
 * Fixed-window rate limit backed by the check_rate_limit RPC. Returns true when
 * the caller is allowed to proceed. Fails OPEN on infrastructure error so a
 * transient DB blip never hard-blocks legitimate users — the failure is logged.
 */
// deno-lint-ignore no-explicit-any
export async function checkRateLimit(
  supabase: any,
  bucket: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_identifier: identifier,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error(`[rateLimit] check failed for ${bucket}/${identifier}:`, error.message);
    return true;
  }
  return data !== false;
}
