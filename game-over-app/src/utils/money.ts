/**
 * Geldbetraege runden und aufteilen - die eine Stelle im Projekt.
 *
 * Owner-Regel vom 05.08.: Betraege erscheinen **ueberall** als ganze Euro,
 * in der Buchungsstrecke wie im Budget. Vorher rundete die Buchungsstrecke,
 * das Budget zeigte Cent, und beide widersprachen sich auf demselben Event.
 *
 * Zwei Eigenschaften machen die Regel aus, und beide sind durch Tests gesichert:
 *
 * 1. **Der Rest ist immer eine Differenz, nie eine eigene Rundung.**
 *    Wer Anzahlung und Rest getrennt rundet, produziert Summen, die um einen
 *    Euro danebenliegen - und das faellt bei Geld sofort auf.
 * 2. **Pro Person wird abgerundet, die Differenz traegt der Organisator.**
 *    Alle Gaeste sehen denselben glatten Betrag; was zum Gesamtpreis fehlt,
 *    schlaegt beim Organisator auf. Das ist die Owner-Entscheidung vom 05.08.
 *    Die Alternative - einem zufaelligen Gast einen abweichenden Betrag geben -
 *    sieht in der Liste wie ein Fehler aus.
 *
 * Abgerundet wird bewusst, nicht kaufmaennisch gerundet: eine zu niedrig
 * ausgewiesene Anzahlung ueberzeichnet den offenen Rest, und das ist die
 * ungefaehrliche Richtung.
 */

export interface DepositAndDue {
  /** Bereits gezahlt, in ganzen Euro. */
  paidEuros: number;
  /** Noch offen, in ganzen Euro. Immer `gesamt - paidEuros`. */
  dueEuros: number;
}

export function depositAndDue(totalCents: number, paidCents: number): DepositAndDue {
  const totalEuros = Math.round((totalCents || 0) / 100);
  const paidEuros = Math.min(totalEuros, Math.floor(Math.max(0, paidCents || 0) / 100));
  return { paidEuros, dueEuros: Math.max(0, totalEuros - paidEuros) };
}

export interface PerPersonSplit {
  /** Was jeder Gast zahlt, in ganzen Euro. */
  perPersonEuros: number;
  /** Was der Organisator zahlt: Anteil plus die Differenz zum Gesamtbetrag. */
  organizerEuros: number;
  /** Die Differenz, die beim Organisator zusaetzlich anfaellt. */
  remainderEuros: number;
}

export function splitPerPerson(totalCents: number, payingCount: number): PerPersonSplit {
  const totalEuros = Math.round((totalCents || 0) / 100);
  if (!payingCount || payingCount < 1) {
    return { perPersonEuros: 0, organizerEuros: 0, remainderEuros: 0 };
  }

  const perPersonEuros = Math.floor(totalEuros / payingCount);
  // Der Organisator traegt den Rest. Bei payingCount = 1 ist das der ganze Betrag.
  const organizerEuros = totalEuros - perPersonEuros * (payingCount - 1);
  return {
    perPersonEuros,
    organizerEuros,
    remainderEuros: organizerEuros - perPersonEuros,
  };
}

/** Ganze Euro, deutsches Format: 114500 -> "1.145 €". */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round((cents || 0) / 100));
}

/** Wie `formatEuro`, aber der Wert liegt bereits in ganzen Euro vor. */
export function formatEuroFromEuros(euros: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(euros || 0);
}
