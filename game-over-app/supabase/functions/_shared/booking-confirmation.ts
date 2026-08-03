/**
 * Buchungsbestaetigung per E-Mail.
 *
 * Bis zum 03.08. gab es diese Mail nicht: Vorlage und Renderer waren fertig,
 * aber `send-email` wurde von keiner Stelle der Codebasis aufgerufen, und weder
 * `confirm-demo-booking` noch `stripe-webhook` verschickten irgendetwas. Der
 * Satz "Du erhaeltst eine Bestaetigungs-E-Mail" auf dem Abschlussbildschirm war
 * damit unzutreffend - auf jedem Zahlungsweg, nicht nur im Demo-Modus.
 *
 * Dieses Modul ist die eine Stelle, die beide Wege benutzen.
 *
 * **Wirft nie.** Eine Zahlung darf nicht scheitern, weil ein Mailversand
 * scheitert; der Fehler wird protokolliert und als Ergebnis zurueckgegeben.
 * Fehlt `RESEND_API_KEY`, meldet `sendEmail` das bereits selbst als Misserfolg.
 *
 * Der Profil-Schalter `email_notifications_enabled` wird hier bewusst **nicht**
 * geprueft: er steuert nur die abbestellbaren Erinnerungen und das Briefing.
 * Bestaetigungen, Stornierungen und Einladungen gehen immer raus.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { sendEmail } from './email.ts';
import {
  buildBookingConfirmationSubject,
  getBookingConfirmationEmailHtml,
} from './email-templates.ts';

export type PaymentKind = 'deposit' | 'full';

export interface BookingConfirmationResult {
  sent: boolean;
  reason?: string;
}

/**
 * Der echte Client-Typ, nicht ein selbstgebautes Minimal-Interface: Supabases
 * Query-Builder ist ein Thenable, kein vollstaendiges Promise, und ein
 * strukturell "passendes" Interface wird deshalb von `deno check` abgelehnt.
 */
type QueryClient = Pick<SupabaseClient, 'from'>;

function formatEur(cents: number, language: 'de' | 'en'): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string | null, language: 'de' | 'en'): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export async function sendBookingConfirmationEmail(
  supabase: QueryClient,
  bookingId: string,
  paymentKind: PaymentKind,
): Promise<BookingConfirmationResult> {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        'id, event_id, package_id, total_amount_cents, deposit_amount_cents, paying_participants, reference_number, fully_paid_at',
      )
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { sent: false, reason: 'booking not found' };
    }

    const eventId = booking.event_id as string | null;
    if (!eventId) return { sent: false, reason: 'booking has no event' };

    const { data: event } = await supabase
      .from('events')
      .select('id, title, honoree_name, start_date, city_id, created_by')
      .eq('id', eventId)
      .single();

    if (!event) return { sent: false, reason: 'event not found' };

    const createdBy = event.created_by as string | null;
    if (!createdBy) return { sent: false, reason: 'event has no owner' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, language')
      .eq('id', createdBy)
      .single();

    const recipient = profile?.email as string | undefined;
    if (!recipient) return { sent: false, reason: 'owner has no email address' };

    // Deutsch ist der Standard: die App richtet sich an den deutschen Markt.
    const language: 'de' | 'en' = profile?.language === 'en' ? 'en' : 'de';

    const cityId = event.city_id as string | null;
    const packageId = booking.package_id as string | null;

    const { data: city } = cityId
      ? await supabase.from('cities').select('name').eq('id', cityId).single()
      : { data: null };
    const { data: pkg } = packageId
      ? await supabase.from('packages').select('name').eq('id', packageId).single()
      : { data: null };

    const totalCents = (booking.total_amount_cents as number | null) ?? 0;
    const depositCents = (booking.deposit_amount_cents as number | null) ?? 0;
    // Bei Vollzahlung bleibt deposit_amount_cents auf der urspruenglichen
    // Anzahlung stehen - der gezeigte Betrag ist dann der Gesamtbetrag.
    const paidCents = paymentKind === 'full' ? totalCents : depositCents;

    const partyLabel = `${event.honoree_name as string}s ${event.title as string}`;
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://game-over.app';

    const html = getBookingConfirmationEmailHtml({
      userName: (profile?.full_name as string | undefined) ?? undefined,
      honoreeName: event.honoree_name as string,
      eventTitle: event.title as string,
      packageName: (pkg?.name as string | undefined) ?? '-',
      city: (city?.name as string | undefined) ?? '-',
      eventDate: formatDate(event.start_date as string | null, language),
      participants: (booking.paying_participants as number | null) ?? 0,
      totalAmount: formatEur(totalCents, language),
      depositAmount: formatEur(paidCents, language),
      bookingReference: (booking.reference_number as string | null) ?? '-',
      eventUrl: `${appBaseUrl}/event/${eventId}`,
      language,
      paymentKind,
    });

    const result = await sendEmail({
      to: recipient,
      subject: buildBookingConfirmationSubject(language, partyLabel),
      html,
    });

    if (!result.success) {
      console.error('[booking-confirmation] send failed:', result.error);
      return { sent: false, reason: result.error };
    }

    console.log(
      `[booking-confirmation] sent booking=${bookingId} kind=${paymentKind} lang=${language}`,
    );
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[booking-confirmation] unexpected failure:', message);
    return { sent: false, reason: message };
  }
}
