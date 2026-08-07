/**
 * Shared Twilio helper for SMS and WhatsApp sending.
 * Used by: send-guest-invitations, send-final-briefing
 *
 * Retries once on 5xx (transient Twilio server errors).
 * 4xx errors are permanent (invalid number, etc.) and are not retried.
 *
 * IMPORTANT: a 201 from the Messages API only means Twilio QUEUED the message —
 * it does NOT mean it was delivered. This especially bites the WhatsApp Sandbox:
 * if the recipient hasn't joined the sandbox, Twilio accepts the request but the
 * message goes to `undelivered` (error 63016 = outside the 24h session window,
 * 63007 = number not on WhatsApp). So for WhatsApp we poll the message status
 * once after sending and only report success if it isn't a terminal failure.
 */

interface TwilioResult {
  success: boolean;
  error?: string;
  twilioCode?: number;
  status?: string;
}

interface TwilioCreateResult {
  ok: boolean;
  status: number;
  body: { sid?: string; status?: string; message?: string; code?: number };
}

async function callTwilio(
  sid: string,
  token: string,
  params: URLSearchParams
): Promise<TwilioCreateResult> {
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

  // Parse the body on both success (need sid/status) and error (need message/code).
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Fetch the current delivery status of a message by SID. */
async function fetchMessageStatus(
  sid: string,
  token: string,
  messageSid: string,
): Promise<{ status?: string; errorCode?: number; errorMessage?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${messageSid}.json`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${btoa(`${sid}:${token}`)}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({}));
    return {
      status: body.status,
      errorCode: body.error_code ?? undefined,
      errorMessage: body.error_message ?? undefined,
    };
  } catch {
    return {};
  }
}

// Terminal Twilio message states.
const TERMINAL_FAILURE = new Set(['undelivered', 'failed']);
const TERMINAL_SUCCESS = new Set(['delivered', 'read', 'sent', 'received']);

export async function sendSMS(to: string, body: string): Promise<TwilioResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_SMS_FROM') ?? 'GameOver';

  if (!sid || !token) return { success: false, error: 'Twilio not configured' };

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const result = await callTwilio(sid, token, params);

  if (result.ok) return { success: true, status: result.body.status };
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

  // Hard API failure (bad number, auth, etc.) — report immediately.
  if (!result.ok) {
    return {
      success: false,
      error: result.body.message ?? `Twilio WhatsApp error ${result.status}`,
      twilioCode: result.body.code,
    };
  }

  const messageSid = result.body.sid;
  let status = result.body.status ?? 'queued';

  // If Twilio queued it, poll once to catch the common "undelivered" outcome
  // (recipient not opted into the sandbox / not on WhatsApp). We don't wait for
  // full delivery — just long enough to surface a terminal failure honestly.
  if (messageSid && !TERMINAL_FAILURE.has(status) && !TERMINAL_SUCCESS.has(status)) {
    await new Promise(r => setTimeout(r, 3000));
    const polled = await fetchMessageStatus(sid, token, messageSid);
    if (polled.status) status = polled.status;

    if (TERMINAL_FAILURE.has(status)) {
      const reason = polled.errorCode === 63016
        ? 'recipient has not joined the WhatsApp sandbox (or is outside the 24h window)'
        : polled.errorCode === 63007
          ? 'number is not registered on WhatsApp'
          : (polled.errorMessage ?? `delivery failed (status: ${status})`);
      return { success: false, error: reason, twilioCode: polled.errorCode, status };
    }
  }

  // Terminal failure returned directly by the create call's status field.
  if (TERMINAL_FAILURE.has(status)) {
    return { success: false, error: `delivery failed (status: ${status})`, status };
  }

  return { success: true, status };
}
