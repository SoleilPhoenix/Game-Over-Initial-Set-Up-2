/**
 * Email templates for Game Over.
 * All templates share a consistent dark-themed layout matching the app's design.
 *
 * Templates:
 * - Welcome (registration)
 * - Booking Confirmation
 * - Payment Reminder (urgency-based)
 */

// ─── Shared Layout ──────────────────────────────────────────

const NAVY = '#0D1B2A';
const CARD = '#1A2F47';
const GOLD = '#C6A75E';
const TEXT = '#E7ECF2';
const MUTED = '#AEB9C7';
const FAINT = '#7A8699';
const BORDER = 'rgba(198,167,94,0.22)';

interface EmailLayoutParams {
  lang: 'de' | 'en';
  title: string;
  headerSubtitle: string;
  bodyHtml: string;
  footerHtml: string;
}

function emailLayout({
  lang,
  title,
  headerSubtitle,
  bodyHtml,
  footerHtml,
}: EmailLayoutParams): string {
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${NAVY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border-radius:20px;overflow:hidden;border:1px solid ${BORDER};">

        <!-- Header -->
        <tr><td style="padding:34px 40px 26px;text-align:center;border-bottom:1px solid ${BORDER};">
          <div style="font-size:13px;letter-spacing:6px;color:${GOLD};font-weight:700;">GAME&nbsp;OVER</div>
          <div style="margin-top:9px;font-size:13px;color:${MUTED};">${headerSubtitle}</div>
        </td></tr>
${bodyHtml}        <!-- Footer -->
        <tr><td style="padding:26px 40px 34px;text-align:center;">
${footerHtml}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding-bottom:32px;">
      <a href="${url}" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:700;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function supportLine(): string {
  return `<p style="margin:0;color:${MUTED};font-size:13px;line-height:1.5;text-align:center;">
  If you have any questions, contact us at support@game-over.app
</p>`;
}

function standardFooter(): string {
  return `          <p style="margin:24px 0 8px;color:${MUTED};font-size:12px;line-height:1.6;border-top:1px solid ${BORDER};padding-top:20px;">
            Game Over &mdash; Plan unforgettable parties
          </p>
          <p style="margin:0;color:${FAINT};font-size:11px;">
            <a href="https://game-over.app/privacy" style="color:${FAINT};text-decoration:underline;">Privacy</a>
            &nbsp;&middot;&nbsp;
            <a href="https://game-over.app/terms" style="color:${FAINT};text-decoration:underline;">Terms</a>
            &nbsp;&middot;&nbsp;
            <a href="https://game-over.app/impressum" style="color:${FAINT};text-decoration:underline;">Impressum</a>
          </p>`;
}

// ─── Welcome Email ──────────────────────────────────────────

interface WelcomeEmailParams {
  userName?: string;
}

export function getWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const greeting = params.userName ? `Hi ${params.userName},` : 'Hi there,';

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#FFFFFF;font-size:16px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 24px;color:${TEXT};font-size:15px;line-height:1.6;">
      Welcome to <strong style="color:#FFFFFF;">Game Over</strong> &mdash; your personal party planning assistant.
      We help you organize unforgettable bachelor and bachelorette parties across Germany.
    </p>

    <!-- Features -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:${NAVY};border:1px solid ${BORDER};border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;">
                <p style="margin:0;color:#FFFFFF;font-size:14px;font-weight:600;">What you can do:</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:${TEXT};font-size:14px;line-height:1.5;">
                  &#127881; Browse curated party packages in Berlin, Hamburg &amp; Hannover
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:${TEXT};font-size:14px;line-height:1.5;">
                  &#128176; Split costs and track budgets with your group
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:${TEXT};font-size:14px;line-height:1.5;">
                  &#128172; Chat, vote on plans, and coordinate everything in one place
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <p style="margin:0;color:${TEXT};font-size:14px;line-height:1.5;">
                  &#127775; AI-powered recommendations based on your group's vibe
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('Start Planning', 'https://game-over.app')}
    ${supportLine()}`;

  return emailLayout({
    lang: 'en',
    title: 'Welcome - Game Over',
    headerSubtitle: 'Welcome to Game Over',
    bodyHtml: `
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${bodyHtml}
        </td></tr>

`,
    footerHtml: standardFooter(),
  });
}

// ─── Booking Confirmation Email ─────────────────────────────

interface BookingConfirmationParams {
  userName?: string;
  honoreeName: string;
  eventTitle: string;
  packageName: string;
  city: string;
  eventDate?: string;       // e.g. "March 15, 2026"
  participants: number;
  totalAmount: string;       // e.g. "€597.00"
  depositAmount: string;     // e.g. "€149.25"
  bookingReference: string;  // e.g. "GO-A3F8K2"
  eventUrl?: string;
}

export function getBookingConfirmationEmailHtml(params: BookingConfirmationParams): string {
  const {
    userName, honoreeName, eventTitle, packageName, city,
    eventDate, participants, totalAmount, depositAmount,
    bookingReference, eventUrl,
  } = params;

  const greeting = userName ? `Hi ${userName},` : 'Hi there,';
  const viewUrl = eventUrl ?? 'https://game-over.app';

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#FFFFFF;font-size:16px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 24px;color:${TEXT};font-size:15px;line-height:1.6;">
      Your booking for <strong style="color:#FFFFFF;">${honoreeName}'s ${eventTitle}</strong> has been confirmed!
    </p>

    <!-- Booking Reference -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:${NAVY};border:1px solid ${BORDER};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
          <p style="margin:0;color:${GOLD};font-size:28px;font-weight:700;letter-spacing:2px;">${bookingReference}</p>
        </td>
      </tr>
    </table>

    <!-- Event Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:${NAVY};border:1px solid ${BORDER};border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;border-bottom:1px solid ${BORDER};">
                <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Package</p>
                <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;font-weight:600;">${packageName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid ${BORDER};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%">
                      <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">City</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${city}</p>
                    </td>
                    <td width="50%">
                      <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Participants</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${participants} people</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${eventDate ? `
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid ${BORDER};">
                <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Event Date</p>
                <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${eventDate}</p>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding-top:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%">
                      <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:18px;font-weight:700;">${totalAmount}</p>
                    </td>
                    <td width="50%">
                      <p style="margin:0;color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Deposit Paid</p>
                      <p style="margin:4px 0 0;color:${GOLD};font-size:18px;font-weight:700;">${depositAmount}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('View Your Event', viewUrl)}
    ${supportLine()}`;

  return emailLayout({
    lang: 'en',
    title: 'Booking Confirmed - Game Over',
    headerSubtitle: 'Booking Confirmed',
    bodyHtml: `
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${bodyHtml}
        </td></tr>

