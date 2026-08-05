import { describe, it, expect } from 'vitest';

import { depositAndDue, formatEuro, splitPerPerson } from '@/utils/money';

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
