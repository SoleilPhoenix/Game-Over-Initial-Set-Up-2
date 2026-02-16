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

interface BaseLayoutParams {
  title: string;
  subtitle?: string;
  accentColor?: string;
  bodyHtml: string;
}

function baseLayout({ title, subtitle, accentColor = '#5A7EB0', bodyHtml }: BaseLayoutParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Game Over</title>
</head>
<body style="margin:0;padding:0;background-color:#15181D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#15181D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#1E2329;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:${accentColor};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;">Game Over</h1>
              ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#23272F;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 8px;color:#6B7280;font-size:12px;">
                Game Over &mdash; Plan unforgettable parties
              </p>
              <p style="margin:0;color:#4B5563;font-size:11px;">
                <a href="https://game-over.app/privacy" style="color:#4B5563;text-decoration:underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://game-over.app/terms" style="color:#4B5563;text-decoration:underline;">Terms</a>
                &nbsp;&middot;&nbsp;
                <a href="https://game-over.app/impressum" style="color:#4B5563;text-decoration:underline;">Impressum</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string, color = '#5A7EB0'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding-bottom:32px;">
      <a href="${url}" style="display:inline-block;background-color:${color};color:#FFFFFF;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function supportLine(): string {
  return `<p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.5;text-align:center;">
  If you have any questions, contact us at support@game-over.app
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

    <p style="margin:0 0 24px;color:#D1D5DB;font-size:15px;line-height:1.6;">
      Welcome to <strong style="color:#FFFFFF;">Game Over</strong> &mdash; your personal party planning assistant.
      We help you organize unforgettable bachelor and bachelorette parties across Germany.
    </p>

    <!-- Features -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:#23272F;border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;">
                <p style="margin:0;color:#FFFFFF;font-size:14px;font-weight:600;">What you can do:</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.5;">
                  &#127881; Browse curated party packages in Berlin, Hamburg &amp; Hannover
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.5;">
                  &#128176; Split costs and track budgets with your group
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.5;">
                  &#128172; Chat, vote on plans, and coordinate everything in one place
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.5;">
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

  return baseLayout({
    title: 'Welcome',
    subtitle: 'Welcome to Game Over',
    bodyHtml,
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

    <p style="margin:0 0 24px;color:#D1D5DB;font-size:15px;line-height:1.6;">
      Your booking for <strong style="color:#FFFFFF;">${honoreeName}'s ${eventTitle}</strong> has been confirmed!
    </p>

    <!-- Booking Reference -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#23272F;border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 4px;color:#9CA3AF;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
          <p style="margin:0;color:#5A7EB0;font-size:28px;font-weight:700;letter-spacing:2px;">${bookingReference}</p>
        </td>
      </tr>
    </table>

    <!-- Event Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:#23272F;border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Package</p>
                <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;font-weight:600;">${packageName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">City</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${city}</p>
                    </td>
                    <td width="50%">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Participants</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${participants} people</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${eventDate ? `
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Event Date</p>
                <p style="margin:4px 0 0;color:#FFFFFF;font-size:15px;">${eventDate}</p>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding-top:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total</p>
                      <p style="margin:4px 0 0;color:#FFFFFF;font-size:18px;font-weight:700;">${totalAmount}</p>
                    </td>
                    <td width="50%">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Deposit Paid</p>
                      <p style="margin:4px 0 0;color:#10B981;font-size:18px;font-weight:700;">${depositAmount}</p>
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

  return baseLayout({
    title: 'Booking Confirmed',
    subtitle: 'Booking Confirmed',
    accentColor: '#10B981',
    bodyHtml,
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

const URGENCY_COLORS: Record<string, { accent: string; badge: string; badgeText: string }> = {
  normal: { accent: '#5A7EB0', badge: '#E8F0FE', badgeText: '#1A73E8' },
  moderate: { accent: '#F59E0B', badge: '#FEF3C7', badgeText: '#92400E' },
  urgent: { accent: '#EF4444', badge: '#FEE2E2', badgeText: '#991B1B' },
  final: { accent: '#DC2626', badge: '#FEE2E2', badgeText: '#991B1B' },
};

const URGENCY_LABELS: Record<string, string> = {
  normal: 'Payment Due',
  moderate: 'Reminder',
  urgent: 'Urgent',
  final: 'Final Notice',
};

export function getPaymentReminderEmailHtml(params: PaymentReminderParams): string {
  const { honoreeName, eventTitle, amountDue, daysRemaining, urgency, paymentUrl } = params;
  const colors = URGENCY_COLORS[urgency] ?? URGENCY_COLORS.normal;
  const label = URGENCY_LABELS[urgency] ?? 'Payment Due';

  const ctaUrl = paymentUrl ?? 'https://game-over.app';
  const isFinal = urgency === 'final';

  const bodyHtml = `
    <!-- Urgency badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:${colors.badge};color:${colors.badgeText};padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">
          ${daysRemaining === 0 ? 'Due Today' : `${daysRemaining} days remaining`}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;color:#FFFFFF;font-size:16px;line-height:1.5;">
      Hi there,
    </p>

    <p style="margin:0 0 24px;color:#D1D5DB;font-size:15px;line-height:1.6;">
      Your final payment for <strong style="color:#FFFFFF;">${honoreeName}'s ${eventTitle}</strong> is due${daysRemaining > 0 ? ` in ${daysRemaining} days` : ' today'}.
    </p>

    <!-- Amount box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:#23272F;border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 4px;color:#9CA3AF;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Amount Due</p>
          <p style="margin:0;color:#FFFFFF;font-size:36px;font-weight:700;">${amountDue}</p>
        </td>
      </tr>
    </table>

    ${isFinal ? `
    <!-- Cancellation warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background-color:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px 20px;">
          <p style="margin:0;color:#FCA5A5;font-size:14px;line-height:1.5;">
            <strong style="color:#EF4444;">Important:</strong> If payment is not received today, your event will be cancelled and only the 25% deposit will be retained.
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    ${ctaButton('Complete Payment', ctaUrl, colors.accent)}
    ${supportLine()}`;

  return baseLayout({
    title: label,
    subtitle: label,
    accentColor: colors.accent,
    bodyHtml,
  });
}