`,
    footerHtml: standardFooter(),
  });
}

// ─── Payment Reminder Email ─────────────────────────────────

interface PaymentReminderParams {
  honoreeName: string;
  eventTitle: string;
  amountDue: string;     // e.g. "€112.50"
  daysRemaining: number;
  urgency: 'normal' | 'moderate' | 'urgent' | 'final';
  paymentUrl?: string;
}

const URGENCY_LABELS: Record<string, string> = {
  normal: 'Payment Due',
  moderate: 'Reminder',
  urgent: 'Urgent',
  final: 'Final Notice',
};

export function getPaymentReminderEmailHtml(params: PaymentReminderParams): string {
  const { honoreeName, eventTitle, amountDue, daysRemaining, urgency, paymentUrl } = params;
  const label = URGENCY_LABELS[urgency] ?? 'Payment Due';

  const ctaUrl = paymentUrl ?? 'https://game-over.app';
  const isFinal = urgency === 'final';

  const bodyHtml = `
    <!-- Urgency badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:${GOLD};color:${NAVY};padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;">
          ${daysRemaining === 0 ? 'Due Today' : `${daysRemaining} days remaining`}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;color:#FFFFFF;font-size:16px;line-height:1.5;">
      Hi there,
    </p>

    <p style="margin:0 0 24px;color:${TEXT};font-size:15px;line-height:1.6;">
      Your final payment for <strong style="color:#FFFFFF;">${honoreeName}'s ${eventTitle}</strong> is due${daysRemaining > 0 ? ` in ${daysRemaining} days` : ' today'}.
    </p>

    <!-- Amount box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:${NAVY};border:1px solid ${BORDER};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:1px;">Amount Due</p>
          <p style="margin:0;color:#FFFFFF;font-size:36px;font-weight:700;">${amountDue}</p>
        </td>
      </tr>
    </table>

    ${isFinal ? `
    <!-- Cancellation warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:${NAVY};border:1px solid ${GOLD};border-radius:12px;padding:16px 20px;">
          <p style="margin:0;color:${MUTED};font-size:14px;line-height:1.5;">
            <strong style="color:${GOLD};">Important:</strong> If payment is not received today, your event will be cancelled and only the 25% deposit will be retained.
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    ${ctaButton('Complete Payment', ctaUrl)}
    ${supportLine()}`;

  return emailLayout({
    lang: 'en',
    title: `${label} - Game Over`,
    headerSubtitle: label,
    bodyHtml: `
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${bodyHtml}
        </td></tr>

`,
    footerHtml: standardFooter(),
  });
}

