/**
 * Shared Twilio helper for SMS and WhatsApp sending.
 * Used by: send-guest-invitations, send-final-briefing
 *
 * Retries once on 5xx (transient Twilio server errors).
 * 4xx errors are permanent (invalid number, etc.) and are not retried.
 */

interface TwilioResult {
  success: boolean;
  error?: string;
  twilioCode?: number;
}

async function callTwilio(
  sid: string,
  token: string,
  params: URLSearchParams
): Promise<{ ok: boolean; status: number; body: { message?: string; code?: number } }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  };

  let res = await fetch(url, init);

  // Retry once on 5xx transient errors
  if (res.status >= 500) {
    await new Promise(r => setTimeout(r, 1000));
    res = await fetch(url, init);
  }

  const responseBody = res.ok ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: responseBody };
}

export async function sendSMS(to: string, body: string): Promise<TwilioResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_SMS_FROM') ?? 'GameOver';

  if (!sid || !token) return { success: false, error: 'Twilio not configured' };

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const result = await callTwilio(sid, token, params);

  if (result.ok) return { success: true };
  return {
    success: false,
    error: result.body.message ?? `Twilio SMS error ${result.status}`,
  };
}

export async function sendWhatsApp(to: string, body: string): Promise<TwilioResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');

  if (!sid || !token || !from) {
    return { success: false, error: 'WhatsApp not configured — TWILIO_WHATSAPP_FROM missing' };
  }

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const params = new URLSearchParams({ To: toFormatted, From: from, Body: body });
  const result = await callTwilio(sid, token, params);

  if (result.ok) return { success: true };
  return {
    success: false,
    error: result.body.message ?? `Twilio WhatsApp error ${result.status}`,
    twilioCode: result.body.code,
  };
}
