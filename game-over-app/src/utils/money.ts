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

export type ExpenseSplitStatus = 'complete' | 'over' | 'short';

export interface ExpenseSplitShare {
  userId: string;
  amountCents: number;
  isManual: boolean;
}

export interface ExpenseSplitResult {
  shares: ExpenseSplitShare[];
  assignedCents: number;
  /** Positive when short, negative when over, and zero when complete. */
  remainingCents: number;
  status: ExpenseSplitStatus;
}

export interface ExpenseSplitOptions {
  paidBy?: string | null;
  /** Amounts entered by the user. Only marked participants are considered. */
  manualAmounts?: Readonly<Record<string, number>>;
}

/**
 * Split one extra expense in integer cents without touching the package invoice rules above.
 *
 * The equal split is deterministic: one marked person receives all remainder cents. Manual
 * values replace only that person's suggested value so an in-progress edit is never silently
 * balanced by changing what the user entered.
 */
export function calculateExpenseSplit(
  totalCents: number,
  participantIds: readonly string[],
  options: ExpenseSplitOptions = {}
): ExpenseSplitResult {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error('Expense total must be a non-negative integer number of cents');
  }

  const markedParticipantIds = [...new Set(participantIds)];
  const participantCount = markedParticipantIds.length;
  const baseAmount = participantCount > 0 ? Math.floor(totalCents / participantCount) : 0;
  const remainder = participantCount > 0 ? totalCents - baseAmount * participantCount : 0;
  const remainderRecipient = options.paidBy && markedParticipantIds.includes(options.paidBy)
    ? options.paidBy
    : markedParticipantIds[0];
  const manualAmounts = options.manualAmounts ?? {};

  const shares = markedParticipantIds.map<ExpenseSplitShare>(userId => {
    const isManual = Object.prototype.hasOwnProperty.call(manualAmounts, userId);
    const manualAmount = manualAmounts[userId];
    if (isManual && (!Number.isSafeInteger(manualAmount) || manualAmount < 0)) {
      throw new Error('Manual expense shares must be non-negative integer cents');
    }

    return {
      userId,
      amountCents: isManual
        ? manualAmount
        : baseAmount + (userId === remainderRecipient ? remainder : 0),
      isManual,
    };
  });
  const assignedCents = shares.reduce((sum, share) => sum + share.amountCents, 0);
  const remainingCents = totalCents - assignedCents;
  const status: ExpenseSplitStatus = remainingCents === 0
    ? 'complete'
    : remainingCents > 0
      ? 'short'
      : 'over';

  return { shares, assignedCents, remainingCents, status };
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
