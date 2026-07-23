/**
 * Shared email module using the Resend REST API.
 *
 * Configure with these Supabase secrets:
 *   RESEND_API_KEY  — from https://resend.com/api-keys (required)
 *   RESEND_FROM     — optional sender override, e.g. "Game Over <hello@game-over.app>".
 *                     Defaults to DEFAULT_FROM. The sender DOMAIN must be verified
 *                     in Resend (resend.com/domains). For quick testing before your
 *                     domain is verified, set RESEND_FROM to "Game Over <onboarding@resend.dev>".
 *
 * Gracefully returns a failure result (never throws) if RESEND_API_KEY is not
 * configured, so a missing key can't crash the invitation flow.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Game Over <support@game-over.app>';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');

  if (!apiKey) {
    console.log('RESEND_API_KEY not configured — skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Resend accepts the "Name <email>" string directly in `from`.
  const from = params.from ?? Deno.env.get('RESEND_FROM') ?? DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    // Resend returns 200 with { id } on success.
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: true, messageId: data?.id };
    }

    // Error body is typically { name, message } or { statusCode, name, message }.
    const errorBody = await response.text();
    let detail = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      detail = parsed?.message ?? parsed?.name ?? errorBody;
    } catch {
      // keep raw text
    }
    console.error('Resend API error:', response.status, detail);
    return { success: false, error: `Resend API ${response.status}: ${detail}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send failed:', message);
    return { success: false, error: message };
  }
}