// ─── Guest Invite Email ─────────────────────────────────────

interface GuestInviteEmailParams {
  organizerName: string;
  honoreeName: string;
  inviteUrl: string;         // https://game-over.app/invite/{code}
  guestFirstName?: string;   // personalise greeting if known
  inviteCode?: string;       // show prominently so guest can type it in the app
  language?: 'de' | 'en';    // organizer's app language drives the copy
  partyType?: 'bachelor' | 'bachelorette';
  cityName?: string;
}

/**
 * Guest invite email. Copy is benefit-first and conversion-oriented: a
 * rhetorical pain hook, five sharp benefits, a prominent invite code, and a
 * single strong CTA.
 */
export function getGuestInviteEmailHtml(params: GuestInviteEmailParams): string {
  const { organizerName, honoreeName, inviteUrl, guestFirstName, inviteCode, language, partyType, cityName } = params;
  const isDe = language === 'de';

  // Party wording follows party_type. German avoids the genitive-s pitfall
  // (e.g. "Sally Jones" → wrong "Sally Joness") by always using "von {name}".
  const partyDe = partyType === 'bachelor' ? 'Bachelor Party (JGA)' : 'Bachelorette Party (JGA)';
  const partyEn = partyType === 'bachelor' ? 'Bachelor Party' : 'Bachelorette Party';
  const citySuffix = cityName ? ` in ${cityName}` : '';

  const C = isDe ? {
    lang: 'de',
    title: `Du bist zur ${partyDe} von ${honoreeName} eingeladen`,
    invitationFrom: `Einladung von ${organizerName}`,
    celebrate: `Du bist zur ${partyDe} von`,
    greeting: guestFirstName ? `Hallo ${guestFirstName},` : 'Hallo,',
    intro: `<strong style="color:#FFFFFF;">${organizerName}</strong> plant etwas Unvergessliches — und du stehst auf der Gästeliste.`,
    hook: 'Keine Lust auf endlose Gruppenchats und die „Wer schuldet was"-Tabelle? Diesmal nicht.',
    benefitsTitle: 'Warum du dich wirklich darauf freust',
    benefits: [
      ['🎯', 'Alles in einer App', 'Planung, Chat und Zahlungen an einem Ort'],
      ['💸', 'Du weißt, was du zahlst', 'exakte Kosten vorab — keine versteckten Gebühren, keine unangenehmen Geldgespräche'],
      ['🤖', 'Auf eure Gruppe abgestimmt', 'KI wählt Aktivitäten, die euch wirklich Spaß machen — keine Zufalls-Checkliste'],
      ['⚡', 'In Minuten geregelt', 'statt wochenlangem Hin und Her im Gruppenchat'],
      ['🤝', 'Einfach hingehen', 'der Koordinationsstress ist weg — für alle'],
    ],
    codeLabel: 'Dein persönlicher Einladungscode',
    cta: `Zur ${partyDe} von ${honoreeName}${citySuffix} &rarr;`,
    howToJoin: `Neu hier? Lade <strong style="color:#FFFFFF;">Game Over</strong> &rarr; tippe auf <em>„Einladungscode?"</em> &rarr; gib <strong style="color:${GOLD};">${inviteCode}</strong> ein`,
    footer: 'Diese Einladung ist persönlich für dich und läuft in 30 Tagen ab.<br>Nicht erwartet? Ignoriere sie einfach.',
  } : {
    lang: 'en',
    title: `You're invited to ${honoreeName}'s ${partyEn}`,
    invitationFrom: `Invitation from ${organizerName}`,
    celebrate: "You're invited to celebrate",
    greeting: guestFirstName ? `Hi ${guestFirstName},` : 'Hey,',
    intro: `<strong style="color:#FFFFFF;">${organizerName}</strong> is planning something unforgettable — and you're on the guest list.`,
    hook: 'Dreading the endless group chat and the "who owes what" spreadsheet? Not this time.',
    benefitsTitle: "Why you'll actually look forward to this",
    benefits: [
      ['🎯', 'One app for everything', 'plans, chat and payments in a single place'],
      ['💸', "Know what you'll pay", 'exact costs up front — no hidden fees, no awkward money chats'],
      ['🤖', 'Matched to your group', "AI picks activities you'll actually enjoy — not a random checklist"],
      ['⚡', 'Sorted in minutes', 'not weeks of back-and-forth in the group chat'],
      ['🤝', 'Just show up', 'the coordination stress is gone — for everyone'],
    ],
    codeLabel: 'Your personal invite code',
    cta: `Join ${honoreeName}'s ${partyEn}${citySuffix} &rarr;`,
    howToJoin: `New here? Download <strong style="color:#FFFFFF;">Game Over</strong> &rarr; tap <em>"Got an invite code?"</em> &rarr; enter <strong style="color:${GOLD};">${inviteCode}</strong>`,
    footer: 'This invite is personal to you and expires in 30 days.<br>Not expecting this? You can safely ignore it.',
  };

  const benefit = (icon: string, bold: string, rest: string) => `
    <tr><td style="padding:0 0 15px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top" style="font-size:17px;line-height:1.5;">${icon}</td>
        <td style="color:${MUTED};font-size:14px;line-height:1.55;">
          <strong style="color:#FFFFFF;">${bold}</strong> — ${rest}
        </td>
      </tr></table>
    </td></tr>`;

  const codeBlock = inviteCode ? `
    <tr><td style="padding:26px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:${NAVY};border:1px solid ${GOLD};border-radius:14px;padding:22px;text-align:center;">
          <p style="margin:0 0 8px;color:${MUTED};font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">${C.codeLabel}</p>
          <p style="margin:0;color:${GOLD};font-size:34px;font-weight:800;letter-spacing:8px;font-family:'Courier New',monospace;">${inviteCode}</p>
        </td></tr>
      </table>
    </td></tr>` : '';

  const howToJoin = inviteCode ? `
    <tr><td style="padding:16px 40px 0;">
      <p style="margin:0;color:${MUTED};font-size:13px;line-height:1.7;text-align:center;">${C.howToJoin}</p>
    </td></tr>` : '';

  return emailLayout({
    lang: isDe ? 'de' : 'en',
    title: C.title,
    headerSubtitle: C.invitationFrom,
    bodyHtml: `
        <!-- Hero -->
        <tr><td style="padding:34px 40px 6px;text-align:center;">
          <div style="font-size:36px;line-height:1;">🎉</div>
          <p style="margin:14px 0 0;color:${MUTED};font-size:15px;">${C.celebrate}</p>
          <p style="margin:6px 0 0;color:#FFFFFF;font-size:30px;font-weight:800;line-height:1.2;">${honoreeName}</p>
        </td></tr>

        <!-- Intro + hook -->
        <tr><td style="padding:22px 40px 0;">
          <p style="margin:0;color:${TEXT};font-size:15px;line-height:1.6;">${C.greeting}</p>
          <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">${C.intro}</p>
          <p style="margin:12px 0 0;color:${MUTED};font-size:15px;line-height:1.6;">${C.hook}</p>
        </td></tr>

        <!-- Benefits -->
        <tr><td style="padding:22px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:${NAVY};border:1px solid ${BORDER};border-radius:14px;padding:22px 22px 7px;">
              <p style="margin:0 0 16px;color:${GOLD};font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;">${C.benefitsTitle}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${C.benefits.map((b) => benefit(b[0], b[1], b[2])).join('')}
              </table>
            </td></tr>
          </table>
        </td></tr>

        ${codeBlock}

        <!-- CTA -->
        <tr><td style="padding:28px 40px 0;text-align:center;">
          <a href="${inviteUrl}" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;padding:16px 44px;border-radius:12px;font-size:16px;font-weight:800;">${C.cta}</a>
        </td></tr>

        ${howToJoin}

`,
    footerHtml: `          <p style="margin:24px 0 0;color:${FAINT};font-size:12px;line-height:1.6;border-top:1px solid ${BORDER};padding-top:20px;">
            ${C.footer} &middot; <a href="mailto:support@game-over.app" style="color:${GOLD};text-decoration:none;font-weight:600;">support@game-over.app</a>
          </p>`,
  });
}

