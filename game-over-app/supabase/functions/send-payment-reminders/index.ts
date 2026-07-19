/**
 * send-payment-reminders Edge Function
 *
 * Sends a friendly PAYMENT reminder (NOT an invitation — no invite code) to the
 * guests the organizer chose, via Email (Resend) or WhatsApp (Twilio).
 *
 * The client is responsible for choosing the recipients (only registered
 * participants with an outstanding balance, honoree excluded) and for the
 * per-person amount. This function just renders the copy and sends it.
 *
 * Body: {
 *   eventId: string,
 *   channel: 'email' | 'whatsapp',
 *   variant: 'A' | 'B',              // A = playful, B = friendly-plain
 *   language?: 'de' | 'en',
 *   recipients: { firstName?: string, email?: string, phone?: string, amount: string }[]
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email.ts';
import { sendWhatsApp } from '../_shared/twilio.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Channel = 'email' | 'whatsapp';
type Variant = 'A' | 'B';
type Lang = 'de' | 'en';

interface Recipient {
  firstName?: string;
  email?: string;
  phone?: string;
  amount: string; // already formatted, e.g. "223,75 €"
}

interface ReminderResult {
  status: 'sent' | 'failed';
  recipient: string; // masked
  error?: string;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}**@${domain}`;
}
function maskPhone(phone: string): string {
  return `${phone.slice(0, 5)}***`;
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Normalise to E.164: leading + kept, 0 → +49, else prefix +. */
function normalisePhone(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, '');
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('0')) return `+49${stripped.slice(1)}`;
  return `+${stripped}`;
}

interface CopyVars {
  firstName: string;
  honoree: string;
  amount: string;
  organizer: string;
}

const BODY: Record<Lang, Record<Variant, (v: CopyVars) => string>> = {
  de: {
    A: (v) => `🎉 Hey ${v.firstName}! Die Party für ${v.honoree} nimmt Fahrt auf - jetzt fehlt nur noch dein Beitrag. Dein Anteil: ${v.amount}. Überweis ihn kurz an ${v.organizer}, dann ist alles safe. Danach: nur noch Vorfreude! 🥂`,
    B: (v) => `Hallo ${v.firstName}, kleine Erinnerung zur Party für ${v.honoree}: Dein Anteil beträgt ${v.amount}. Bitte überweise ihn an ${v.organizer}, damit alles rechtzeitig gesichert ist. Danke dir! 🙌`,
  },
  en: {
    A: (v) => `🎉 Hey ${v.firstName}! ${v.honoree}'s party is coming together - just your share is missing. Your part: ${v.amount}. Send it over to ${v.organizer} and you're all set. Then: pure anticipation! 🥂`,
    B: (v) => `Hi ${v.firstName}, a quick reminder about ${v.honoree}'s party: your share is ${v.amount}. Please send it to ${v.organizer} so everything stays booked in time. Thanks! 🙌`,
  },
};

function subject(lang: Lang, variant: Variant, honoree: string, firstName: string): string {
  if (lang === 'en') {
    return variant === 'A'
      ? `${firstName}, your share for ${honoree}'s party 🎉`
      : `Quick reminder: your share for ${honoree}'s party`;
  }
  return variant === 'A'
    ? `${firstName}, dein Beitrag für ${honoree}s Party 🎉`
    : `Kleine Erinnerung: dein Beitrag für ${honoree}s Party`;
}

function reminderEmailHtml(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0D1B2A;color:#FFFFFF;padding:28px;border-radius:14px;max-width:520px;margin:0 auto;">
    <div style="color:#C6A75E;letter-spacing:3px;font-weight:700;text-align:center;font-size:13px;margin-bottom:18px;">GAME OVER</div>
    <p style="font-size:16px;line-height:1.6;margin:0;">${escapeHtml(body)}</p>
  </div>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userToken = authHeader.replace('Bearer ', '');
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(userToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { eventId, channel, variant = 'A', language = 'de', recipients: recipientsRaw } =
      await req.json() as {
        eventId: string; channel: Channel; variant?: Variant; language?: Lang; recipients: Recipient[];
      };

    if (!eventId || !channel) {
      return new Response(JSON.stringify({ error: 'eventId and channel are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['email', 'whatsapp'].includes(channel)) {
      return new Response(JSON.stringify({ error: 'channel must be email or whatsapp' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ownership check
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, honoree_name, created_by')
      .eq('id', eventId)
      .single();
    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (event.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Organizer display name (auth metadata is freshest, profiles as fallback)
    const { data: authUserData } = await supabase.auth.admin.getUserById(event.created_by);
    const authFullName: string = authUserData?.user?.user_metadata?.full_name ?? '';
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', event.created_by).single();
    const organizerName: string = authFullName || profile?.full_name || (language === 'en' ? 'the organizer' : 'den Organisator');
    const honoreeName: string = event.honoree_name ?? (language === 'en' ? 'the guest of honour' : 'den Ehrengast');

    const lang: Lang = language === 'en' ? 'en' : 'de';
    const chosenVariant: Variant = variant === 'B' ? 'B' : 'A';

    const recipients: Recipient[] = (recipientsRaw ?? []).filter((r) =>
      channel === 'email' ? !!r.email : !!r.phone
    );
    const MAX = 50;
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, results: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (recipients.length > MAX) {
      return new Response(JSON.stringify({ error: `Too many recipients. Maximum ${MAX} per call.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: ReminderResult[] = [];
    let sent = 0, failed = 0;

    for (const r of recipients) {
      const firstName = (r.firstName ?? '').trim() || (lang === 'en' ? 'there' : 'du');
      const body = BODY[lang][chosenVariant]({ firstName, honoree: honoreeName, amount: r.amount, organizer: organizerName });

      let ok: { success: boolean; error?: string };
      if (channel === 'email') {
        ok = await sendEmail({
          to: r.email!,
          subject: subject(lang, chosenVariant, honoreeName, firstName),
          html: reminderEmailHtml(body),
        });
      } else {
        ok = await sendWhatsApp(normalisePhone(r.phone!), body);
      }

      if (ok.success) sent++; else failed++;
      results.push({
        status: ok.success ? 'sent' : 'failed',
        recipient: channel === 'email' ? maskEmail(r.email!) : maskPhone(normalisePhone(r.phone!)),
        error: ok.error,
      });
    }

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
