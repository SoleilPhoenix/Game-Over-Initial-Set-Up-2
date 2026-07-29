/**
 * Final-briefing copy shared by both delivery channels.
 *
 * Lives in _shared rather than inside send-final-briefing/index.ts so it can be
 * imported without executing that module's serve() call — which is what lets the
 * preview script render the real message text instead of a hand-copied mock.
 *
 * The brand claim is copied verbatim from src/i18n/{de,en}.ts (welcome screen
 * claim1-3 + claimSub). If the claim changes there, change it here too.
 */

export type PartyType = 'bachelor' | 'bachelorette' | null | undefined;
export type Language = 'de' | 'en';

/** "Bachelor Party (JGA)" in German, "Bachelor Party" in English. */
export function partyTerm(partyType: PartyType, language: Language): string {
  const base = partyType === 'bachelorette' ? 'Bachelorette Party' : 'Bachelor Party';
  return language === 'de' ? `${base} (JGA)` : base;
}

/**
 * Possessive form of a name. Not a plain `${name}s` — that would produce
 * "Hanss" / "Phoenixs".
 *
 * The two languages differ: German drops the s after any sibilant (s, ß, x, z)
 * and takes a bare apostrophe — "Hans' Party", "Phoenix' Party". English only
 * does that for names already ending in s ("Chris' party"); x and z still take
 * the full 's — "Phoenix's", "Chavez's".
 */
export function possessive(name: string, language: Language): string {
  const n = name.trim();
  if (language === 'de') return /[sßxz]$/i.test(n) ? `${n}'` : `${n}s`;
  return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}

/** First token of a full name, e.g. "Soleil Phoenix" -> "Soleil". */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/**
 * Title/subject label, e.g. "Soleils Bachelor Party (JGA)".
 * Deliberately first-name only — it reads punchier in a subject line. The body
 * copy still uses the full honoree name.
 */
export function partyLabel(honoreeName: string, partyType: PartyType, language: Language): string {
  const first = firstName(honoreeName) || honoreeName.trim();
  return `${possessive(first, language)} ${partyTerm(partyType, language)}`;
}

export const CLAIM = {
  de: { lines: 'Einer heiratet. Alle feiern. Keiner stresst.', sub: 'Planen, feiern, abrechnen. Alles in einer App.' },
  en: { lines: 'One gets married. Everyone celebrates. Nobody stresses.', sub: 'Plan it, party, settle up. All in one app.' },
} as const;

/** Event-level briefing facts, shared by both channels. */
export interface BriefingDetails {
  partyLabel: string;       // "Soleil Phoenix' Bachelor Party (JGA)"
  partyTerm: string;        // "Bachelor Party (JGA)"
  honoreeName: string;
  dateStr: string;          // localised for `language`
  cityName: string;
  packageTier: string;
  bookingReference: string;
  eventUrl: string;
  language: Language;       // organizer's profiles.language
}

/** First name comes from invite_codes.guest_first_name and may be absent. */
export function buildBriefingMessage(d: BriefingDetails, guestFirstName?: string): string {
  const name = guestFirstName ? ` ${guestFirstName}` : '';
  const claim = CLAIM[d.language];

  const lines = d.language === 'de'
    ? [
        `🎉 *Finales Briefing - ${d.partyLabel}*`,
        '',
        `Hallo${name}! Morgen startet die ${d.partyTerm} für ${d.honoreeName}. Hier ist alles, was du wissen musst:`,
        '',
        `📅 *Datum:* ${d.dateStr}`,
        `📍 *Stadt:* ${d.cityName}`,
        `🎁 *Paket:* ${d.packageTier}`,
        `📋 *Buchungsref.:* ${d.bookingReference}`,
        '',
        `Sei pünktlich und mach dich bereit für etwas Unvergessliches! 🖤`,
        '',
        claim.lines,
        claim.sub,
        '',
        `Alle Details: ${d.eventUrl}`,
        '',
        `- Game Over`,
      ]
    : [
        `🎉 *Final Briefing - ${d.partyLabel}*`,
        '',
        `Hey${name}! Tomorrow the ${d.partyTerm} for ${d.honoreeName} kicks off. Here is everything you need to know:`,
        '',
        `📅 *Date:* ${d.dateStr}`,
        `📍 *City:* ${d.cityName}`,
        `🎁 *Package:* ${d.packageTier}`,
        `📋 *Booking ref:* ${d.bookingReference}`,
        '',
        `Be on time and get ready for something unforgettable! 🖤`,
        '',
        claim.lines,
        claim.sub,
        '',
        `Full details: ${d.eventUrl}`,
        '',
        `- Game Over`,
      ];

  return lines.join('\n');
}

/** Subject line for the briefing email. Sender name already reads "Game Over". */
export function buildBriefingSubject(d: BriefingDetails): string {
  return d.language === 'de'
    ? `Morgen ist es soweit: ${d.partyLabel} | Game Over`
    : `Tomorrow is the day: ${d.partyLabel} | Game Over`;
}
