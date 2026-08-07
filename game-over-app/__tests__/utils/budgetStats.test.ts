import { describe, it, expect } from 'vitest';

import { computeBookedBudgetStats } from '@/utils/budgetStats';

/**
 * Die Zahlen stammen aus der Live-DB (03.08.) und aus der Sollvorgabe des Owners.
 * Sie halten die Trennung der beiden Kassenbuecher fest:
 *
 *   Buchung          - was der Organisator an Game Over zahlt (25 % / 75 %)
 *   Gaestebeitraege  - was die Gaeste an den Organisator zahlen
 *
 * Vorher summierte der Budget-Bildschirm die Gaestebeitraege und beschriftete das
 * Ergebnis als Anzahlung. Natalia zeigte deshalb 687 EUR / 458 EUR statt
 * 286,25 EUR / 858,75 EUR, und zwei frisch gebuchte Events zeigten 0 EUR.
 */

const natalia = {
  totalAmountCents: 114500,
  depositAmountCents: 28625,
  remainingAmountCents: 85875,
  perPersonCents: 22900,
  payingParticipants: 5,
  fullyPaid: false,
};

describe('computeBookedBudgetStats', () => {
  it('zeigt die Anzahlung der Buchung, nicht die Summe der Gaestebeitraege', () => {
    // 3 von 4 Gaesten haben je 229 EUR gezahlt = 687 EUR. Diese Zahl darf
    // in den beiden Karten nicht auftauchen.
    const stats = computeBookedBudgetStats(natalia, [
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
    ]);

    expect(stats.totalBudget).toBe(114500);
    expect(stats.collected).toBe(28625);
    expect(stats.pending).toBe(85875);
    expect(stats.percentage).toBe(25);
  });

  it('liest die Personenzahl aus der Buchung statt sie zu schaetzen', () => {
    // Es gibt erst 4 Teilnehmerzeilen, die Buchung laeuft aber ueber 5 Personen.
    const stats = computeBookedBudgetStats(natalia, [
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
    ]);

    expect(stats.payingCount).toBe(5);
  });

  it('meldet eine vollstaendig bezahlte Buchung als bezahlt, auch ohne Gaestezahlungen', () => {
    // Sven's Bachelor, live: voll bezahlt, aber kein Gast hat etwas markiert.
    // Die App forderte hier faelschlich die vollen 1145 EUR erneut ein.
    const stats = computeBookedBudgetStats(
      {
        totalAmountCents: 114500,
        depositAmountCents: 28625,
        remainingAmountCents: 0,
        perPersonCents: 28625,
        payingParticipants: 4,
        fullyPaid: true,
      },
      [{ paymentStatus: 'pending', contributionAmountCents: 28625 }],
    );

    expect(stats.collected).toBe(114500);
    expect(stats.pending).toBe(0);
    expect(stats.percentage).toBe(100);
  });

  it('zeigt die Anzahlung eines frisch gebuchten Events statt 0 EUR', () => {
    // Van's Bachelor, live: Anzahlung verbucht, noch kein Gast hat gezahlt.
    const stats = computeBookedBudgetStats(
      {
        totalAmountCents: 229000,
        depositAmountCents: 57250,
        remainingAmountCents: 171750,
        perPersonCents: 25444,
        payingParticipants: 9,
        fullyPaid: false,
      },
      [{ paymentStatus: 'pending', contributionAmountCents: 25444 }],
    );

    expect(stats.collected).toBe(57250);
    expect(stats.pending).toBe(171750);
  });

  it('laesst die Gaestebeitraege das Buchungs-Kassenbuch nicht veraendern', () => {
    const ohneZahlungen = computeBookedBudgetStats(natalia, [
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
    ]);
    const mitZahlungen = computeBookedBudgetStats(natalia, [
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
    ]);

    expect(mitZahlungen.collected).toBe(ohneZahlungen.collected);
    expect(mitZahlungen.pending).toBe(ohneZahlungen.pending);
  });

  it('zaehlt die Gaeste weiterhin fuer die Beitragsliste', () => {
    const stats = computeBookedBudgetStats(natalia, [
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'paid', contributionAmountCents: 22900 },
      { paymentStatus: 'pending', contributionAmountCents: 22900 },
    ]);

    expect(stats.paidCount).toBe(2);
    expect(stats.pendingCount).toBe(1);
    expect(stats.perPerson).toBe(22900);
  });

  it('faellt auf total minus collected zurueck, wenn remaining fehlt', () => {
    const stats = computeBookedBudgetStats(
      { ...natalia, remainingAmountCents: null },
      [],
    );

    expect(stats.pending).toBe(114500 - 28625);
  });
});
