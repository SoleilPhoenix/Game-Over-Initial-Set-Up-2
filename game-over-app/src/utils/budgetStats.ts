/**
 * Budget-Kennzahlen einer gebuchten Veranstaltung.
 *
 * Die App fuehrt zwei getrennte Kassenbuecher, und genau deren Vermischung war
 * der Fehler, den dieses Modul behebt:
 *
 *   1. **Buchung** - was der Organisator an Game Over zahlt. 25 % Anzahlung bei
 *      Buchung, 75 % spaetestens 14 Tage vorher. Steht in `bookings`.
 *   2. **Gaestebeitraege** - was die Gaeste an den Organisator zahlen. Steht in
 *      `event_participants`.
 *
 * Der Budget-Bildschirm beschriftet seine beiden oberen Karten als Kassenbuch 1
 * ("Bezahlter Betrag", "Offener Restbetrag", Knopf "Restbetrag bezahlen"),
 * berechnete sie aber aus Kassenbuch 2. Folge: ein frisch gebuchtes Event zeigte
 * 0 EUR, obwohl die Anzahlung verbucht war, und eine vollstaendig bezahlte
 * Buchung forderte den vollen Betrag erneut ein.
 *
 * `collected` und `pending` gehoeren deshalb ausschliesslich zur Buchung.
 * `paidCount`, `pendingCount` und `perPerson` beschreiben weiterhin die Gaeste -
 * sie speisen die Beitragsliste darunter und sind dort korrekt.
 */

export interface BookingLedger {
  totalAmountCents: number;
  depositAmountCents: number | null;
  remainingAmountCents: number | null;
  perPersonCents: number | null;
  payingParticipants: number | null;
  /** `bookings.fully_paid_at` ist gesetzt. */
  fullyPaid: boolean;
}

export interface ParticipantContribution {
  paymentStatus: string | null;
  contributionAmountCents: number | null;
}

export interface BudgetStats {
  /** Gesamtpreis der Buchung. */
  totalBudget: number;
  /** An Game Over gezahlt: Gesamtbetrag bei Vollzahlung, sonst die Anzahlung. */
  collected: number;
  /** Noch an Game Over offen. */
  pending: number;
  /** Anteil der Buchung, der bezahlt ist. */
  percentage: number;
  /** Gaeste mit Status `paid`. */
  paidCount: number;
  /** Gaeste mit Status `pending`. */
  pendingCount: number;
  /** Anteil pro zahlender Person. */
  perPerson: number;
  /** Zahlende Personen laut Buchung. */
  payingCount: number;
}

export function computeBookedBudgetStats(
  booking: BookingLedger,
  participants: readonly ParticipantContribution[],
): BudgetStats {
  const totalBudget = booking.totalAmountCents || 0;

  // Eine vollstaendig bezahlte Buchung laesst `deposit_amount_cents` auf der
  // urspruenglichen Anzahlung stehen - der Restbetrag wird separat verbucht.
  // Ohne diese Fallunterscheidung meldete Sven's Buchung 286,25 EUR statt 1145 EUR.
  const collected = booking.fullyPaid
    ? totalBudget
    : (booking.depositAmountCents ?? 0);

  // `remaining_amount_cents` ist die Wahrheit; die Differenz ist nur der
  // Rueckfall, falls die Spalte noch nicht gefuellt ist.
  const pending = Math.max(
    0,
    booking.remainingAmountCents ?? totalBudget - collected,
  );

  const percentage = totalBudget > 0
    ? Math.round((collected / totalBudget) * 100)
    : 0;

  // Die Buchung kennt ihre Kopfzahl. Frueher wurde sie aus total/per_person
  // zurueckgerechnet, was bei noch nicht beigetretenen Gaesten danebenlag.
  const storedPerPerson = booking.perPersonCents ?? 0;
  const payingCount = booking.payingParticipants
    ?? (storedPerPerson > 0
      ? Math.round(totalBudget / storedPerPerson)
      : participants.length);

  const perPerson = storedPerPerson > 0
    ? storedPerPerson
    : payingCount > 0
      ? Math.round(totalBudget / payingCount)
      : 0;

  let paidCount = 0;
  let pendingCount = 0;
  for (const participant of participants) {
    if (participant.paymentStatus === 'paid') paidCount++;
    else if (participant.paymentStatus === 'pending') pendingCount++;
  }

  return {
    totalBudget,
    collected,
    pending,
    percentage,
    paidCount,
    pendingCount,
    perPerson,
    payingCount,
  };
}
