/** Shared HTTP helpers for Supabase edge functions. */

const DEFAULT_ALLOWED_ORIGINS = ['https://game-over.app'];

/**
 * Native callers do not send an Origin header. Browser origins are reflected
 * only when they are explicitly allowed.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  const origin = req.headers.get('Origin');
  if (!origin) return headers;

  const allowedOrigins = (
    Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS.join(',')
  )
    .split(',')
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

export function optionsResponse(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) });
}
