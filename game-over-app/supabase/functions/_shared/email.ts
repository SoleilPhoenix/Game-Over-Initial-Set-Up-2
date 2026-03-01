/**
 * Shared email module using Twilio SendGrid REST API.
 * Replaces the previous Resend integration.
 * Gracefully skips if SENDGRID_API_KEY is not configured.
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

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const DEFAULT_FROM = 'Game Over <noreply@mail.game-over.app>';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');

  if (!apiKey) {
    console.log('SENDGRID_API_KEY not configured — skipping email send');
    return { success: false, error: 'SENDGRID_API_KEY not configured' };
  }

  const fromRaw = params.from ?? DEFAULT_FROM;
  // Parse "Name <email>" format into SendGrid's { name, email } object
  const fromMatch = fromRaw.match(/^(.+)\s<(.+)>$/);
  const fromObj = fromMatch
    ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
    : { email: fromRaw.trim() };

  try {
    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: fromObj,
        subject: params.subject,
        content: [{ type: 'text/html', value: params.html }],
      }),
    });

    // SendGrid returns 202 Accepted on success (no body)
    if (response.status === 202) {
      // X-Message-Id header is the SendGrid message ID
      const messageId = response.headers.get('X-Message-Id') ?? undefined;
      return { success: true, messageId };
    }

    const errorBody = await response.text();
    console.error('SendGrid API error:', response.status, errorBody);
    return { success: false, error: `SendGrid API ${response.status}: ${errorBody}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send failed:', message);
    return { success: false, error: message };
  }
}
