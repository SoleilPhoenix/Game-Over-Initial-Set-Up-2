import { describe, it, expect } from 'vitest';

import {
  calculateExpenseSplit,
  depositAndDue,
  formatEuro,
  formatEuroCents,
  formatCentsForInput,
  splitPerPerson,
} from '@/utils/money';

/**
 * Owner-Regel vom 05.08.: Betraege erscheinen ueberall als **ganze Euro**.
 * Der Restbetrag wird immer als Differenz zum Gesamtbetrag gebildet, nie
 * unabhaengig gerundet - nur so passt die Summe garantiert.
 * Die Aufteilung pro Person wird abgerundet; die Differenz traegt der
 * Organisator.
 *
 * Die Zahlen stammen aus der Live-DB (05.08.).
 */

describe('depositAndDue', () => {
  it('rundet die Anzahlung ab und bildet den Rest als Differenz', () => {
    // Hans: 1145 EUR gesamt, 286,25 EUR angezahlt
    const { paidEuros, dueEuros } = depositAndDue(114500, 28625);
    expect(paidEuros).toBe(286);
    expect(dueEuros).toBe(859);
    expect(paidEuros + dueEuros).toBe(1145);
  });

  it('haelt die Summe auch dort, wo unabhaengiges Runden sie brechen wuerde', () => {
    // Dana: 895 EUR gesamt, 223,75 EUR angezahlt. Unabhaengig gerundet waeren
    // das 224 + 671 = 895 zufaellig richtig, 223 + 672 aber ist die Regel:
    // abrunden, Rest als Differenz.
    const { paidEuros, dueEuros } = depositAndDue(89500, 22375);
    expect(paidEuros).toBe(223);
    expect(dueEuros).toBe(672);
    expect(paidEuros + dueEuros).toBe(895);
  });

  it('meldet bei Vollzahlung keinen Restbetrag', () => {
    // Sven: vollstaendig bezahlt
    const { paidEuros, dueEuros } = depositAndDue(114500, 114500);
    expect(paidEuros).toBe(1145);
    expect(dueEuros).toBe(0);
  });

  it('meldet vor der ersten Zahlung den vollen Betrag als offen', () => {
    const { paidEuros, dueEuros } = depositAndDue(114500, 0);
    expect(paidEuros).toBe(0);
    expect(dueEuros).toBe(1145);
  });

  it('wird nie negativ, auch wenn mehr verbucht ist als der Gesamtbetrag', () => {
    const { dueEuros } = depositAndDue(114500, 120000);
    expect(dueEuros).toBe(0);
  });
});

describe('splitPerPerson', () => {
  it('teilt glatt auf, wenn es aufgeht', () => {
    // Natalia: 1145 EUR auf 5 Zahlende = 229 EUR
    const s = splitPerPerson(114500, 5);
    expect(s.perPersonEuros).toBe(229);
    expect(s.organizerEuros).toBe(229);
    expect(s.remainderEuros).toBe(0);
  });

  it('rundet pro Person ab und legt die Differenz auf den Organisator', () => {
    // Dana: 895 EUR auf 4 = 223,75 EUR. Jeder Gast 223, Organisator traegt 226.
    const s = splitPerPerson(89500, 4);
    expect(s.perPersonEuros).toBe(223);
    expect(s.organizerEuros).toBe(226);
    expect(s.remainderEuros).toBe(3);
  });

  it('die Summe trifft immer exakt den Gesamtbetrag', () => {
    for (const [total, count] of [
      [89500, 4], [114500, 5], [114500, 4], [229000, 9], [137400, 5], [100000, 3],
    ] as const) {
      const s = splitPerPerson(total, count);
      const summe = s.perPersonEuros * (count - 1) + s.organizerEuros;
      expect(summe).toBe(Math.round(total / 100));
    }
  });

  it('gibt bei einer einzigen zahlenden Person den ganzen Betrag an sie', () => {
    const s = splitPerPerson(89500, 1);
    expect(s.organizerEuros).toBe(895);
    expect(s.remainderEuros).toBe(0);
  });

  it('faellt bei einer Kopfzahl von 0 nicht auf die Nase', () => {
    const s = splitPerPerson(89500, 0);
    expect(s.perPersonEuros).toBe(0);
    expect(s.organizerEuros).toBe(0);
  });
});