// ─── Final Briefing Email ───────────────────────────────────

interface FinalBriefingEmailParams {
  guestFirstName?: string;
  partyLabel: string;        // "Soleil Phoenix' Bachelor Party (JGA)"
  partyTerm: string;         // "Bachelor Party (JGA)"
  honoreeName: string;
  dateStr: string;           // already localised by the caller
  cityName: string;
  packageTier: string;       // e.g. "Classic (M)"
  bookingReference: string;
  eventUrl?: string;
  language?: 'de' | 'en';    // organizer's app language drives the copy
  isOrganizer?: boolean;     // organizer gets the same briefing as a reminder
}

/**
 * Sent ~24h before the event, mirroring the WhatsApp briefing copy.
 *
 * Language follows the organizer's profiles.language, the same convention
 * getGuestInviteEmailHtml uses. German says "von {name}" rather than "{name}s"
 * to dodge the genitive-s pitfall on names already ending in s.
 */
export function getFinalBriefingEmailHtml(params: FinalBriefingEmailParams): string {
  const {
    guestFirstName, partyLabel, partyTerm, honoreeName, dateStr,
    cityName, packageTier, bookingReference, eventUrl, language, isOrganizer,
  } = params;
  const isDe = language === 'de';
  const strong = (s: string) => `<strong style="color:#FFFFFF;">${s}</strong>`;

  const C = isDe ? {
    lang: 'de',
    title: `Morgen ist es soweit: ${partyLabel}`,
    kicker: 'Finales Briefing',
    heroLine: 'Morgen ist es soweit',
    greeting: guestFirstName ? `Hallo ${guestFirstName},` : 'Hallo,',
    intro: isOrganizer
      ? `morgen startet die ${partyTerm} für ${strong(honoreeName)}. Hier ist deine Erinnerung mit allen Eckdaten - dieselben Infos haben auch deine Gäste bekommen.`
      : `morgen startet die ${partyTerm} für ${strong(honoreeName)}. Hier ist alles, was du wissen musst.`,
    keep: 'Heb dir diese E-Mail auf, sie enthält deine Buchungsreferenz.',
    labels: { date: 'Datum', city: 'Stadt', pkg: 'Paket', ref: 'Buchungsref.' },
    closing: 'Sei pünktlich und mach dich bereit für etwas Unvergessliches. 🖤',
    claimLines: 'Einer heiratet. Alle feiern. Keiner stresst.',
    claimSub: 'Planen, feiern, abrechnen. Alles in einer App.',
    cta: 'Details in der App ansehen &rarr;',
    footer: 'Fragen?',
  } : {
    lang: 'en',
    title: `Tomorrow is the day: ${partyLabel}`,
    kicker: 'Final Briefing',
    heroLine: 'Tomorrow is the day',
    greeting: guestFirstName ? `Hi ${guestFirstName},` : 'Hey,',
    intro: isOrganizer
      ? `tomorrow the ${partyTerm} for ${strong(honoreeName)} kicks off. Here is your reminder with all the key facts - your guests received the same details.`
      : `tomorrow the ${partyTerm} for ${strong(honoreeName)} kicks off. Here is everything you need to know.`,
    keep: 'Keep this email, it has your booking reference.',
    labels: { date: 'Date', city: 'City', pkg: 'Package', ref: 'Booking ref' },
    closing: 'Be on time and get ready for something unforgettable. 🖤',
    claimLines: 'One gets married. Everyone celebrates. Nobody stresses.',
    claimSub: 'Plan it, party, settle up. All in one app.',
    cta: 'View details in the app &rarr;',
    footer: 'Questions?',
  };

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;white-space:nowrap;">${label}</td>
      <td style="padding:11px 0 11px 18px;border-bottom:1px solid ${BORDER};color:#FFFFFF;font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`;

  const ctaBlock = eventUrl ? `
        <tr><td style="padding:26px 40px 0;" align="center">
          <a href="${eventUrl}" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;padding:14px 34px;border-radius:10px;font-size:15px;font-weight:700;">${C.cta}</a>
        </td></tr>` : '';

  return emailLayout({
    lang: isDe ? 'de' : 'en',
    title: C.title,
    headerSubtitle: C.kicker,
    bodyHtml: `
        <!-- Hero -->
        <tr><td style="padding:34px 40px 6px;text-align:center;">
          <div style="font-size:36px;line-height:1;">🎉</div>
          <p style="margin:14px 0 0;color:${MUTED};font-size:15px;">${C.heroLine}</p>
          <p style="margin:6px 0 0;color:#FFFFFF;font-size:30px;font-weight:800;line-height:1.2;">${partyLabel}</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:22px 40px 0;">
          <p style="margin:0;color:${TEXT};font-size:15px;line-height:1.6;">${C.greeting}</p>
          <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">${C.intro}</p>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:24px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:${NAVY};border:1px solid ${BORDER};border-radius:14px;padding:8px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row(C.labels.date, dateStr)}
                ${row(C.labels.city, cityName)}
                ${row(C.labels.pkg, packageTier)}
                ${row(C.labels.ref, bookingReference)}
              </table>
            </td></tr>
          </table>
        </td></tr>
${ctaBlock}
        <!-- Closing -->
        <tr><td style="padding:26px 40px 0;">
          <p style="margin:0;color:${TEXT};font-size:15px;line-height:1.6;">${C.closing}</p>
        </td></tr>

        <!-- Brand claim (verbatim from the welcome screen, src/i18n) -->
        <tr><td style="padding:24px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};padding:20px 0;text-align:center;">
              <p style="margin:0;color:${GOLD};font-size:16px;font-weight:700;line-height:1.5;">${C.claimLines}</p>
              <p style="margin:6px 0 0;color:${MUTED};font-size:13.5px;line-height:1.5;">${C.claimSub}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Keep-this-email note -->
        <tr><td style="padding:20px 40px 0;">
          <p style="margin:0;color:${MUTED};font-size:13px;line-height:1.6;">${C.keep}</p>
        </td></tr>

`,
    footerHtml: `          <p style="margin:24px 0 0;color:${FAINT};font-size:12px;line-height:1.6;border-top:1px solid ${BORDER};padding-top:20px;">
            ${C.footer} &middot; <a href="mailto:support@game-over.app" style="color:${GOLD};text-decoration:none;font-weight:600;">support@game-over.app</a>
          </p>`,
  });
}

