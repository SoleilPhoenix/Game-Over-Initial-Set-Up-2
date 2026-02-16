/**
 * Shared email module using Resend REST API.
 * Gracefully skips if RESEND_API_KEY is not configured.
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
const DEFAULT_FROM = 'Game Over <noreply@mail.game-over.app>';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');

  if (!apiKey) {
    console.log('RESEND_API_KEY not configured — skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from ?? DEFAULT_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error:', response.status, errorBody);
      return { success: false, error: `Resend API ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send failed:', message);
    return { success: false, error: message };
  }
}