describe('calculateExpenseSplit', () => {
  it('verteilt Rest-Cent exakt und deterministisch auf den Zahlenden', () => {
    const result = calculateExpenseSplit(20000, ['user-1', 'user-2', 'user-3'], {
      paidBy: 'user-2',
    });

    expect(result.shares.map(share => share.amountCents)).toEqual([6666, 6668, 6666]);
    expect(result.assignedCents).toBe(20000);
    expect(result.status).toBe('complete');
  });

  it('gibt den Rest der ersten markierten Person, wenn der Zahlende nicht markiert ist', () => {
    const result = calculateExpenseSplit(10001, ['user-3', 'user-1'], {
      paidBy: 'user-2',
    });

    expect(result.shares).toMatchObject([
      { userId: 'user-3', amountCents: 5001 },
      { userId: 'user-1', amountCents: 5000 },
    ]);
    expect(result.remainingCents).toBe(0);
  });

  it('bewahrt manuelle Werte und meldet kurze, ueberhoehte und vollstaendige Verteilungen', () => {
    const short = calculateExpenseSplit(1000, ['user-1', 'user-2'], {
      manualAmounts: { 'user-1': 400 },
    });
    const over = calculateExpenseSplit(1000, ['user-1', 'user-2'], {
      manualAmounts: { 'user-1': 600 },
    });
    const complete = calculateExpenseSplit(1000, ['user-1', 'user-2'], {
      manualAmounts: { 'user-1': 600, 'user-2': 400 },
    });

    expect(short).toMatchObject({ status: 'short', remainingCents: 100 });
    expect(short.shares[0]).toEqual({ userId: 'user-1', amountCents: 400, isManual: true });
    expect(over).toMatchObject({ status: 'over', remainingCents: -100 });
    expect(over.shares[0].amountCents).toBe(600);
    expect(complete).toMatchObject({ status: 'complete', remainingCents: 0 });
    expect(complete.shares.map(share => share.amountCents)).toEqual([600, 400]);
  });

  it('erlaubt niemanden zu markieren und meldet dann den vollen Betrag als fehlend', () => {
    expect(calculateExpenseSplit(2500, [])).toEqual({
      shares: [],
      assignedCents: 0,
      remainingCents: 2500,
      status: 'short',
    });
  });
});

describe('formatEuro', () => {
  // Intl trennt Zahl und Waehrungszeichen mit einem *geschuetzten* Leerzeichen
  // (U+00A0), nicht mit einem normalen. Hier normalisiert, damit die Erwartung
  // lesbar bleibt - der Unterschied ist Absicht von Intl, kein Fehler.
  const norm = (s: string) => s.replace(/ /g, ' ');

  it('zeigt ganze Euro ohne Nachkommastellen', () => {
    expect(norm(formatEuro(114500))).toBe('1.145 €');
    expect(norm(formatEuro(0))).toBe('0 €');
  });

  it('rundet Cent-Betraege auf ganze Euro', () => {
    expect(norm(formatEuro(28625))).toBe('286 €');
    expect(norm(formatEuro(22375))).toBe('224 €');
  });
});

describe('formatEuroCents', () => {
  it('preserves cents for the separate extra-cost ledger', () => {
    expect(formatEuroCents(12345).replace(/ /g, ' ')).toBe('123,45 €');
  });

  it('formats editable euro inputs without a currency symbol', () => {
    expect(formatCentsForInput(12345)).toBe('123,45');
  });
});