// ─── Booking Cancelled Email ─────────────────────────────────

interface BookingCancelledEmailParams {
  organizerFirstName?: string;
  partyLabel: string;
  dateStr: string;             // already localised by the caller
  remainingAmount: string;     // already formatted by the caller
  depositAmount: string;       // already formatted by the caller
  // Omitted when the booking has no GO-XXXXXX reference yet. Better to drop the
  // block than to print a raw UUID at a customer who is being told they lost money.
  bookingReference?: string;
  appUrl?: string;
  language?: 'de' | 'en';      // organizer's app language drives the copy
}

/**
 * Sent after an unpaid booking has been cancelled at the 14-day milestone.
 *
 * The brand claim below is verbatim from the welcome screen in
 * src/i18n/{de,en}.ts (claim1-3 + claimSub).
 */
export function getBookingCancelledEmailHtml(params: BookingCancelledEmailParams): string {
  const {
    organizerFirstName, partyLabel, dateStr, remainingAmount, depositAmount,
    bookingReference, appUrl, language,
  } = params;
  const isDe = language === 'de';
  const destination = appUrl ?? 'https://game-over.app';
  const strong = (s: string) => `<strong style="color:#FFFFFF;">${s}</strong>`;

  const C = isDe ? {
    title: 'Schade - wir mussten stornieren | Game Over',
    kicker: 'Buchung storniert',
    greeting: organizerFirstName ? `Hallo ${organizerFirstName},` : 'Hallo,',
    intro: `wir haben bis zuletzt gewartet, aber der Restbetrag von ${strong(remainingAmount)} ist nicht angekommen. Damit ist ${strong(partyLabel)} am ${strong(dateStr)} storniert.`,
    deposit: `Die Anzahlung von ${strong(depositAmount)} bleibt einbehalten - so steht es in den Bedingungen, und wir wissen, dass sich das bitter anfühlt.`,
    reopen: 'Ihr wollt es trotzdem machen? Schreib uns. Neu planen geht schneller als du denkst.',
    referenceLabel: 'Buchungsreferenz',
    claimLines: 'Einer heiratet. Alle feiern. Keiner stresst.',
    claimSub: 'Planen, feiern, abrechnen. Alles in einer App.',
    cta: 'Neu planen',
    contact: 'Schreib uns',
  } : {
    title: 'We’re sorry - we had to cancel | Game Over',
    kicker: 'Booking cancelled',
    greeting: organizerFirstName ? `Hi ${organizerFirstName},` : 'Hi,',
    intro: `we waited until the last possible moment, but the remaining balance of ${strong(remainingAmount)} never arrived. That means ${strong(partyLabel)} on ${strong(dateStr)} has been cancelled.`,
    deposit: `We’ve retained the ${strong(depositAmount)} deposit, as set out in the terms. We know that still stings.`,
    reopen: 'Still want to make it happen? Drop us a line. Starting fresh is quicker than you might think.',
    referenceLabel: 'Booking reference',
    claimLines: 'One gets married. Everyone celebrates. Nobody stresses.',
    claimSub: 'Plan it, party, settle up. All in one app.',
    cta: 'Plan again',
    contact: 'Contact us',
  };

  return emailLayout({
    lang: isDe ? 'de' : 'en',
    title: C.title,
    headerSubtitle: C.kicker,
    bodyHtml: `
        <!-- Message -->
        <tr><td style="padding:34px 40px 0;">
          <p style="margin:0;color:${TEXT};font-size:15px;line-height:1.6;">${C.greeting}</p>
          <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">${C.intro}</p>
          <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">${C.deposit}</p>
          <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">${C.reopen}</p>
        </td></tr>

        <!-- Booking reference -->
        ${bookingReference ? `
        <tr><td style="padding:24px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:${NAVY};border:1px solid ${BORDER};border-radius:14px;padding:18px 22px;text-align:center;">
              <p style="margin:0 0 5px;color:${MUTED};font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;">${C.referenceLabel}</p>
              <p style="margin:0;color:${GOLD};font-size:20px;font-weight:800;letter-spacing:1.5px;">${bookingReference}</p>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:28px 40px 0;text-align:center;">
          <a href="${destination}" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">${C.cta}</a>
        </td></tr>

        <!-- Brand claim (verbatim from the welcome screen, src/i18n) -->
        <tr><td style="padding:26px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};padding:20px 0;text-align:center;">
              <p style="margin:0;color:${GOLD};font-size:16px;font-weight:700;line-height:1.5;">${C.claimLines}</p>
              <p style="margin:6px 0 0;color:${MUTED};font-size:13.5px;line-height:1.5;">${C.claimSub}</p>
            </td></tr>
          </table>
        </td></tr>

`,
    footerHtml: `          <p style="margin:24px 0 0;color:${FAINT};font-size:12px;line-height:1.6;border-top:1px solid ${BORDER};padding-top:20px;">
            ${C.contact} &middot; <a href="mailto:support@game-over.app" style="color:${GOLD};text-decoration:none;font-weight:600;">support@game-over.app</a>
          </p>`,
  });
}
